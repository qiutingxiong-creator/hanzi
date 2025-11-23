import { initializeApp } from "firebase/app";
import { getFirestore } from "firebase/firestore";

// 您刚才提供的配置信息
const firebaseConfig = {
  apiKey: "AIzaSyA5q760qD5nN4Jp8i70z4sudY7HBIEMrC4",
  authDomain: "hanzi-a1d84.firebaseapp.com",
  projectId: "hanzi-a1d84",
  storageBucket: "hanzi-a1d84.firebasestorage.app",
  messagingSenderId: "1056302111936",
  appId: "1:1056302111936:web:ac465b6ab5279703b8a125",
  measurementId: "G-D5TDVD9727"
};

// 初始化 Firebase

let app;
try {
  app = initializeApp(firebaseConfig);
} catch (e) {
  console.warn("Firebase 初始化异常:", e);
}

export const db = app ? getFirestore(app) : null;