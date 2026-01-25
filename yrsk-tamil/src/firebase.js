import { initializeApp } from "firebase/app";
import { getFirestore } from "firebase/firestore";
import { getStorage } from "firebase/storage";

const firebaseConfig = {
  apiKey: "AIzaSyAMx_56lPERjjW3z6Avix6XlWEqpWez3EA",
  authDomain: "yrsk-divya-vani-tamil.firebaseapp.com",
  projectId: "yrsk-divya-vani-tamil",
  storageBucket: "yrsk-divya-vani-tamil.firebasestorage.app",
  messagingSenderId: "55924670496",
  appId: "1:55924670496:web:e8ce97648038f9e9767c45",
  measurementId: "G-SFLK25SG2E"
};

const app = initializeApp(firebaseConfig);
export const db = getFirestore(app);
export const storage = getStorage(app);

console.log("Firebase initialized successfully with project:", firebaseConfig.projectId);