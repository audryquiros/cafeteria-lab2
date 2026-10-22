
import { useCallback, useEffect, useState } from "react";
import {
  Banknote,
  CreditCard,
  Receipt,
  RefreshCw,
  CalendarDays,
  Calendar,
  ChevronLeft,
  ChevronRight,
  CircleDollarSign,
  ShoppingBag,
  TrendingUp,
  Coffee,
  AlertCircle,
  Wallet,
} from "lucide-react";

import Notificacion from "../../components/Notificacion/Notificacion";
import "./CierreCaja.css";

const obtenerFechaLocal = () => {
  const ahora = new Date();
  const anio = ahora.getFullYear();
  const mes = String(ahora.getMonth() + 1).padStart(2, "0");
  const dia = String(ahora.getDate()).padStart(2, "0");

  return `${anio}-${mes}-${dia}`;
};

const formatoColones = (valor) =>
  new Intl.NumberFormat("es-CR", {
    style: "currency",
    currency: "CRC",
    minimumFractionDigits: 2,
    maximumFractionDigits: 2,
  }).format(Number(valor) || 0);

const formatoCantidad = (valor) =>
  new Intl.NumberFormat("es-CR", {
    maximumFractionDigits: 2,
  }).format(Number(valor) || 0);

const formatoFechaLarga = (fecha) => {
  if (!fecha) return "";

  const [anio, mes, dia] = fecha.split("-").map(Number);
  const fechaLocal = new Date(anio, mes - 1, dia);

  return fechaLocal.toLocaleDateString("es-CR", {
    weekday: "long",
    year: "numeric",
    month: "long",
    day: "numeric",
  });
};

const metodosPago = {
  efectivo: {
    nombre: "Efectivo",
    Icono: Banknote,
    clase: "efectivo",
  },
  tarjeta: {
    nombre: "Tarjeta",
    Icono: CreditCard,
    clase: "tarjeta",
  },
  transferencia: {
    nombre: "Transferencia",
    Icono: Wallet,
    clase: "transferencia",
  },
};

