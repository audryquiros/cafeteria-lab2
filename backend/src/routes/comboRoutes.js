
const express = require("express");
const router = express.Router();
const comboController = require("../controllers/comboController");

router.get("/", comboController.listar);
router.get("/:id", comboController.obtener);
router.post("/", comboController.crear);
router.put("/:id", comboController.actualizar);
router.delete("/:id", comboController.eliminar);

module.exports = router;
