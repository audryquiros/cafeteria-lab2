
const productoService = require("../services/productoService");

function listar(req, res) {
  try {
    const productos = productoService.listarProductos();
    res.status(200).json(productos);
  } catch (error) {
    console.error(error);
    res.status(500).json({
      error: "No se pudieron consultar los productos",
    });
  }
}

function obtenerPorId(req, res) {
  const id = Number(req.params.id);

  if (!Number.isInteger(id) || id <= 0) {
    return res.status(400).json({
      error: "El ID debe ser un entero positivo",
    });
  }

  try {
    const producto = productoService.obtenerProductoPorId(id);

    if (!producto) {
      return res.status(404).json({
        error: "Producto no encontrado",
      });
    }

    res.status(200).json(producto);
  } catch (error) {
    console.error(error);
    res.status(500).json({
      error: "No se pudo consultar el producto",
    });
  }
}

// NUEVA FUNCIÓN: crear un producto.
function crear(req, res) {
  const { nombre, precio, categoria } = req.body;

  if (
    typeof nombre !== "string" ||
    !nombre.trim() ||
    typeof categoria !== "string" ||
    !categoria.trim() ||
    typeof precio !== "number" ||
    !Number.isFinite(precio) ||
    precio <= 0
  ) {
    return res.status(400).json({
      error: "Nombre, categoria y precio positivo son obligatorios",
    });
  }

  try {
    const producto = productoService.crearProducto({
      nombre: nombre.trim(),
      precio,
      categoria: categoria.trim(),
    });

    return res.status(201).json(producto);
  } catch (error) {
    if (error.code === "SQLITE_CONSTRAINT_UNIQUE") {
      return res.status(409).json({
        error: "Ya existe un producto con ese nombre",
      });
    }

    console.error(error);
    return res.status(500).json({
      error: "No se pudo crear el producto",
    });
  }
}


function actualizar(req, res) {
  const id = Number(req.params.id);
  const { nombre, precio, categoria, activo } = req.body;

  if (!Number.isInteger(id) || id <= 0) {
    return res.status(400).json({
      error: "El ID debe ser un entero positivo",
    });
  }

  if (
    typeof nombre !== "string" ||
    !nombre.trim() ||
    typeof categoria !== "string" ||
    !categoria.trim() ||
    typeof precio !== "number" ||
    !Number.isFinite(precio) ||
    precio <= 0 ||
    ![0, 1].includes(activo)
  ) {
    return res.status(400).json({
      error: "Datos invalidos para actualizar el producto",
    });
  }

  try {
    const producto = productoService.actualizarProducto(id, {
      nombre: nombre.trim(),
      precio,
      categoria: categoria.trim(),
      activo,
    });

    if (!producto) {
      return res.status(404).json({
        error: "Producto no encontrado",
      });
    }

    return res.status(200).json(producto);
  } catch (error) {
    if (error.code === "SQLITE_CONSTRAINT_UNIQUE") {
      return res.status(409).json({
        error: "Ya existe un producto con ese nombre",
      });
    }

    console.error(error);
    return res.status(500).json({
      error: "No se pudo actualizar el producto",
    });
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
    const eliminado = productoService.eliminarProducto(id);

    if (!eliminado) {
      return res.status(404).json({
        error: "Producto no encontrado",
      });
    }

    return res.status(200).json({
      mensaje: "Producto eliminado correctamente",
    });
  } catch (error) {
    if (error.code === "SQLITE_CONSTRAINT_FOREIGNKEY") {
      return res.status(409).json({
        error: "No se puede eliminar un producto que tiene recetas o ventas registradas",
      });
    }

    console.error(error);
    return res.status(500).json({
      error: "No se pudo eliminar el producto",
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
