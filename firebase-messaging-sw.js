// firebase-messaging-sw.js
importScripts("https://www.gstatic.com/firebasejs/10.12.2/firebase-app-compat.js");
importScripts("https://www.gstatic.com/firebasejs/10.12.2/firebase-messaging-compat.js");

firebase.initializeApp({
  apiKey: "AIzaSyBIwXyfVtegK6xiJq81aO3S7GjJyNYf3Po",
  projectId: "fir-3e617",
  storageBucket: "fir-3e617.appspot.com",
  messagingSenderId: "37080394932",
  appId: "1:37080394932:web:3be6f91fde3e279928bbe1"
});

const messaging = firebase.messaging();

messaging.onBackgroundMessage(payload => {
  self.registration.showNotification(payload.data.title, {
    body: payload.data.body,
    icon: "/img/icon-192.png"  // AHORA SIN SUBCARPETA
  });
});
