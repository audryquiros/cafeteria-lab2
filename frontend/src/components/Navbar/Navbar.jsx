
import { useState } from "react";
import { NavLink } from "react-router-dom";
import {
  LayoutDashboard,
  Coffee,
  Package,
  ClipboardList,
  Wallet,
  Flower2,
  BookOpen,
  Menu,
  X,
} from "lucide-react";

import "./Navbar.css";

const enlaces = [
  { ruta: "/", nombre: "Inicio", Icono: LayoutDashboard },
  { ruta: "/productos", nombre: "Productos", Icono: Coffee },
  { ruta: "/inventario", nombre: "Inventario", Icono: Package },
  { ruta: "/recetas", nombre: "Recetas", Icono: BookOpen },
  { ruta: "/pedidos", nombre: "Pedidos", Icono: ClipboardList },
  { ruta: "/cierre-caja", nombre: "Cierre de caja", Icono: Wallet },
];

function Navbar() {
  const [menuAbierto, setMenuAbierto] = useState(false);

  function cerrarMenu() {
    setMenuAbierto(false);
  }

  return (
    <>
      <header className="mobile-header">
        <div className="mobile-brand">
          <span className="mobile-logo">
            <Flower2 size={23} />
          </span>
          <span>Mori Café</span>
        </div>

        <button
          type="button"
          className="hamburger-button"
          aria-label={menuAbierto ? "Cerrar menú" : "Abrir menú"}
          aria-expanded={menuAbierto}
          aria-controls="main-navigation"
          onClick={() => setMenuAbierto((abierto) => !abierto)}
        >
          {menuAbierto ? <X size={24} /> : <Menu size={24} />}
        </button>
      </header>

      {menuAbierto && (
        <button
          type="button"
          className="navbar-overlay"
          aria-label="Cerrar menú"
          onClick={cerrarMenu}
        />
      )}

      <aside
        id="main-navigation"
        className={`navbar${menuAbierto ? " navbar-open" : ""}`}
      >
        <div className="navbar-brand">
          <div className="navbar-logo">
            <Flower2 size={25} strokeWidth={1.8} />
          </div>

          <div>
            <h2>Mori Café</h2>
            <p>COFFEE · TEA · MOMENTS</p>
          </div>

          <button
            type="button"
            className="navbar-close"
            aria-label="Cerrar menú"
            onClick={cerrarMenu}
          >
            <X size={22} />
          </button>
        </div>

        <nav className="navbar-menu" aria-label="Navegación principal">
          {enlaces.map(({ ruta, nombre, Icono }) => (
            <NavLink
              key={ruta}
              to={ruta}
              end={ruta === "/"}
              className={({ isActive }) =>
                `navbar-link${isActive ? " active" : ""}`
              }
              onClick={cerrarMenu}
            >
              <Icono size={20} strokeWidth={1.8} aria-hidden="true" />
              <span>{nombre}</span>
            </NavLink>
          ))}
        </nav>

        <div className="navbar-footer">
          Un espacio bonito para tu cafetería ♡
        </div>
      </aside>
    </>
  );
}

export default Navbar;
