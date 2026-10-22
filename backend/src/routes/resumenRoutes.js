const express = require("express");
const router = express.Router();

const resumenController = require("../controllers/resumenController");

router.get("/", resumenController.obtener);

module.exports = router;
