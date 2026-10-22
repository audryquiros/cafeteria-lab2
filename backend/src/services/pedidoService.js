
const db = require("../db");

const IMPUESTO = 0.13;

// Crear un pedido y descontar los insumos en una transacción.
function crearPedido({ metodo_pago, productos }) {
  const registrarPedido = db.transaction(() => {
    if (!Array.isArray(productos) || productos.length === 0) {
      const error = new Error("El pedido debe incluir al menos un producto");
      error.status = 400;
      throw error;
    }

    if (!["efectivo", "tarjeta", "transferencia"].includes(metodo_pago)) {
      const error = new Error("El método de pago no es válido");
      error.status = 400;
      throw error;
    }

    const obtenerProducto = db.prepare(`
      SELECT id, nombre, precio
      FROM productos
      WHERE id = ? AND activo = 1
    `);

    const obtenerReceta = db.prepare(`
      SELECT r.insumo_id, r.cantidad, i.nombre AS insumo, i.stock
      FROM recetas r
      INNER JOIN insumos i ON i.id = r.insumo_id
      WHERE r.producto_id = ?
    `);

    const descontarInsumo = db.prepare(`
      UPDATE insumos
      SET stock = stock - ?
      WHERE id = ? AND stock >= ?
    `);

    const guardarPedido = db.prepare(`
      INSERT INTO pedidos (metodo_pago, subtotal, impuesto, total)
      VALUES (?, ?, ?, ?)
    `);

    const guardarDetalle = db.prepare(`
      INSERT INTO pedido_items
        (pedido_id, producto_id, cantidad, precio_unitario)
      VALUES (?, ?, ?, ?)
    `);

    // Registrar los insumos consumidos por cada pedido.
    const guardarConsumoInsumo = db.prepare(`
      INSERT INTO pedido_insumos (pedido_id, insumo_id, cantidad)
      VALUES (?, ?, ?)
    `);

    const lineas = [];
    const necesidades = new Map();

    for (const item of productos) {
      const productoId = Number(item.producto_id);
      const cantidad = Number(item.cantidad);

      if (
        !Number.isInteger(productoId) ||
        productoId <= 0 ||
        !Number.isInteger(cantidad) ||
        cantidad <= 0
      ) {
        const error = new Error(
          "Cada producto debe tener un ID y una cantidad válidos"
        );
        error.status = 400;
        throw error;
      }

      const producto = obtenerProducto.get(productoId);

      if (!producto) {
        const error = new Error(
          `El producto ${productoId} no existe o está inactivo`
        );
        error.status = 404;
        throw error;
      }

      const receta = obtenerReceta.all(productoId);

      if (receta.length === 0) {
        const error = new Error(
          `El producto ${producto.nombre} no tiene receta`
        );
        error.status = 409;
        throw error;
      }

      for (const ingrediente of receta) {
        const requerida = ingrediente.cantidad * cantidad;
        const acumulada =
          (necesidades.get(ingrediente.insumo_id) || 0) + requerida;

        if (acumulada > ingrediente.stock) {
          const error = new Error(
            `Inventario insuficiente de ${ingrediente.insumo}`
          );
          error.status = 409;
          throw error;
        }

        necesidades.set(ingrediente.insumo_id, acumulada);
      }

      lineas.push({
        producto_id: producto.id,
        nombre: producto.nombre,
        cantidad,
        precio_unitario: producto.precio,
        importe: producto.precio * cantidad,
      });
    }

    const subtotal = Math.round(
      lineas.reduce((suma, linea) => suma + linea.importe, 0) * 100
    ) / 100;

    const impuesto = Math.round(subtotal * IMPUESTO * 100) / 100;
    const total = Math.round((subtotal + impuesto) * 100) / 100;

    const pedido = guardarPedido.run(
      metodo_pago,
      subtotal,
      impuesto,
      total
    );

    const pedidoId = Number(pedido.lastInsertRowid);

    for (const linea of lineas) {
      guardarDetalle.run(
        pedidoId,
        linea.producto_id,
        linea.cantidad,
        linea.precio_unitario
      );
    }

    // Descontar y registrar cada consumo dentro de la misma transacción.
    for (const [insumoId, cantidadRequerida] of necesidades) {
      const resultado = descontarInsumo.run(
        cantidadRequerida,
        insumoId,
        cantidadRequerida
      );

      if (resultado.changes !== 1) {
        const error = new Error(
          "No hay existencias suficientes para completar el pedido"
        );
        error.status = 409;
        throw error;
      }

      guardarConsumoInsumo.run(
        pedidoId,
        insumoId,
        cantidadRequerida
      );
    }

    return {
      id: pedidoId,
      metodo_pago,
      subtotal,
      impuesto,
      total,
      estado: "confirmado",
      productos: lineas,
    };
  });

  return registrarPedido();
}

