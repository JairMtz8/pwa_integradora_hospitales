let historial = [];
let paginaActual = 1;
const POR_PAGINA = 10;

let filtroRol = "";

document.addEventListener("DOMContentLoaded", () => {
    cargarHistorial();

    document.getElementById("btn-aplicar").addEventListener("click", () => {
        filtroRol = document.getElementById("filtro-rol").value;
        paginaActual = 1;
        render();
    });

    document.getElementById("btn-limpiar").addEventListener("click", () => {
        filtroRol = "";
        document.getElementById("filtro-rol").value = "";
        paginaActual = 1;
        render();
    });
});

async function cargarHistorial() {
    try {
        const res = await fetch(`${API_BASE_URL}/historico`);
        historial = await res.json();

        // Ordenar por fecha DESC
        historial.sort((a, b) => new Date(b.fecha) - new Date(a.fecha));

        render();
    } catch (e) {
        Swal.fire("Error", "No se pudo cargar el historial", "error");
    }
}

function aplicarFiltros(data) {
    return data.filter(h => {
        const okRol = filtroRol === "" || h.rol === filtroRol;
        return okRol;
    });
}

function render() {
    const cont = document.getElementById("historial-container");
    const pag = document.getElementById("pagination");

    cont.innerHTML = "";
    pag.innerHTML = "";

    const filtrado = aplicarFiltros(historial);
    const total = filtrado.length;
    const totalPaginas = Math.ceil(total / POR_PAGINA);

    const inicio = (paginaActual - 1) * POR_PAGINA;
    const pagina = filtrado.slice(inicio, inicio + POR_PAGINA);

    pagina.forEach(reg => renderHistorialCard(reg, cont));

    // PAGINACIÓN
    const prev = document.createElement("button");
    prev.textContent = "Anterior";
    prev.disabled = paginaActual === 1;
    prev.className = "page-btn";
    prev.onclick = () => { paginaActual--; render(); };

    const next = document.createElement("button");
    next.textContent = "Siguiente";
    next.disabled = paginaActual === totalPaginas;
    next.className = "page-btn";
    next.onclick = () => { paginaActual++; render(); };

    const label = document.createElement("span");
    label.textContent = `Página ${paginaActual} de ${totalPaginas}`;

    pag.appendChild(prev);
    pag.appendChild(label);
    pag.appendChild(next);
}

function renderHistorialCard(h, cont) {
    const card = document.createElement("div");
    card.className = "hist-card";

    card.innerHTML = `
        <div class="hist-header">
            <span>${h.nombreHabitacion}</span>
            <span>${new Date(h.fecha).toLocaleString()}</span>
        </div>

        <div class="hist-mov">${h.movimiento}</div>
        <div class="hist-rol">Realizado por: <b>${h.rol}</b></div>
    `;

    cont.appendChild(card);
}
