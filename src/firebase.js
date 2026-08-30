import { initializeApp } from "firebase/app";
import { getAuth } from "firebase/auth";
import { getFirestore } from "firebase/firestore";

const firebaseConfig = {
  apiKey: "AIzaSyDmFNxdTxvOJfqefXGyBdQX_ATSbgqVksY",
  authDomain: "disaster-guide-62c48.firebaseapp.com",
  projectId: "disaster-guide-62c48",
  storageBucket: "disaster-guide-62c48.firebasestorage.app",
  messagingSenderId: "103135397912",
  appId: "1:103135397912:web:a3d1688504d90688b59b6d"
};

const app = initializeApp(firebaseConfig);

export const auth = getAuth(app);
export const db = getFirestore(app);