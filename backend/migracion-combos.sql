
PRAGMA foreign_keys = ON;

BEGIN TRANSACTION;

CREATE TABLE IF NOT EXISTS combos (
    id INTEGER PRIMARY KEY AUTOINCREMENT,
    nombre TEXT NOT NULL UNIQUE,
    descripcion TEXT NOT NULL DEFAULT '',
    descuento_porcentaje REAL NOT NULL DEFAULT 10
        CHECK (
            descuento_porcentaje > 0
            AND descuento_porcentaje <= 100
        ),
    activo INTEGER NOT NULL DEFAULT 1
        CHECK (activo IN (0, 1))
);

CREATE TABLE IF NOT EXISTS combo_items (
    id INTEGER PRIMARY KEY AUTOINCREMENT,
    combo_id INTEGER NOT NULL,
    producto_id INTEGER NOT NULL,
    cantidad INTEGER NOT NULL CHECK (cantidad > 0),

    FOREIGN KEY (combo_id)
        REFERENCES combos(id) ON DELETE CASCADE,

    FOREIGN KEY (producto_id)
        REFERENCES productos(id),

    UNIQUE (combo_id, producto_id)
);

CREATE INDEX IF NOT EXISTS idx_combo_items_combo
ON combo_items(combo_id);

CREATE INDEX IF NOT EXISTS idx_combo_items_producto
ON combo_items(producto_id);

COMMIT;
