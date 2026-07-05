import { initializeApp } from "firebase/app";
import { getFirestore } from "firebase/firestore";
import { getAuth } from "firebase/auth";

const firebaseConfig = {
  projectId: "gen-lang-client-0151986859",
  appId: "1:955924061054:web:2d5efbf0e4918957bbf12f",
  apiKey: import.meta.env.VITE_FIREBASE_API_KEY || "AIzaSyCMJh2ZnSdX5jBP2cR0GU41uOv2H4f_B-k",
  authDomain: "gen-lang-client-0151986859.firebaseapp.com",
  storageBucket: "gen-lang-client-0151986859.firebasestorage.app",
  messagingSenderId: "955924061054"
};

const app = initializeApp(firebaseConfig);
export const db = getFirestore(app);
export const auth = getAuth(app);
