
const pedidoService = require("../services/pedidoService");

// Crear un pedido.
function crear(req, res) {
  try {
    const pedido = pedidoService.crearPedido(req.body);

    return res.status(201).json({
      mensaje: "Pedido registrado correctamente",
      pedido,
    });
  } catch (error) {
    console.error("Error al registrar el pedido:", error);

    const status = [400, 404, 409].includes(error.status)
      ? error.status
      : 500;

    return res.status(status).json({
      error:
        status === 500
          ? "No se pudo registrar el pedido"
          : error.message,
    });
  }
}

// Consultar todos los pedidos.
function listar(req, res) {
  try {
    const pedidos = pedidoService.listarPedidos();
    return res.status(200).json(pedidos);
  } catch (error) {
    console.error("Error al consultar pedidos:", error);

    return res.status(500).json({
      error: "No se pudieron consultar los pedidos",
    });
  }
}

// Consultar un pedido por ID.
function obtenerPorId(req, res) {
  const id = Number(req.params.id);

  if (!Number.isInteger(id) || id <= 0) {
    return res.status(400).json({
      error: "El ID debe ser un número entero positivo",
    });
  }

  try {
    const pedido = pedidoService.obtenerPedidoPorId(id);

    if (!pedido) {
      return res.status(404).json({
        error: "No se encontró el pedido",
      });
    }

    return res.status(200).json(pedido);
  } catch (error) {
    console.error("Error al consultar el pedido:", error);

    return res.status(500).json({
      error: "No se pudo consultar el pedido",
    });
  }
}


function anular(req, res) {
  const id = Number(req.params.id);

  if (!Number.isInteger(id) || id <= 0) {
    return res.status(400).json({
      error: "El ID debe ser un número entero positivo",
    });
  }

  try {
    const resultado = pedidoService.anularPedido(id);
    return res.status(200).json(resultado);
  } catch (error) {
    console.error("Error al anular el pedido:", error);

    const status = [400, 404, 409].includes(error.status)
      ? error.status
      : 500;

    return res.status(status).json({
      error:
        status === 500
          ? "No se pudo anular el pedido"
          : error.message,
    });
  }
}


function cierreCaja(req, res) {
  try {
    const fecha = req.query.fecha;
    const resultado = pedidoService.obtenerCierreCaja(fecha);

    return res.status(200).json(resultado);
  } catch (error) {
    console.error("Error al consultar el cierre de caja:", error);

    const status = error.status === 400 ? 400 : 500;

    return res.status(status).json({
      error:
        status === 400
          ? error.message
          : "No se pudo consultar el cierre de caja",
    });
  }
}



module.exports = {
  crear,
  listar,
  obtenerPorId,
  anular,
  cierreCaja,
};
