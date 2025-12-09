// home-camarera.js
// Usa API_BASE_URL desde env.js

import { guardarIncidenciaOffline } from "./offline-incidencias.js";

window.addEventListener("offline", () => {
  Swal.fire({
    icon: "warning",
    title: "Sin Internet",
    text: "La app está trabajando en modo offline.",
    timer: 2500,
    showConfirmButton: false
  });
});

window.addEventListener("online", () => {
  Swal.fire({
    icon: "success",
    title: "Conexión restaurada",
    text: "Sincronizando cambios...",
    timer: 2500,
    showConfirmButton: false
  });
});

let camareraActual = null;

// Para incidencias
let habitacionIncidencia = null;
let fotosTomadas = [];

let allRoomsCam = [];
let filteredRoomsCam = [];
let currentPageRoomsCam = 1;
let offlineQueue = JSON.parse(localStorage.getItem("offlineQueue")) || [];

const ROOMS_PER_PAGE_CAM = 9;

let verSoloAsignadas = true;
let searchTermRooms = "";

// ================== INICIO ==================
document.addEventListener("DOMContentLoaded", () => {
  // 1) Ver si hay camarera logueada
  camareraActual = JSON.parse(localStorage.getItem("camarera"));

  if (!camareraActual) {
    window.location.href = "login.html";
    return;
  }

  // 2) Saludo
  const titulo = document.getElementById("titulo-camarera");
  if (titulo) {
    titulo.textContent = `Hola,\n${camareraActual.nombre || "Camarera"}`;
  }

  // 3) Footer reciclado (cerrar sesión)
  const bottomBtn = document.getElementById("bottom-main-btn");
  if (bottomBtn) {
    bottomBtn.innerHTML = `
      <span class="icon">⏻</span>
      <span class="label">Cerrar sesión</span>
    `;
    bottomBtn.addEventListener("click", () => {
      Swal.fire({
        title: "Cerrar sesión",
        text: "¿Seguro que quieres cerrar sesión?",
        icon: "warning",
        showCancelButton: true,
        confirmButtonText: "Sí, salir",
        cancelButtonText: "Cancelar"
      }).then(r => {
        if (r.isConfirmed) {
          localStorage.removeItem("camarera");
          Swal.fire("Sesión cerrada", "Hasta pronto.", "success").then(() => {
            window.location.href = "login.html";
          });
        }
      });
    });
  }

  // 4) Animación
  const main = document.querySelector("main.page");
  if (main) {
    main.style.opacity = "0";
    main.style.transform = "translateY(10px)";
    requestAnimationFrame(() => {
      main.style.transition = "opacity 0.35s ease-out, transform 0.35s ease-out";
      main.style.opacity = "1";
      main.style.transform = "translateY(0)";
    });
  }

  // 5) Filtros y búsqueda
  const inputSearch = document.getElementById("search-hab");
  if (inputSearch) {
    inputSearch.addEventListener("input", () => {
      searchTermRooms = inputSearch.value.trim().toUpperCase();
      aplicarFiltrosRooms();
    });
  }

  const btnAsignadas = document.getElementById("btn-filtro-asignadas");
  const btnTodas = document.getElementById("btn-filtro-todas");

  if (btnAsignadas && btnTodas) {
    btnAsignadas.addEventListener("click", () => {
      verSoloAsignadas = true;
      btnAsignadas.classList.add("active");
      btnTodas.classList.remove("active");
      aplicarFiltrosRooms();
    });

    btnTodas.addEventListener("click", () => {
      verSoloAsignadas = false;
      btnTodas.classList.add("active");
      btnAsignadas.classList.remove("active");
      aplicarFiltrosRooms();
    });
  }

  // Reconexión → sincronizar estados de habitaciones
  window.addEventListener("online", () => {
    Swal.fire({
      icon: "success",
      title: "Conexión recuperada",
      text: "Sincronizando cambios...",
      timer: 2000,
      showConfirmButton: false
    });

    sincronizarCambiosPendientes();
  });

  // 7) Cargar habitaciones
  cargarHabitacionesParaCamarera();
});

// ================== CARGA Y FILTROS ==================