function CierreCaja() {
  const [fecha, setFecha] = useState(obtenerFechaLocal);
  const [cierre, setCierre] = useState(null);
  const [cargando, setCargando] = useState(true);
  const [error, setError] = useState("");
  const [notificacion, setNotificacion] = useState(null);

  // Estado del calendario personalizado.
  const [calendarioAbierto, setCalendarioAbierto] = useState(false);

  const [mesVisible, setMesVisible] = useState(() => {
    const [anio, mes] = obtenerFechaLocal().split("-").map(Number);
    return new Date(anio, mes - 1, 1);
  });

  const consultarCierre = useCallback(
    async (fechaConsulta = fecha) => {
      setCargando(true);
      setError("");

      try {
        const respuesta = await fetch(
          `http://localhost:3000/api/pedidos/cierre-caja?fecha=${encodeURIComponent(
            fechaConsulta
          )}`
        );

        const resultado = await respuesta.json().catch(() => null);

        if (!respuesta.ok) {
          throw new Error(
            resultado?.error ||
              "No se pudo consultar el cierre de caja."
          );
        }

        setCierre(resultado);
      } catch (err) {
        setCierre(null);
        setError(
          err.message ||
            "No fue posible conectar con el servidor. Verificá que el backend esté activo."
        );
      } finally {
        setCargando(false);
      }
    },
    [fecha]
  );

  useEffect(() => {
    consultarCierre(fecha);
  }, [fecha, consultarCierre]);

  // Seleccionar un día del calendario.
  function seleccionarFecha(dia) {
    const anio = mesVisible.getFullYear();
    const mes = String(mesVisible.getMonth() + 1).padStart(2, "0");
    const diaFormato = String(dia).padStart(2, "0");

    const nuevaFecha = `${anio}-${mes}-${diaFormato}`;

    if (nuevaFecha <= obtenerFechaLocal()) {
      setFecha(nuevaFecha);
      setCalendarioAbierto(false);
      setNotificacion(null);
    }
  }

  // Navegar entre meses.
  function cambiarMes(cantidad) {
    setMesVisible(
      (mesActual) =>
        new Date(
          mesActual.getFullYear(),
          mesActual.getMonth() + cantidad,
          1
        )
    );
  }

  // Preparar los días que se mostrarán en el calendario.
  const primerDiaMes = new Date(
    mesVisible.getFullYear(),
    mesVisible.getMonth(),
    1
  );

  const diasEnMes = new Date(
    mesVisible.getFullYear(),
    mesVisible.getMonth() + 1,
    0
  ).getDate();

  // La semana comienza el lunes.
  const desplazamiento = (primerDiaMes.getDay() + 6) % 7;

  const nombreMes = mesVisible.toLocaleDateString("es-CR", {
    month: "long",
    year: "numeric",
  });

  const hoy = obtenerFechaLocal();
  const [anioHoy, mesHoy] = hoy.split("-").map(Number);

  const esMesActual =
    mesVisible.getFullYear() === anioHoy &&
    mesVisible.getMonth() === mesHoy - 1;

  function abrirCalendario() {
    const [anio, mes] = fecha.split("-").map(Number);

    setMesVisible(new Date(anio, mes - 1, 1));
    setCalendarioAbierto((abierto) => !abierto);
  }

  function seleccionarHoy() {
    const fechaHoy = obtenerFechaLocal();
    const [anio, mes] = fechaHoy.split("-").map(Number);

    setFecha(fechaHoy);
    setMesVisible(new Date(anio, mes - 1, 1));
    setCalendarioAbierto(false);
    setNotificacion(null);
  }

  async function actualizarConsulta() {
    await consultarCierre(fecha);
  }

  const totales = cierre?.totales || {
    cantidad_pedidos: 0,
    subtotal: 0,
    impuesto: 0,
    total: 0,
  };

  const ventasPorMetodo = cierre?.ventas_por_metodo || [];
  const productosMasVendidos = cierre?.productos_mas_vendidos || [];

  const totalMetodos = ventasPorMetodo.reduce(
    (suma, metodo) => suma + Number(metodo.total || 0),
    0
  );

  return (
    <main className="cierre-caja-page">
      <header className="cierre-caja-header">
        <div className="cierre-caja-encabezado-texto">
          <span className="cierre-caja-eyebrow">
            MORI CAFÉ · ADMINISTRACIÓN
          </span>

          <h1>Cierre de caja</h1>

          <p>
            Consultá las ventas, los métodos de pago y el resumen diario
            de tu cafetería.
          </p>
        </div>

        <button
          type="button"
          className="cierre-caja-btn-secundario"
          onClick={actualizarConsulta}
          disabled={cargando}
        >
          <RefreshCw
            size={17}
            className={cargando ? "cierre-caja-girando" : ""}
          />
          Actualizar
        </button>
      </header>

      {notificacion && (
        <Notificacion
          key={notificacion.id}
          tipo={notificacion.tipo}
          titulo={notificacion.titulo}
          mensaje={notificacion.descripcion}
          onCerrar={() => setNotificacion(null)}
        />
      )}

      {/* Selector de fecha personalizado */}
      <section className="cierre-caja-selector-fecha">
        <div className="cierre-caja-fecha-icono">
          <CalendarDays size={22} />
        </div>

        <div className="cierre-caja-fecha-info">
          <label>Fecha de consulta</label>
          <p>{formatoFechaLarga(fecha)}</p>
        </div>

        <div className="cierre-caja-calendario">
          <button
            type="button"
            className={`cierre-caja-fecha-boton ${
              calendarioAbierto ? "activo" : ""
            }`}
            onClick={abrirCalendario}
            aria-label="Seleccionar fecha"
            aria-expanded={calendarioAbierto}
          >
            <span>{fecha.split("-").reverse().join("/")}</span>
            <Calendar size={17} />
          </button>

          {calendarioAbierto && (
            <>
              <button
                type="button"
                className="cierre-caja-calendario-fondo"
                aria-label="Cerrar calendario"
                onClick={() => setCalendarioAbierto(false)}
              />

              <div
                className="cierre-caja-calendario-panel"
                role="dialog"
                aria-label="Calendario para seleccionar fecha"
              >
                <div className="cierre-caja-calendario-cabecera">
                  <button
                    type="button"
                    onClick={() => cambiarMes(-1)}
                    aria-label="Mes anterior"
                  >
                    <ChevronLeft size={18} />
                  </button>

                  <strong>{nombreMes}</strong>

                  <button
                    type="button"
                    onClick={() => cambiarMes(1)}
                    disabled={esMesActual}
                    aria-label="Mes siguiente"
                  >
                    <ChevronRight size={18} />
                  </button>
                </div>

                <div className="cierre-caja-calendario-dias">
                  {["Lu", "Ma", "Mi", "Ju", "Vi", "Sá", "Do"].map(
                    (dia) => (
                      <span key={dia} className="nombre-dia">
                        {dia}
                      </span>
                    )
                  )}

                  {Array.from(
                    { length: desplazamiento },
                    (_, indice) => (
                      <span
                        key={`vacio-${indice}`}
                        className="dia-vacio"
                      />
                    )
                  )}

                  {Array.from({ length: diasEnMes }, (_, indice) => {
                    const dia = indice + 1;
                    const anio = mesVisible.getFullYear();

                    const mes = String(
                      mesVisible.getMonth() + 1
                    ).padStart(2, "0");

                    const diaFormato = String(dia).padStart(2, "0");

                    const valorDia = `${anio}-${mes}-${diaFormato}`;
                    const seleccionado = valorDia === fecha;
                    const futuro = valorDia > hoy;

                    return (
                      <button
                        type="button"
                        key={dia}
                        className={`cierre-caja-calendario-dia ${
                          seleccionado ? "seleccionado" : ""
                        }`}
                        disabled={futuro}
                        aria-pressed={seleccionado}
                        onClick={() => seleccionarFecha(dia)}
                      >
                        {dia}
                      </button>
                    );
                  })}
                </div>

                <div className="cierre-caja-calendario-pie">
                  <button
                    type="button"
                    onClick={() => setCalendarioAbierto(false)}
                  >
                    Cerrar
                  </button>

                  <button type="button" onClick={seleccionarHoy}>
                    Hoy
                  </button>
                </div>
              </div>
            </>
          )}
        </div>
      </section>

      {cargando && (
        <div className="cierre-caja-estado">
          <RefreshCw
            size={27}
            className="cierre-caja-girando"
          />
          <strong>Consultando ventas...</strong>
          <p>Estamos preparando el resumen de caja.</p>
        </div>
      )}

      {!cargando && error && (
        <div className="cierre-caja-error" role="alert">
          <AlertCircle size={22} />

          <div>
            <strong>No se pudo cargar el cierre</strong>
            <p>{error}</p>
          </div>

          <button
            type="button"
            className="cierre-caja-btn-secundario"
            onClick={() => consultarCierre(fecha)}
          >
            Reintentar
          </button>
        </div>
      )}

      {!cargando && !error && cierre && (
        <>
          <section className="cierre-caja-resumen">
            <article className="cierre-caja-tarjeta cierre-caja-tarjeta-total">
              <div className="cierre-caja-tarjeta-superior">
                <div className="cierre-caja-tarjeta-icono morado">
                  <CircleDollarSign size={23} />
                </div>

                <span className="cierre-caja-tarjeta-etiqueta">
                  Venta total
                </span>
              </div>

              <strong className="cierre-caja-valor-principal">
                {formatoColones(totales.total)}
              </strong>

              <span className="cierre-caja-tarjeta-pie">
                Ingresos de pedidos confirmados
              </span>
            </article>

            <article className="cierre-caja-tarjeta">
              <div className="cierre-caja-tarjeta-superior">
                <div className="cierre-caja-tarjeta-icono verde">
                  <ShoppingBag size={22} />
                </div>

                <span className="cierre-caja-tarjeta-etiqueta">
                  Pedidos confirmados
                </span>
              </div>

              <strong className="cierre-caja-valor">
                {formatoCantidad(totales.cantidad_pedidos)}
              </strong>

              <span className="cierre-caja-tarjeta-pie">
                Ventas completadas del día
              </span>
            </article>

            <article className="cierre-caja-tarjeta">
              <div className="cierre-caja-tarjeta-superior">
                <div className="cierre-caja-tarjeta-icono rosa">
                  <Receipt size={22} />
                </div>

                <span className="cierre-caja-tarjeta-etiqueta">
                  Subtotal
                </span>
              </div>

              <strong className="cierre-caja-valor">
                {formatoColones(totales.subtotal)}
              </strong>

              <span className="cierre-caja-tarjeta-pie">
                Antes del impuesto
              </span>
            </article>

            <article className="cierre-caja-tarjeta">
              <div className="cierre-caja-tarjeta-superior">
                <div className="cierre-caja-tarjeta-icono amarillo">
                  <TrendingUp size={22} />
                </div>

                <span className="cierre-caja-tarjeta-etiqueta">
                  Impuesto
                </span>
              </div>

              <strong className="cierre-caja-valor">
                {formatoColones(totales.impuesto)}
              </strong>

              <span className="cierre-caja-tarjeta-pie">
                Impuesto aplicado a las ventas
              </span>
            </article>
          </section>

          {Number(totales.cantidad_pedidos) === 0 ? (
            <section className="cierre-caja-sin-ventas">
              <div className="cierre-caja-sin-ventas-icono">
                <Coffee size={29} />
              </div>

              <h2>Sin ventas registradas</h2>

              <p>
                No hay pedidos confirmados para el{" "}
                {formatoFechaLarga(fecha)}. Cuando se registren ventas,
                el resumen aparecerá aquí.
              </p>
            </section>
          ) : (
            <section className="cierre-caja-contenido">
              <article className="cierre-caja-panel">
                <header className="cierre-caja-panel-header">
                  <div className="cierre-caja-panel-icono">
                    <Wallet size={21} />
                  </div>

                  <div>
                    <h2>Ventas por método de pago</h2>
                    <p>
                      Distribución de las ventas confirmadas del día.
                    </p>
                  </div>
                </header>

                {ventasPorMetodo.length === 0 ? (
                  <p className="cierre-caja-texto-vacio">
                    No hay información de métodos de pago para esta fecha.
                  </p>
                ) : (
                  <div className="cierre-caja-metodos">
                    {ventasPorMetodo.map((metodo) => {
                      const configuracion =
                        metodosPago[metodo.metodo_pago] ||
                        metodosPago.efectivo;

                      const Icono = configuracion.Icono;

                      const porcentaje =
                        totalMetodos > 0
                          ? (Number(metodo.total) / totalMetodos) * 100
                          : 0;

                      return (
                        <div
                          className="cierre-caja-metodo"
                          key={metodo.metodo_pago}
                        >
                          <div
                            className={`cierre-caja-metodo-icono ${configuracion.clase}`}
                          >
                            <Icono size={21} />
                          </div>

                          <div className="cierre-caja-metodo-contenido">
                            <div className="cierre-caja-metodo-titulo">
                              <strong>{configuracion.nombre}</strong>

                              <span>
                                {formatoColones(metodo.total)}
                              </span>
                            </div>

                            <div className="cierre-caja-barra-fondo">
                              <div
                                className={`cierre-caja-barra ${configuracion.clase}`}
                                style={{ width: `${porcentaje}%` }}
                              />
                            </div>

                            <div className="cierre-caja-metodo-pie">
                              <span>
                                {formatoCantidad(metodo.cantidad_pedidos)}{" "}
                                {Number(metodo.cantidad_pedidos) === 1
                                  ? "pedido"
                                  : "pedidos"}
                              </span>

                              <span>
                                {porcentaje.toLocaleString("es-CR", {
                                  maximumFractionDigits: 1,
                                })}
                                %
                              </span>
                            </div>
                          </div>
                        </div>
                      );
                    })}
                  </div>
                )}

                <div className="cierre-caja-metodos-total">
                  <span>Total por métodos de pago</span>
                  <strong>{formatoColones(totalMetodos)}</strong>
                </div>
              </article>

              <article className="cierre-caja-panel">
                <header className="cierre-caja-panel-header">
                  <div className="cierre-caja-panel-icono">
                    <TrendingUp size={21} />
                  </div>

                  <div>
                    <h2>Productos más vendidos</h2>
                    <p>
                      Los cinco productos con más unidades vendidas.
                    </p>
                  </div>
                </header>

                {productosMasVendidos.length === 0 ? (
                  <p className="cierre-caja-texto-vacio">
                    No hay productos vendidos para esta fecha.
                  </p>
                ) : (
                  <div className="cierre-caja-productos">
                    {productosMasVendidos.map((producto, indice) => (
                      <div
                        className="cierre-caja-producto"
                        key={producto.producto_id}
                      >
                        <span className="cierre-caja-producto-posicion">
                          {indice + 1}
                        </span>

                        <div className="cierre-caja-producto-icono">
                          <Coffee size={19} />
                        </div>

                        <div className="cierre-caja-producto-info">
                          <strong>{producto.producto}</strong>
                          <span>
                            {formatoCantidad(producto.unidades_vendidas)}{" "}
                            {Number(producto.unidades_vendidas) === 1
                              ? "unidad vendida"
                              : "unidades vendidas"}
                          </span>
                        </div>

                        <strong className="cierre-caja-producto-importe">
                          {formatoColones(producto.importe)}
                        </strong>
                      </div>
                    ))}
                  </div>
                )}
              </article>
            </section>
          )}

          <footer className="cierre-caja-nota">
            <AlertCircle size={17} />

            <p>
              Este reporte incluye únicamente pedidos confirmados. Los
              pedidos anulados se excluyen de los totales. Es una consulta
              de ventas y no representa un cierre definitivo guardado.
            </p>
          </footer>
        </>
      )}
    </main>
  );
}

export default CierreCaja;