// Consultar todos los pedidos con sus detalles.
function listarPedidos() {
  const pedidos = db.prepare(`
    SELECT id, fecha, metodo_pago, subtotal, impuesto, total, estado
    FROM pedidos
    ORDER BY id DESC
  `).all();

  const obtenerDetalles = db.prepare(`
    SELECT
      pi.id,
      pi.producto_id,
      p.nombre AS producto,
      pi.cantidad,
      pi.precio_unitario,
      pi.cantidad * pi.precio_unitario AS importe
    FROM pedido_items pi
    INNER JOIN productos p ON p.id = pi.producto_id
    WHERE pi.pedido_id = ?
    ORDER BY pi.id ASC
  `);

  return pedidos.map((pedido) => ({
    ...pedido,
    productos: obtenerDetalles.all(pedido.id),
  }));
}

// Consultar un pedido por su ID.
function obtenerPedidoPorId(id) {
  const pedido = db.prepare(`
    SELECT id, fecha, metodo_pago, subtotal, impuesto, total, estado
    FROM pedidos
    WHERE id = ?
  `).get(id);

  if (!pedido) {
    return null;
  }

  const productos = db.prepare(`
    SELECT
      pi.id,
      pi.producto_id,
      p.nombre AS producto,
      pi.cantidad,
      pi.precio_unitario,
      pi.cantidad * pi.precio_unitario AS importe
    FROM pedido_items pi
    INNER JOIN productos p ON p.id = pi.producto_id
    WHERE pi.pedido_id = ?
    ORDER BY pi.id ASC
  `).all(id);

  return { ...pedido, productos };
}

// Anular un pedido dentro de los primeros 15 minutos.
function anularPedido(id) {
  const ejecutarAnulacion = db.transaction(() => {
    const pedido = db.prepare(`
      SELECT id, fecha, estado
      FROM pedidos
      WHERE id = ?
    `).get(id);

    if (!pedido) {
      const error = new Error("No se encontró el pedido");
      error.status = 404;
      throw error;
    }

    if (pedido.estado === "anulado") {
      const error = new Error("El pedido ya fue anulado");
      error.status = 409;
      throw error;
    }

    const fechaPedido = new Date(pedido.fecha.replace(" ", "T"));
    const ahora = new Date();

    if (
      Number.isNaN(fechaPedido.getTime()) ||
      ahora.getTime() - fechaPedido.getTime() > 15 * 60 * 1000 ||
      ahora.getTime() < fechaPedido.getTime()
    ) {
      const error = new Error(
        "El pedido solo puede anularse dentro de los primeros 15 minutos"
      );
      error.status = 409;
      throw error;
    }

    // Recuperar el consumo histórico, no la receta actual.
    const consumos = db.prepare(`
      SELECT insumo_id, cantidad
      FROM pedido_insumos
      WHERE pedido_id = ?
    `).all(id);

    // No restaurar cantidades inventadas para pedidos antiguos.
    if (consumos.length === 0) {
      const error = new Error(
        "Este pedido no tiene un registro histórico de insumos y no puede anularse automáticamente con seguridad"
      );
      error.status = 409;
      throw error;
    }

    const devolverInsumo = db.prepare(`
      UPDATE insumos
      SET stock = stock + ?
      WHERE id = ?
    `);

    for (const consumo of consumos) {
      const resultado = devolverInsumo.run(
        consumo.cantidad,
        consumo.insumo_id
      );

      if (resultado.changes !== 1) {
        const error = new Error(
          `No se pudo devolver el insumo ${consumo.insumo_id}`
        );
        error.status = 409;
        throw error;
      }
    }

    const actualizacion = db.prepare(`
      UPDATE pedidos
      SET estado = 'anulado'
      WHERE id = ? AND estado = 'confirmado'
    `).run(id);

    if (actualizacion.changes !== 1) {
      const error = new Error("El pedido ya fue anulado");
      error.status = 409;
      throw error;
    }

    return {
      id: pedido.id,
      estado: "anulado",
      mensaje: "Pedido anulado y existencias devueltas correctamente",
    };
  });

  return ejecutarAnulacion();
}

