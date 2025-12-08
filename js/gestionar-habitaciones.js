// Asumo que ya tienes en env.js algo como:
// const API_BASE_URL = "http://TU_IP:8080/api";

let camareras = [];
let camarerasSeleccionadas = [];
let habitacionCreada = null;

document.addEventListener("DOMContentLoaded", () => {
  // Menú inferior: aquí es ir a INICIO (home)
  const bottomBtn = document.getElementById("bottom-main-btn");
  if (bottomBtn) {
    bottomBtn.innerHTML = `
      <span class="icon">🏠</span>
      <span class="label">Inicio</span>
    `;
    bottomBtn.addEventListener("click", () => {
      window.location.href = "home.html";
    });
  }

  // Animación de entrada
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

  // Eventos
  const btnCrear = document.getElementById("btn-crear-hab");
  if (btnCrear) btnCrear.addEventListener("click", onClickCrearHabitacion);

  const filtro = document.getElementById("filtro-camarera");
  if (filtro) filtro.addEventListener("input", filtrarCamareras);

  const selectCamarera = document.getElementById("select-camarera");
  if (selectCamarera) selectCamarera.addEventListener("change", onSelectCamarera);

  const btnAsignar = document.getElementById("btn-asignar");
  if (btnAsignar) btnAsignar.addEventListener("click", onClickAsignar);

  // Datos iniciales
  cargarCamareras();
  cargarHabitaciones();
});


// =============== CAMARERAS ===============

function cargarCamareras() {
  fetch(`${API_BASE_URL}/camareras`)
    .then(res => {
      if (!res.ok) throw new Error("Error al obtener camareras");
      return res.json();
    })
    .then(data => {
      camareras = data || [];
      renderSelectCamareras(camareras);
    })
    .catch(err => console.error(err));
}

function renderSelectCamareras(lista) {
  const select = document.getElementById("select-camarera");
  if (!select) return;

  select.innerHTML = "";
  lista.forEach(c => {
    const op = document.createElement("option");
    op.value = c.id;
    op.textContent = `${c.nombre} ${c.apellidoPaterno ?? ""}`.trim();
    select.appendChild(op);
  });
}

function filtrarCamareras() {
  const texto = document.getElementById("filtro-camarera").value.toLowerCase();
  const filtradas = camareras.filter(c => {
    const full = `${c.nombre} ${c.apellidoPaterno ?? ""} ${c.apellidoMaterno ?? ""}`.toLowerCase();
    return full.includes(texto);
  });
  renderSelectCamareras(filtradas);
}

function onSelectCamarera() {
  const select = document.getElementById("select-camarera");
  const id = parseInt(select.value);
  if (!id) return;

  const yaEsta = camarerasSeleccionadas.find(c => c.id === id);

  // Si ya estaba, lo quitamos (toggle)
  if (yaEsta) {
    camarerasSeleccionadas = camarerasSeleccionadas.filter(c => c.id !== id);
    renderChips();
    return;
  }

  if (camarerasSeleccionadas.length >= 4) {
    Swal.fire("Límite alcanzado", "Solo puedes asignar máximo 4 camareras por habitación.", "warning");
    return;
  }

  const cam = camareras.find(c => c.id === id);
  if (cam) {
    camarerasSeleccionadas.push(cam);
    renderChips();
  }
}

function renderChips() {
  const cont = document.getElementById("chips-camareras");
  if (!cont) return;

  cont.innerHTML = "";

  camarerasSeleccionadas.forEach(c => {
    const btn = document.createElement("button");
    btn.className = "chip";
    btn.dataset.id = c.id;

    // 🔥 AQUÍ VA EL innerHTML NUEVO
    btn.innerHTML = `${c.nombre} ${c.apellidoPaterno ?? ""} <span class="chip-x">✕</span>`;

    btn.addEventListener("click", () => {
      camarerasSeleccionadas = camarerasSeleccionadas.filter(x => x.id !== c.id);
      renderChips();
    });

    cont.appendChild(btn);
  });
}


