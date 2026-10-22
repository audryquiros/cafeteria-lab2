
const db = require("./src/db");

try {
  const tablas = db
    .prepare(
      "SELECT name FROM sqlite_master WHERE type = 'table' ORDER BY name"
    )
    .all();

  console.log("Tablas encontradas en la base de datos:");
  console.table(tablas);
} catch (error) {
  console.error("Error al consultar la base de datos:", error.message);
} finally {
  db.close();
}
