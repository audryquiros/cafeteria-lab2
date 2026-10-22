
const db = require("../db");

function obtenerResumen() {
  // 1. Cantidad de productos activos.
  const productos = db.prepare(`
    SELECT COUNT(*) AS total
    FROM productos
    WHERE activo = 1
  `).get();

  // 2. Cantidad de insumos registrados.
  const insumos = db.prepare(`
    SELECT COUNT(*) AS total
    FROM insumos
  `).get();

  // 3. Insumos que necesitan reposición.
  const insumosPorReponer = db.prepare(`
    SELECT COUNT(*) AS total
    FROM insumos
    WHERE stock <= stock_minimo
  `).get();

  // 4. Pedidos e ingresos confirmados del día.
  const pedidosHoy = db.prepare(`
    SELECT
      COUNT(*) AS cantidad,
      ROUND(COALESCE(SUM(total), 0), 2) AS ingresos
    FROM pedidos
    WHERE date(fecha) = date('now', 'localtime')
      AND estado = 'confirmado'
  `).get();

  // 5. Ventas de los últimos siete días.
  const ventasSemana = db.prepare(`
    WITH RECURSIVE dias(fecha, numero) AS (
      SELECT date('now', 'localtime', '-6 days'), 0

      UNION ALL

      SELECT date(fecha, '+1 day'), numero + 1
      FROM dias
      WHERE numero < 6
    )
    SELECT
      dias.fecha,
      CAST(strftime('%w', dias.fecha) AS INTEGER) AS dia_semana,
      ROUND(COALESCE(SUM(p.total), 0), 2) AS ingresos,
      COUNT(p.id) AS pedidos
    FROM dias
    LEFT JOIN pedidos p
      ON date(p.fecha) = dias.fecha
      AND p.estado = 'confirmado'
    GROUP BY dias.fecha, dias.numero
    ORDER BY dias.fecha ASC
  `).all();

  // 6. Los cinco productos más vendidos durante los últimos siete días.
  const productosMasVendidos = db.prepare(`
    SELECT
      pi.producto_id,
      pr.nombre AS producto,
      SUM(pi.cantidad) AS unidades_vendidas,
      ROUND(
        SUM(pi.cantidad * pi.precio_unitario),
        2
      ) AS ingresos
    FROM pedido_items pi
    INNER JOIN pedidos p
      ON p.id = pi.pedido_id
    INNER JOIN productos pr
      ON pr.id = pi.producto_id
    WHERE p.estado = 'confirmado'
      AND date(p.fecha) >= date('now', 'localtime', '-6 days')
      AND date(p.fecha) <= date('now', 'localtime')
    GROUP BY pi.producto_id, pr.nombre
    ORDER BY unidades_vendidas DESC, ingresos DESC
    LIMIT 5
  `).all();

  // 7. Detalle de los insumos que necesitan reposición.
  const alertasInventario = db.prepare(`
    SELECT
      id,
      nombre,
      stock,
      stock_minimo,
      unidad
    FROM insumos
    WHERE stock <= stock_minimo
    ORDER BY
      CASE
        WHEN stock_minimo > 0
          THEN CAST(stock AS REAL) / stock_minimo
        ELSE 0
      END ASC,
      nombre ASC
  `).all();

  // 8. Resumen general para el dashboard.
  return {
    productos_activos: productos.total,
    insumos_registrados: insumos.total,
    insumos_por_reponer: insumosPorReponer.total,
    pedidos_confirmados_hoy: pedidosHoy.cantidad,
    ingresos_hoy: pedidosHoy.ingresos,
    ventas_semana: ventasSemana,
    productos_mas_vendidos: productosMasVendidos,
    alertas_inventario: alertasInventario,
  };
}

module.exports = { obtenerResumen };
