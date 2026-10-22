
const API_URL = import.meta.env.VITE_API_URL || "http://localhost:3000/api";

async function solicitar(ruta, opciones = {}) {
  let respuesta;

  try {
    respuesta = await fetch(`${API_URL}${ruta}`, {
      ...opciones,
      headers: {
        "Content-Type": "application/json",
        ...opciones.headers,
      },
    });
  } catch {
    throw new Error(
      "No se pudo conectar con el servidor. Verificá que el backend esté funcionando."
    );
  }

  const texto = await respuesta.text();
  let datos = null;

  if (texto) {
    try {
      datos = JSON.parse(texto);
    } catch {
      throw new Error("El servidor devolvió una respuesta no válida.");
    }
  }

  if (!respuesta.ok) {
    throw new Error(
      datos?.error ||
      datos?.mensaje ||
      `Error del servidor: ${respuesta.status}`
    );
  }

  return datos;
}

export const api = {
  obtener: (ruta) => solicitar(ruta),

  crear: (ruta, datos) =>
    solicitar(ruta, {
      method: "POST",
      body: JSON.stringify(datos),
    }),

  actualizar: (ruta, datos) =>
    solicitar(ruta, {
      method: "PUT",
      body: JSON.stringify(datos),
    }),

  eliminar: (ruta) =>
    solicitar(ruta, {
      method: "DELETE",
    }),

  modificar: (ruta, datos) =>
    solicitar(ruta, {
      method: "PATCH",
      body: JSON.stringify(datos),
    }),
};
