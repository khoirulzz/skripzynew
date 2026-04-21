import { initializeApp, getApps, getApp } from "firebase/app";
import { getAuth } from "firebase/auth";
import { getFirestore } from "firebase/firestore";

const firebaseConfig = {
    apiKey: "AIzaSyB2YYmDJHpb3Ou8GZzpYWc-b0CuBx4nLJQ",
    authDomain: "skripzy-4fbaa.firebaseapp.com",
    projectId: "skripzy-4fbaa",
    storageBucket: "skripzy-4fbaa.appspot.com",
    messagingSenderId: "614571470693",
    appId: "1:614571470693:web:b39a2839291c396d15fb8c",
    measurementId: "G-7TSE1FFB8H"
};

// Initialize Firebase only if it hasn't been initialized (to avoid Next.js hot-reload issues)
const app = !getApps().length ? initializeApp(firebaseConfig) : getApp();
const auth = getAuth(app);
const db = getFirestore(app);

export { app, auth, db };
