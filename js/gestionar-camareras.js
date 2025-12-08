// gestionar-camareras.js
// Usa API_BASE_URL desde env.js

let camarerasData = [];
let filteredCamareras = [];
let currentPageCam = 1;
const perPageCam = 5;

document.addEventListener("DOMContentLoaded", () => {
  // Menú inferior: botón para ir al home
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

  // Animación suave
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
  const searchInput = document.getElementById("search-camarera");
  if (searchInput) {
    searchInput.addEventListener("input", () => {
      aplicarFiltro(searchInput.value);
    });
  }

  const btnNueva = document.getElementById("btn-nueva-camarera");
  if (btnNueva) {
    btnNueva.addEventListener("click", abrirModalNuevaCamarera);
  }

  // Cargar datos
  cargarCamareras();
});

// ================== CARGAR / RENDER ==================

function cargarCamareras() {
  fetch(`${API_BASE_URL}/camareras`)
    .then(res => {
      if (!res.ok) throw new Error("Error al obtener camareras");
      return res.json();
    })
    .then(data => {
      camarerasData = data || [];
      filteredCamareras = [...camarerasData];
      currentPageCam = 1;
      renderCamarerasPage();
    })
    .catch(err => {
      console.error(err);
      Swal.fire("Error", "No se pudieron cargar las camareras.", "error");
    });
}

function aplicarFiltro(texto) {
  const term = texto.trim().toLowerCase();
  if (!term) {
    filteredCamareras = [...camarerasData];
  } else {
    filteredCamareras = camarerasData.filter(c => {
      const full = `${c.nombre} ${c.apellidoPaterno ?? ""} ${c.apellidoMaterno ?? ""}`.toLowerCase();
      return full.includes(term);
    });
  }
  currentPageCam = 1;
  renderCamarerasPage();
}

function renderCamarerasPage() {
  const cont = document.getElementById("camareras-container");
  const pag = document.getElementById("camareras-pagination");
  if (!cont || !pag) return;

  cont.innerHTML = "";
  pag.innerHTML = "";

  if (!filteredCamareras.length) {
    cont.innerHTML = `<p style="padding:0 4px;">Aún no hay camareras registradas.</p>`;
    return;
  }

  const totalPages = Math.ceil(filteredCamareras.length / perPageCam);
  if (currentPageCam > totalPages) currentPageCam = totalPages;

  const start = (currentPageCam - 1) * perPageCam;
  const end = start + perPageCam;
  const pageItems = filteredCamareras.slice(start, end);

  pageItems.forEach(c => {
    const chip = crearChipCamarera(c);
    cont.appendChild(chip);
  });

  // Paginación
  const prevBtn = document.createElement("button");
  prevBtn.className = "page-btn";
  prevBtn.textContent = "Anterior";
  prevBtn.disabled = currentPageCam === 1;
  prevBtn.onclick = () => {
    currentPageCam--;
    renderCamarerasPage();
  };

  const nextBtn = document.createElement("button");
  nextBtn.className = "page-btn";
  nextBtn.textContent = "Siguiente";
  nextBtn.disabled = currentPageCam === totalPages;
  nextBtn.onclick = () => {
    currentPageCam++;
    renderCamarerasPage();
  };

  const indicator = document.createElement("span");
  indicator.className = "page-indicator";
  indicator.textContent = `Página ${currentPageCam} de ${totalPages}`;

  pag.appendChild(prevBtn);
  pag.appendChild(indicator);
  pag.appendChild(nextBtn);
}

// ================== CHIP ==================

