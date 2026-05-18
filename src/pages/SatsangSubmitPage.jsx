import { useState } from 'react';
import { Link } from 'react-router-dom';
import { databases, ID, DATABASE_ID, COLLECTIONS } from '../appwriteClient';
import './SatsangSubmitPage.css';

const PLATFORMS  = ['Zoom','Google Meet','Zoho Meet','Microsoft Teams','WhatsApp','YouTube Live','namavruksha.org','Other'];
const FREQUENCIES = ['Daily','Weekly','Monthly','One-time','Every Monday','Every Tuesday','Every Wednesday','Every Thursday','Every Friday','Every Saturday','Every Sunday'];
const COUNTRIES  = ['India','UK','USA','Canada','Australia','Singapore','Malaysia','UAE','Germany','France','Netherlands','Sweden','New Zealand','South Africa','Sri Lanka','Global','Other'];

const TIMEZONES = [
    { label: 'India (IST)',           tz: 'Asia/Kolkata'        },
    { label: 'UK (GMT / BST)',        tz: 'Europe/London'       },
    { label: 'US Eastern (ET)',       tz: 'America/New_York'    },
    { label: 'US Central (CT)',       tz: 'America/Chicago'     },
    { label: 'US Pacific (PT)',       tz: 'America/Los_Angeles' },
    { label: 'UAE (GST)',             tz: 'Asia/Dubai'          },
    { label: 'Singapore (SGT)',       tz: 'Asia/Singapore'      },
    { label: 'Australia — Sydney',    tz: 'Australia/Sydney'    },
    { label: 'Germany (CET/CEST)',    tz: 'Europe/Berlin'       },
];

// Convert local datetime string + IANA timezone → UTC ISO string
const localToUTC = (localDatetime, ianaZone) => {
    if (!localDatetime || !ianaZone) return null;
    // localDatetime is "YYYY-MM-DDTHH:mm" from datetime-local input
    // We interpret it as that time in the given IANA zone
    const [datePart, timePart] = localDatetime.split('T');
    const [year, month, day]   = datePart.split('-').map(Number);
    const [hour, minute]       = timePart.split(':').map(Number);

    // Build a fake UTC date then adjust for the timezone offset
    // Use Intl to find the offset at that local time
    const approxUtc = new Date(Date.UTC(year, month-1, day, hour, minute));
    // Get what UTC time corresponds to this local time in the given zone
    const formatter = new Intl.DateTimeFormat('en-US', {
        timeZone: ianaZone,
        year: 'numeric', month: '2-digit', day: '2-digit',
        hour: '2-digit', minute: '2-digit', hour12: false
    });
    // Binary search for offset — simpler: use the offset difference
    // Get the local time string for approxUtc in the target zone
    const parts = formatter.formatToParts(approxUtc);
    const get = (type) => parseInt(parts.find(p => p.type === type)?.value || '0');
    const tzYear   = get('year');
    const tzMonth  = get('month');
    const tzDay    = get('day');
    const tzHour   = get('hour') === 24 ? 0 : get('hour');
    const tzMinute = get('minute');

    // Difference between what we wanted and what the zone gives us
    const wantedMs = Date.UTC(year, month-1, day, hour, minute);
    const gotMs    = Date.UTC(tzYear, tzMonth-1, tzDay, tzHour, tzMinute);
    const offsetMs = wantedMs - gotMs;

    return new Date(approxUtc.getTime() + offsetMs).toISOString();
};

