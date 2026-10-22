
const db = require("./src/db");

try {
  const resultado = db.prepare("SELECT sqlite_version() AS version").get();

  console.log("¡Conexión con SQLite exitosa!");
  console.log("Versión de SQLite:", resultado.version);
} catch (error) {
  console.error("Error al conectar con SQLite:", error.message);
  process.exitCode = 1;
} finally {
  db.close();
}
    