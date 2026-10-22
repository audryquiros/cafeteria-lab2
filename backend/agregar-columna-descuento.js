
const db = require("./src/db");

try {
  const columnas = db.prepare("PRAGMA table_info(pedidos)").all();

  const existeDescuento = columnas.some(
    (columna) => columna.name === "descuento"
  );

  if (existeDescuento) {
    console.log("La columna descuento ya existe. No se hicieron cambios.");
  } else {
    db.exec(`
      ALTER TABLE pedidos
      ADD COLUMN descuento REAL NOT NULL DEFAULT 0
      CHECK (descuento >= 0);
    `);

    console.log("Columna descuento agregada correctamente.");
  }

  const pedidosColumnas = db
    .prepare("PRAGMA table_info(pedidos)")
    .all();

  console.log("\nColumnas actuales de pedidos:");
  console.table(
    pedidosColumnas.map((columna) => ({
      nombre: columna.name,
      tipo: columna.type,
      obligatorio: Boolean(columna.notnull),
      valorPorDefecto: columna.dflt_value,
    }))
  );
} catch (error) {
  console.error("Error al modificar pedidos:", error.message);
  process.exitCode = 1;
} finally {
  db.close();
}