const SatsangSubmitPage = () => {
    const [form, setForm] = useState({
        event_name: '', country: '', event_datetime: '', event_timezone: 'Asia/Kolkata',
        sankalpa: '', frequency: 'One-time', platform: '', host_name: '', meeting_url: ''
    });
    const [submitting, setSubmitting] = useState(false);
    const [submitted,  setSubmitted]  = useState(false);
    const [errors,     setErrors]     = useState({});

    const handleChange = (e) => {
        const { name, value } = e.target;
        setForm(prev => ({ ...prev, [name]: value }));
        if (errors[name]) setErrors(prev => ({ ...prev, [name]: '' }));
    };

    // Live preview of UTC conversion
    const getUTCPreview = () => {
        if (!form.event_datetime || !form.event_timezone) return null;
        try {
            const utc = localToUTC(form.event_datetime, form.event_timezone);
            if (!utc) return null;
            const d = new Date(utc);
            const ist = new Intl.DateTimeFormat('en-IN', { timeZone:'Asia/Kolkata', day:'2-digit', month:'short', year:'numeric', hour:'2-digit', minute:'2-digit', hour12:true }).format(d) + ' IST';
            const uk  = new Intl.DateTimeFormat('en-GB', { timeZone:'Europe/London', day:'2-digit', month:'short', hour:'2-digit', minute:'2-digit', hour12:false, timeZoneName:'short' }).format(d);
            const us  = new Intl.DateTimeFormat('en-US', { timeZone:'America/Chicago', day:'2-digit', month:'short', hour:'2-digit', minute:'2-digit', hour12:true, timeZoneName:'short' }).format(d);
            return { ist, uk, us };
        } catch { return null; }
    };

    const validate = () => {
        const errs = {};
        if (!form.event_name.trim()) errs.event_name = 'Required';
        if (!form.country)           errs.country    = 'Required';
        if (!form.event_datetime)    errs.event_datetime = 'Required';
        if (!form.event_timezone)    errs.event_timezone = 'Required';
        if (!form.platform)          errs.platform   = 'Required';
        if (!form.host_name.trim())  errs.host_name  = 'Required';
        if (!form.frequency)         errs.frequency  = 'Required';
        return errs;
    };

    const handleSubmit = async (e) => {
        e.preventDefault();
        const errs = validate();
        if (Object.keys(errs).length > 0) { setErrors(errs); return; }

        const utcDateTime = localToUTC(form.event_datetime, form.event_timezone);
        if (!utcDateTime) { setErrors({ submit: 'Could not convert date/time. Please check your entry.' }); return; }

        setSubmitting(true);
        try {
            await databases.createDocument(
                DATABASE_ID, COLLECTIONS.SATSANG_EVENTS, ID.unique(),
                {
                    event_name:     form.event_name.trim(),
                    country:        form.country,
                    event_datetime: utcDateTime,          // stored as UTC
                    event_timezone: form.event_timezone,  // stored for reference
                    sankalpa:       form.sankalpa.trim(),
                    frequency:      form.frequency,
                    platform:       form.platform,
                    host_name:      form.host_name.trim(),
                    meeting_url:    form.meeting_url.trim(),
                    status:         'Upcoming',
                    is_active:      false,
                    created_at:     new Date().toISOString()
                }
            );
            setSubmitted(true);
        } catch (err) {
            console.error(err);
            setErrors({ submit: 'Failed to submit. Please try again.' });
        } finally { setSubmitting(false); }
    };

    const preview = getUTCPreview();
    const tzLabel = TIMEZONES.find(t => t.tz === form.event_timezone)?.label || '';

    if (submitted) {
        return (
            <div className="submit-page">
                <div className="submit-success-card">
                    <div className="submit-success-icon">🙏</div>
                    <h2>Thank You!</h2>
                    <p>Your satsang event has been submitted for review.</p>
                    <p className="submit-success-note">Once approved by the Namavruksha team, it will appear on the Global Satsang page.</p>
                    <p className="submit-success-note"><strong>Dynamic meeting link?</strong> Submit again with the same event details once your link is ready — we'll approve it promptly.</p>
                    <div className="submit-success-btns">
                        <Link to="/satsang" className="submit-back-btn">← View All Events</Link>
                        <button className="submit-another-btn" onClick={() => { setSubmitted(false); setForm({ event_name:'',country:'',event_datetime:'',event_timezone:'Asia/Kolkata',sankalpa:'',frequency:'One-time',platform:'',host_name:'',meeting_url:'' }); }}>
                            + Submit Another
                        </button>
                    </div>
                </div>
            </div>
        );
    }

    return (
        <div className="submit-page">
            <header className="submit-header">
                <Link to="/satsang" className="submit-back-link">← Back to Satsang Events</Link>
                <h1 className="submit-title">🕉 Submit a Satsang Event</h1>
                <p className="submit-subtitle">Share your online chanting session with the global Namavruksha community. All events are reviewed before going live.</p>
            </header>

            <div className="submit-container">
                <div className="submit-info-box">
                    <strong>📌 For hosts with dynamic meeting links:</strong> Submit your event details now without a URL. Once your meeting link is generated (even 30 minutes before), submit again with the updated URL — our team will approve it promptly.
                </div>

                <form className="submit-form" onSubmit={handleSubmit}>
                    <div className="submit-row">
                        <div className="submit-field">
                            <label className="submit-label">Event Name <span className="req">*</span></label>
                            <input type="text" name="event_name" value={form.event_name} onChange={handleChange} className={`submit-input ${errors.event_name?'input-error':''}`} placeholder="e.g. Morning Nama Japa" />
                            {errors.event_name && <span className="field-error">{errors.event_name}</span>}
                        </div>
                        <div className="submit-field">
                            <label className="submit-label">Host Name <span className="req">*</span></label>
                            <input type="text" name="host_name" value={form.host_name} onChange={handleChange} className={`submit-input ${errors.host_name?'input-error':''}`} placeholder="Your name" />
                            {errors.host_name && <span className="field-error">{errors.host_name}</span>}
                        </div>
                    </div>

                    <div className="submit-row">
                        <div className="submit-field">
                            <label className="submit-label">Country <span className="req">*</span></label>
                            <select name="country" value={form.country} onChange={handleChange} className={`submit-input ${errors.country?'input-error':''}`}>
                                <option value="">Select country</option>
                                {COUNTRIES.map(c => <option key={c} value={c}>{c}</option>)}
                            </select>
                            {errors.country && <span className="field-error">{errors.country}</span>}
                        </div>
                        <div className="submit-field">
                            <label className="submit-label">Platform <span className="req">*</span></label>
                            <select name="platform" value={form.platform} onChange={handleChange} className={`submit-input ${errors.platform?'input-error':''}`}>
                                <option value="">Select platform</option>
                                {PLATFORMS.map(p => <option key={p} value={p}>{p}</option>)}
                            </select>
                            {errors.platform && <span className="field-error">{errors.platform}</span>}
                        </div>
                    </div>

                    {/* Timezone selector FIRST, then datetime */}
                    <div className="submit-row">
                        <div className="submit-field">
                            <label className="submit-label">Your Timezone <span className="req">*</span></label>
                            <select name="event_timezone" value={form.event_timezone} onChange={handleChange} className={`submit-input ${errors.event_timezone?'input-error':''}`}>
                                {TIMEZONES.map(t => <option key={t.tz} value={t.tz}>{t.label}</option>)}
                            </select>
                            <span className="field-hint">Select the timezone you are entering the time in</span>
                            {errors.event_timezone && <span className="field-error">{errors.event_timezone}</span>}
                        </div>
                        <div className="submit-field">
                            <label className="submit-label">
                                Date & Time <span className="req">*</span>
                                <span style={{fontSize:'0.75rem',color:'#8b5e00',fontWeight:'400',marginLeft:'6px'}}>in {tzLabel}</span>
                            </label>
                            <input type="datetime-local" name="event_datetime" value={form.event_datetime} onChange={handleChange} className={`submit-input ${errors.event_datetime?'input-error':''}`} />
                            {errors.event_datetime && <span className="field-error">{errors.event_datetime}</span>}
                        </div>
                    </div>

                    {/* Live timezone preview */}
                    {preview && (
                        <div className="tz-preview-box">
                            <p className="tz-preview-title">🌍 How this will appear globally:</p>
                            <div className="tz-preview-grid">
                                <div className="tz-preview-item">
                                    <span className="tz-flag">🇮🇳</span>
                                    <span className="tz-preview-label">India (IST)</span>
                                    <span className="tz-preview-value">{preview.ist}</span>
                                </div>
                                <div className="tz-preview-item">
                                    <span className="tz-flag">🇬🇧</span>
                                    <span className="tz-preview-label">UK (GMT/BST)</span>
                                    <span className="tz-preview-value">{preview.uk}</span>
                                </div>
                                <div className="tz-preview-item">
                                    <span className="tz-flag">🇺🇸</span>
                                    <span className="tz-preview-label">US Central</span>
                                    <span className="tz-preview-value">{preview.us}</span>
                                </div>
                            </div>
                        </div>
                    )}

                    <div className="submit-row">
                        <div className="submit-field">
                            <label className="submit-label">Frequency <span className="req">*</span></label>
                            <select name="frequency" value={form.frequency} onChange={handleChange} className="submit-input">
                                {FREQUENCIES.map(f => <option key={f} value={f}>{f}</option>)}
                            </select>
                        </div>
                        <div className="submit-field">
                            <label className="submit-label">Meeting URL <span className="optional-tag">optional — can add later</span></label>
                            <input type="url" name="meeting_url" value={form.meeting_url} onChange={handleChange} className="submit-input" placeholder="https://zoom.us/... or https://meet.google.com/..." />
                        </div>
                    </div>

                    <div className="submit-field" style={{gridColumn:'span 2'}}>
                        <label className="submit-label">Sankalpa / Purpose <span className="optional-tag">optional</span></label>
                        <input type="text" name="sankalpa" value={form.sankalpa} onChange={handleChange} className="submit-input" placeholder="e.g. 1008 Daily Chanting, World Peace..." />
                    </div>

                    {errors.submit && <div className="submit-error-banner">{errors.submit}</div>}

                    <div className="submit-actions">
                        <Link to="/satsang" className="submit-cancel">Cancel</Link>
                        <button type="submit" className="submit-btn" disabled={submitting}>
                            {submitting ? <><span className="loader loader-sm"/> Submitting...</> : '🙏 Submit for Review'}
                        </button>
                    </div>
                    <p className="submit-disclaimer">Your event will be reviewed and published within a few hours. By submitting, you confirm this is a genuine devotional gathering in the name of Bhagawan Yogi Ramsuratkumar.</p>
                </form>
            </div>
        </div>
    );
};

export default SatsangSubmitPage;
