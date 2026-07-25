// Import the functions you need from the SDKs you need
import { initializeApp, getApps, getApp } from "firebase/app";
import { getAuth } from "firebase/auth";
import { getAnalytics, isSupported } from "firebase/analytics";
// TODO: Add SDKs for Firebase products that you want to use
// https://firebase.google.com/docs/web/setup#available-libraries

// Your web app's Firebase configuration
// For Firebase JS SDK v7.20.0 and later, measurementId is optional
const firebaseConfig = {
  apiKey: "AIzaSyBQD5SyILM2cJTshMYjLquGQIFaNaHcKeU",
  authDomain: "careertrack-fde11.firebaseapp.com",
  projectId: "careertrack-fde11",
  storageBucket: "careertrack-fde11.firebasestorage.app",
  messagingSenderId: "907875215283",
  appId: "1:907875215283:web:c0c119efec91d378c40dc6",
  measurementId: "G-33JX2CY7W2"
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
