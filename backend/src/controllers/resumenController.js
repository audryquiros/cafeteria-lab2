const resumenService = require("../services/resumenService");

function obtener(req, res) {
  try {
    const resumen = resumenService.obtenerResumen();
    return res.status(200).json(resumen);
  } catch (error) {
    console.error("Error al obtener el resumen:", error);

    return res.status(500).json({
      error: "No se pudo obtener el resumen de la cafetería",
    });
  }
}

module.exports = { obtener };
