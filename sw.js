// sw.js – Service Worker con Background Sync

// ==================== FIREBASE CONFIG ====================
importScripts("https://www.gstatic.com/firebasejs/10.12.2/firebase-app-compat.js");
importScripts("https://www.gstatic.com/firebasejs/10.12.2/firebase-messaging-compat.js");

firebase.initializeApp({
  apiKey: "AIzaSyBIwXyfVtegK6xiJq81aO3S7GjJyNYf3Po",
  authDomain: "fir-3e617.firebaseapp.com",
  projectId: "fir-3e617",
  messagingSenderId: "37080394932",
  appId: "1:37080394932:web:3be6f91fde3e279928bbe1"
});

const messaging = firebase.messaging();

// ==================== CACHE CONFIG ====================
const CACHE_NAME = "narvaez-cache-v1";
const URLS_TO_CACHE = [
  "/",
  "/index.html",
  "/home-camarera.html",
  "/css/styles.css",
  "/js/home-camarera.js",
  "/js/login.js",
  "/js/offline-incidencias.js",
  "/js/pouchdb-config.js",
  "/env.js",
  "/manifest.json"
];

// ==================== INSTALL ====================
self.addEventListener("install", (event) => {
  console.log("✅ SW instalado");
  event.waitUntil(
    caches.open(CACHE_NAME).then((cache) => cache.addAll(URLS_TO_CACHE))
  );
  self.skipWaiting();
});

// ==================== ACTIVATE ====================
self.addEventListener("activate", (event) => {
  console.log("✅ SW activado");
  event.waitUntil(self.clients.claim());
});

// ==================== FETCH ====================
self.addEventListener("fetch", (event) => {
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

// ==================== BACKGROUND SYNC ====================

/**
 * SYNC para incidencias con fotos
 */
self.addEventListener("sync", (event) => {
  console.log("🔄 Sync event:", event.tag);

  if (event.tag === "sync-incidencias") {
    event.waitUntil(
      notificarClientes({ action: "SYNC_INCIDENCIAS" })
    );
  }

  if (event.tag === "sync-cambios") {
    event.waitUntil(enviarCambiosPendientes());
  }
});

/**
 * Notifica a todos los clientes abiertos
 */
async function notificarClientes(mensaje) {
  const clients = await self.clients.matchAll({ type: 'window' });
  
  if (clients.length === 0) {
    console.warn("⚠️ No hay clientes activos");
    return;
  }

  clients.forEach(client => {
    console.log("📨 Enviando mensaje a cliente:", mensaje);
    client.postMessage(mensaje);
  });
}

/**
 * Sincroniza cambios de estados (tu código original)
 */
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
            body: JSON.stringify(item.body)
          });
        } catch (err) {
          console.warn("❌ No se pudo sincronizar cambio de estado");
          return;
        }
      }

      store.clear();
      console.log("✅ Cola de cambios sincronizada");
    };
  };
}

// ==================== NOTIFICACIONES PUSH ====================
messaging.onBackgroundMessage(payload => {
  console.log("📬 Notificación en segundo plano:", payload);

  const notificationTitle = payload.data?.title || "Nueva notificación";
  const notificationOptions = {
    body: payload.data?.body || "",
    icon: "/img/icon-192.png",
    badge: "/img/icon-192.png",
    vibrate: [200, 100, 200]
  };

  self.registration.showNotification(notificationTitle, notificationOptions);
});

// ==================== MESSAGE HANDLER ====================
self.addEventListener("message", (event) => {
  console.log("📨 Mensaje recibido en SW:", event.data);

  if (event.data && event.data.type === "SAVE_OFFLINE") {
    guardarEnCola(event.data.payload);
  }
});

/**
 * Guarda operaciones en cola de IndexedDB
 */
function guardarEnCola(data) {
  return new Promise((resolve) => {
    self.registration.sync.register("sync-cambios");
    const req = indexedDB.open("narvaez-db", 1);

    req.onupgradeneeded = () => {
      req.result.createObjectStore("cola", { autoIncrement: true });
    };

    req.onsuccess = () => {
      const db = req.result;
      const tx = db.transaction("cola", "readwrite");
      tx.objectStore("cola").add(data);
      resolve();
    };
  });
}