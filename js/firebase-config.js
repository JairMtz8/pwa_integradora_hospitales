// =============================
//  CONFIGURACIÓN DE FIREBASE
// =============================
firebase.initializeApp({
  apiKey: "AIzaSyBIwXyfVtegK6xiJq81aO3S7GjJyNYf3Po",
  authDomain: "fir-3e617.firebaseapp.com",
  projectId: "fir-3e617",
  storageBucket: "fir-3e617.appspot.com",
  messagingSenderId: "37080394932",
  appId: "1:37080394932:web:3be6f91fde3e279928bbe1"
});

// Crear instancia global de Messaging
const messaging = firebase.messaging();

// ❌ NO PONER getToken() AQUÍ
// ❌ NO registrar SW aquí
// Todo eso va SOLO en home.js para recepción
