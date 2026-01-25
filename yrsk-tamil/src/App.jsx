import './App.css';
import { useCollection } from 'react-firebase-hooks/firestore';
import { db } from './firebase';
import { collection, query, where } from 'firebase/firestore';

function App() {
  // Use IST (Indian Standard Time) consistently for date queries
  // IST is UTC+5:30, so we need to get the current time in IST
  const now = new Date();
  // Convert to IST by adding 5:30 hours offset
  const istOffset = 5.5 * 60 * 60 * 1000; // 5:30 in milliseconds
  const utcTime = now.getTime() + (now.getTimezoneOffset() * 60 * 1000);
  const istTime = new Date(utcTime + istOffset);

  const day = istTime.toISOString().slice(0, 10); // YYYY-MM-DD in IST
  const start = `${day} 00:00:00`;
  const end = `${day} 23:59:59`;
  const q = query(collection(db, 'quotes'), where('date', '>=', start), where('date', '<=', end));
  const [value, loading, error] = useCollection(q);

  console.log('IST Today bounds:', start, end);
  console.log('Loading:', loading);
  console.log('Error:', error);
  console.log('Data:', value);

  if (loading) return <div className="status">Loading...</div>;
  if (error) return <div className="status status-error">Error: {error.message}</div>;

  // Get the first quote from today
  const quote = value?.docs[0]?.data();
  console.log('Quote:', quote);

  if (!quote) return <div className="status status-error">No quote found for today. Check Firestore "quotes" collection and ensure "date" is stored like "YYYY-MM-DD 00:00:00".</div>;

  // Map fields with fallbacks
  const title = quote.title || "Today's Blessing";
  const body = quote.text || quote.quote || '';
  const imageUrl = quote.imageUrl || quote.image || quote.photo || quote.url || '';
  const tamil = quote.tamilText || quote.tamil || '';
  const dateText = quote.date || day;

  // Format date/time/day for display (IST) in Tamil
  let formattedDateLine = dateText;
  try {
    const parsed = new Date(dateText.replace(' ', 'T'));
    const tamilMonths = ['ஜனவரி', 'பிப்ரவரி', 'மார்ச்', 'ஏப்ரல்', 'மே', 'ஜூன்', 'ஜூலை', 'ஆகஸ்ட்', 'செப்டம்பர்', 'அக்டோபர்', 'நவம்பர்', 'டிசம்பர்'];
    const tamilDays = ['ஞாயிற்றுக்கிழமை', 'திங்கட்கிழமை', 'செவ்வாய்கிழமை', 'புதன்கிழமை', 'வியாழக்கிழமை', 'வெள்ளிக்கிழமை', 'சனிக்கிழமை'];

    const day = parsed.getDate();
    const month = tamilMonths[parsed.getMonth()];
    const year = parsed.getFullYear();
    const dayName = tamilDays[parsed.getDay()];

    const optsTime = { hour: '2-digit', minute: '2-digit', hour12: true, timeZone: 'Asia/Kolkata' };
    const prettyTime = parsed.toLocaleTimeString('en-US', optsTime);

    formattedDateLine = `${month} ${day}, ${year} | ${prettyTime} IST | ${dayName}`;
  } catch (e) {
    console.warn('Date parse failed, using raw', dateText);
  }

  return (
    <div className="page">
      <header className="hero">
        <div className="brand">'யோகி ராம்சுரத்குமார்'</div>
        <div className="subtitle">இன்றைய ஆசீர்வாதம்</div>
      </header>

      <div className="date-row">{formattedDateLine}</div>

      <main className="card">

        <div className="quote-box">
          <div className="quote-title">{title}</div>
          <div className="quote-body">{body}</div>
        </div>

        <div className="image-box">
          {imageUrl ? (
            <img className="blessing-img" src={imageUrl} alt="Yogi Ramsuratkumar" />
          ) : null}
          {tamil ? <div className="tamil-text">{tamil}</div> : null}
        </div>
      </main>
    </div>
  );
}

export default App