// =============== CREAR HABITACIÓN ===============

function onClickCrearHabitacion() {
  const inputNombre = document.getElementById("hab-nombre");
  if (!inputNombre) return;

  const nombre = inputNombre.value.trim().toUpperCase();

  if (nombre.length !== 4) {
    Swal.fire("Nombre inválido", "El nombre debe tener exactamente 4 caracteres.", "warning");
    return;
  }

  Swal.fire({
    title: "Confirmar creación",
    html: `¿Deseas crear la habitación <b>${nombre}</b> con disponibilidad <b>Disponible</b> y estado <b>En Revisión</b>?`,
    icon: "question",
    showCancelButton: true,
    confirmButtonText: "Sí, crear",
    cancelButtonText: "Cancelar"
  }).then(result => {
    if (!result.isConfirmed) return;
    crearHabitacion(nombre);
  });
}

async function crearHabitacion(nombre) {
  const spinner = document.getElementById("hab-spinner");
  if (spinner) spinner.style.display = "block";

  try {
    const res = await fetch(`${API_BASE_URL}/habitaciones`, {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({
        nombre,
        disponibilidad: "Disponible",
        status: "Limpia"
      })
    });

    // 🔥 SI YA EXISTE LA HABITACIÓN (409)
    if (res.status === 409) {
      Swal.fire(
        "Nombre duplicado",
        `Ya existe una habitación con el nombre <b>${nombre}</b>.`,
        "warning"
      );
      return; // 💥 Detiene el flujo
    }

    // 🔥 OTROS ERRORES
    if (!res.ok) {
      throw new Error("No se pudo crear la habitación.");
    }

    // ÉXITO
    const hab = await res.json();
    habitacionCreada = hab;

    const asigContainer = document.getElementById("asig-container");
    const habLabel = document.getElementById("hab-creada");
    if (asigContainer) asigContainer.style.display = "block";
    if (habLabel) habLabel.textContent = hab.nombre;

    camarerasSeleccionadas = [];
    renderChips();

    Swal.fire(
      "Habitación creada",
      `Se creó la habitación <b>${hab.nombre}</b> correctamente.`,
      "success"
    );

    cargarHabitaciones();

  } catch (err) {
    console.error(err);
    Swal.fire("Error", err.message || "Error al crear la habitación.", "error");
  } finally {
    if (spinner) spinner.style.display = "none";
  }
}


// =============== ASIGNAR CAMARERAS ===============

function onClickAsignar() {
  if (!habitacionCreada) {
    Swal.fire("Atención", "Primero crea una habitación.", "info");
    return;
  }
  if (camarerasSeleccionadas.length === 0) {
    Swal.fire("Atención", "Selecciona al menos una camarera.", "info");
    return;
  }

  const nombres = camarerasSeleccionadas
    .map(c => `${c.nombre} ${c.apellidoPaterno ?? ""}`.trim())
    .join(", ");

  Swal.fire({
    title: "Confirmar asignación",
    html: `¿Seguro que deseas asignar la habitación <b>${habitacionCreada.nombre}</b> a <b>${nombres}</b>?`,
    icon: "question",
    showCancelButton: true,
    confirmButtonText: "Sí, asignar",
    cancelButtonText: "Cancelar"
  }).then(result => {
    if (!result.isConfirmed) return;
    asignarCamareras(nombres);
  });
}

async function asignarCamareras(nombresMostrar) {
  try {
    const res = await fetch(
      `${API_BASE_URL}/habitaciones/${habitacionCreada.id}/asignar-camareras`,
      {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          idsCamareras: camarerasSeleccionadas.map(c => c.id)
        })
      }
    );

    if (!res.ok) throw new Error("No se pudo asignar la habitación.");

    const habActualizada = await res.json();
    habitacionCreada = habActualizada;

    Swal.fire(
      "Asignación realizada",
      `Se asignó la habitación <b>${habActualizada.nombre}</b> a <b>${nombresMostrar}</b>.`,
      "success"
    );

    // 🔥 Limpia selección
    camarerasSeleccionadas = [];
    renderChips();

    // 🔥 Oculta panel de asignación
    const asigContainer = document.getElementById("asig-container");
    if (asigContainer) asigContainer.style.display = "none";

    // 🔥 Recargar habitaciones
    cargarHabitaciones();

  } catch (err) {
    console.error(err);
    Swal.fire("Error", err.message || "Error al asignar camareras.", "error");
  }
}



