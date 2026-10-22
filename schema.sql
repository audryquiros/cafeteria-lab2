
PRAGMA foreign_keys = ON;

-- 1. Insumos utilizados para preparar los productos.
CREATE TABLE IF NOT EXISTS insumos (
    id INTEGER PRIMARY KEY AUTOINCREMENT,
    nombre TEXT NOT NULL UNIQUE,
    unidad TEXT NOT NULL,
    stock REAL NOT NULL DEFAULT 0 CHECK (stock >= 0),
    stock_minimo REAL NOT NULL DEFAULT 0 CHECK (stock_minimo >= 0)
);

-- 2. Productos que ofrece la cafetería.
CREATE TABLE IF NOT EXISTS productos (
    id INTEGER PRIMARY KEY AUTOINCREMENT,
    nombre TEXT NOT NULL UNIQUE,
    precio REAL NOT NULL CHECK (precio > 0),
    categoria TEXT NOT NULL,
    activo INTEGER NOT NULL DEFAULT 1 CHECK (activo IN (0, 1))
);

-- 3. Recetas: insumos y cantidades necesarios por producto.
CREATE TABLE IF NOT EXISTS recetas (
    id INTEGER PRIMARY KEY AUTOINCREMENT,
    producto_id INTEGER NOT NULL,
    insumo_id INTEGER NOT NULL,
    cantidad REAL NOT NULL CHECK (cantidad > 0),

    FOREIGN KEY (producto_id) REFERENCES productos(id),
    FOREIGN KEY (insumo_id) REFERENCES insumos(id),
    UNIQUE (producto_id, insumo_id)
);

-- 4. Ventas realizadas.
CREATE TABLE IF NOT EXISTS pedidos (
    id INTEGER PRIMARY KEY AUTOINCREMENT,
    fecha TEXT NOT NULL DEFAULT (datetime('now', 'localtime')),
    metodo_pago TEXT NOT NULL
        CHECK (metodo_pago IN ('efectivo', 'tarjeta', 'transferencia')),
    subtotal REAL NOT NULL CHECK (subtotal >= 0),
    impuesto REAL NOT NULL CHECK (impuesto >= 0),
    total REAL NOT NULL CHECK (total >= 0),
    estado TEXT NOT NULL DEFAULT 'confirmado'
        CHECK (estado IN ('confirmado', 'anulado'))
);

-- 5. Productos incluidos en cada venta.
CREATE TABLE IF NOT EXISTS pedido_items (
    id INTEGER PRIMARY KEY AUTOINCREMENT,
    pedido_id INTEGER NOT NULL,
    producto_id INTEGER NOT NULL,
    cantidad INTEGER NOT NULL CHECK (cantidad > 0),
    precio_unitario REAL NOT NULL CHECK (precio_unitario > 0),

    FOREIGN KEY (pedido_id) REFERENCES pedidos(id) ON DELETE CASCADE,
    FOREIGN KEY (producto_id) REFERENCES productos(id)
);

-- Datos de ejemplo para los insumos.
INSERT OR IGNORE INTO insumos (nombre, unidad, stock, stock_minimo)
VALUES
    ('Cafe molido', 'gramos', 2000, 500),
    ('Leche', 'mililitros', 5000, 1000),
    ('Vasos', 'unidades', 100, 20),
    ('Te', 'gramos', 500, 100),
    ('Chocolate', 'gramos', 800, 150);

-- Datos de ejemplo para los productos.
INSERT OR IGNORE INTO productos (nombre, precio, categoria, activo)
VALUES
    ('Americano', 1200, 'Cafe', 1),
    ('Capuchino', 1800, 'Cafe', 1),
    ('Te caliente', 1000, 'Te', 1),
    ('Chocolate caliente', 1500, 'Chocolate', 1);

-- Recetas de ejemplo.
INSERT OR IGNORE INTO recetas (producto_id, insumo_id, cantidad)
SELECT p.id, i.id, 18
FROM productos p, insumos i
WHERE p.nombre = 'Americano' AND i.nombre = 'Cafe molido';

INSERT OR IGNORE INTO recetas (producto_id, insumo_id, cantidad)
SELECT p.id, i.id, 18
FROM productos p, insumos i
WHERE p.nombre = 'Americano' AND i.nombre = 'Vasos';

INSERT OR IGNORE INTO recetas (producto_id, insumo_id, cantidad)
SELECT p.id, i.id, 18
FROM productos p, insumos i
WHERE p.nombre = 'Capuchino' AND i.nombre = 'Cafe molido';

INSERT OR IGNORE INTO recetas (producto_id, insumo_id, cantidad)
SELECT p.id, i.id, 150
FROM productos p, insumos i
WHERE p.nombre = 'Capuchino' AND i.nombre = 'Leche';

INSERT OR IGNORE INTO recetas (producto_id, insumo_id, cantidad)
SELECT p.id, i.id, 1
FROM productos p, insumos i
WHERE p.nombre = 'Capuchino' AND i.nombre = 'Vasos';

INSERT OR IGNORE INTO recetas (producto_id, insumo_id, cantidad)
SELECT p.id, i.id, 2
FROM productos p, insumos i
WHERE p.nombre = 'Te caliente' AND i.nombre = 'Te';

INSERT OR IGNORE INTO recetas (producto_id, insumo_id, cantidad)
SELECT p.id, i.id, 1
FROM productos p, insumos i
WHERE p.nombre = 'Te caliente' AND i.nombre = 'Vasos';

INSERT OR IGNORE INTO recetas (producto_id, insumo_id, cantidad)
SELECT p.id, i.id, 20
FROM productos p, insumos i
WHERE p.nombre = 'Chocolate caliente' AND i.nombre = 'Chocolate';

INSERT OR IGNORE INTO recetas (producto_id, insumo_id, cantidad)
SELECT p.id, i.id, 150
FROM productos p, insumos i
WHERE p.nombre = 'Chocolate caliente' AND i.nombre = 'Leche';

INSERT OR IGNORE INTO recetas (producto_id, insumo_id, cantidad)
SELECT p.id, i.id, 1
FROM productos p, insumos i
WHERE p.nombre = 'Chocolate caliente' AND i.nombre = 'Vasos';


-- 6. Insumos consumidos por cada pedido.
CREATE TABLE IF NOT EXISTS pedido_insumos (
    id INTEGER PRIMARY KEY AUTOINCREMENT,
    pedido_id INTEGER NOT NULL,
    insumo_id INTEGER NOT NULL,
    cantidad REAL NOT NULL CHECK (cantidad > 0),

    FOREIGN KEY (pedido_id) REFERENCES pedidos(id) ON DELETE CASCADE,
    FOREIGN KEY (insumo_id) REFERENCES insumos(id)
);

CREATE INDEX IF NOT EXISTS idx_pedido_insumos_pedido
ON pedido_insumos(pedido_id);
