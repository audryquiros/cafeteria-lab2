
const db = require("../db");

// Listar todos los insumos.
function listarInsumos() {
  return db.prepare(`
    SELECT
      id,
      nombre,
      unidad,
      stock,
      stock_minimo,
      CASE
        WHEN stock <= stock_minimo THEN 1
        ELSE 0
      END AS necesita_reposicion
    FROM insumos
    ORDER BY nombre ASC
  `).all();
}

// Consultar un insumo por ID.
function obtenerInsumoPorId(id) {
  return db.prepare(`
    SELECT
      id,
      nombre,
      unidad,
      stock,
      stock_minimo,
      CASE
        WHEN stock <= stock_minimo THEN 1
        ELSE 0
      END AS necesita_reposicion
    FROM insumos
    WHERE id = ?
  `).get(id);
}

// Crear un insumo nuevo.
function crearInsumo({ nombre, unidad, stock, stock_minimo }) {
  const resultado = db.prepare(`
    INSERT INTO insumos (nombre, unidad, stock, stock_minimo)
    VALUES (?, ?, ?, ?)
  `).run(nombre, unidad, stock, stock_minimo);

  return obtenerInsumoPorId(Number(resultado.lastInsertRowid));
}

// Actualizar un insumo existente.
function actualizarInsumo(id, { nombre, unidad, stock, stock_minimo }) {
  const resultado = db.prepare(`
    UPDATE insumos
    SET nombre = ?, unidad = ?, stock = ?, stock_minimo = ?
    WHERE id = ?
  `).run(nombre, unidad, stock, stock_minimo, id);

  if (resultado.changes === 0) {
    return null;
  }

  return obtenerInsumoPorId(id);
}

// Eliminar un insumo si no está relacionado con una receta.
function eliminarInsumo(id) {
  const resultado = db.prepare(`
    DELETE FROM insumos
    WHERE id = ?
  `).run(id);

  return resultado.changes > 0;
}

module.exports = {
  listarInsumos,
  obtenerInsumoPorId,
  crearInsumo,
  actualizarInsumo,
  eliminarInsumo,
};