// =============== LISTAR HABITACIONES ===============

function cargarHabitaciones() {
  fetch(`${API_BASE_URL}/habitaciones`)
    .then(res => {
      if (!res.ok) throw new Error("Error al cargar habitaciones");
      return res.json();
    })
    .then(data => {
      renderHabitaciones(data || []);
    })
    .catch(err => {
      console.error(err);
      const cont = document.getElementById("rooms-container");
      if (cont) cont.textContent = "Error al cargar habitaciones.";
    });
}

let roomsPerPage = 9;
let currentPage = 1;
let roomsData = [];

// Render principal con paginación
function renderHabitaciones(lista) {
  roomsData = lista;
  currentPage = 1;
  renderRoomsPage();
}

// Renderiza solo la página actual
function renderRoomsPage() {
  const cont = document.getElementById("rooms-container");
  const pag = document.getElementById("rooms-pagination");

  if (!cont || !pag) return;

  cont.innerHTML = "";
  pag.innerHTML = "";

  if (!roomsData.length) {
    cont.textContent = "Aún no hay habitaciones registradas.";
    return;
  }

  // Cálculo de paginación
  const totalPages = Math.ceil(roomsData.length / roomsPerPage);
  const start = (currentPage - 1) * roomsPerPage;
  const end = start + roomsPerPage;
  const pageRooms = roomsData.slice(start, end);

  // Render de chips
  pageRooms.forEach(h => {
    const card = document.createElement("button");

    const isDisponible = h.disponibilidad === "Disponible";

    card.className = "room-card";
    card.textContent = h.nombre;
    card.style.background = isDisponible ? "#dbeafe" : "#e5e7eb";
    card.style.color = isDisponible ? "#1e3a8a" : "#374151";

    card.addEventListener("click", () => mostrarModalHabitacion(h));

    cont.appendChild(card);
  });

  // PAGINACIÓN
  const prevBtn = document.createElement("button");
  prevBtn.className = "page-btn";
  prevBtn.textContent = "Anterior";
  prevBtn.disabled = currentPage === 1;
  prevBtn.onclick = () => {
    currentPage--;
    renderRoomsPage();
  };

  const nextBtn = document.createElement("button");
  nextBtn.className = "page-btn";
  nextBtn.textContent = "Siguiente";
  nextBtn.disabled = currentPage === totalPages;
  nextBtn.onclick = () => {
    currentPage++;
    renderRoomsPage();
  };

  const indicator = document.createElement("span");
  indicator.className = "page-indicator";
  indicator.textContent = `Página ${currentPage} de ${totalPages}`;

  pag.appendChild(prevBtn);
  pag.appendChild(indicator);
  pag.appendChild(nextBtn);
}


