/* ───────── CONFIGURAZIONE FIREBASE ─────────
   Dati del progetto Firebase "dispensa-casa" (vedi GUIDA.md, passo 2).
   Se apiKey è vuoto, l'app funziona solo su questo dispositivo, senza sincronizzazione.
   Questi dati NON sono segreti: la protezione la fanno login + regole di Firestore. */
window.FIREBASE_CONFIG = {
  apiKey: "AIzaSyAm-_b9icEaeDkpNe9QqpRnRpJnNypZanc",
  authDomain: "dispensa-casa-171a5.firebaseapp.com",
  projectId: "dispensa-casa-171a5",
  storageBucket: "dispensa-casa-171a5.firebasestorage.app",
  messagingSenderId: "529994571911",
  appId: "1:529994571911:web:6c7dbf6e5ef0734cda9822"
};
/* Chiave per le notifiche push (Firebase → Impostazioni progetto → Cloud Messaging → Certificati push web) */
window.FIREBASE_VAPID_KEY = "";
