import { useState, useEffect, useRef, useCallback, useMemo } from 'react';
import { useParams, useNavigate } from 'react-router-dom';
import { Document, Page, pdfjs } from 'react-pdf';
import HTMLFlipBook from 'react-pageflip';
import { getBooks, incrementBookView } from '../services/namaService';
import './BookReaderPage.css';
import 'react-pdf/dist/Page/AnnotationLayer.css';
import 'react-pdf/dist/Page/TextLayer.css';

// Configure PDF.js worker to use local file from public folder
pdfjs.GlobalWorkerOptions.workerSrc = '/pdf.worker.min.mjs';

// Configure standard fonts from CDN to prevent local font loading errors
const STANDARD_FONT_DATA_URL = `//unpkg.com/pdfjs-dist@${pdfjs.version}/standard_fonts/`;

const BookReaderPage = () => {
    const { id } = useParams();
    const navigate = useNavigate();
    const [book, setBook] = useState(null);
    const [pdfBlobUrl, setPdfBlobUrl] = useState(null);
    const [pdfDocument, setPdfDocument] = useState(null);
    const [numPages, setNumPages] = useState(0);
    const [currentPage, setCurrentPage] = useState(0);
    const [scale, setScale] = useState(1.0);
    const [loading, setLoading] = useState(true);
    const [pdfError, setPdfError] = useState(null);
    const [showOutline, setShowOutline] = useState(false);
    const [outline, setOutline] = useState([]);
    const [searchQuery, setSearchQuery] = useState('');
    const [searchResults, setSearchResults] = useState([]);
    const [currentSearchIndex, setCurrentSearchIndex] = useState(-1);
    const [isSearching, setIsSearching] = useState(false);
    const [pageDimensions, setPageDimensions] = useState({ width: 550, height: 733 });
    const [bookmarks, setBookmarks] = useState([]);
    const [showBookmarks, setShowBookmarks] = useState(false);
    const [showGoToPage, setShowGoToPage] = useState(false);
    const [goToPageInput, setGoToPageInput] = useState('');

    const flipBookRef = useRef(null);
    const containerRef = useRef(null);

    // Memoize PDF options to prevent reloading on every render
    const pdfOptions = useMemo(() => ({
        standardFontDataUrl: STANDARD_FONT_DATA_URL,
        cMapUrl: `//unpkg.com/pdfjs-dist@${pdfjs.version}/cmaps/`,
        cMapPacked: true
    }), []);

    // Aggressive scroll lock - completely freeze background page
    useEffect(() => {
        // Save current scroll position
        const scrollY = window.scrollY;
        const scrollX = window.scrollX;

        // Lock the body in place
        document.body.style.position = 'fixed';
        document.body.style.top = `-${scrollY}px`;
        document.body.style.left = `-${scrollX}px`;
        document.body.style.width = '100%';
        document.body.style.overflow = 'hidden';

        // Prevent any scroll events from reaching the body
        const preventBodyScroll = (e) => {
            // Only block if not inside our reader
            if (!e.target.closest('.book-reader-page')) {
                e.preventDefault();
                e.stopPropagation();
            }
        };

        document.addEventListener('wheel', preventBodyScroll, { passive: false, capture: true });
        document.addEventListener('touchmove', preventBodyScroll, { passive: false, capture: true });

        return () => {
            // Restore body styles
            document.body.style.position = '';
            document.body.style.top = '';
            document.body.style.left = '';
            document.body.style.width = '';
            document.body.style.overflow = '';

            // Restore scroll position
            window.scrollTo(scrollX, scrollY);

            document.removeEventListener('wheel', preventBodyScroll, { capture: true });
            document.removeEventListener('touchmove', preventBodyScroll, { capture: true });
        };
    }, []);

    useEffect(() => {
        loadBook();
        // Load bookmarks from localStorage
        const storedBookmarks = localStorage.getItem(`bookmarks_${id}`);
        if (storedBookmarks) {
            setBookmarks(JSON.parse(storedBookmarks));
        }
        // Resume from last read page
        const lastPage = localStorage.getItem(`lastPage_${id}`);
        if (lastPage) {
            setCurrentPage(parseInt(lastPage));
        }
    }, [id]);

    // Save current page on change
    useEffect(() => {
        if (id && currentPage > 0) {
            localStorage.setItem(`lastPage_${id}`, currentPage.toString());
        }
    }, [id, currentPage]);

    // Keyboard navigation
    useEffect(() => {
        const handleKeyDown = (e) => {
            if (!flipBookRef.current) return;
            if (e.target.tagName === 'INPUT') return; // Don't interfere with inputs

            switch (e.key) {
                case 'ArrowRight':
                case 'PageDown':
                    e.preventDefault();
                    flipBookRef.current.pageFlip().flipNext();
                    break;
                case 'ArrowLeft':
                case 'PageUp':
                    e.preventDefault();
                    flipBookRef.current.pageFlip().flipPrev();
                    break;
                case 'Home':
                    e.preventDefault();
                    jumpToPage(0);
                    break;
                case 'End':
                    e.preventDefault();
                    jumpToPage(numPages - 1);
                    break;
                case 'b':
                case 'B':
                    e.preventDefault();
                    toggleBookmark();
                    break;
                case 'f':
                case 'F':
                    if (!e.ctrlKey) {
                        e.preventDefault();
                        toggleFullscreen();
                    }
                    break;
                case 'Escape':
                    setShowOutline(false);
                    setShowBookmarks(false);
                    setShowGoToPage(false);
                    break;
                default:
                    break;
            }
        };

        document.addEventListener('keydown', handleKeyDown);
        return () => document.removeEventListener('keydown', handleKeyDown);
    }, [numPages]);

    // Toggle bookmark for current page
    const toggleBookmark = () => {
        const isBookmarked = bookmarks.includes(currentPage);
        let newBookmarks;
        if (isBookmarked) {
            newBookmarks = bookmarks.filter(p => p !== currentPage);
        } else {
            newBookmarks = [...bookmarks, currentPage].sort((a, b) => a - b);
        }
        setBookmarks(newBookmarks);
        localStorage.setItem(`bookmarks_${id}`, JSON.stringify(newBookmarks));
    };

    // Go to specific page
    const handleGoToPage = (e) => {
        e.preventDefault();
        const pageNum = parseInt(goToPageInput) - 1;
        if (pageNum >= 0 && pageNum < numPages) {
            jumpToPage(pageNum);
            setShowGoToPage(false);
            setGoToPageInput('');
        }
    };

    const loadBook = async () => {
        try {
            setLoading(true);
            const books = await getBooks();
            const found = books.find(b => b.id === id);

            if (found) {
                setBook(found);
                incrementBookView(id);

                // Fetch PDF as blob to bypass CORS
                try {
                    console.log("Fetching PDF from:", found.file_url);
                    const response = await fetch(found.file_url);
                    if (!response.ok) {
                        throw new Error(`HTTP error! status: ${response.status}`);
                    }
                    const blob = await response.blob();
                    const blobUrl = URL.createObjectURL(blob);
                    console.log("PDF Blob created:", blobUrl);
                    setPdfBlobUrl(blobUrl);
                } catch (err) {
                    console.error("PDF Fetch Error:", err);
                    setPdfError("Failed to load PDF file: " + err.message);
                }
            } else {
                setPdfError("Book not found in library");
            }
        } catch (err) {
            console.error("Load Book Error:", err);
            setPdfError("Failed to load book details");
        } finally {
            setLoading(false);
        }
    };

    // Cleanup blob URL on unmount
    useEffect(() => {
        return () => {
            if (pdfBlobUrl) {
                URL.revokeObjectURL(pdfBlobUrl);
            }
        };
    }, [pdfBlobUrl]);

    const onDocumentLoadSuccess = useCallback(async (pdf) => {
        try {
            setPdfDocument(pdf);
            setNumPages(pdf.numPages);

            // Getting outline can be fragile if transport is unstable
            try {
                const outlineData = await pdf.getOutline();

                // Recursive helper to flatten nested outline
                const flattenOutline = (items) => {
                    let result = [];
                    if (!items) return result;
                    for (const item of items) {
                        result.push(item);
                        if (item.items && item.items.length > 0) {
                            // Recursively get children
                            result = result.concat(flattenOutline(item.items));
                        }
                    }
                    return result;
                };

                // Flatten the outline structure first
                const flatRawOutline = flattenOutline(outlineData || []);

                // Process outline to extract page numbers
                const processedOutline = [];
                if (flatRawOutline.length > 0) {
                    for (const item of flatRawOutline) {
                        try {
                            let pageNum = 0;
                            if (item.dest) {
                                // Resolve destination to page number
                                const dest = typeof item.dest === 'string'
                                    ? await pdf.getDestination(item.dest)
                                    : item.dest;

                                if (dest) {
                                    const pageRef = dest[0];
                                    const pageIndex = await pdf.getPageIndex(pageRef);
                                    pageNum = pageIndex; // 0-indexed for flipbook
                                }
                            }
                            processedOutline.push({
                                title: item.title,
                                page: pageNum,
                                // Optional: could keep depth info for indentation later
                            });
                        } catch (err) {
                            console.warn('Could not resolve TOC item:', item.title, err);
                        }
                    }
                }

                // Fallback: Smart Scan for Table of Contents
                if (processedOutline.length === 0) {
                    console.log("No metadata outline found. Attempting Smart TOC extraction...");
                    let smartOutline = [];

                    // Helper to group text items by line (Y-coordinate)
                    const getPageLines = async (pageNum) => {
                        const page = await pdf.getPage(pageNum);
                        const textContent = await page.getTextContent();
                        const items = textContent.items;

                        // Group by Y coordinate (tolerance of 5 units)
                        const lines = [];
                        items.forEach(item => {
                            const y = Math.round(item.transform[5] / 5) * 5;
                            const existingLine = lines.find(l => l.y === y);
                            if (existingLine) {
                                existingLine.text += " " + item.str;
                            } else {
                                lines.push({ y, text: item.str });
                            }
                        });

                        // Sort by Y (top to bottom)
                        return lines.sort((a, b) => b.y - a.y).map(l => l.text.trim());
                    };

                    // Scan first 15 pages for a TOC
                    for (let i = 1; i <= Math.min(15, pdf.numPages); i++) {
                        const lines = await getPageLines(i);

                        // Heuristic: Count how many lines look like TOC entries (Text ... Number)
                        let tocLineCount = 0;
                        const potentialItems = [];

                        // Relaxed Regex: Capture any line ending in a number (1-3 digits)
                        // excluding obviously long numbers (years)
                        const looseRegex = /^(.*?)\s+(\d{1,3})$/;

                        lines.forEach(line => {
                            const trimmed = line.trim();
                            const match = trimmed.match(looseRegex);

                            if (match) {
                                const title = match[1].replace(/[\.\s]+$/, '').trim();
                                const pageNum = parseInt(match[2]);

                                // Valid TOC entry:
                                // 1. Page number is valid and within bounds
                                // 2. Title has text
                                // 3. Title isn't just a number (like "1 2")
                                // 4. Page number isn't a year (heuristic < 200 for a book of this size, or <= numPages)
                                if (!isNaN(pageNum) && pageNum <= pdf.numPages && title.length > 2 && isNaN(parseInt(title))) {
                                    potentialItems.push({ title, page: pageNum - 1 });
                                    tocLineCount++;
                                }
                            }
                        });

                        // If we found a page with multiple TOC-like lines (at least 3), assume it's the TOC
                        // This bypasses the need for a specific "Contents" header which might be an image or styled weirdly
                        if (tocLineCount >= 3) {
                            console.log(`Found TOC on page ${i} with ${tocLineCount} items`);
                            smartOutline.push(...potentialItems);
                            break; // Stop after finding the first valid TOC page
                        }
                    }

                    if (smartOutline.length > 0) {
                        console.log(`Smart extraction found ${smartOutline.length} items.`);
                        processedOutline.push(...smartOutline);
                    } else {
                        // Ultimate Fallback: Page numbers
                        for (let i = 0; i < pdf.numPages; i++) {
                            processedOutline.push({
                                title: `Page ${i + 1}`,
                                page: i
                            });
                        }
                    }
                }

                setOutline(processedOutline);

                const firstPage = await pdf.getPage(1);
                const viewport = firstPage.getViewport({ scale: 1 });
                // Set dimensions based on the first page, but ensure it fits 2-page view
                setPageDimensions({ width: viewport.width, height: viewport.height });

            } catch (outlineErr) {
                console.warn("Could not load outline or page dimensions:", outlineErr);
                // Fallback dimensions if getPage failed
                if (pageDimensions.width === 550) {
                    setPageDimensions({ width: 600, height: 850 });
                }
            }

        } catch (e) {
            console.error('Error getting PDF metadata:', e);
            // If critical error, clear document to avoid "Transport destroyed" loops
            setPdfDocument(null);
            setPdfError("Error loading PDF structure: " + e.message);
        }
    }, []);

    const onDocumentLoadError = (error) => {
        console.error("PDF Load Error:", error);
        setPdfError("Failed to render PDF: " + error.message);
        setPdfDocument(null);
    }

    const onFlip = useCallback((e) => {
        setCurrentPage(e.data);
    }, []);

    const jumpToPage = (pageNum) => {
        if (flipBookRef.current) {
            // Ensure pageNum is valid
            if (pageNum >= 0 && pageNum < numPages) {
                flipBookRef.current.pageFlip().flip(pageNum);
            }
        }
        setShowOutline(false);
    };

    const toggleFullscreen = () => {
        if (!document.fullscreenElement) {
            containerRef.current.requestFullscreen();
        } else {
            document.exitFullscreen();
        }
    };

    const handleWheel = (e) => {
        // Stop if scrolling in sidebar or modal
        if (e.target.closest('.outline-sidebar') || e.target.closest('.goto-modal')) {
            return;
        }

        // ALWAYS prevent default to stop any scrolling within the reader
        e.preventDefault();
        e.stopPropagation();

        // Only turn pages - no scrolling at all
        if (!flipBookRef.current) return;
        if (e.deltaY > 0) {
            flipBookRef.current.pageFlip().flipNext();
        } else if (e.deltaY < 0) {
            flipBookRef.current.pageFlip().flipPrev();
        }
    };

    const handleSearch = async (e) => {
        e.preventDefault();
        if (!searchQuery.trim() || !pdfDocument) return;

        setIsSearching(true);
        setSearchResults([]);
        setCurrentSearchIndex(-1);

        try {
            const results = [];
            // Search all pages - optimized to run in chunks to avoid blocking UI
            const CHUNK_SIZE = 5;
            for (let i = 1; i <= numPages; i += CHUNK_SIZE) {
                const limit = Math.min(i + CHUNK_SIZE, numPages + 1);
                const promises = [];
                for (let j = i; j < limit; j++) {
                    promises.push(pdfDocument.getPage(j).then(page => page.getTextContent().then(content => ({
                        pageIndex: j - 1,
                        text: content.items.map(item => item.str).join(' ')
                    }))));
                }

                const chunks = await Promise.all(promises);
                chunks.forEach(chunk => {
                    if (chunk.text.toLowerCase().includes(searchQuery.toLowerCase())) {
                        results.push(chunk.pageIndex);
                    }
                });
            }

            results.sort((a, b) => a - b);

            setSearchResults(results);
            if (results.length > 0) {
                setCurrentSearchIndex(0);
                jumpToPage(results[0]);
            } else {
                // Optional: Show no results message
                // alert('No matches found');
            }
        } catch (err) {
            console.error('Search error:', err);
        } finally {
            setIsSearching(false);
        }
    };

    const nextSearchMatch = () => {
        if (searchResults.length === 0) return;
        const nextIndex = (currentSearchIndex + 1) % searchResults.length;
        setCurrentSearchIndex(nextIndex);
        jumpToPage(searchResults[nextIndex]);
    };

    // Search Highlighting Effect
    useEffect(() => {
        if (!searchQuery) {
            // Clear highlights if search is empty
            const marks = document.querySelectorAll('mark.search-highlight');
            marks.forEach(mark => {
                const parent = mark.parentNode;
                if (parent) {
                    parent.textContent = parent.textContent; // Unwrap
                }
            });
            return;
        }

        const highlightText = () => {
            const textLayers = document.querySelectorAll('.react-pdf__Page__textContent');
            textLayers.forEach(layer => {
                const spans = layer.querySelectorAll('span');
                spans.forEach(span => {
                    // Only process if not already highlighted to prevent potential loops usually
                    // But here we might be re-running on fresh render
                    const text = span.textContent;
                    if (text.toLowerCase().includes(searchQuery.toLowerCase())) {
                        const regex = new RegExp(`(${searchQuery.replace(/[.*+?^${}()|[\]\\]/g, '\\$&')})`, 'gi');
                        if (regex.test(text)) {
                            span.innerHTML = text.replace(regex, '<mark class="search-highlight">$1</mark>');
                        }
                    }
                });
            });
        };

        // Run after a slight delay to allow React PDF to render text layer
        const timeoutId = setTimeout(highlightText, 500);
        return () => clearTimeout(timeoutId);
    }, [searchQuery, currentPage, scale, pdfDocument]);

    // Calculate initial scale to fit viewport ONLY if not already set or manually changed
    useEffect(() => {
        if (!pageDimensions.width) return;

        const isMobile = window.innerWidth <= 768;
        const toolbarHeight = isMobile ? 100 : 64;
        const padding = isMobile ? 10 : 40;

        const maxWidth = window.innerWidth - padding;
        const maxHeight = window.innerHeight - toolbarHeight - padding;

        // Calculate fit ratio
        const widthRatio = maxWidth / pageDimensions.width;
        const heightRatio = maxHeight / pageDimensions.height;
        const fitRatio = Math.min(widthRatio, heightRatio);

        // Only set initial scale, don't override user zoom
        if (scale === 1.0) {
            setScale(fitRatio * 0.95); // 0.95 gives a little breathing room
        }
    }, [pageDimensions]);

    if (loading) return <div className="reader-loading"><span className="loader"></span></div>;

    if (!book && !pdfError) return <div className="pdf-error">Book not found</div>;

    const isMobile = window.innerWidth <= 768;

    // Calculate display dimensions based on CURRENT scale
    const currentWidth = Math.round(pageDimensions.width * scale);
    const currentHeight = Math.round(pageDimensions.height * scale);

    return (
        <div className="book-reader-page" ref={containerRef} onWheel={handleWheel}>
            {/* Toolbar */}
            <header className="reader-toolbar">
                <div className="toolbar-left">
                    <button className="btn-icon" onClick={() => navigate('/books')} title="Back to Library">
                        <svg xmlns="http://www.w3.org/2000/svg" width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"><path d="M19 12H5M12 19l-7-7 7-7" /></svg>
                    </button>
                    <button className="btn-icon" onClick={() => setShowOutline(!showOutline)} title="Table of Contents">
                        <svg xmlns="http://www.w3.org/2000/svg" width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"><line x1="8" y1="6" x2="21" y2="6" /><line x1="8" y1="12" x2="21" y2="12" /><line x1="8" y1="18" x2="21" y2="18" /><line x1="3" y1="6" x2="3.01" y2="6" /><line x1="3" y1="12" x2="3.01" y2="12" /><line x1="3" y1="18" x2="3.01" y2="18" /></svg>
                    </button>
                    <button
                        className={`btn-icon ${bookmarks.includes(currentPage) ? 'active' : ''}`}
                        onClick={toggleBookmark}
                        title={bookmarks.includes(currentPage) ? "Remove Bookmark (B)" : "Add Bookmark (B)"}
                    >
                        <svg xmlns="http://www.w3.org/2000/svg" width="20" height="20" viewBox="0 0 24 24" fill={bookmarks.includes(currentPage) ? "#FF9933" : "none"} stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"><path d="M19 21l-7-5-7 5V5a2 2 0 0 1 2-2h10a2 2 0 0 1 2 2z" /></svg>
                    </button>
                    {bookmarks.length > 0 && (
                        <button className="btn-icon" onClick={() => setShowBookmarks(!showBookmarks)} title="View Bookmarks">
                            <span style={{ fontSize: '0.75rem', fontWeight: 'bold' }}>{bookmarks.length}</span>
                        </button>
                    )}
                </div>

                {book && (
                    <div className="book-title-mini" onClick={() => setShowGoToPage(true)} style={{ cursor: 'pointer' }} title="Click to go to page">
                        <strong>{book.title}</strong>
                        <span>Page {currentPage + 1} of {numPages}</span>
                        <div className="reading-progress" style={{ width: '100%', height: '3px', background: '#e0e0e0', borderRadius: '2px', marginTop: '4px' }}>
                            <div style={{ width: `${((currentPage + 1) / numPages) * 100}%`, height: '100%', background: 'linear-gradient(90deg, #FF9933, #FF6600)', borderRadius: '2px', transition: 'width 0.3s' }} />
                        </div>
                    </div>
                )}

                <div className="toolbar-right">
                    <div className="search-container">
                        <form className="search-box" onSubmit={handleSearch}>
                            <input
                                type="text"
                                placeholder="Search..."
                                value={searchQuery}
                                onChange={(e) => setSearchQuery(e.target.value)}
                            />
                            <button type="submit" disabled={isSearching}>
                                {isSearching ? <span className="mini-loader"></span> : <svg xmlns="http://www.w3.org/2000/svg" width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"><circle cx="11" cy="11" r="8" /><line x1="21" y1="21" x2="16.65" y2="16.65" /></svg>}
                            </button>
                        </form>
                        {searchResults.length > 0 && (
                            <div className="search-results-nav">
                                <span>{currentSearchIndex + 1}/{searchResults.length}</span>
                                <button onClick={nextSearchMatch} title="Next Match">›</button>
                            </div>
                        )}
                    </div>

                    <div className="zoom-controls">
                        <button className="btn-icon" onClick={() => setScale(s => Math.max(0.2, s - 0.1))}>
                            <svg xmlns="http://www.w3.org/2000/svg" width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"><line x1="5" y1="12" x2="19" y2="12" /></svg>
                        </button>
                        <span className="zoom-level">{Math.round(scale * 100)}%</span>
                        <button className="btn-icon" onClick={() => setScale(s => Math.min(3.0, s + 0.1))}>
                            <svg xmlns="http://www.w3.org/2000/svg" width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"><line x1="12" y1="5" x2="12" y2="19" /><line x1="5" y1="12" x2="19" y2="12" /></svg>
                        </button>
                    </div>

                    <button className="btn-icon" onClick={toggleFullscreen}>
                        <svg xmlns="http://www.w3.org/2000/svg" width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"><path d="M8 3H5a2 2 0 0 0-2 2v3m18 0V5a2 2 0 0 0-2-2h-3m0 18h3a2 2 0 0 0 2-2v-3M3 16v3a2 2 0 0 0 2 2h3" /></svg>
                    </button>
                </div>
            </header>

            <main className="reader-main">
                {/* TOC Sidebar */}
                {showOutline && (
                    <aside className="outline-sidebar shadow-lg">
                        <div className="sidebar-header">
                            <h3>Contents</h3>
                            <button onClick={() => setShowOutline(false)}>×</button>
                        </div>
                        <div className="outline-list">
                            {outline.length > 0 ? outline.map((item, idx) => (
                                <button
                                    key={idx}
                                    onClick={() => jumpToPage(item.page)}
                                    className={currentPage === item.page ? 'active' : ''}
                                >
                                    {item.title}
                                </button>
                            )) : (
                                <p className="no-outline">No table of contents found</p>
                            )}
                        </div>
                    </aside>
                )}

                {/* Bookmarks Sidebar */}
                {showBookmarks && (
                    <aside className="outline-sidebar bookmarks-sidebar shadow-lg">
                        <div className="sidebar-header">
                            <h3>🔖 Bookmarks</h3>
                            <button onClick={() => setShowBookmarks(false)}>×</button>
                        </div>
                        <div className="outline-list">
                            {bookmarks.length > 0 ? bookmarks.map((page, idx) => (
                                <button
                                    key={idx}
                                    onClick={() => { jumpToPage(page); setShowBookmarks(false); }}
                                    className={currentPage === page ? 'active' : ''}
                                >
                                    Page {page + 1}
                                </button>
                            )) : (
                                <p className="no-outline">No bookmarks yet. Press B to add one.</p>
                            )}
                        </div>
                    </aside>
                )}

                {/* Go to Page Modal */}
                {showGoToPage && (
                    <div className="goto-modal-overlay" onClick={() => setShowGoToPage(false)}>
                        <div className="goto-modal" onClick={e => e.stopPropagation()}>
                            <h4>Go to Page</h4>
                            <form onSubmit={handleGoToPage}>
                                <input
                                    type="number"
                                    min="1"
                                    max={numPages}
                                    value={goToPageInput}
                                    onChange={e => setGoToPageInput(e.target.value)}
                                    placeholder={`1-${numPages}`}
                                    autoFocus
                                />
                                <div className="modal-actions">
                                    <button type="button" onClick={() => setShowGoToPage(false)}>Cancel</button>
                                    <button type="submit">Go</button>
                                </div>
                            </form>
                        </div>
                    </div>
                )}

                <div className="flipbook-wrapper" style={{ overflow: 'auto' }}>

                    {pdfError ? (
                        <div className="pdf-error">{pdfError}</div>
                    ) : pdfBlobUrl ? (
                        <Document
                            file={pdfBlobUrl}
                            onLoadSuccess={onDocumentLoadSuccess}
                            onLoadError={onDocumentLoadError}
                            loading={<div className="loader">Loading PDF Document...</div>}
                            error={<div className="pdf-error">Failed to load PDF data.</div>}
                            options={pdfOptions}
                        >
                            {numPages > 0 ? (
                                <HTMLFlipBook
                                    width={currentWidth}
                                    height={currentHeight}
                                    startPage={currentPage}
                                    minWidth={100}
                                    maxWidth={2000}
                                    minHeight={100}
                                    maxHeight={2500}
                                    maxShadowOpacity={0.5}
                                    showCover={true}
                                    drawShadow={true}
                                    flippingTime={600}
                                    usePortrait={false}
                                    startZIndex={0}
                                    autoSize={true}
                                    clickEventForward={true}
                                    useMouseEvents={true}
                                    swipeDistance={50}
                                    showPageCorners={true}
                                    disableFlipByClick={false}
                                    mobileScrollSupport={true}
                                    onFlip={onFlip}
                                    className="nama-flipbook"
                                    ref={flipBookRef}
                                >
                                    {Array.from(new Array(numPages), (el, index) => {
                                        const pageNum = index + 1;
                                        // "Lazy load" pages: only render content if within 2 pages of current
                                        // This significantly improves performance for large books
                                        const isNear = Math.abs(pageNum - (currentPage + 1)) < 3;

                                        return (
                                            <div key={`page_${pageNum}`} className="page-content">
                                                {isNear ? (
                                                    <Page
                                                        pageNumber={pageNum}
                                                        width={currentWidth}
                                                        height={currentHeight}
                                                        renderTextLayer={true} // Keep text layer for selection
                                                        renderAnnotationLayer={false} // Disable annotations for perf
                                                        devicePixelRatio={Math.min(window.devicePixelRatio, 2)} // Cap pixel ratio for perf
                                                        loading={<div className="page-loader">Loading...</div>}
                                                        error={<div className="page-error">Error</div>}
                                                        onRenderSuccess={() => {
                                                            // Trigger highlighting for this specific page when it finishes rendering
                                                            if (searchQuery) {
                                                                setTimeout(highlightText, 100);
                                                            }
                                                        }}
                                                    />
                                                ) : (
                                                    <div className="page-placeholder" style={{ width: currentWidth, height: currentHeight }}>
                                                        <span className="page-number-watermark">{pageNum}</span>
                                                    </div>
                                                )}
                                                <div className="page-footer">{pageNum}</div>
                                            </div>
                                        );
                                    })}
                                </HTMLFlipBook>
                            ) : (
                                <div className="loader">Analyzing PDF Pages...</div>
                            )}
                        </Document>
                    ) : (
                        <div className="loader">Fetching Book File...</div>
                    )}
                </div>

                {/* Navigation Arrows */}
                <button className="nav-btn prev" onClick={() => flipBookRef.current.pageFlip().flipPrev()}>
                    ‹
                </button>
                <button className="nav-btn next" onClick={() => flipBookRef.current.pageFlip().flipNext()}>
                    ›
                </button>
            </main>
        </div>
    );
};

export default BookReaderPage;
