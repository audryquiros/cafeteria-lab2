const express = require("express");
const router = express.Router();

const productoController = require("../controllers/productoController");

router.get("/", productoController.listar);
router.get("/:id", productoController.obtenerPorId);
router.post("/", productoController.crear);
router.put("/:id", productoController.actualizar);
router.delete("/:id", productoController.eliminar);

module.exports = router;
