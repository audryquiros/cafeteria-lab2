
const comboService = require("../services/comboService");

function responderError(res, error) {
  const conflicto =
    error.code === "SQLITE_CONSTRAINT_UNIQUE" ||
    error.code === "SQLITE_CONSTRAINT_PRIMARYKEY";

  const status = conflicto
    ? 409
    : [400, 404, 409].includes(error.status)
      ? error.status
      : 500;

  const mensaje = conflicto
    ? "Ya existe un combo con ese nombre"
    : status === 500
      ? "No se pudo procesar el combo"
      : error.message;

  return res.status(status).json({ error: mensaje });
}

function listar(req, res) {
  try {
    return res.status(200).json(comboService.listarCombos());
  } catch (error) {
    console.error(error);
    return responderError(res, error);
  }
}

function obtener(req, res) {
  const id = Number(req.params.id);

  if (!Number.isInteger(id) || id <= 0) {
    return res.status(400).json({
      error: "El ID debe ser un entero positivo",
    });
  }

  try {
    const combo = comboService.obtenerCombo(id);

    return combo
      ? res.status(200).json(combo)
      : res.status(404).json({ error: "No se encontró el combo" });
  } catch (error) {
    console.error(error);
    return responderError(res, error);
  }
}

function crear(req, res) {
  try {
    const id = comboService.guardarCombo(null, req.body);

    return res.status(201).json({
      mensaje: "Combo creado correctamente",
      combo: comboService.obtenerCombo(id),
    });
  } catch (error) {
    console.error(error);
    return responderError(res, error);
  }
}

function actualizar(req, res) {
  const id = Number(req.params.id);

  if (!Number.isInteger(id) || id <= 0) {
    return res.status(400).json({
      error: "El ID debe ser un entero positivo",
    });
  }

  try {
    const comboId = comboService.guardarCombo(id, req.body);

    return res.status(200).json({
      mensaje: "Combo actualizado correctamente",
      combo: comboService.obtenerCombo(comboId),
    });
  } catch (error) {
    console.error(error);
    return responderError(res, error);
  }
}

function eliminar(req, res) {
  const id = Number(req.params.id);

  if (!Number.isInteger(id) || id <= 0) {
    return res.status(400).json({
      error: "El ID debe ser un entero positivo",
    });
  }

  try {
    return comboService.eliminarCombo(id)
      ? res.status(200).json({ mensaje: "Combo eliminado correctamente" })
      : res.status(404).json({ error: "No se encontró el combo" });
  } catch (error) {
    console.error(error);
    return responderError(res, error);
  }
}

module.exports = {
  listar,
  obtener,
  crear,
  actualizar,
  eliminar,
};
