
const db = require("../db");

function listarCombos() {
  const combos = db.prepare(`
    SELECT id, nombre, descripcion, descuento_porcentaje, activo
    FROM combos
    ORDER BY nombre ASC
  `).all();

  const obtenerProductos = db.prepare(`
    SELECT ci.producto_id, p.nombre AS producto, ci.cantidad
    FROM combo_items ci
    JOIN productos p ON p.id = ci.producto_id
    WHERE ci.combo_id = ?
    ORDER BY p.nombre ASC
  `);

  return combos.map((combo) => ({
    ...combo,
    activo: Boolean(combo.activo),
    productos: obtenerProductos.all(combo.id),
  }));
}

function obtenerCombo(id) {
  const combo = db.prepare(`
    SELECT id, nombre, descripcion, descuento_porcentaje, activo
    FROM combos
    WHERE id = ?
  `).get(id);

  if (!combo) return null;

  return {
    ...combo,
    activo: Boolean(combo.activo),
    productos: db.prepare(`
      SELECT ci.producto_id, p.nombre AS producto, ci.cantidad
      FROM combo_items ci
      JOIN productos p ON p.id = ci.producto_id
      WHERE ci.combo_id = ?
      ORDER BY p.nombre ASC
    `).all(id),
  };
}

function validarDatos({
  nombre,
  descripcion = "",
  descuento_porcentaje = 10,
  activo = true,
  productos,
}) {
  const descuento = Number(descuento_porcentaje);

  if (typeof nombre !== "string" || !nombre.trim()) {
    const error = new Error("El nombre del combo es obligatorio");
    error.status = 400;
    throw error;
  }

  if (!Number.isFinite(descuento) || descuento <= 0 || descuento > 100) {
    const error = new Error("El descuento debe ser mayor que 0 y máximo 100");
    error.status = 400;
    throw error;
  }

  if (typeof activo !== "boolean" && ![0, 1].includes(activo)) {
    const error = new Error("El campo activo debe ser booleano");
    error.status = 400;
    throw error;
  }

  if (!Array.isArray(productos) || productos.length < 2) {
    const error = new Error(
      "Un combo debe incluir al menos dos productos distintos"
    );
    error.status = 400;
    throw error;
  }

  const normalizados = productos.map((item) => ({
    producto_id: Number(item.producto_id),
    cantidad: Number(item.cantidad),
  }));

  const datosInvalidos = normalizados.some(
    (item) =>
      !Number.isInteger(item.producto_id) ||
      item.producto_id <= 0 ||
      !Number.isInteger(item.cantidad) ||
      item.cantidad <= 0
  );

  if (datosInvalidos) {
    const error = new Error(
      "Cada producto requiere un ID y una cantidad entera positiva"
    );
    error.status = 400;
    throw error;
  }

  const ids = normalizados.map((item) => item.producto_id);

  if (new Set(ids).size !== ids.length) {
    const error = new Error(
      "No repitas productos; aumenta la cantidad requerida"
    );
    error.status = 400;
    throw error;
  }

  for (const item of normalizados) {
    const producto = db.prepare(`
      SELECT id
      FROM productos
      WHERE id = ? AND activo = 1
    `).get(item.producto_id);

    if (!producto) {
      const error = new Error(
        `El producto ${item.producto_id} no existe o está inactivo`
      );
      error.status = 400;
      throw error;
    }
  }

  return {
    nombre: nombre.trim(),
    descripcion: String(descripcion || "").trim(),
    descuento_porcentaje: descuento,
    activo: activo === true || activo === 1,
    productos: normalizados,
  };
}

function guardarCombo(id, datos) {
  const combo = validarDatos(datos);

  const guardar = db.transaction(() => {
    let comboId = id;

    if (id) {
      const existente = db.prepare(`
        SELECT id FROM combos WHERE id = ?
      `).get(id);

      if (!existente) {
        const error = new Error("No se encontró el combo");
        error.status = 404;
        throw error;
      }

      db.prepare(`
        UPDATE combos
        SET nombre = ?, descripcion = ?,
            descuento_porcentaje = ?, activo = ?
        WHERE id = ?
      `).run(
        combo.nombre,
        combo.descripcion,
        combo.descuento_porcentaje,
        combo.activo ? 1 : 0,
        id
      );

      db.prepare(`
        DELETE FROM combo_items WHERE combo_id = ?
      `).run(id);
    } else {
      const resultado = db.prepare(`
        INSERT INTO combos
          (nombre, descripcion, descuento_porcentaje, activo)
        VALUES (?, ?, ?, ?)
      `).run(
        combo.nombre,
        combo.descripcion,
        combo.descuento_porcentaje,
        combo.activo ? 1 : 0
      );

      comboId = Number(resultado.lastInsertRowid);
    }

    const insertarProducto = db.prepare(`
      INSERT INTO combo_items (combo_id, producto_id, cantidad)
      VALUES (?, ?, ?)
    `);

    for (const item of combo.productos) {
      insertarProducto.run(
        comboId,
        item.producto_id,
        item.cantidad
      );
    }

    return comboId;
  });

  return guardar();
}

function eliminarCombo(id) {
  const resultado = db.prepare(`
    DELETE FROM combos WHERE id = ?
  `).run(id);

  return resultado.changes > 0;
}

module.exports = {
  listarCombos,
  obtenerCombo,
  guardarCombo,
  eliminarCombo,
};