function cargarHabitacionesParaCamarera() {
  fetch(`${API_BASE_URL}/habitaciones`)
    .then(res => {
      if (!res.ok) throw new Error("Error al obtener habitaciones");
      return res.json();
    })
    .then(data => {
      allRoomsCam = data || [];
      aplicarFiltrosRooms();
    })
    .catch(err => {
      console.error(err);
      Swal.fire("Error", "No se pudieron cargar las habitaciones.", "error");
    });
}

function aplicarFiltrosRooms() {
  if (!camareraActual) return;

  // 1) Base: Asignadas o todas
  let base = [...allRoomsCam];

  if (verSoloAsignadas) {
    base = base.filter(h =>
      (h.camareras || []).some(c => c.id === camareraActual.id)
    );
  }

  // 2) Filtro por nombre
  if (searchTermRooms) {
    base = base.filter(h =>
      (h.nombre || "").toUpperCase().includes(searchTermRooms)
    );
  }

  filteredRoomsCam = base;
  currentPageRoomsCam = 1;
  renderRoomsCamareraPage();
}

// ================== RENDER CON PAGINACIÓN ==================

function renderRoomsCamareraPage() {
  const cont = document.getElementById("rooms-camarera-container");
  const pag = document.getElementById("rooms-camarera-pagination");
  if (!cont || !pag) return;

  cont.innerHTML = "";
  pag.innerHTML = "";

  if (!filteredRoomsCam.length) {
    cont.innerHTML = `<p style="padding:0 12px;">No hay habitaciones para mostrar.</p>`;
    return;
  }

  const totalPages = Math.ceil(filteredRoomsCam.length / ROOMS_PER_PAGE_CAM);
  if (currentPageRoomsCam > totalPages) currentPageRoomsCam = totalPages;

  const start = (currentPageRoomsCam - 1) * ROOMS_PER_PAGE_CAM;
  const end = start + ROOMS_PER_PAGE_CAM;
  const pageRooms = filteredRoomsCam.slice(start, end);

  // Render chips
  pageRooms.forEach(h => {
    const card = document.createElement("button");

    const isDisponible = h.disponibilidad === "Disponible";
    const status = h.status || "En Revisión";

    // Clase según STATUS
    let statusClass = "status-revision";
    if (status === "Limpia") statusClass = "status-limpia";
    else if (status === "Incidente") statusClass = "status-incidente";

    card.className = `room-card ${statusClass}`;

    // Fondo según DISPONIBILIDAD (igual que antes)
    card.style.background = isDisponible ? "#dbeafe" : "#e5e7eb";
    card.style.color = isDisponible ? "#1e3a8a" : "#374151";

    card.innerHTML = `
      <div class="room-status-bar"></div>
      <div class="room-card-body">
        <div class="room-name">${h.nombre}</div>
        <div class="room-status-text">${status}</div>
      </div>
    `;

    card.addEventListener("click", () => onClickHabitacionCamarera(h));

    cont.appendChild(card);
  });

  // Paginación
  const prevBtn = document.createElement("button");
  prevBtn.className = "page-btn";
  prevBtn.textContent = "Anterior";
  prevBtn.disabled = currentPageRoomsCam === 1;
  prevBtn.onclick = () => {
    currentPageRoomsCam--;
    renderRoomsCamareraPage();
  };

  const nextBtn = document.createElement("button");
  nextBtn.className = "page-btn";
  nextBtn.textContent = "Siguiente";
  nextBtn.disabled = currentPageRoomsCam === totalPages;
  nextBtn.onclick = () => {
    currentPageRoomsCam++;
    renderRoomsCamareraPage();
  };

  const indicator = document.createElement("span");
  indicator.className = "page-indicator";
  indicator.textContent = `Página ${currentPageRoomsCam} de ${totalPages}`;

  pag.appendChild(prevBtn);
  pag.appendChild(indicator);
  pag.appendChild(nextBtn);
}

// ================== ACCIÓN AL CLIC DEL CHIP ==================

function onClickHabitacionCamarera(h) {
  // Si ya está Disponible, no hacemos nada
  if (h.disponibilidad === "Disponible") {
    return;
  }

  Swal.fire({
    title: `Habitación ${h.nombre}`,
    html: `
      <p style="margin-bottom:8px;">
        La habitación actualmente está <b>${h.disponibilidad}</b> con estado <b>${h.status}</b>.
      </p>
      <p style="margin:0;">
        ¿Qué deseas hacer?
      </p>
    `,
    icon: "question",
    showCancelButton: true,
    showDenyButton: true,
    confirmButtonText: "Marcar como limpia",
    denyButtonText: "Reportar incidente",
    cancelButtonText: "Cancelar"
  }).then(result => {
    if (result.isConfirmed) {
      actualizarStatusHabitacion(h, "Limpia");
    } else if (result.isDenied) {
      abrirModalIncidencia(h);
    }
  });
}

