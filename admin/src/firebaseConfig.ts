
import { initializeApp } from "firebase/app";
import { initializeFirestore } from "firebase/firestore";

const firebaseConfig = {
  apiKey: "AIzaSyDIFEwrd8SoSY3VWohb1fK3FmlxDiL2tzA",
  authDomain: "pop-up-cf9ca.firebaseapp.com",
  projectId: "pop-up-cf9ca",
  storageBucket: "pop-up-cf9ca.firebasestorage.app",
  messagingSenderId: "823971264400",
  appId: "1:823971264400:web:14a6ec0e4b58e3fc86a515",
  measurementId: "G-FRXWZWLQGW"
};

const app = initializeApp(firebaseConfig);
export const db = initializeFirestore(app, {
  experimentalForceLongPolling: true,
});