// Obtener el cierre de caja de una fecha determinada.
function obtenerCierreCaja(fecha) {
  const fechaConsulta =
    fecha || new Date().toLocaleDateString("en-CA");

  if (!/^\d{4}-\d{2}-\d{2}$/.test(fechaConsulta)) {
    const error = new Error("La fecha debe tener el formato AAAA-MM-DD");
    error.status = 400;
    throw error;
  }

  const [anio, mes, dia] = fechaConsulta.split("-").map(Number);
  const fechaUTC = new Date(Date.UTC(anio, mes - 1, dia));

  if (
    fechaUTC.getUTCFullYear() !== anio ||
    fechaUTC.getUTCMonth() !== mes - 1 ||
    fechaUTC.getUTCDate() !== dia
  ) {
    const error = new Error("La fecha indicada no es válida");
    error.status = 400;
    throw error;
  }

  const ventasPorMetodo = db.prepare(`
    SELECT
      metodo_pago,
      COUNT(*) AS cantidad_pedidos,
      ROUND(SUM(subtotal), 2) AS subtotal,
      ROUND(SUM(impuesto), 2) AS impuesto,
      ROUND(SUM(total), 2) AS total
    FROM pedidos
    WHERE date(fecha) = ?
      AND estado = 'confirmado'
    GROUP BY metodo_pago
    ORDER BY metodo_pago
  `).all(fechaConsulta);

  const totales = db.prepare(`
    SELECT
      COUNT(*) AS cantidad_pedidos,
      ROUND(COALESCE(SUM(subtotal), 0), 2) AS subtotal,
      ROUND(COALESCE(SUM(impuesto), 0), 2) AS impuesto,
      ROUND(COALESCE(SUM(total), 0), 2) AS total
    FROM pedidos
    WHERE date(fecha) = ?
      AND estado = 'confirmado'
  `).get(fechaConsulta);

  const productosMasVendidos = db.prepare(`
    SELECT
      p.id AS producto_id,
      p.nombre AS producto,
      SUM(pi.cantidad) AS unidades_vendidas,
      ROUND(SUM(pi.cantidad * pi.precio_unitario), 2) AS importe
    FROM pedido_items pi
    INNER JOIN pedidos pe ON pe.id = pi.pedido_id
    INNER JOIN productos p ON p.id = pi.producto_id
    WHERE date(pe.fecha) = ?
      AND pe.estado = 'confirmado'
    GROUP BY p.id, p.nombre
    ORDER BY unidades_vendidas DESC, importe DESC
    LIMIT 5
  `).all(fechaConsulta);

  return {
    fecha: fechaConsulta,
    totales,
    ventas_por_metodo: ventasPorMetodo,
    productos_mas_vendidos: productosMasVendidos,
  };
}

module.exports = {
  crearPedido,
  listarPedidos,
  obtenerPedidoPorId,
  anularPedido,
  obtenerCierreCaja,
};
