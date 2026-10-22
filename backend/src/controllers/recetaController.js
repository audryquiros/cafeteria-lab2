
const recetaService = require("../services/recetaService");

function listar(req, res, next) {
  try {
    const filas = recetaService.listarRecetas();
    const recetas = new Map();

    for (const fila of filas) {
      if (!recetas.has(fila.producto_id)) {
        recetas.set(fila.producto_id, {
          producto_id: fila.producto_id,
          producto: fila.producto,
          activo: Boolean(fila.activo),
          disponible: Boolean(fila.activo),
          insumos: [],
        });
      }

      const receta = recetas.get(fila.producto_id);

      receta.insumos.push({
        id: fila.id,
        insumo_id: fila.insumo_id,
        insumo: fila.insumo,
        cantidad_necesaria: fila.cantidad,
        unidad: fila.unidad,
        stock_disponible: fila.stock_disponible,
      });

      if (
        !Boolean(fila.activo) ||
        fila.stock_disponible < fila.cantidad
      ) {
        receta.disponible = false;
      }
    }

    res.json([...recetas.values()]);
  } catch (error) {
    next(error);
  }
}

function obtenerPorProducto(req, res, next) {
  try {
    const productoId = Number(req.params.productoId);

    if (!Number.isInteger(productoId) || productoId <= 0) {
      return res.status(400).json({
        error: "El ID del producto debe ser un entero positivo.",
      });
    }

    const filas = recetaService.obtenerRecetaPorProducto(productoId);

    if (filas.length === 0) {
      return res.status(404).json({
        error: "El producto no tiene una receta registrada.",
      });
    }

    const disponible = filas.every(
      (fila) => fila.stock_disponible >= fila.cantidad
    );

    res.json({
      producto_id: filas[0].producto_id,
      producto: filas[0].producto,
      activo: Boolean(filas[0].activo),
      disponible: Boolean(filas[0].activo) && disponible,
      insumos: filas.map((fila) => ({
        id: fila.id,
        insumo_id: fila.insumo_id,
        insumo: fila.insumo,
        cantidad_necesaria: fila.cantidad,
        unidad: fila.unidad,
        stock_disponible: fila.stock_disponible,
      })),
    });
  } catch (error) {
    next(error);
  }
}

function validarId(valor) {
  const id = Number(valor);
  return Number.isInteger(id) && id > 0 ? id : null;
}

function validarCantidad(valor) {
  const cantidad = Number(valor);

  return Number.isFinite(cantidad) && cantidad > 0
    ? cantidad
    : null;
}

function agregarIngrediente(req, res, next) {
  try {
    const producto_id = validarId(req.body.producto_id);
    const insumo_id = validarId(req.body.insumo_id);
    const cantidad = validarCantidad(req.body.cantidad);

    if (!producto_id || !insumo_id || cantidad === null) {
      return res.status(400).json({
        error:
          "Debés indicar un producto, un insumo y una cantidad mayor que cero.",
      });
    }

    const ingrediente = recetaService.agregarIngrediente({
      producto_id,
      insumo_id,
      cantidad,
    });

    res.status(201).json({
      mensaje: "Ingrediente agregado a la receta correctamente.",
      ingrediente,
    });
  } catch (error) {
    if (error.code === "SQLITE_CONSTRAINT_UNIQUE") {
      return res.status(409).json({
        error: "Este insumo ya forma parte de la receta del producto.",
      });
    }

    if (error.code === "SQLITE_CONSTRAINT_FOREIGNKEY") {
      return res.status(400).json({
        error: "El producto o el insumo seleccionado no existe.",
      });
    }

    next(error);
  }
}

function actualizarIngrediente(req, res, next) {
  try {
    const id = validarId(req.params.id);
    const cantidad = validarCantidad(req.body.cantidad);

    if (!id || cantidad === null) {
      return res.status(400).json({
        error: "Indicá un ID válido y una cantidad mayor que cero.",
      });
    }

    const ingrediente = recetaService.actualizarIngrediente(id, {
      cantidad,
    });

    if (!ingrediente) {
      return res.status(404).json({
        error: "No se encontró el ingrediente de la receta.",
      });
    }

    res.json({
      mensaje: "Cantidad del ingrediente actualizada correctamente.",
      ingrediente,
    });
  } catch (error) {
    next(error);
  }
}

function eliminarIngrediente(req, res, next) {
  try {
    const id = validarId(req.params.id);

    if (!id) {
      return res.status(400).json({
        error: "El ID del ingrediente debe ser un entero positivo.",
      });
    }

    const eliminado = recetaService.eliminarIngrediente(id);

    if (!eliminado) {
      return res.status(404).json({
        error: "No se encontró el ingrediente de la receta.",
      });
    }

    res.json({
      mensaje: "Ingrediente eliminado de la receta correctamente.",
    });
  } catch (error) {
    next(error);
  }
}

module.exports = {
  listar,
  obtenerPorProducto,
  agregarIngrediente,
  actualizarIngrediente,
  eliminarIngrediente,
};
