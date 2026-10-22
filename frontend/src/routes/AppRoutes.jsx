
import { Navigate, Route, Routes } from "react-router-dom";

import Dashboard from "../pages/Dashboard/Dashboard";
import Productos from "../pages/Productos/Productos";
import Inventario from "../pages/Inventario/Inventario";
import Pedidos from "../pages/Pedidos/Pedidos";
import CierreCaja from "../pages/CierreCaja/CierreCaja";
import Recetas from "../pages/Recetas/Recetas";

function AppRoutes() {
  return (
    <Routes>
      <Route path="/" element={<Dashboard />} />
      <Route path="/productos" element={<Productos />} />
      <Route path="/inventario" element={<Inventario />} />
      <Route path="/recetas" element={<Recetas />} />
      <Route path="/pedidos" element={<Pedidos />} />
      <Route path="/cierre-caja" element={<CierreCaja />} />

      <Route path="*" element={<Navigate to="/" replace />} />
    </Routes>
  );
}

export default AppRoutes;
