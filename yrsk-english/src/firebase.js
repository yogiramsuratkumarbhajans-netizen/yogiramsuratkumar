// Import the functions you need from the SDKs you need
import { initializeApp } from "firebase/app";
import { getAnalytics } from "firebase/analytics";
import { getFirestore } from "firebase/firestore";

const firebaseConfig = {
  apiKey: "AIzaSyBypTSxsv-XWZ_YKhvfpn6qCCVv-gU6R0s",
  authDomain: "yrsk-divya-vani-english.firebaseapp.com",
  projectId: "yrsk-divya-vani-english",
  storageBucket: "yrsk-divya-vani-english.firebasestorage.app",
  messagingSenderId: "94717252824",
  appId: "1:94717252824:web:e30a8154f29ac72fbdf3ad",
  measurementId: "G-8C7MT822FB"
};

// Initialize Firebase
const app = initializeApp(firebaseConfig);
const analytics = getAnalytics(app);
export const db = getFirestore(app);