function crearChipCamarera(c) {
  const fullName = `${c.nombre} ${c.apellidoPaterno ?? ""} ${c.apellidoMaterno ?? ""}`.trim();

  const chip = document.createElement("div");
  chip.className = "maid-chip";

  // Nuevo avatar
  const avatarUrl = `https://ui-avatars.com/api/?name=${encodeURIComponent(fullName)}&background=random&size=128`;

  chip.innerHTML = `
    <img src="${avatarUrl}" alt="Avatar" class="maid-avatar" />

    <div class="maid-main">
      <div class="maid-name"><i class="ph ph-user"></i> ${fullName}</div>

      <div class="maid-phone"><i class="ph ph-phone"></i> ${c.telefono || "Sin teléfono"}</div>

      <div class="maid-cred-row">
        <span class="maid-cred-label">Usuario:</span>
        <span class="maid-cred-value">${c.usuario || "-"}</span>
      </div>

      <div class="maid-cred-row">
        <span class="maid-cred-label">Contraseña:</span>
        <span class="maid-cred-value password-value" data-pass="${c.password || ""}" data-visible="0">
          ${c.password ? "******" : "-"}
        </span>
        <button type="button" class="icon-btn eye-btn"><i class="ph ph-eye"></i></button>
      </div>
    </div>
  `;

  // Toggle ojo
  const eyeBtn = chip.querySelector(".eye-btn");
  const passSpan = chip.querySelector(".password-value");

  eyeBtn.addEventListener("click", (e) => {
    e.stopPropagation();
    const visible = passSpan.dataset.visible === "1";

    if (!passSpan.dataset.pass) return;

    if (visible) {
      passSpan.textContent = "******";
      passSpan.dataset.visible = "0";
      eyeBtn.innerHTML = `<i class="ph ph-eye"></i>`;
    } else {
      passSpan.textContent = passSpan.dataset.pass;
      passSpan.dataset.visible = "1";
      eyeBtn.innerHTML = `<i class="ph ph-eye-slash"></i>`;
    }
  });

  chip.addEventListener("click", () => abrirModalEditarCamarera(c));

  return chip;
}


// ================== MODAL NUEVA CAMARERA ==================

function abrirModalNuevaCamarera() {
  Swal.fire({
    title: "Registrar camarera",
    html: `
      <div style="text-align:left;">
        <label>Nombre</label>
        <input id="cam-nombre" class="swal2-input" style="margin:4px 0;" />

        <label>Apellido paterno</label>
        <input id="cam-ap-p" class="swal2-input" style="margin:4px 0;" />

        <label>Apellido materno</label>
        <input id="cam-ap-m" class="swal2-input" style="margin:4px 0;" />

        <label>Teléfono</label>
        <input id="cam-tel" class="swal2-input" style="margin:4px 0;" />

        <label>Usuario</label>
        <input id="cam-user" class="swal2-input" style="margin:4px 0;" />

        <label>Contraseña</label>
        <input id="cam-pass" type="password" class="swal2-input" style="margin:4px 0;" />
      </div>
    `,
    focusConfirm: false,
    showCancelButton: true,
    confirmButtonText: "Guardar",
    cancelButtonText: "Cancelar",
    preConfirm: () => {
  const nombre = document.getElementById("cam-nombre").value.trim();
  const apP = document.getElementById("cam-ap-p").value.trim();
  const apM = document.getElementById("cam-ap-m").value.trim();
  const tel = document.getElementById("cam-tel").value.trim();
  const user = document.getElementById("cam-user").value.trim();
  const pass = document.getElementById("cam-pass").value.trim();

  if (!nombre || !apP || !user || !pass) {
    Swal.showValidationMessage("Nombre, apellido paterno, usuario y contraseña son obligatorios.");
    return false;
  }

  // Teléfono: exactamente 10 números
  if (tel && !/^\d{10}$/.test(tel)) {
    Swal.showValidationMessage("El teléfono debe tener exactamente 10 números.");
    return false;
  }

  // Contraseña fuerte
  const passRegex = /^(?=.*[0-9])(?=.*[!@#$%^&*._-]).{6,}$/;
  if (!passRegex.test(pass)) {
    Swal.showValidationMessage(
      "La contraseña debe tener mínimo 6 caracteres, un número y un símbolo especial."
    );
    return false;
  }

  return { nombre, apP, apM, tel, user, pass };
}

  }).then(async (res) => {
    if (!res.isConfirmed || !res.value) return;

    const data = res.value;

    try {
      const resp = await fetch(`${API_BASE_URL}/camareras`, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          nombre: data.nombre,
          apellidoPaterno: data.apP,
          apellidoMaterno: data.apM,
          telefono: data.tel,
          usuario: data.user,
          password: data.pass
        })
      });

      if (!resp.ok) {
        throw new Error("No se pudo registrar la camarera.");
      }

      Swal.fire({
        icon: "success",
        title: "Camarera registrada",
        timer: 2500,
        showConfirmButton: false
      });

      cargarCamareras();
    } catch (err) {
      console.error(err);
      Swal.fire("Error", err.message || "Error al registrar camarera.", "error");
    }
  });
}

