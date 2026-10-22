
const db = require("./src/db");

try {
  for (const tabla of ["combos", "combo_items"]) {
    console.log(`\nEstructura de ${tabla}:`);

    const columnas = db
      .prepare(`PRAGMA table_info(${tabla})`)
      .all();

    console.table(
      columnas.map((columna) => ({
        columna: columna.name,
        tipo: columna.type,
        obligatorio: Boolean(columna.notnull),
      }))
    );
  }

  const clavesForaneas = db
    .prepare("PRAGMA foreign_key_list(combo_items)")
    .all();

  console.log("\nRelaciones de combo_items:");
  console.table(clavesForaneas);
} catch (error) {
  console.error("Error al verificar combos:", error.message);
  process.exitCode = 1;
} finally {
  db.close();
}
