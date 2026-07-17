// Import the functions you need from the SDKs you need
import { initializeApp, getApps, getApp } from "firebase/app";
import { getAuth } from "firebase/auth";
import { getAnalytics, isSupported } from "firebase/analytics";
// TODO: Add SDKs for Firebase products that you want to use
// https://firebase.google.com/docs/web/setup#available-libraries

// Your web app's Firebase configuration
// For Firebase JS SDK v7.20.0 and later, measurementId is optional
const firebaseConfig = {
  apiKey: "AIzaSyBwgIxgTbwfX3ATVw177T7hUjA2Xy8116M",
  authDomain: "career-and-internship-tracker.firebaseapp.com",
  projectId: "career-and-internship-tracker",
  storageBucket: "career-and-internship-tracker.firebasestorage.app",
  messagingSenderId: "842830938221",
  appId: "1:842830938221:web:a90d7fd5a582be7d54ff64",
  measurementId: "G-G0HKV7BHRB"
};

// Initialize Firebase (ensure it's only initialized once)
const app = getApps().length ? getApp() : initializeApp(firebaseConfig);
const auth = getAuth(app);

let analytics: any = null;
if (typeof window !== "undefined") {
  isSupported().then((supported) => {
    if (supported) {
      analytics = getAnalytics(app);
    }
  });
}

export { app, auth, analytics };
