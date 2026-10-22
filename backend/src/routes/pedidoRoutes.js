
const express = require("express");
const router = express.Router();

const pedidoController = require("../controllers/pedidoController");

// Las rutas específicas deben ir antes de /:id.
router.get("/cierre-caja", pedidoController.cierreCaja);
router.get("/", pedidoController.listar);
router.post("/", pedidoController.crear);
router.patch("/:id/anular", pedidoController.anular);
router.get("/:id", pedidoController.obtenerPorId);

module.exports = router;
