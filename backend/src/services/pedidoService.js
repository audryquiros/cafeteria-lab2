
const db = require("../db");

const IMPUESTO = 0.13;

// Redondear importes monetarios a dos decimales.
function redondear(valor) {
  return Math.round((valor + Number.EPSILON) * 100) / 100;
}

// Crear un pedido, aplicar combos y descontar insumos
// dentro de una sola transacción.
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
      INSERT INTO pedidos
        (metodo_pago, subtotal, descuento, impuesto, total)
      VALUES (?, ?, ?, ?, ?)
    `);

    const guardarDetalle = db.prepare(`
      INSERT INTO pedido_items
        (pedido_id, producto_id, cantidad, precio_unitario)
      VALUES (?, ?, ?, ?)
    `);

    const guardarConsumoInsumo = db.prepare(`
      INSERT INTO pedido_insumos (pedido_id, insumo_id, cantidad)
      VALUES (?, ?, ?)
    `);

    const lineas = [];
    const necesidades = new Map();
    const cantidadesDisponibles = new Map();

    // Validar productos y calcular necesidades de inventario.
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
        importe: redondear(producto.precio * cantidad),
      });

      cantidadesDisponibles.set(
        producto.id,
        (cantidadesDisponibles.get(producto.id) || 0) + cantidad
      );
    }

    // Subtotal antes de aplicar descuentos.
    const subtotalOriginal = redondear(
      lineas.reduce((suma, linea) => suma + linea.importe, 0)
    );

    // Buscar combos activos y sus productos configurados.
    const combos = db.prepare(`
      SELECT id, nombre, descuento_porcentaje
      FROM combos
      WHERE activo = 1
      ORDER BY id ASC
    `).all();

    const obtenerComponentesCombo = db.prepare(`
      SELECT
        ci.producto_id,
        ci.cantidad,
        p.nombre AS producto,
        p.precio
      FROM combo_items ci
      INNER JOIN productos p ON p.id = ci.producto_id
      WHERE ci.combo_id = ?
      ORDER BY ci.producto_id
    `);

    let descuento = 0;
    const combosAplicados = [];

    // Evitar usar las mismas unidades en dos combos distintos.
    // El orden de aplicación es el ID ascendente del combo.
    for (const combo of combos) {
      const componentes = obtenerComponentesCombo.all(combo.id);

      if (componentes.length < 2) {
        continue;
      }

      let combinacionesCompletas = Infinity;

      for (const componente of componentes) {
        const disponibles =
          cantidadesDisponibles.get(componente.producto_id) || 0;

        const posibles = Math.floor(
          disponibles / componente.cantidad
        );

        combinacionesCompletas = Math.min(
          combinacionesCompletas,
          posibles
        );
      }

      if (
        !Number.isFinite(combinacionesCompletas) ||
        combinacionesCompletas <= 0
      ) {
        continue;
      }

      const importeCombo = componentes.reduce(
        (suma, componente) =>
          suma + componente.precio * componente.cantidad,
        0
      );

      const descuentoCombo = redondear(
        importeCombo *
          (combo.descuento_porcentaje / 100) *
          combinacionesCompletas
      );

      descuento = redondear(descuento + descuentoCombo);

      // Reservar las unidades utilizadas por este combo.
      for (const componente of componentes) {
        const restantes =
          (cantidadesDisponibles.get(componente.producto_id) || 0) -
          componente.cantidad * combinacionesCompletas;

        cantidadesDisponibles.set(
          componente.producto_id,
          restantes
        );
      }

      combosAplicados.push({
        combo_id: combo.id,
        nombre: combo.nombre,
        cantidad: combinacionesCompletas,
        descuento_porcentaje: combo.descuento_porcentaje,
        descuento: descuentoCombo,
      });
    }

    // Guardar subtotal neto: después del descuento.
    // El impuesto se calcula sobre el subtotal neto.
    if (descuento > subtotalOriginal) {
      const error = new Error(
        "El descuento calculado supera el subtotal del pedido"
      );
      error.status = 409;
      throw error;
    }

    const subtotal = redondear(subtotalOriginal - descuento);
    const impuesto = redondear(subtotal * IMPUESTO);
    const total = redondear(subtotal + impuesto);

    const pedido = guardarPedido.run(
      metodo_pago,
      subtotal,
      descuento,
      impuesto,
      total
    );

    const pedidoId = Number(pedido.lastInsertRowid);

    // Guardar las líneas originales: el descuento se registra
    // por separado en pedidos.descuento.
    for (const linea of lineas) {
      guardarDetalle.run(
        pedidoId,
        linea.producto_id,
        linea.cantidad,
        linea.precio_unitario
      );
    }

    // Descontar y registrar el consumo histórico de insumos.
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
      subtotal_original: subtotalOriginal,
      descuento,
      subtotal,
      impuesto,
      total,
      estado: "confirmado",
      productos: lineas,
      combos_aplicados: combosAplicados,
    };
  });

  return registrarPedido();
}

// Consultar todos los pedidos con sus detalles.
function listarPedidos() {
  const pedidos = db.prepare(`
    SELECT
      id, fecha, metodo_pago, subtotal,
      descuento, impuesto, total, estado
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
    SELECT
      id, fecha, metodo_pago, subtotal,
      descuento, impuesto, total, estado
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
      ROUND(SUM(descuento), 2) AS descuento,
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
      ROUND(COALESCE(SUM(descuento), 0), 2) AS descuento,
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
