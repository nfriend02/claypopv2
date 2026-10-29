// Firebase web app config (public identifiers; access is enforced by Auth + security rules)
export const firebaseConfig = {
  apiKey: 'AIzaSyAxZ6hXCOeE_SKbibX0nIgpdM40a1Gzon0',
  authDomain: 'claypopv2.firebaseapp.com',
  projectId: 'claypopv2',
  storageBucket: 'claypopv2.firebasestorage.app',
  messagingSenderId: '573426202926',
  appId: '1:573426202926:web:9bc3e8caa0d1b8ab1422bf',
  measurementId: 'G-HNWY0TTEWZ'
};

// Phone accounts sign in with "mobile number : password" (no SMS). Each E.164 number maps to a
// synthetic Email/Password account on this domain, e.g. +821012345678 -> 821012345678@phone.claypopv2.app
export const PHONE_LOGIN_DOMAIN = 'phone.claypopv2.app';
