
import { useApi } from "../../hooks/useApi";
import {
  Coffee,
  Package,
  ShoppingBag,
  Wallet,
  AlertTriangle,
  RefreshCw,
} from "lucide-react";

import "./Dashboard.css";

const metricas = [
  {
    clave: "productos_activos",
    titulo: "Productos activos",
    Icono: Coffee,
    color: "lila",
  },
  {
    clave: "insumos_registrados",
    titulo: "Insumos registrados",
    Icono: Package,
    color: "azul",
  },
  {
    clave: "pedidos_confirmados_hoy",
    titulo: "Pedidos de hoy",
    Icono: ShoppingBag,
    color: "rosa",
  },
  {
    clave: "ingresos_hoy",
    titulo: "Ingresos de hoy",
    Icono: Wallet,
    color: "morado",
    moneda: true,
  },
];

function Dashboard() {
  const { datos, cargando, error, recargar } = useApi("/resumen");

  return (
    <section className="dashboard">
      <header className="dashboard-header">
        <div>
          <span className="dashboard-eyebrow">
            MORI CAFÉ · PANEL DE CONTROL
          </span>
          <h1>¡Bienvenido a Mori Café! ✿</h1>
          <p>Todo en orden, una taza a la vez.</p>
        </div>

        <button
          className="dashboard-refresh"
          type="button"
          onClick={recargar}
          disabled={cargando}
        >
          <RefreshCw size={17} />
          Actualizar
        </button>
      </header>

      {error && (
        <div className="dashboard-error" role="alert">
          <AlertTriangle size={20} />
          <div>
            <strong>No pudimos cargar el resumen</strong>
            <p>{error}</p>
          </div>
          <button type="button" onClick={recargar}>
            Reintentar
          </button>
        </div>
      )}

      <div className="dashboard-metrics">
        {metricas.map(({ clave, titulo, Icono, color, moneda }) => (
          <article className="metric-card" key={clave}>
            <div className={`metric-icon ${color}`}>
              <Icono size={22} strokeWidth={1.8} />
            </div>

            <p className="metric-title">{titulo}</p>

            <strong className="metric-value">
              {cargando
                ? "..."
                : datos
                  ? moneda
                    ? new Intl.NumberFormat("es-CR", {
                        style: "currency",
                        currency: "CRC",
                        maximumFractionDigits: 2,
                      }).format(datos[clave] ?? 0)
                    : (datos[clave] ?? 0).toLocaleString("es-CR")
                  : "—"}
            </strong>
          </article>
        ))}
      </div>

      <section className="dashboard-stock">
        <div className="stock-heading">
          <div className="stock-icon">
            <Package size={21} />
          </div>
          <div>
            <h2>Estado del inventario</h2>
            <p>Insumos que requieren atención</p>
          </div>
        </div>

        <div className="stock-summary">
          <strong>
            {cargando
              ? "..."
              : datos
                ? datos.insumos_por_reponer ?? 0
                : "—"}
          </strong>
          <span>insumos por reponer</span>
        </div>
      </section>
    </section>
  );
}

export default Dashboard;
