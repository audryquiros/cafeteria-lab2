
const fs = require("fs");
const path = require("path");
const db = require("./src/db");

try {
  const rutaSQL = path.join(__dirname, "migracion-combos.sql");
  const sql = fs.readFileSync(rutaSQL, "utf8");

  db.exec(sql);

  const tablas = db.prepare(`
    SELECT name
    FROM sqlite_master
    WHERE type = 'table'
      AND name IN ('combos', 'combo_items')
    ORDER BY name
  `).all();

  console.log("Migración ejecutada correctamente.");
  console.table(tablas);
} catch (error) {
  console.error("Error al aplicar la migración:", error.message);
  process.exitCode = 1;
} finally {
  db.close();
}
