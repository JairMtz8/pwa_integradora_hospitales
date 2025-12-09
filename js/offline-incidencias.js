// offline-incidencias.js
import db from "./pouchdb-config.js";

/**
 * Guarda una incidencia Offline
 * @param {String} habitacion
 * @param {Blob[]} fotos
 */
export async function guardarIncidenciaOffline(habitacion, fotos) {
  const adjuntos = {};

  for (let i = 0; i < fotos.length; i++) {
    adjuntos[`foto_${i + 1}.jpg`] = {
      content_type: "image/jpeg",
      data: fotos[i]
    };
  }

  const incidencia = {
    _id: `incidencia_${Date.now()}`,
    habitacion,
    tipo: "incidencia",
    _attachments: adjuntos
  };

  await db.put(incidencia);
  console.log("📁 Incidencia guardada offline:", incidencia._id);

  return incidencia._id;
}