// ================== MODAL INCIDENCIA ==================

function limpiarModalIncidencia() {
  const txt = document.getElementById("modal-inc-descripcion");
  const prev = document.getElementById("preview-fotos");
  const input = document.getElementById("input-camara");
  const btnTomar = document.querySelector(".photo-opt");

  if (txt) txt.value = "";
  if (prev) prev.innerHTML = "";
  fotosTomadas = [];
  if (input) input.value = "";
  if (btnTomar) btnTomar.style.display = "block";
}

function abrirModalIncidencia(habitacion) {
  habitacionIncidencia = habitacion;
  limpiarModalIncidencia();

  const labelHab = document.getElementById("modal-inc-habitacion");
  if (labelHab) {
    labelHab.textContent = "Habitación " + habitacion.nombre;
  }

  document.getElementById("modal-incidencia").classList.remove("hidden");
}

function cerrarModalIncidencia() {
  document.getElementById("modal-incidencia").classList.add("hidden");
}

function cancelarIncidencia() {
  cerrarModalIncidencia();
  limpiarModalIncidencia();
}

// ================== FOTOS (máx 3) ==================

function tomarFoto() {
  if (fotosTomadas.length >= 3) {
    Swal.fire("Límite alcanzado", "Solo puedes tomar 3 fotos.", "warning");
    return;
  }

  const input = document.getElementById("input-camara");

  input.onchange = () => {
    const nuevas = Array.from(input.files || []);

    nuevas.forEach(f => {
      if (fotosTomadas.length < 3) {
        fotosTomadas.push(f);
      }
    });

    input.value = "";
    mostrarPreviewFotos();
  };

  input.click();
}

window.tomarFoto = tomarFoto;

function mostrarPreviewFotos() {
  const cont = document.getElementById("preview-fotos");
  if (!cont) return;

  cont.innerHTML = "";

  fotosTomadas.forEach((file) => {
    const img = document.createElement("img");
    img.src = URL.createObjectURL(file);
    img.classList.add("preview-img");
    cont.appendChild(img);
  });

  const btnTomar = document.querySelector(".photo-opt");
  if (btnTomar) {
    btnTomar.style.display = fotosTomadas.length >= 3 ? "none" : "block";
  }
}

// ================== SUBIDA A STORAGE (ONLINE) ==================

async function subirFotosAStorage(nombreHabitacion) {
  console.log("🔥 Bucket actual:", firebase.app().options.storageBucket);

  const storage = firebase.storage();
  const urls = [];

  const carpeta = `incidencias/${nombreHabitacion}_${Date.now()}`;

  for (let i = 0; i < fotosTomadas.length; i++) {
    const foto = fotosTomadas[i];
    const ref = storage.ref(`${carpeta}/foto_${i + 1}.jpg`);

    console.log("📤 Subiendo:", ref.fullPath);

    await ref.put(foto);
    const url = await ref.getDownloadURL();

    console.log("✔️ URL creada:", url);

    urls.push(url);
  }

  return urls;
}

// ================== GUARDAR INCIDENCIA ==================