function mostrarModalHabitacion(h) {
  const camarerasHtml =
    h.camareras?.length
      ? h.camareras.map(c => `<li>${c.nombre} ${c.apellidoPaterno ?? ""}</li>`).join("")
      : `<li style="color:#6b7280;">Sin asignar</li>`;

  let colorStatus = "#1e3a8a";
  if (h.status === "En Revisión") colorStatus = "#6b7280";
  if (h.status === "Incidente") colorStatus = "#ef4444";

  const disponibleChecked = h.disponibilidad === "Disponible" ? "checked" : "";

  Swal.fire({
    html: `
      <div style="text-align:left;">

        <!-- NOMBRE + BOTÓN EDITAR -->
        <div style="
          display:flex;
          justify-content:center;
          align-items:center;
          gap:8px;
          margin-bottom:10px;
        ">
          <h2 id="hab-nombre-label" style="font-size:24px; margin:0;">
            ${h.nombre}
          </h2>

          <button id="edit-name-btn"
            style="
              background:none;
              border:none;
              cursor:pointer;
              padding:4px;
              display:flex;
              align-items:center;
            ">
            <svg id="edit-icon" width="16" height="16" viewBox="0 0 24 24" fill="#111">
                <path d="M3 17.25V21h3.75L17.81 9.94l-3.75-3.75L3 17.25zM20.71 7.04c.39-.39.39-1.02 
                0-1.41l-2.34-2.34a1 1 0 0 0-1.41 0l-1.83 1.83 
                3.75 3.75 1.83-1.83z"/>
            </svg>
          </button>
        </div>

        <!-- INPUT PARA EDITAR NOMBRE -->
        <input id="hab-nombre-input"
          maxlength="4"
          style="
            display:none;
            margin-top:6px;
            width:100%;
            padding:10px;
            border-radius:8px;
            border:1px solid #ccc;
            text-transform:uppercase;
            font-size:16px;
          "
          value="${h.nombre}" />

        <!-- BOTÓN PARA GUARDAR NOMBRE -->
        <button id="save-name-btn"
          style="
            display:none;
            margin-top:8px;
            width:100%;
            padding:10px;
            border:none;
            border-radius:8px;
            font-weight:bold;
            background:#111827;
            color:white;
            cursor:pointer;
          ">
          Guardar nombre
        </button>

        <!-- STATUS -->
        <div style="text-align:center; margin:16px 0;">
          <span style="
            padding:6px 14px;
            border-radius:16px;
            background:${colorStatus}20;
            color:${colorStatus};
            font-weight:600;
            font-size:14px;
          ">
            ${h.status}
          </span>
        </div>

        <!-- DISPONIBILIDAD -->
        <div style="margin-bottom:22px;">
          <label style="font-weight:600;">Disponibilidad</label>

          <div style="display:flex; align-items:center; gap:12px; margin-top:6px;">
            <label class="switch">
              <input type="checkbox" id="toggle-disponible" ${disponibleChecked}>
              <span class="slider azul"></span>
            </label>

            <span id="disp-label" style="font-size:15px;">
              ${h.disponibilidad}
            </span>
          </div>
        </div>

        <!-- CAMARERAS -->
        <div>
          <label style="font-weight:600;">Camareras asignadas</label>
          <ul style="padding-left:18px; margin-top:8px;">
            ${camarerasHtml}
          </ul>
        </div>
<!-- AGREGAR CAMARERA -->
<div style="margin-top:20px;">
  <label style="font-weight:600;">Agregar camarera</label>

  <select id="modal-select-camarera" style="
      width:100%;
      margin-top:6px;
      padding:10px;
      border-radius:8px;
      border:1px solid #ccc;
  ">
      <option value="">Seleccionar...</option>
  </select>

  <button id="modal-btn-agregar" style="
      margin-top:10px;
      width:100%;
      padding:10px;
      border:none;
      border-radius:8px;
      font-weight:bold;
      background:#2563eb;
      color:white;
      cursor:pointer;
  ">
    Agregar camarera
  </button>
</div>

      </div>
    `,
    width: "360px",
    background: "#ffffff",
    confirmButtonText: "Cerrar",
    confirmButtonColor: "#111827",

    didOpen: () => {
      const editBtn = document.getElementById("edit-name-btn");
      const editIcon = document.getElementById("edit-icon");
      const lbl = document.getElementById("hab-nombre-label");
      const input = document.getElementById("hab-nombre-input");
      const saveBtn = document.getElementById("save-name-btn");

      // 🔥 cambiar a modo edición
      editBtn.addEventListener("click", () => {
        lbl.style.display = "none";
        editBtn.style.display = "none";
        input.style.display = "block";
        saveBtn.style.display = "block";
      });

      // 🔥 Guardar nuevo nombre
      saveBtn.addEventListener("click", async () => {
        const nuevoNombre = input.value.trim().toUpperCase();

        if (nuevoNombre.length !== 4) {
          Swal.fire("Error", "El nombre debe tener 4 caracteres.", "error");
          return;
        }

        const res = await fetch(`${API_BASE_URL}/habitaciones/${h.id}/nombre`, {
          method: "PUT",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify({ nombre: nuevoNombre })
        });

        if (res.status === 409) {
          Swal.fire("Nombre duplicado", "Ya existe otra habitación con ese nombre.", "warning");
          return;
        }

        if (!res.ok) {
          Swal.fire("Error", "No se pudo actualizar el nombre.", "error");
          return;
        }

        // 🔥 Actualizar visualmente sin cerrar el modal
        lbl.textContent = nuevoNombre;
        lbl.style.display = "block";
        saveBtn.style.display = "none";
        input.style.display = "none";

        Swal.fire({
          icon: "success",
          title: "Nombre actualizado",
          html: `La habitación cambió de <b>${h.nombre}</b> a <b>${nuevoNombre}</b>.`,
          timer: 3000,
          showConfirmButton: false
        });

        h.nombre = nuevoNombre; // actualizar objeto local
        cargarHabitaciones();
      });

      // 🔥 Actualizar disponibilidad
      const toggle = document.getElementById("toggle-disponible");
      const label = document.getElementById("disp-label");

      toggle.addEventListener("change", async () => {
        const nuevaDisp = toggle.checked ? "Disponible" : "No disponible";

        const res = await fetch(`${API_BASE_URL}/habitaciones/${h.id}/disponibilidad`, {
          method: "PUT",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify({ disponibilidad: nuevaDisp })
        });

        if (!res.ok) {
          Swal.fire("Error", "No se pudo actualizar la disponibilidad.", "error");
          return;
        }

        // actualizar en modal
        label.textContent = nuevaDisp;

        Swal.fire({
          icon: "success",
          title: "Disponibilidad actualizada",
          html: `La habitación <b>${h.nombre}</b> ahora está <b>${nuevaDisp}</b>.`,
          timer: 2500,
          showConfirmButton: false
        });

        h.disponibilidad = nuevaDisp;
        cargarHabitaciones();
      });
      // 🔥 Llenar select con TODAS las camareras
      const selectModal = document.getElementById("modal-select-camarera");
      camareras.forEach(c => {
        const op = document.createElement("option");
        op.value = c.id;
        op.textContent = `${c.nombre} ${c.apellidoPaterno ?? ""}`;
        selectModal.appendChild(op);
      });

      // 🔥 Evento para agregar camarera
      const btnAgregar = document.getElementById("modal-btn-agregar");

      btnAgregar.addEventListener("click", async () => {

        const idAgregar = parseInt(selectModal.value);

        if (!idAgregar) {
          Swal.fire("Atención", "Selecciona una camarera.", "info");
          return;
        }

        if (h.camareras.some(c => c.id === idAgregar)) {
          Swal.fire("Ya asignada", "Esta camarera ya está en esta habitación.", "warning");
          return;
        }

        if (h.camareras.length >= 4) {
          Swal.fire("Límite alcanzado", "Solo puedes asignar máximo 4 camareras.", "warning");
          return;
        }

        const nuevosIds = [...h.camareras.map(c => c.id), idAgregar];

        const res = await fetch(`${API_BASE_URL}/habitaciones/${h.id}/asignar-camareras`, {
          method: "POST",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify({ idsCamareras: nuevosIds })
        });

        if (!res.ok) {
          Swal.fire("Error", "No se pudo asignar la camarera.", "error");
          return;
        }

        Swal.fire("Asignada", "La camarera fue añadida correctamente.", "success");

        cargarHabitaciones();
        Swal.close(); // cerrar modal para refrescarlo
      });

    }
  });
}
