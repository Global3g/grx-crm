import { initializeApp } from 'firebase/app';
import { getFirestore } from 'firebase/firestore';
import { getAuth } from 'firebase/auth';

const firebaseConfig = {
  apiKey: "AIzaSyDIhm6U1Ou2Gm99lr_Zzlce-8r5L2bhCnM",
  authDomain: "grx-crm.firebaseapp.com",
  projectId: "grx-crm",
  storageBucket: "grx-crm.firebasestorage.app",
  messagingSenderId: "743985678551",
  appId: "1:743985678551:web:a4236c717568177d3a0892"
};

// Initialize Firebase
const app = initializeApp(firebaseConfig);

// Initialize services
export const db = getFirestore(app);
export const auth = getAuth(app);
