// subirFotosAStorage.js
export async function subirFotosAStorage(nombreHabitacion, fotosBlobs) {
    console.log("🔥 Subiendo fotos a Firebase Storage…");

    const storage = firebase.storage();
    const urls = [];

    const carpeta = `incidencias/${nombreHabitacion}_${Date.now()}`;

    for (let i = 0; i < fotosBlobs.length; i++) {
        const foto = fotosBlobs[i];
        const ref = storage.ref(`${carpeta}/foto_${i + 1}.jpg`);

        console.log("📤 Subiendo:", ref.fullPath);

        await ref.put(foto);
        const url = await ref.getDownloadURL();

        console.log("✔️ URL creada:", url);

        urls.push(url);
    }

    return urls;
}
