// offline-incidencias.js
import db from "./pouchdb-config.js";

/**
 * Guarda una incidencia Offline
 * @param {String} habitacion
 * @param {Blob[]} fotos
 */
export async function guardarIncidenciaOffline(data) {
  const { habitacionId, habitacionNombre, camareraId, descripcion, fotos, timestamp, urlApi } = data;

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
    _attachments: adjuntos
  };

  await db.put(incidencia);
  console.log("📁 Incidencia guardada offline:", incidencia._id);

  return incidencia._id;
}

