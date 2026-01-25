import { useState, useEffect } from 'react';
import { Link } from 'react-router-dom';
import { getBooks, getMostViewedBooks } from '../services/namaService';
import { useToast } from '../context/ToastContext';
import './BookshelfPage.css';

const BookshelfPage = () => {
    const { error } = useToast();
    const [books, setBooks] = useState([]);
    const [mostViewed, setMostViewed] = useState([]);
    const [loading, setLoading] = useState(true);
    const [filters, setFilters] = useState({
        year: '',
        month: '',
        language: '',
        country: '',
        edition_type: ''
    });

    const [filterOptions, setFilterOptions] = useState({
        years: [],
        months: [],
        languages: [],
        countries: [],
        types: []
    });

    useEffect(() => {
        loadData();
    }, []);

    useEffect(() => {
        loadBooksFiltered();
    }, [filters]);

    const loadData = async () => {
        try {
            const [allBooks, popular] = await Promise.all([
                getBooks(),
                getMostViewedBooks(5)
            ]);
            setBooks(allBooks);
            setMostViewed(popular);
            extractFilterOptions(allBooks);
        } catch (err) {
            console.error('Error loading library:', err);
            error('Failed to load library');
        } finally {
            setLoading(false);
        }
    };

    const loadBooksFiltered = async () => {
        try {
            // Only apply filters if at least one is selected
            const hasFilters = Object.values(filters).some(val => val !== '');
            if (!hasFilters) {
                // If we already have initial data, we might need to reload if "allBooks" state isn't preserved separately. 
                // For simplicity, let's just re-fetch all. Efficient enough for now.
                const all = await getBooks();
                setBooks(all);
            } else {
                // Filter out empty strings
                const activeFilters = Object.fromEntries(
                    Object.entries(filters).filter(([_, v]) => v !== '')
                );
                const filtered = await getBooks(activeFilters);
                setBooks(filtered);
            }
        } catch (err) {
            console.error('Error filtering books:', err);
        }
    };

    const extractFilterOptions = (data) => {
        const years = [...new Set(data.map(b => b.year).filter(Boolean))].sort().reverse();
        const months = [...new Set(data.map(b => b.month).filter(Boolean))].sort();
        const languages = [...new Set(data.map(b => b.language).filter(Boolean))].sort();
        const countries = [...new Set(data.map(b => b.country).filter(Boolean))].sort();
        const types = [...new Set(data.map(b => b.edition_type).filter(Boolean))].sort();

        setFilterOptions({ years, months, languages, countries, types });
    };

    const handleFilterChange = (key, value) => {
        setFilters(prev => ({ ...prev, [key]: value }));
    };

    const clearFilters = () => {
        setFilters({ year: '', month: '', language: '', country: '', edition_type: '' });
    };

    return (
        <div className="bookshelf-page page-enter">
            <header className="bookshelf-header">
                <div className="container">
                    <Link to="/" className="back-link">
                        <svg xmlns="http://www.w3.org/2000/svg" width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
                            <line x1="19" y1="12" x2="5" y2="12" />
                            <polyline points="12 19 5 12 12 5" />
                        </svg>
                        Back to Home
                    </Link>
                    <h1>Digital Library</h1>
                    <p>Explore our collection of devotional readings and monthly editions.</p>
                </div>
            </header>

            <main className="bookshelf-main container">
                {/* Featured Section */}
                {mostViewed.length > 0 && !Object.values(filters).some(Boolean) && (
                    <section className="featured-shelf">
                        <h2>Most Viewed</h2>
                        <div className="shelf-scroll">
                            {mostViewed.map(book => (
                                <a href={`/books/${book.id}`} key={book.id} className="book-card featured" target="_blank" rel="noopener noreferrer">
                                    <div className="book-cover">
                                        <div className="book-spine"></div>
                                        <div className="book-content">
                                            <h3>{book.title}</h3>
                                            <div className="book-meta">
                                                <span>{book.month} {book.year}</span>
                                            </div>
                                        </div>
                                    </div>
                                    <div className="book-details">
                                        <h4>{book.title}</h4>
                                        <span className="view-count">👁 {book.view_count} reads</span>
                                    </div>
                                </a>
                            ))}
                        </div>
                    </section>
                )}

                {/* Filters */}
                <section className="library-controls">
                    <div className="filter-bar">
                        <select value={filters.year} onChange={(e) => handleFilterChange('year', e.target.value)}>
                            <option value="">All Years</option>
                            {filterOptions.years.map(y => <option key={y} value={y}>{y}</option>)}
                        </select>
                        <select value={filters.month} onChange={(e) => handleFilterChange('month', e.target.value)}>
                            <option value="">All Months</option>
                            {filterOptions.months.map(m => <option key={m} value={m}>{m}</option>)}
                        </select>
                        <select value={filters.language} onChange={(e) => handleFilterChange('language', e.target.value)}>
                            <option value="">All Languages</option>
                            {filterOptions.languages.map(l => <option key={l} value={l}>{l}</option>)}
                        </select>
                        <select value={filters.country} onChange={(e) => handleFilterChange('country', e.target.value)}>
                            <option value="">All Countries</option>
                            {filterOptions.countries.map(c => <option key={c} value={c}>{c}</option>)}
                        </select>
                        <select value={filters.edition_type} onChange={(e) => handleFilterChange('edition_type', e.target.value)}>
                            <option value="">All Types</option>
                            {filterOptions.types.map(t => <option key={t} value={t}>{t}</option>)}
                        </select>

                        {Object.values(filters).some(Boolean) && (
                            <button className="btn btn-ghost btn-sm" onClick={clearFilters}>
                                Clear Filters
                            </button>
                        )}
                    </div>
                </section>

                {/* Main Grid */}
                <section className="library-grid">
                    {loading ? (
                        <div className="loading-state">
                            <span className="loader"></span>
                        </div>
                    ) : books.length === 0 ? (
                        <div className="empty-state">
                            <p>No books found matching your criteria.</p>
                        </div>
                    ) : (
                        <div className="books-grid">
                            {books.map(book => (
                                <a href={`/books/${book.id}`} key={book.id} className="book-card" target="_blank" rel="noopener noreferrer">
                                    <div className="book-cover plain">
                                        <div className="book-spine"></div>
                                        <div className="book-content">
                                            <h3>{book.title}</h3>
                                            <div className="book-meta">
                                                <span>{book.month} {book.year}</span>
                                            </div>
                                        </div>
                                    </div>
                                    <div className="book-details">
                                        <h4>{book.title}</h4>
                                        <div className="book-sub-info">
                                            <span>{book.language}</span> • <span>{book.edition_type}</span>
                                        </div>
                                        <span className="location-tag">{book.city}, {book.country}</span>
                                    </div>
                                </a>
                            ))}
                        </div>
                    )}
                </section>
            </main>
        </div>
    );
};

export default BookshelfPage;
