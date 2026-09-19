import { initializeApp } from 'firebase/app';
import { getAuth, GoogleAuthProvider, signInWithPopup } from 'firebase/auth';

// ⬇️ ВСТАВЬ сюда свой web-config из Firebase Console:
// Project settings → General → Your apps → Web app → SDK setup and configuration.
// Значения тут ПУБЛИЧНЫЕ (не секрет) — их можно коммитить.
export const firebaseConfig = {
  apiKey: 'AIzaSyBuaZjZKLGYHdwD2B5e-A8kW7Mh322vXP8',
  authDomain: 'levelup-1c059.firebaseapp.com',
  projectId: 'levelup-1c059',
  storageBucket: 'levelup-1c059.firebasestorage.app',
  messagingSenderId: '436397755185',
  appId: '1:436397755185:web:f803a2fd950f55424b3e10',
  measurementId: 'G-RWCK0B6TXP',
};

export const firebaseReady = Boolean(firebaseConfig.apiKey && firebaseConfig.projectId);

let auth = null;
if (firebaseReady) {
  auth = getAuth(initializeApp(firebaseConfig));
}

/** Открывает popup Google, возвращает Google ID-token для проверки на бэке. */
export async function signInWithGoogle() {
  if (!firebaseReady) {
    const e = new Error('firebase-not-configured');
    e.code = 'firebase-not-configured';
    throw e;
  }
  const result = await signInWithPopup(auth, new GoogleAuthProvider());
  const cred = GoogleAuthProvider.credentialFromResult(result);
  return cred.idToken;
}
