// Import the functions you need from the SDKs you need
import { getApp, getApps, initializeApp } from 'firebase/app';
import { getFirestore } from 'firebase/firestore';
// TODO: Add SDKs for Firebase products that you want to use
// https://firebase.google.com/docs/web/setup#available-libraries

// Your web app's Firebase configuration
const firebaseConfig = {
  apiKey: 'AIzaSyARM8Na_iCXtb3DHH1yyS7UtCoZoV9sNSI',
  authDomain: 'watchlist-1f961.firebaseapp.com',
  projectId: 'watchlist-1f961',
  storageBucket: 'watchlist-1f961.firebasestorage.app',
  messagingSenderId: '650368805154',
  appId: '1:650368805154:web:ba90980eabe484617b9d7b',
};

const app = initializeApp(firebaseConfig);
const db = getFirestore(app);

export { app, db };
