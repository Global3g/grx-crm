import { initializeApp } from 'firebase/app';
import { getFirestore } from 'firebase/firestore';
import { getAuth } from 'firebase/auth';
import { getStorage } from 'firebase/storage';

const firebaseConfig = {
  apiKey: "AIzaSyD4SnDE04w3KrQ6BfN5V13geRqpYX3vwYU",
  authDomain: "crm-grx.firebaseapp.com",
  projectId: "crm-grx",
  storageBucket: "crm-grx.firebasestorage.app",
  messagingSenderId: "811740510101",
  appId: "1:811740510101:web:4d34dc31058ffcf792689c"
};

// Initialize Firebase
const app = initializeApp(firebaseConfig);

// Initialize services
export const db = getFirestore(app);
export const auth = getAuth(app);
export const storage = getStorage(app);
