import { useState } from 'react';
import { Link } from 'react-router-dom';
import { databases, ID, DATABASE_ID, COLLECTIONS } from '../appwriteClient';
import './SatsangSubmitPage.css';

const PLATFORMS = ['Google Meet', 'Zoom', 'Microsoft Teams', 'WhatsApp', 'YouTube Live', 'namavruksha.org', 'Other'];
const FREQUENCIES = ['One-time', 'Daily', 'Weekly', 'Monthly'];
const COUNTRIES = [
    'India', 'USA', 'UK', 'Canada', 'Australia', 'Singapore', 'Malaysia',
    'UAE', 'Germany', 'France', 'Netherlands', 'Sweden', 'New Zealand',
    'South Africa', 'Sri Lanka', 'Global', 'Other'
];

const SatsangSubmitPage = () => {
    const [form, setForm] = useState({
        event_name: '',
        country: '',
        event_datetime: '',
        sankalpa: '',
        frequency: 'One-time',
        platform: '',
        host_name: '',
        meeting_url: '',
    });
    const [submitting, setSubmitting] = useState(false);
    const [submitted, setSubmitted] = useState(false);
    const [errors, setErrors] = useState({});

    const handleChange = (e) => {
        const { name, value } = e.target;
        setForm(prev => ({ ...prev, [name]: value }));
        if (errors[name]) setErrors(prev => ({ ...prev, [name]: '' }));
    };

    const validate = () => {
        const errs = {};
        if (!form.event_name.trim()) errs.event_name = 'Event name is required';
        if (!form.country) errs.country = 'Country is required';
        if (!form.event_datetime) errs.event_datetime = 'Date and time is required';
        if (!form.platform) errs.platform = 'Platform is required';
        if (!form.host_name.trim()) errs.host_name = 'Host name is required';
        if (!form.frequency) errs.frequency = 'Frequency is required';
        return errs;
    };

    const handleSubmit = async (e) => {
        e.preventDefault();
        const errs = validate();
        if (Object.keys(errs).length > 0) { setErrors(errs); return; }

        setSubmitting(true);
        try {
            await databases.createDocument(
                DATABASE_ID,
                COLLECTIONS.SATSANG_EVENTS,
                ID.unique(),
                {
                    event_name: form.event_name.trim(),
                    country: form.country,
                    event_datetime: form.event_datetime,
                    sankalpa: form.sankalpa.trim() || '',
                    frequency: form.frequency,
                    platform: form.platform,
                    host_name: form.host_name.trim(),
                    meeting_url: form.meeting_url.trim() || '',
                    status: 'Upcoming',
                    is_active: false,   // ← pending admin approval
                    created_at: new Date().toISOString()
                }
            );
            setSubmitted(true);
        } catch (err) {
            console.error('Submit error:', err);
            setErrors({ submit: 'Failed to submit. Please try again.' });
        } finally {
            setSubmitting(false);
        }
    };

    if (submitted) {
        return (
            <div className="submit-page">
                <div className="submit-success-card">
                    <div className="submit-success-icon">🙏</div>
                    <h2>Thank You!</h2>
                    <p>Your satsang event has been submitted for review.</p>
                    <p className="submit-success-note">
                        Once approved by the Namavruksha team, it will appear on the Global Satsang page for all devotees to see and join.
                    </p>
                    <p className="submit-success-note">
                        <strong>If your meeting link is dynamic</strong> (generated closer to the session), you can submit it again once you have it — just fill in the same event details with the updated link.
                    </p>
                    <div className="submit-success-btns">
                        <Link to="/satsang" className="submit-back-btn">← View All Events</Link>
                        <button className="submit-another-btn" onClick={() => { setSubmitted(false); setForm({ event_name: '', country: '', event_datetime: '', sankalpa: '', frequency: 'One-time', platform: '', host_name: '', meeting_url: '' }); }}>
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
                <p className="submit-subtitle">
                    Share your online chanting session with the global Namavruksha community.
                    All events are reviewed before going live.
                </p>
            </header>

            <div className="submit-container">
                <div className="submit-info-box">
                    <strong>📌 For hosts with dynamic meeting links:</strong> Submit your event details now. Once your meeting link is generated (even 30 minutes before), simply submit again with the updated URL — our team will approve it promptly.
                </div>

                <form className="submit-form" onSubmit={handleSubmit}>

                    {/* Row 1 */}
                    <div className="submit-row">
                        <div className="submit-field">
                            <label className="submit-label">Event Name <span className="req">*</span></label>
                            <input
                                type="text"
                                name="event_name"
                                value={form.event_name}
                                onChange={handleChange}
                                className={`submit-input ${errors.event_name ? 'input-error' : ''}`}
                                placeholder="e.g. Morning Nama Japa — Chennai Group"
                            />
                            {errors.event_name && <span className="field-error">{errors.event_name}</span>}
                        </div>
                        <div className="submit-field">
                            <label className="submit-label">Host Name <span className="req">*</span></label>
                            <input
                                type="text"
                                name="host_name"
                                value={form.host_name}
                                onChange={handleChange}
                                className={`submit-input ${errors.host_name ? 'input-error' : ''}`}
                                placeholder="Your name"
                            />
                            {errors.host_name && <span className="field-error">{errors.host_name}</span>}
                        </div>
                    </div>

                    {/* Row 2 */}
                    <div className="submit-row">
                        <div className="submit-field">
                            <label className="submit-label">Country <span className="req">*</span></label>
                            <select name="country" value={form.country} onChange={handleChange} className={`submit-input ${errors.country ? 'input-error' : ''}`}>
                                <option value="">Select country</option>
                                {COUNTRIES.map(c => <option key={c} value={c}>{c}</option>)}
                            </select>
                            {errors.country && <span className="field-error">{errors.country}</span>}
                        </div>
                        <div className="submit-field">
                            <label className="submit-label">Platform <span className="req">*</span></label>
                            <select name="platform" value={form.platform} onChange={handleChange} className={`submit-input ${errors.platform ? 'input-error' : ''}`}>
                                <option value="">Select platform</option>
                                {PLATFORMS.map(p => <option key={p} value={p}>{p}</option>)}
                            </select>
                            {errors.platform && <span className="field-error">{errors.platform}</span>}
                        </div>
                    </div>

                    {/* Row 3 */}
                    <div className="submit-row">
                        <div className="submit-field">
                            <label className="submit-label">Event Date & Time (IST) <span className="req">*</span></label>
                            <input
                                type="datetime-local"
                                name="event_datetime"
                                value={form.event_datetime}
                                onChange={handleChange}
                                className={`submit-input ${errors.event_datetime ? 'input-error' : ''}`}
                            />
                            <span className="field-hint">Enter in India Standard Time (IST). GMT and EST will be shown automatically.</span>
                            {errors.event_datetime && <span className="field-error">{errors.event_datetime}</span>}
                        </div>
                        <div className="submit-field">
                            <label className="submit-label">Frequency <span className="req">*</span></label>
                            <select name="frequency" value={form.frequency} onChange={handleChange} className={`submit-input ${errors.frequency ? 'input-error' : ''}`}>
                                {FREQUENCIES.map(f => <option key={f} value={f}>{f}</option>)}
                            </select>
                            {errors.frequency && <span className="field-error">{errors.frequency}</span>}
                        </div>
                    </div>

                    {/* Row 4 */}
                    <div className="submit-row">
                        <div className="submit-field">
                            <label className="submit-label">Meeting URL <span className="optional-tag">optional — can add later</span></label>
                            <input
                                type="url"
                                name="meeting_url"
                                value={form.meeting_url}
                                onChange={handleChange}
                                className="submit-input"
                                placeholder="https://meet.google.com/... or zoom link"
                            />
                            <span className="field-hint">Leave blank if your link is not yet generated. You can resubmit once available.</span>
                        </div>
                        <div className="submit-field">
                            <label className="submit-label">Sankalpa / Purpose <span className="optional-tag">optional</span></label>
                            <input
                                type="text"
                                name="sankalpa"
                                value={form.sankalpa}
                                onChange={handleChange}
                                className="submit-input"
                                placeholder="e.g. 1008 Daily Chanting, World Peace, etc."
                            />
                        </div>
                    </div>

                    {errors.submit && (
                        <div className="submit-error-banner">{errors.submit}</div>
                    )}

                    <div className="submit-actions">
                        <Link to="/satsang" className="submit-cancel">Cancel</Link>
                        <button type="submit" className="submit-btn" disabled={submitting}>
                            {submitting ? (
                                <><span className="loader loader-sm" /> Submitting...</>
                            ) : (
                                '🙏 Submit for Review'
                            )}
                        </button>
                    </div>

                    <p className="submit-disclaimer">
                        Your event will be reviewed by the Namavruksha team and published within a few hours. By submitting, you confirm this is a genuine devotional gathering in the name of Bhagawan Yogi Ramsuratkumar.
                    </p>
                </form>
            </div>
        </div>
    );
};

export default SatsangSubmitPage;