// ================== MODAL EDITAR CAMARERA ==================

function abrirModalEditarCamarera(c) {
  Swal.fire({
    title: "Editar camarera",
    html: `
      <div style="text-align:left;">
        <label>Nombre</label>
        <input id="edit-nombre" class="swal2-input" style="margin:4px 0;" value="${c.nombre || ""}" />

        <label>Apellido paterno</label>
        <input id="edit-ap-p" class="swal2-input" style="margin:4px 0;" value="${c.apellidoPaterno || ""}" />

        <label>Apellido materno</label>
        <input id="edit-ap-m" class="swal2-input" style="margin:4px 0;" value="${c.apellidoMaterno || ""}" />

        <label>Teléfono</label>
        <input id="edit-tel" class="swal2-input" style="margin:4px 0;" value="${c.telefono || ""}" />

        <label>Usuario</label>
        <input id="edit-user" class="swal2-input" style="margin:4px 0;" value="${c.usuario || ""}" />

        <label>Contraseña</label>
        <input id="edit-pass" type="text" class="swal2-input" style="margin:4px 0;" value="${c.password || ""}" />
      </div>
    `,
    focusConfirm: false,
    showCancelButton: true,
    confirmButtonText: "Guardar cambios",
    cancelButtonText: "Cancelar",
    preConfirm: () => {
  const nombre = document.getElementById("edit-nombre").value.trim();
  const apP = document.getElementById("edit-ap-p").value.trim();
  const apM = document.getElementById("edit-ap-m").value.trim();
  const tel = document.getElementById("edit-tel").value.trim();
  const user = document.getElementById("edit-user").value.trim();
  const pass = document.getElementById("edit-pass").value.trim();

  if (!nombre || !apP || !user || !pass) {
    Swal.showValidationMessage("Nombre, apellido paterno, usuario y contraseña son obligatorios.");
    return false;
  }

  if (tel && !/^\d{10}$/.test(tel)) {
    Swal.showValidationMessage("El teléfono debe tener exactamente 10 números.");
    return false;
  }

  const passRegex = /^(?=.*[0-9])(?=.*[!@#$%^&*._-]).{6,}$/;
  if (!passRegex.test(pass)) {
    Swal.showValidationMessage(
      "La contraseña debe tener mínimo 6 caracteres, un número y un símbolo especial."
    );
    return false;
  }

  return { nombre, apP, apM, tel, user, pass };
}

  }).then(async (res) => {
    if (!res.isConfirmed || !res.value) return;

    const data = res.value;

    try {
      const resp = await fetch(`${API_BASE_URL}/camareras/${c.id}`, {
        method: "PUT",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          nombre: data.nombre,
          apellidoPaterno: data.apP,
          apellidoMaterno: data.apM,
          telefono: data.tel,
          usuario: data.user,
          password: data.pass
        })
      });

      if (!resp.ok) {
        throw new Error("No se pudo actualizar la camarera.");
      }

      Swal.fire({
        icon: "success",
        title: "Datos actualizados",
        timer: 2500,
        showConfirmButton: false
      });

      cargarCamareras();
    } catch (err) {
      console.error(err);
      Swal.fire("Error", err.message || "Error al actualizar camarera.", "error");
    }
  });
}