async function guardarIncidencia() {
  const desc = document.getElementById("modal-inc-descripcion").value.trim();

  if (!desc) {
    Swal.fire("Falta descripción", "Debes escribir qué ocurrió.", "warning");
    return;
  }

  if (!habitacionIncidencia) {
    Swal.fire("Error", "No se encontró la habitación de la incidencia.", "error");
    return;
  }

  // ---- MODO OFFLINE → guardar en SW + marcar estado offline ----
  if (!navigator.onLine) {
    await guardarIncidenciaOffline({
      habitacionId: habitacionIncidencia.id,
      habitacionNombre: habitacionIncidencia.nombre,
      camareraId: camareraActual.id,
      descripcion: desc,
      fotos: fotosTomadas,           // BLOBs reales
      timestamp: Date.now(),
      urlApi: `${API_BASE_URL}/incidencias`
    });

    cerrarModalIncidencia();
    limpiarModalIncidencia();

    // También marcamos la habitación como Incidente usando tu cola local
    await actualizarStatusHabitacion(habitacionIncidencia, "Incidente");

    Swal.fire({
      icon: "info",
      title: "Guardado sin Internet",
      text: "La incidencia y las fotos se enviarán automáticamente cuando vuelva la conexión.",
      timer: 2800,
      showConfirmButton: false
    });

    return;
  }

  // ---- MODO ONLINE → subir fotos y enviar directo ----
  cerrarModalIncidencia();

  Swal.fire({
    title: "Guardando...",
    text: "Subiendo evidencia...",
    didOpen: () => Swal.showLoading(),
    allowOutsideClick: false
  });

  let urls = [];

  if (fotosTomadas.length > 0) {
    urls = await subirFotosAStorage(habitacionIncidencia.nombre);
  }

  const incidencia = {
    habitacionId: habitacionIncidencia.id,
    camareraId: camareraActual.id,
    descripcion: desc,
    fotos: urls
  };

  await fetch(`${API_BASE_URL}/incidencias`, {
    method: "POST",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify(incidencia)
  });

  await actualizarStatusHabitacion(habitacionIncidencia, "Incidente");

  Swal.fire("Guardado", "La incidencia fue registrada.", "success");

  cargarHabitacionesParaCamarera();
}

window.guardarIncidencia = guardarIncidencia;
window.cancelarIncidencia = cancelarIncidencia;


// ================== STATUS Y OFFLINE (lo que ya tenías) ==================

async function actualizarStatusHabitacion(hab, nuevoStatus) {
  const data = {
    status: nuevoStatus,
    camareraId: camareraActual.id
  };

  // 1) Si no hay internet → guardar acción
  if (!navigator.onLine) {
    offlineQueue.push({
      type: "status-update",
      habId: hab.id,
      nuevoStatus,
      camareraId: camareraActual.id,
      timestamp: Date.now()
    });

    localStorage.setItem("offlineQueue", JSON.stringify(offlineQueue));

    Swal.fire({
      icon: "info",
      title: "Sin conexión",
      text: `El cambio a "${nuevoStatus}" se guardó.  
            Se sincronizará cuando haya Internet.`,
      timer: 3000,
      showConfirmButton: false
    });

    return;
  }

  // 2) Si hay internet → enviar al backend
  try {
    const res = await fetch(`${API_BASE_URL}/habitaciones/${hab.id}/status`, {
      method: "PUT",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify(data)
    });

    if (!res.ok) throw new Error("No se pudo actualizar el estado de la habitación.");

    const habAct = await res.json();

    Swal.fire({
      icon: "success",
      title: "Estado actualizado",
      html: `La habitación <b>${habAct.nombre}</b> ahora está <b>${habAct.status}</b>.`,
      timer: 2000,
      showConfirmButton: false
    });

    cargarHabitacionesParaCamarera();
  } catch (err) {
    console.error(err);
    Swal.fire("Error", err.message, "error");
  }
}

async function sincronizarCambiosPendientes() {
  if (offlineQueue.length === 0) return;

  console.log("🔄 Sincronizando cola offline:", offlineQueue);

  for (const action of offlineQueue) {
    if (action.type !== "status-update") continue;

    try {
      const res = await fetch(`${API_BASE_URL}/habitaciones/${action.habId}/status`, {
        method: "PUT",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          status: action.nuevoStatus,
          camareraId: action.camareraId
        })
      });

      if (res.ok) {
        console.log("✔️ Acción sincronizada:", action);
      } else {
        console.warn("❌ Falló sincronización, se mantiene en cola:", action);
      }

    } catch (e) {
      console.warn("❌ Error al sincronizar, se reintentará después:", e);
      // No vaciamos la cola para que se vuelva a intentar
      return;
    }
  }

  // Si llegamos aquí, todo lo de la cola se intentó bien
  offlineQueue = [];
  localStorage.setItem("offlineQueue", JSON.stringify([]));

  cargarHabitacionesParaCamarera();

  Swal.fire({
    icon: "success",
    title: "Cambios sincronizados",
    timer: 2000,
    showConfirmButton: false
  });
}
