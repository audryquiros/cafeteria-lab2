
require("dotenv").config();

const express = require("express");
const cors = require("cors");
const db = require("./db");

const app = express();
const PORT = process.env.PORT || 3000;

const productoRoutes = require("./routes/productoRoutes");
const inventarioRoutes = require("./routes/inventarioRoutes");
const recetaRoutes = require("./routes/recetaRoutes");
const pedidoRoutes = require("./routes/pedidoRoutes");
const resumenRoutes = require("./routes/resumenRoutes");

// Middlewares
app.use(cors());
app.use(express.json());

// Rutas de la API
app.use("/api/productos", productoRoutes);
app.use("/api/inventario", inventarioRoutes);
app.use("/api/recetas", recetaRoutes);
app.use("/api/pedidos", pedidoRoutes);
app.use("/api/resumen", resumenRoutes);

// Ruta inicial.
app.get("/", (req, res) => {
  res.status(200).json({
    mensaje: "API de la cafeteria funcionando",
  });
});

// Comprobar la conexión con SQLite.
app.get("/api/estado", (req, res) => {
  try {
    const resultado = db
      .prepare("SELECT COUNT(*) AS total FROM productos")
      .get();

    res.status(200).json({
      ok: true,
      baseDatos: "conectada",
      productos: resultado.total,
    });
  } catch (error) {
    console.error("Error al consultar SQLite:", error);

    res.status(500).json({
      error: "No se pudo consultar la base de datos",
    });
  }
});

// Manejo de rutas inexistentes.
app.use((req, res) => {
  res.status(404).json({
    error: "Ruta no encontrada",
    ruta: req.originalUrl,
  });
});

// Manejo global de errores.
app.use((error, req, res, next) => {
  console.error("Error no controlado:", error);

  if (res.headersSent) {
    return next(error);
  }

  if (error.type === "entity.parse.failed") {
    return res.status(400).json({
      error: "El cuerpo de la solicitud contiene JSON inválido",
    });
  }

  res.status(error.status || 500).json({
    error:
      error.status && error.status < 500
        ? error.message
        : "Error interno del servidor",
  });
});

app.listen(PORT, () => {
  console.log(`Servidor ejecutandose en http://localhost:${PORT}`);
});
