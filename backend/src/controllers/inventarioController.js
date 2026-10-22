
const inventarioService = require("../services/inventarioService");

// Validar el ID recibido en la URL.
function validarId(id) {
  const numero = Number(id);
  return Number.isInteger(numero) && numero > 0 ? numero : null;
}

// Validar los datos de un insumo.
function validarDatos({ nombre, unidad, stock, stock_minimo }) {
  if (
    typeof nombre !== "string" ||
    !nombre.trim() ||
    typeof unidad !== "string" ||
    !unidad.trim()
  ) {
    return "El nombre y la unidad son obligatorios";
  }

  if (
    stock === undefined ||
    stock === null ||
    stock === "" ||
    stock_minimo === undefined ||
    stock_minimo === null ||
    stock_minimo === ""
  ) {
    return "El stock y el stock mínimo son obligatorios";
  }

  const stockNumero = Number(stock);
  const minimoNumero = Number(stock_minimo);

  if (
    !Number.isFinite(stockNumero) ||
    !Number.isFinite(minimoNumero) ||
    stockNumero < 0 ||
    minimoNumero < 0
  ) {
    return "El stock y el stock mínimo deben ser números no negativos";
  }

  return null;
}

function normalizarDatos(datos) {
  return {
    nombre: datos.nombre.trim(),
    unidad: datos.unidad.trim(),
    stock: Number(datos.stock),
    stock_minimo: Number(datos.stock_minimo),
  };
}

// GET /api/inventario
function listar(req, res) {
  try {
    return res.status(200).json(inventarioService.listarInsumos());
  } catch (error) {
    console.error(error);
    return res.status(500).json({
      error: "No se pudo consultar el inventario",
    });
  }
}

// GET /api/inventario/:id
function obtenerPorId(req, res) {
  const id = validarId(req.params.id);

  if (!id) {
    return res.status(400).json({
      error: "El ID debe ser un número entero positivo",
    });
  }

  try {
    const insumo = inventarioService.obtenerInsumoPorId(id);

    if (!insumo) {
      return res.status(404).json({
        error: "No se encontró el insumo",
      });
    }

    return res.status(200).json(insumo);
  } catch (error) {
    console.error(error);
    return res.status(500).json({
      error: "No se pudo consultar el insumo",
    });
  }
}

// POST /api/inventario
function crear(req, res) {
  const errorValidacion = validarDatos(req.body);

  if (errorValidacion) {
    return res.status(400).json({ error: errorValidacion });
  }

  try {
    const insumo = inventarioService.crearInsumo(
      normalizarDatos(req.body)
    );

    return res.status(201).json({
      mensaje: "Insumo creado correctamente",
      insumo,
    });
  } catch (error) {
    console.error(error);

    if (error.code === "SQLITE_CONSTRAINT_UNIQUE") {
      return res.status(409).json({
        error: "Ya existe un insumo con ese nombre",
      });
    }

    return res.status(500).json({
      error: "No se pudo crear el insumo",
    });
  }
}

// PUT /api/inventario/:id
function actualizar(req, res) {
  const id = validarId(req.params.id);

  if (!id) {
    return res.status(400).json({
      error: "El ID debe ser un número entero positivo",
    });
  }

  const errorValidacion = validarDatos(req.body);

  if (errorValidacion) {
    return res.status(400).json({ error: errorValidacion });
  }

  try {
    const insumo = inventarioService.actualizarInsumo(
      id,
      normalizarDatos(req.body)
    );

    if (!insumo) {
      return res.status(404).json({
        error: "No se encontró el insumo",
      });
    }

    return res.status(200).json({
      mensaje: "Insumo actualizado correctamente",
      insumo,
    });
  } catch (error) {
    console.error(error);

    if (error.code === "SQLITE_CONSTRAINT_UNIQUE") {
      return res.status(409).json({
        error: "Ya existe un insumo con ese nombre",
      });
    }

    return res.status(500).json({
      error: "No se pudo actualizar el insumo",
    });
  }
}

// DELETE /api/inventario/:id
function eliminar(req, res) {
  const id = validarId(req.params.id);

  if (!id) {
    return res.status(400).json({
      error: "El ID debe ser un número entero positivo",
    });
  }

  try {
    const eliminado = inventarioService.eliminarInsumo(id);

    if (!eliminado) {
      return res.status(404).json({
        error: "No se encontró el insumo",
      });
    }

    return res.status(200).json({
      mensaje: "Insumo eliminado correctamente",
    });
  } catch (error) {
    console.error(error);

    if (
      error.code === "SQLITE_CONSTRAINT_FOREIGNKEY"
    ) {
      return res.status(409).json({
        error: "No se puede eliminar el insumo porque está relacionado con una receta",
      });
    }

    return res.status(500).json({
      error: "No se pudo eliminar el insumo",
    });
  }
}

module.exports = {
  listar,
  obtenerPorId,
  crear,
  actualizar,
  eliminar,
};
