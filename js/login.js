document.addEventListener("DOMContentLoaded", () => {
  const btn = document.getElementById("btn-login");

  btn.addEventListener("click", async () => {
    const usuario = document.getElementById("usuario").value.trim();
    const password = document.getElementById("password").value.trim();

    if (!usuario || !password) {
      Swal.fire("Campos vacíos", "Ingresa usuario y contraseña.", "warning");
      return;
    }

    try {
      const res = await fetch(`${API_BASE_URL}/auth/login`, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ usuario, password })
      });

      if (!res.ok) {
        Swal.fire("Error", "Credenciales incorrectas", "error");
        return;
      }

      const data = await res.json();

      if (data.tipo === "recepcionista") {
        localStorage.setItem("recepcionista", JSON.stringify(data.data));
        window.location.href = "home.html";
      } 
      else if (data.tipo === "camarera") {
        localStorage.setItem("camarera", JSON.stringify(data.data));
        window.location.href = "home-camarera.html";
      } 
      else {
        Swal.fire("Error", "Usuario no reconocido.", "error");
      }

    } catch (err) {
      console.error(err);
      Swal.fire("Error", "No se pudo conectar al servidor.", "error");
    }
  });
});
