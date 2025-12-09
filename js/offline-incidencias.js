// offline-incidencias.js
import db from "./pouchdb-config.js";

/**
 * Guarda una incidencia Offline con fotos como attachments
 */
export async function guardarIncidenciaOffline(data) {
  const { habitacionId, habitacionNombre, camareraId, descripcion, fotos, timestamp, urlApi } = data;

  // Convertir Blobs a attachments de PouchDB
  const adjuntos = {};
  for (let i = 0; i < fotos.length; i++) {
    adjuntos[`foto_${i + 1}.jpg`] = {
      content_type: "image/jpeg",
      data: fotos[i]
    };
  }

  const incidencia = {
    _id: `incidencia_${timestamp}`,
    tipo: "incidencia",
    habitacionId,
    habitacionNombre,
    camareraId,
    descripcion,
    timestamp,
    urlApi,
    synced: false,  // ← Marca para saber si ya se sincronizó
    _attachments: adjuntos
  };

  await db.put(incidencia);
  console.log("📁 Incidencia guardada offline:", incidencia._id);

  // Registrar sync event para cuando vuelva internet
  if ('serviceWorker' in navigator && 'SyncManager' in window) {
    const registration = await navigator.serviceWorker.ready;
    await registration.sync.register('sync-incidencias');
    console.log("🔄 Background Sync registrado");
  }

  return incidencia._id;
}

/**
 * Obtiene todas las incidencias pendientes de sincronizar
 */
export async function obtenerIncidenciasPendientes() {
  const result = await db.allDocs({
    include_docs: true,
    attachments: true,
    binary: true
  });

  return result.rows
    .filter(row => row.doc.tipo === "incidencia" && !row.doc.synced)
    .map(row => row.doc);
}

/**
 * Marca una incidencia como sincronizada
 */
export async function marcarComoSincronizada(docId) {
  const doc = await db.get(docId);
  doc.synced = true;
  await db.put(doc);
  console.log("✅ Incidencia marcada como sincronizada:", docId);
}

/**
 * Elimina una incidencia ya sincronizada
 */
export async function eliminarIncidencia(docId) {
  const doc = await db.get(docId);
  await db.remove(doc);
  console.log("🗑️ Incidencia eliminada:", docId);
}

/**
 * Sincroniza todas las incidencias pendientes
 * ESTA FUNCIÓN SE LLAMARÁ DESDE home-camarera.js
 */
export async function sincronizarIncidenciasPendientes() {
  if (!navigator.onLine) {
    console.log("⚠️ Sin conexión, no se puede sincronizar");
    return;
  }

  console.log("🔄 Iniciando sincronización de incidencias...");

  const pendientes = await obtenerIncidenciasPendientes();
  
  if (pendientes.length === 0) {
    console.log("✅ No hay incidencias pendientes");
    return;
  }

  console.log(`📦 Sincronizando ${pendientes.length} incidencias...`);

  for (const incidencia of pendientes) {
    try {
      // 1. Subir fotos a Firebase Storage
      const urlsFotos = await subirFotosDesdeAttachments(
        incidencia._attachments,
        incidencia.habitacionNombre
      );

      // 2. Enviar incidencia al backend con las URLs
      const payload = {
        habitacionId: incidencia.habitacionId,
        camareraId: incidencia.camareraId,
        descripcion: incidencia.descripcion,
        fotos: urlsFotos
      };

      const response = await fetch(incidencia.urlApi, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify(payload)
      });

      if (!response.ok) {
        throw new Error(`Error ${response.status}: ${response.statusText}`);
      }

      console.log("✅ Incidencia sincronizada:", incidencia._id);

      // 3. Eliminar de PouchDB
      await eliminarIncidencia(incidencia._id);

    } catch (error) {
      console.error("❌ Error sincronizando incidencia:", incidencia._id, error);
      // No eliminamos la incidencia, se reintentará después
    }
  }

  console.log("🎉 Sincronización completada");
}

/**
 * Sube fotos desde attachments de PouchDB a Firebase Storage
 */
async function subirFotosDesdeAttachments(attachments, habitacionNombre) {
  if (!attachments || Object.keys(attachments).length === 0) {
    return [];
  }

  const storage = firebase.storage();
  const urls = [];
  const carpeta = `incidencias/${habitacionNombre}_${Date.now()}`;

  const fotosEntries = Object.entries(attachments);

  for (let i = 0; i < fotosEntries.length; i++) {
    const [filename, attachment] = fotosEntries[i];
    
    // El attachment.data es un Blob
    const blob = attachment.data;
    
    const ref = storage.ref(`${carpeta}/${filename}`);
    
    console.log(`📤 Subiendo foto ${i + 1}/${fotosEntries.length}:`, ref.fullPath);
    
    await ref.put(blob);
    const url = await ref.getDownloadURL();
    
    console.log("✔️ URL obtenida:", url);
    
    urls.push(url);
  }

  return urls;
}