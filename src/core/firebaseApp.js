// src/core/firebaseApp.js
// Single Firebase app instance shared by Auth, Firestore, Storage and Analytics

import { initializeApp } from 'firebase/app';
import { getAuth } from 'firebase/auth';
import { getFirestore } from 'firebase/firestore';
import { getStorage } from 'firebase/storage';
import { getAnalytics, isSupported as analyticsSupported } from 'firebase/analytics';
import { firebaseConfig } from '../config/firebaseConfig.js';

export const app = initializeApp(firebaseConfig);
export const fbAuth = getAuth(app);
export const db = getFirestore(app);
export const storage = getStorage(app);

analyticsSupported()
  .then((ok) => { if (ok && import.meta.env.PROD) getAnalytics(app); })
  .catch(() => {});
