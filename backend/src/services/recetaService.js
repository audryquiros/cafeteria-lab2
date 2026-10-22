
const db = require("../db");

function listarRecetas() {
  return db.prepare(`
    SELECT
      r.id,
      p.id AS producto_id,
      p.nombre AS producto,
      p.activo,
      i.id AS insumo_id,
      i.nombre AS insumo,
      r.cantidad,
      i.unidad,
      i.stock AS stock_disponible
    FROM recetas r
    INNER JOIN productos p ON p.id = r.producto_id
    INNER JOIN insumos i ON i.id = r.insumo_id
    ORDER BY p.nombre ASC, i.nombre ASC
  `).all();
}

function obtenerRecetaPorProducto(productoId) {
  return db.prepare(`
    SELECT
      r.id,
      p.id AS producto_id,
      p.nombre AS producto,
      p.activo,
      i.id AS insumo_id,
      i.nombre AS insumo,
      r.cantidad,
      i.unidad,
      i.stock AS stock_disponible
    FROM recetas r
    INNER JOIN productos p ON p.id = r.producto_id
    INNER JOIN insumos i ON i.id = r.insumo_id
    WHERE p.id = ?
    ORDER BY i.nombre ASC
  `).all(productoId);
}

function obtenerIngredientePorId(id) {
  return db.prepare(`
    SELECT
      r.id,
      p.id AS producto_id,
      p.nombre AS producto,
      p.activo,
      i.id AS insumo_id,
      i.nombre AS insumo,
      r.cantidad,
      i.unidad,
      i.stock AS stock_disponible
    FROM recetas r
    INNER JOIN productos p ON p.id = r.producto_id
    INNER JOIN insumos i ON i.id = r.insumo_id
    WHERE r.id = ?
  `).get(id);
}

function agregarIngrediente({ producto_id, insumo_id, cantidad }) {
  const insertar = db.prepare(`
    INSERT INTO recetas (producto_id, insumo_id, cantidad)
    VALUES (?, ?, ?)
  `);

  const resultado = insertar.run(
    producto_id,
    insumo_id,
    cantidad
  );

  return obtenerIngredientePorId(resultado.lastInsertRowid);
}

function actualizarIngrediente(id, { cantidad }) {
  const resultado = db.prepare(`
    UPDATE recetas
    SET cantidad = ?
    WHERE id = ?
  `).run(cantidad, id);

  if (resultado.changes === 0) {
    return null;
  }

  return obtenerIngredientePorId(id);
}

function eliminarIngrediente(id) {
  const resultado = db.prepare(`
    DELETE FROM recetas
    WHERE id = ?
  `).run(id);

  return resultado.changes > 0;
}

module.exports = {
  listarRecetas,
  obtenerRecetaPorProducto,
  obtenerIngredientePorId,
  agregarIngrediente,
  actualizarIngrediente,
  eliminarIngrediente,
};
