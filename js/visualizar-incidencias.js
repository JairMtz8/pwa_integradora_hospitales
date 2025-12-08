let incidencias = [];
let paginaActual = 1;
const POR_PAGINA = 5;

let filtroHab = "";
let filtroCama = "";

document.addEventListener("DOMContentLoaded", () => {
    cargarIncidencias();

    document.getElementById("btn-aplicar").addEventListener("click", () => {
        filtroHab = document.getElementById("filtro-hab").value;
        filtroCama = document.getElementById("filtro-cama").value;
        paginaActual = 1;
        render();
    });

    document.getElementById("btn-limpiar").addEventListener("click", () => {
        filtroHab = "";
        filtroCama = "";
        document.getElementById("filtro-hab").value = "";
        document.getElementById("filtro-cama").value = "";
        paginaActual = 1;
        render();
    });
});

async function cargarIncidencias() {
    try {
        const res = await fetch(`${API_BASE_URL}/incidencias`);
        incidencias = await res.json();

        // ordenar por fecha descendente
        incidencias.sort((a, b) => new Date(b.fecha) - new Date(a.fecha));

        llenarSelects();
        render();
    } catch (e) {
        console.error(e);
        Swal.fire("Error", "No se pudieron cargar las incidencias", "error");
    }
}

/* ==========================================
   LLENAR SELECTS AUTOMÁTICOS
========================================== */
function llenarSelects() {
    const selHab = document.getElementById("filtro-hab");
    const selCama = document.getElementById("filtro-cama");

    selHab.innerHTML = `<option value="">Todas</option>`;
    selCama.innerHTML = `<option value="">Todas</option>`;

    // Habitaciones únicas
    const habitaciones = [
        ...new Map(incidencias.map(i => [i.habitacion.id, i.habitacion])).values()
    ];

    habitaciones.forEach(h => {
        selHab.innerHTML += `<option value="${h.nombre.toUpperCase()}">${h.nombre}</option>`;
    });

    // Camareras únicas
    const camareras = [
        ...new Map(incidencias.map(i => [i.camarera.id, i.camarera])).values()
    ];

    camareras.forEach(c => {
        selCama.innerHTML += `<option value="${c.nombre.toUpperCase()}">${c.nombre}</option>`;
    });
}

/* ==========================================
   APLICAR FILTROS (solo ajustado a selects)
========================================== */
function aplicarFiltros(datos) {
    return datos.filter(i => {
        const hab = i.habitacion?.nombre?.toUpperCase() || "";
        const cam = i.camarera?.nombre?.toUpperCase() || "";

        const okHab = filtroHab === "" || hab === filtroHab;
        const okCama = filtroCama === "" || cam === filtroCama;

        return okHab && okCama;
    });
}

/* ============================================================== */
/* RESTO DEL CÓDIGO SIGUE EXACTAMENTE IGUAL (NO LO MODIFIQUÉ)     */
/* ============================================================== */

function render() {
    const cont = document.getElementById("incidencias-container");
    const pag = document.getElementById("pagination");

    cont.innerHTML = "";
    pag.innerHTML = "";

    const filtradas = aplicarFiltros(incidencias);

    const total = filtradas.length;
    const totalPaginas = Math.ceil(total / POR_PAGINA);

    const inicio = (paginaActual - 1) * POR_PAGINA;
    const pagina = filtradas.slice(inicio, inicio + POR_PAGINA);

    pagina.forEach(inc => renderIncidencia(inc, cont));

    // Render paginación
    const prev = document.createElement("button");
    prev.textContent = "Anterior";
    prev.className = "page-btn";
    prev.disabled = paginaActual === 1;
    prev.onclick = () => { paginaActual--; render(); };

    const next = document.createElement("button");
    next.textContent = "Siguiente";
    next.className = "page-btn";
    next.disabled = paginaActual === totalPaginas;
    next.onclick = () => { paginaActual++; render(); };

    const label = document.createElement("span");
    label.textContent = `Página ${paginaActual} de ${totalPaginas}`;

    pag.appendChild(prev);
    pag.appendChild(label);
    pag.appendChild(next);
}

function renderIncidencia(inc, cont) {
    const card = document.createElement("div");
    card.className = "incidencia-card";

    card.innerHTML = `
      <div class="incidencia-header">
        <span class="incidencia-title">Hab. ${inc.habitacion.nombre}</span>
        <span>${new Date(inc.fecha).toLocaleString()}</span>
      </div>

      <div class="incidencia-desc">${inc.descripcion}</div>
    `;

    if (inc.fotos.length > 0) {
        const carrusel = document.createElement("div");
        carrusel.className = "carousel";

        inc.fotos.forEach((url, i) => {
            const img = document.createElement("img");
            img.src = url;
            img.className = i === 0 ? "active" : "";
            carrusel.appendChild(img);
        });

        if (inc.fotos.length > 1) {
            const left = document.createElement("button");
            left.className = "carousel-btn left";
            left.innerHTML = "◀";
            left.onclick = () => cambiarFoto(carrusel, -1);

            const right = document.createElement("button");
            right.className = "carousel-btn right";
            right.innerHTML = "▶";
            right.onclick = () => cambiarFoto(carrusel, 1);

            carrusel.appendChild(left);
            carrusel.appendChild(right);
        }

        card.appendChild(carrusel);
    }

    cont.appendChild(card);
}

function cambiarFoto(carrusel, dir) {
    const imgs = Array.from(carrusel.querySelectorAll("img"));
    const actual = imgs.findIndex(i => i.classList.contains("active"));

    imgs[actual].classList.remove("active");

    let nuevo = actual + dir;
    if (nuevo < 0) nuevo = imgs.length - 1;
    if (nuevo >= imgs.length) nuevo = 0;

    imgs[nuevo].classList.add("active");
}
