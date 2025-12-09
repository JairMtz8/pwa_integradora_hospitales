// =========================
//      HOME RECEPCIÓN
// =========================

document.addEventListener("DOMContentLoaded", () => {
  const recep = JSON.parse(localStorage.getItem("recepcionista"));

  if (!recep) {
    window.location.href = "login.html";
    return;
  }

  // Título de saludo
  const titulo = document.getElementById("titulo");
  if (titulo) titulo.textContent = `Hola,\n${recep.nombre}`;

  // Menú inferior: cerrar sesión
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
          localStorage.removeItem("recepcionista");
          Swal.fire("Sesión cerrada", "Hasta pronto.", "success")
            .then(() => window.location.href = "login.html");
        }
      });
    });
  }

  // Animación
  const main = document.querySelector("main.page");
  if (main) {
    main.style.opacity = "0";
    main.style.transform = "translateY(10px)";
    requestAnimationFrame(() => {
      main.style.transition = "opacity .35s, transform .35s";
      main.style.opacity = "1";
      main.style.transform = "translateY(0)";
    });
  }
});


// =========================
//  FIREBASE MESSAGING
// =========================

if ("serviceWorker" in navigator) {

  navigator.serviceWorker.register("/pwa_integradora_hospitales/firebase-messaging-sw.js")
    .then(reg => {
      console.log("✔ FCM SW registrado:", reg);

      // Obtener token usando el SW correcto
      return messaging.getToken({
        vapidKey: "BCFr7D1TR67Ja2cvcZoIeX-c46t8Ichtj9nKKVmmw9rtD1lXuXKHSCReLqpb5U4u7kdleT5cZjOPLteVMueKIIY",
        serviceWorkerRegistration: reg
      });
    })
    .then(token => {

      console.log("📨 TOKEN RECEPCIÓN:", token);

      const recep = JSON.parse(localStorage.getItem("recepcionista"));
      if (!recep) return;

      // Guardar token en backend
      fetch(`${API_BASE_URL}/tokens/save`, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          recepcionistaId: recep.id,
          token: token
        })
      });
    })
    .catch(err => {
      console.error("❌ Error obteniendo token FCM:", err);
    });

}


// =========================
//  NOTIFICACIONES FOREGROUND
// =========================

messaging.onMessage(payload => {
  console.log("📩 Notificación en foreground:", payload);

  Swal.fire({
    icon: "info",
    title: payload.data.title,
    text: payload.data.body,
    timer: 3000
  });
});
