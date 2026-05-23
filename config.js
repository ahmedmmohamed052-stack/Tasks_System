// ─────────────────────────────────────────────────────────────
//  firebase/config.js
//  Replace the values below with your actual Firebase project
// ─────────────────────────────────────────────────────────────

import { initializeApp } from "firebase/app";
import { getAuth } from "firebase/auth";
import { getFirestore } from "firebase/firestore";

const firebaseConfig = {
  apiKey: "AIzaSyBzaY33Wi7V_T22EuBk-045WwEtFqTsV4Y",
  authDomain: "tasks-system-ace8a.firebaseapp.com",
  projectId: "tasks-system-ace8a",
  storageBucket: "tasks-system-ace8a.firebasestorage.app",
  messagingSenderId: "357805533325",
  appId: "1:357805533325:web:506703398fe76daacc9ac4",
};

const app = initializeApp(firebaseConfig);

export const auth = getAuth(app);
export const db = getFirestore(app);
