
const Database = require("better-sqlite3");
const path = require("path");
require("dotenv").config();

const dbPath = path.resolve(
  __dirname,
  "..",
  process.env.DB_PATH || "cafeteria.db"
);

const db = new Database(dbPath);

// Activar las restricciones de claves foráneas.
db.pragma("foreign_keys = ON");

// Esperar un poco si la base de datos está ocupada.
db.pragma("busy_timeout = 5000");

module.exports = db;
