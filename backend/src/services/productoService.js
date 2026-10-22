const db = require("../db");

function listarProductos() {
  return db.prepare(`
    SELECT id, nombre, precio, categoria, activo
    FROM productos
    ORDER BY nombre ASC
  `).all();
}

function obtenerProductoPorId(id) {
  return db.prepare(`
    SELECT id, nombre, precio, categoria, activo
    FROM productos
    WHERE id = ?
  `).get(id);
}


function crearProducto({ nombre, precio, categoria }) {
  const resultado = db.prepare(`
    INSERT INTO productos (nombre, precio, categoria)
    VALUES (?, ?, ?)
  `).run(nombre, precio, categoria);

  return db.prepare(`
    SELECT id, nombre, precio, categoria, activo
    FROM productos
    WHERE id = ?
  `).get(resultado.lastInsertRowid);
}


function actualizarProducto(id, { nombre, precio, categoria, activo }) {
  const resultado = db.prepare(`
    UPDATE productos
    SET nombre = ?, precio = ?, categoria = ?, activo = ?
    WHERE id = ?
  `).run(nombre, precio, categoria, activo, id);

  if (resultado.changes === 0) {
    return null;
  }

  return db.prepare(`
    SELECT id, nombre, precio, categoria, activo
    FROM productos
    WHERE id = ?
  `).get(id);
}


function eliminarProducto(id) {
  const resultado = db.prepare(`
    DELETE FROM productos
    WHERE id = ?
  `).run(id);

  return resultado.changes > 0;
}


module.exports = {
  listarProductos,
  obtenerProductoPorId,
  crearProducto,
  actualizarProducto,
  eliminarProducto,
};
