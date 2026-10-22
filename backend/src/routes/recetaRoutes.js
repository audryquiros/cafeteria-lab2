
const express = require("express");
const router = express.Router();

const recetaController = require("../controllers/recetaController");

// Consultar todas las recetas
router.get("/", recetaController.listar);

// Consultar la receta de un producto específico
router.get("/producto/:productoId", recetaController.obtenerPorProducto);

// Agregar un ingrediente a una receta
router.post("/", recetaController.agregarIngrediente);

// Actualizar la cantidad de un ingrediente
router.put("/:id", recetaController.actualizarIngrediente);

// Eliminar un ingrediente de una receta
router.delete("/:id", recetaController.eliminarIngrediente);

module.exports = router;
