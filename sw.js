// sw.js – OFFLINE + BACKGROUND SYNC

const CACHE_NAME = "narvaez-cache-v1";
const URLS_TO_CACHE = [
  "/",
  "/index.html",
  "/home-camarera.html",
  "/css/styles.css",
  "/js/home-camarera.js",
  "/js/login.js",
  "/env.js",
  "/manifest.json"
];

// Instalación → Cacheo inicial
self.addEventListener("install", (event) => {
  console.log("SW instalado");
  event.waitUntil(
    caches.open(CACHE_NAME).then((cache) => cache.addAll(URLS_TO_CACHE))
  );
  self.skipWaiting();
});

// Activación
self.addEventListener("activate", (event) => {
  console.log("SW activado");
  return self.clients.claim();
});

// Interceptamos todas las peticiones (fetch)
self.addEventListener("fetch", (event) => {
  const url = event.request.url;

  // 🔹 Si es GET → intentar cache-first
  if (event.request.method === "GET") {
    event.respondWith(
      caches.match(event.request).then((cached) => {
        return (
          cached ||
          fetch(event.request).catch(() => {
            return caches.match("/home-camarera.html");
          })
        );
      })
    );
  }
});

// =========================
// Cola Offline en IndexedDB
// =========================

function guardarEnCola(data) {
  return new Promise((res) => {
    self.registration.sync.register("sync-cambios");
    const req = indexedDB.open("narvaez-db", 1);

    req.onupgradeneeded = () => {
      req.result.createObjectStore("cola", { autoIncrement: true });
    };

    req.onsuccess = () => {
      const db = req.result;
      const tx = db.transaction("cola", "readwrite");
      tx.objectStore("cola").add(data);
      res();
    };
  });
}

// Escuchar mensajes del cliente
self.addEventListener("message", (event) => {
  if (event.data && event.data.type === "SAVE_OFFLINE") {
    guardarEnCola(event.data.payload);
  }
});

// =============
// BACKGROUND SYNC
// =============
self.addEventListener("sync", (event) => {
  if (event.tag === "sync-cambios") {
    event.waitUntil(enviarCambiosPendientes());
  }
});

// =============
// SYNC DE FOTOS PARA INCIDENCIAS
// =============
self.addEventListener("sync", (event) => {
  if (event.tag === "sync-incidencias") {
    event.waitUntil(
      self.clients.matchAll().then(clients => {
        return clients[0].postMessage({ action: "SYNC_INCIDENCIAS" });
      })
    );
  }
});

// Enviar cola al backend cuando vuelva Internet
async function enviarCambiosPendientes() {
  const req = indexedDB.open("narvaez-db", 1);

  req.onupgradeneeded = () => {
    req.result.createObjectStore("cola", { autoIncrement: true });
  };

  req.onsuccess = async () => {
    const db = req.result;
    const tx = db.transaction("cola", "readwrite");
    const store = tx.objectStore("cola");

    const getAll = store.getAll();

    getAll.onsuccess = async () => {
      const items = getAll.result;

      for (const item of items) {
        try {
          await fetch(item.url, {
            method: item.method,
            headers: { "Content-Type": "application/json" },
            body: JSON.stringify(item.body),
          });
        } catch (err) {
          console.warn("No se pudo sincronizar, se intentará luego.");
          return; // Detener, seguir en siguiente sync
        }
      }

      // Si todo salió bien limpiar cola
      store.clear();
    };
  };
}


// sw.js

// Importar Firebase compat (solo funciona con compat)
importScripts("https://www.gstatic.com/firebasejs/10.12.2/firebase-app-compat.js");
importScripts("https://www.gstatic.com/firebasejs/10.12.2/firebase-messaging-compat.js");

firebase.initializeApp({
  apiKey: "AIzaSyBIwXyfVtegK6xiJq81aO3S7GjJyNYf3Po",
  authDomain: "fir-3e617.firebaseapp.com",
  projectId: "fir-3e617",
  messagingSenderId: "37080394932",
  appId: "1:37080394932:web:3be6f91fde3e279928bbe1"
});

// Habilitar mensajes en segundo plano
const messaging = firebase.messaging();

messaging.onBackgroundMessage(payload => {
  console.log("Notificación en segundo plano:", payload);

  self.registration.showNotification(
    payload.data.title,
    {
      body: payload.data.body,
      icon: "/img/icon-192.png" // tu ícono si tienes uno
    }
  );
});
