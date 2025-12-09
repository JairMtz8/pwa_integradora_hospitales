// sync-incidencias.js
import db from "./pouchdb-config.js";
import { subirFotosAStorage } from "./subirFotosAStorage.js";

const API_BASE_URL = "https://192.168.100.184:8080/api";

/**
 * Sincroniza todas las incidencias guardadas en PouchDB
 */
export async function sincronizarIncidenciasOffline() {
    console.log("🔄 Buscando incidencias offline para sincronizar…");

    const result = await db.allDocs({ include_docs: true, attachments: true });

    for (const row of result.rows) {
        const doc = row.doc;

        if (doc.tipo !== "incidencia") continue;

        console.log("📤 Sincronizando:", doc._id);

        // 1️⃣ Tomar las fotos BLOBS desde los attachments de PouchDB
        const fotos = Object.values(doc._attachments).map(att => att.data);

        // 2️⃣ Subir a Firebase Storage
        const urls = await subirFotosAStorage(doc.habitacion, fotos);

        // 3️⃣ Enviar incidencia a backend
        const res = await fetch(`${API_BASE_URL}/incidencias`, {
            method: "POST",
            headers: { "Content-Type": "application/json" },
            body: JSON.stringify({
                habitacion: doc.habitacion,
                imagenes: urls
            })
        });

        if (!res.ok) {
            console.warn("❌ Backend rechazó incidencia, se mantiene:", doc._id);
            continue;
        }

        // 4️⃣ Eliminar incidencia sincronizada
        await db.remove(doc);

        console.log("✔️ Incidencia sincronizada y eliminada:", doc._id);
    }

    console.log("✨ Sincronización de incidencias completada");
}
