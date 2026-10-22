
import { useCallback, useEffect, useMemo, useState } from "react";
import {
  ShoppingBag, Coffee, Plus, Minus, Trash2, RefreshCw,
  CircleCheck, AlertTriangle, Receipt, CreditCard, Banknote,
  Wallet, Search, History, Eye, X, Ban, CalendarDays,
  PackageCheck
} from "lucide-react";
import { api } from "../../services/api";
import CustomSelect from "../../components/CustomSelect/CustomSelect";
import Notificacion from "../../components/Notificacion/Notificacion";
import "./Pedidos.css";

const IMPUESTO = 0.13;

const formatoColones = (valor) =>
  new Intl.NumberFormat("es-CR", {
    style: "currency",
    currency: "CRC",
    maximumFractionDigits: 2,
  }).format(Number(valor) || 0);

const formatoFecha = (fecha) => {
  if (!fecha) return "Fecha no disponible";

  const valor = new Date(String(fecha).replace(" ", "T"));

  if (Number.isNaN(valor.getTime())) return fecha;

  return valor.toLocaleString("es-CR", {
    dateStyle: "medium",
    timeStyle: "short",
  });
};

const nombreMetodo = (metodo) => ({
  efectivo: "Efectivo",
  tarjeta: "Tarjeta",
  transferencia: "Transferencia",
}[metodo] || metodo || "No indicado");

export default function Pedidos() {
  const [pestana, setPestana] = useState("nuevo");

  const [productos, setProductos] = useState([]);
  const [recetas, setRecetas] = useState([]);
  const [cargandoMenu, setCargandoMenu] = useState(true);

  const [carrito, setCarrito] = useState([]);
  const [metodoPago, setMetodoPago] = useState("efectivo");
  const [busquedaProducto, setBusquedaProducto] = useState("");

  const [pedidos, setPedidos] = useState([]);
  const [cargandoPedidos, setCargandoPedidos] = useState(false);
  const [busquedaPedido, setBusquedaPedido] = useState("");
  const [filtroEstado, setFiltroEstado] = useState("todos");

  const [pedidoDetalle, setPedidoDetalle] = useState(null);
  const [cargandoDetalle, setCargandoDetalle] = useState(false);
  const [pedidoAnular, setPedidoAnular] = useState(null);
  const [anulando, setAnulando] = useState(false);
  const [guardando, setGuardando] = useState(false);

  const [notificacion, setNotificacion] = useState(null);

  const mostrarMensaje = (texto, tipo = "exito") => {
    setNotificacion({
      id: Date.now(),
      tipo,
      titulo:
        tipo === "error"
          ? "No se pudo completar la operación"
          : "Operación completada",
      descripcion: texto,
    });
  };

  const cargarMenu = useCallback(async () => {
    setCargandoMenu(true);

    try {
      const [listaProductos, listaRecetas] = await Promise.all([
        api.obtener("/productos"),
        api.obtener("/recetas"),
      ]);

      setProductos(Array.isArray(listaProductos) ? listaProductos : []);
      setRecetas(Array.isArray(listaRecetas) ? listaRecetas : []);
    } catch (error) {
      mostrarMensaje(
        error.message || "No se pudo cargar el menú.",
        "error"
      );
    } finally {
      setCargandoMenu(false);
    }
  }, []);

  const cargarPedidos = useCallback(async () => {
    setCargandoPedidos(true);

    try {
      const resultado = await api.obtener("/pedidos");
      setPedidos(Array.isArray(resultado) ? resultado : []);
    } catch (error) {
      mostrarMensaje(
        error.message || "No se pudo cargar el historial.",
        "error"
      );
    } finally {
      setCargandoPedidos(false);
    }
  }, []);

  useEffect(() => {
    cargarMenu();
    cargarPedidos();
  }, [cargarMenu, cargarPedidos]);

  const recetasPorProducto = useMemo(
    () =>
      new Map(
        recetas.map((receta) => [
          Number(receta.producto_id),
          receta,
        ])
      ),
    [recetas]
  );

  const productosDisponibles = useMemo(
    () =>
      productos
        .filter((producto) => {
          const receta = recetasPorProducto.get(Number(producto.id));

          return Number(producto.activo) === 1 && receta?.disponible;
        })
        .filter((producto) =>
          String(producto.nombre || "")
            .toLowerCase()
            .includes(busquedaProducto.toLowerCase().trim())
        )
        .sort((a, b) =>
          String(a.nombre || "").localeCompare(
            String(b.nombre || "")
          )
        ),
    [productos, recetasPorProducto, busquedaProducto]
  );

  const productosNoDisponibles = useMemo(
    () =>
      productos.filter((producto) => {
        const receta = recetasPorProducto.get(Number(producto.id));

        return (
          Number(producto.activo) === 1 &&
          (!receta || !receta.disponible)
        );
      }),
    [productos, recetasPorProducto]
  );

  const subtotal = carrito.reduce(
    (suma, item) => suma + item.precio * item.cantidad,
    0
  );

  const impuesto = Math.round(subtotal * IMPUESTO * 100) / 100;
  const total = Math.round((subtotal + impuesto) * 100) / 100;

  const cantidadUnidades = carrito.reduce(
    (suma, item) => suma + item.cantidad,
    0
  );

  const pedidosFiltrados = useMemo(() => {
    const consulta = busquedaPedido.trim().toLowerCase();

    return pedidos.filter((pedido) => {
      const productosPedido = Array.isArray(pedido.productos)
        ? pedido.productos
            .map((producto) => producto.producto || producto.nombre || "")
            .join(" ")
        : "";

      const coincideBusqueda =
        !consulta ||
        String(pedido.id).includes(consulta) ||
        String(pedido.metodo_pago || "")
          .toLowerCase()
          .includes(consulta) ||
        productosPedido.toLowerCase().includes(consulta);

      const coincideEstado =
        filtroEstado === "todos" ||
        String(pedido.estado || "").toLowerCase() === filtroEstado;

      return coincideBusqueda && coincideEstado;
    });
  }, [pedidos, busquedaPedido, filtroEstado]);

  const pedidosConfirmados = pedidos.filter(
    (pedido) => pedido.estado === "confirmado"
  );

  const ventasConfirmadas = pedidosConfirmados.reduce(
    (suma, pedido) => suma + Number(pedido.total || 0),
    0
  );

  function agregarProducto(producto) {
    const receta = recetasPorProducto.get(Number(producto.id));

    if (!receta?.disponible) {
      mostrarMensaje(
        "Este producto no está disponible por falta de insumos.",
        "error"
      );
      return;
    }

    setNotificacion(null);

    setCarrito((actual) => {
      const existente = actual.find(
        (item) => item.producto_id === Number(producto.id)
      );

      if (existente) {
        return actual.map((item) =>
          item.producto_id === Number(producto.id)
            ? { ...item, cantidad: item.cantidad + 1 }
            : item
        );
      }

      return [
        ...actual,
        {
          producto_id: Number(producto.id),
          nombre: producto.nombre,
          precio: Number(producto.precio),
          cantidad: 1,
        },
      ];
    });
  }

  function cambiarCantidad(productoId, cambio) {
    setCarrito((actual) =>
      actual
        .map((item) =>
          item.producto_id === productoId
            ? { ...item, cantidad: item.cantidad + cambio }
            : item
        )
        .filter((item) => item.cantidad > 0)
    );
  }

  function quitarProducto(productoId) {
    setCarrito((actual) =>
      actual.filter((item) => item.producto_id !== productoId)
    );
  }

  async function registrarPedido() {
    if (!carrito.length) {
      mostrarMensaje("Agregá al menos un producto al pedido.", "error");
      return;
    }

    setGuardando(true);
    setNotificacion(null);

    try {
      const resultado = await api.crear("/pedidos", {
        metodo_pago: metodoPago,
        productos: carrito.map((item) => ({
          producto_id: item.producto_id,
          cantidad: item.cantidad,
        })),
      });

      const pedidoRegistrado = resultado?.pedido ?? resultado;
      const idPedido =
        pedidoRegistrado?.id ?? pedidoRegistrado?.pedido_id;
      const totalRegistrado = pedidoRegistrado?.total ?? total;

      setCarrito([]);
      setMetodoPago("efectivo");

      mostrarMensaje(
        idPedido != null
          ? `Pedido #${idPedido} registrado correctamente. Total: ${formatoColones(totalRegistrado)}.`
          : `Pedido registrado correctamente. Total: ${formatoColones(totalRegistrado)}.`
      );

      await Promise.all([cargarMenu(), cargarPedidos()]);
      setPestana("historial");
    } catch (error) {
      mostrarMensaje(
        error.message || "No se pudo registrar el pedido.",
        "error"
      );

      await cargarMenu();
    } finally {
      setGuardando(false);
    }
  }

  async function verDetalle(id) {
    setCargandoDetalle(true);
    setPedidoDetalle(null);

    try {
      const detalle = await api.obtener(`/pedidos/${id}`);
      setPedidoDetalle(detalle);
    } catch (error) {
      mostrarMensaje(
        error.message || "No se pudo consultar el pedido.",
        "error"
      );
    } finally {
      setCargandoDetalle(false);
    }
  }

  async function confirmarAnulacion() {
    if (!pedidoAnular) return;

    setAnulando(true);

    try {
      const resultado = await api.modificar(
        `/pedidos/${pedidoAnular.id}/anular`,
        {}
      );

      mostrarMensaje(
        resultado?.mensaje ||
          `El pedido #${pedidoAnular.id} fue anulado.`
      );

      setPedidoAnular(null);

      if (pedidoDetalle?.id === pedidoAnular.id) {
        setPedidoDetalle(null);
      }

      await Promise.all([cargarPedidos(), cargarMenu()]);
    } catch (error) {
      mostrarMensaje(
        error.message || "No se pudo anular el pedido.",
        "error"
      );
    } finally {
      setAnulando(false);
    }
  }

  return (
    <main className="pedidos-page">
      <header className="pedidos-encabezado">
        <div>
          <span className="pedidos-etiqueta">MORI CAFÉ · VENTAS</span>
          <h1>Pedidos</h1>
          <p>Registrá ventas y consultá el historial de pedidos.</p>
        </div>

        <button
          type="button"
          className="pedidos-boton-secundario"
          onClick={() => {
            cargarMenu();
            cargarPedidos();
          }}
          disabled={cargandoMenu || cargandoPedidos || guardando}
        >
          <RefreshCw size={17} />
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

      <nav className="pedidos-pestanas" aria-label="Secciones de pedidos">
        <button
          type="button"
          className={pestana === "nuevo" ? "activa" : ""}
          onClick={() => setPestana("nuevo")}
        >
          <Plus size={18} />
          Nuevo pedido
        </button>

        <button
          type="button"
          className={pestana === "historial" ? "activa" : ""}
          onClick={() => {
            setPestana("historial");
            cargarPedidos();
          }}
        >
          <History size={18} />
          Historial
          <span className="pedidos-pestana-contador">
            {pedidos.length}
          </span>
        </button>
      </nav>

      {pestana === "nuevo" ? (
        <section className="pedidos-contenido">
          <div className="pedidos-catalogo">
            <div className="pedidos-seccion-titulo">
              <div className="pedidos-titulo-icono">
                <Coffee size={21} />
              </div>

              <div>
                <h2>Menú disponible</h2>
                <p>Elegí los productos para tu pedido</p>
              </div>
            </div>

            <label className="pedidos-busqueda">
              <Search size={18} />
              <input
                type="search"
                value={busquedaProducto}
                onChange={(e) => setBusquedaProducto(e.target.value)}
                placeholder="Buscar un producto..."
                aria-label="Buscar productos"
              />
            </label>

            {cargandoMenu ? (
              <div className="pedidos-estado">
                <RefreshCw
                  className="pedidos-girando"
                  size={25}
                />
                <p>Cargando menú...</p>
              </div>
            ) : (
              <div className="pedidos-productos-grid">
                {productosDisponibles.map((producto) => (
                  <article
                    className="pedido-producto-card"
                    key={producto.id}
                  >
                    <div className="pedido-producto-icono">
                      <Coffee size={25} />
                    </div>

                    <div className="pedido-producto-info">
                      <h3>{producto.nombre}</h3>
                      <p>
                        {producto.categoria || "Producto de cafetería"}
                      </p>
                      <strong>
                        {formatoColones(producto.precio)}
                      </strong>
                    </div>

                    <button
                      type="button"
                      className="pedido-agregar"
                      onClick={() => agregarProducto(producto)}
                      disabled={guardando}
                      aria-label={`Agregar ${producto.nombre}`}
                      title="Agregar al pedido"
                    >
                      <Plus size={20} />
                    </button>
                  </article>
                ))}

                {!productosDisponibles.length && (
                  <div className="pedidos-estado pedidos-vacio">
                    <Coffee size={30} />
                    <p>
                      {busquedaProducto
                        ? "No hay productos que coincidan con la búsqueda."
                        : "No hay productos disponibles para vender."}
                    </p>
                  </div>
                )}
              </div>
            )}

            {!cargandoMenu && productosNoDisponibles.length > 0 && (
              <div className="pedidos-aviso-stock">
                <AlertTriangle size={18} />

                <div>
                  <strong>
                    Productos temporalmente no disponibles
                  </strong>
                  <p>
                    {productosNoDisponibles
                      .map((producto) => producto.nombre)
                      .join(", ")}
                  </p>
                  <span>
                    Revisá las recetas y el inventario de sus ingredientes.
                  </span>
                </div>
              </div>
            )}
          </div>

          <aside className="pedidos-panel">
            <div className="pedidos-seccion-titulo">
              <div className="pedidos-titulo-icono">
                <ShoppingBag size={21} />
              </div>

              <div>
                <h2>Tu pedido</h2>
                <p>{cantidadUnidades} unidades</p>
              </div>
            </div>

            <div className="pedidos-carrito">
              {!carrito.length ? (
                <div className="pedidos-carrito-vacio">
                  <ShoppingBag size={34} />
                  <strong>Tu pedido está vacío</strong>
                  <span>Agregá productos desde el menú.</span>
                </div>
              ) : (
                carrito.map((item) => (
                  <article
                    className="pedido-carrito-item"
                    key={item.producto_id}
                  >
                    <div className="pedido-carrito-info">
                      <strong>{item.nombre}</strong>
                      <span>
                        {formatoColones(item.precio)} c/u
                      </span>
                      <b>
                        {formatoColones(
                          item.precio * item.cantidad
                        )}
                      </b>
                    </div>

                    <div className="pedido-carrito-controles">
                      <button
                        type="button"
                        onClick={() =>
                          cambiarCantidad(item.producto_id, -1)
                        }
                        disabled={guardando}
                        aria-label={`Disminuir cantidad de ${item.nombre}`}
                      >
                        <Minus size={15} />
                      </button>

                      <span>{item.cantidad}</span>

                      <button
                        type="button"
                        onClick={() =>
                          cambiarCantidad(item.producto_id, 1)
                        }
                        disabled={guardando}
                        aria-label={`Aumentar cantidad de ${item.nombre}`}
                      >
                        <Plus size={15} />
                      </button>

                      <button
                        type="button"
                        className="pedido-carrito-eliminar"
                        onClick={() =>
                          quitarProducto(item.producto_id)
                        }
                        disabled={guardando}
                        aria-label={`Quitar ${item.nombre}`}
                      >
                        <Trash2 size={16} />
                      </button>
                    </div>
                  </article>
                ))
              )}
            </div>

            <div className="pedidos-metodo-pago">
              <h3>
                <Wallet size={18} />
                Método de pago
              </h3>

              <div className="pedidos-metodos-grid">
                <button
                  type="button"
                  className={
                    metodoPago === "efectivo" ? "seleccionado" : ""
                  }
                  onClick={() => setMetodoPago("efectivo")}
                  disabled={guardando}
                >
                  <Banknote size={19} />
                  Efectivo
                </button>

                <button
                  type="button"
                  className={
                    metodoPago === "tarjeta" ? "seleccionado" : ""
                  }
                  onClick={() => setMetodoPago("tarjeta")}
                  disabled={guardando}
                >
                  <CreditCard size={19} />
                  Tarjeta
                </button>

                <button
                  type="button"
                  className={
                    metodoPago === "transferencia"
                      ? "seleccionado"
                      : ""
                  }
                  onClick={() => setMetodoPago("transferencia")}
                  disabled={guardando}
                >
                  <Receipt size={19} />
                  Transferencia
                </button>
              </div>
            </div>

            <div className="pedidos-totales">
              <div>
                <span>Subtotal</span>
                <span>{formatoColones(subtotal)}</span>
              </div>

              <div>
                <span>Impuesto (13 %)</span>
                <span>{formatoColones(impuesto)}</span>
              </div>

              <div className="pedidos-total-final">
                <strong>Total</strong>
                <strong>{formatoColones(total)}</strong>
              </div>
            </div>

            <button
              type="button"
              className="pedidos-confirmar"
              onClick={registrarPedido}
              disabled={
                guardando ||
                cargandoMenu ||
                !carrito.length
              }
            >
              {guardando ? (
                <>
                  <RefreshCw
                    className="pedidos-girando"
                    size={19}
                  />
                  Registrando...
                </>
              ) : (
                <>
                  <CircleCheck size={19} />
                  Registrar pedido
                </>
              )}
            </button>

            <p className="pedidos-nota">
              El inventario se actualizará al registrar el pedido.
            </p>
          </aside>
        </section>
      ) : (
        <section className="pedidos-historial">
          <div className="pedidos-resumen-historial">
            <article className="pedidos-resumen-card">
              <div className="pedidos-resumen-icono">
                <Receipt size={21} />
              </div>
              <div>
                <span>Pedidos registrados</span>
                <strong>{pedidos.length}</strong>
              </div>
            </article>

            <article className="pedidos-resumen-card">
              <div className="pedidos-resumen-icono verde">
                <PackageCheck size={21} />
              </div>
              <div>
                <span>Pedidos confirmados</span>
                <strong>{pedidosConfirmados.length}</strong>
              </div>
            </article>

            <article className="pedidos-resumen-card">
              <div className="pedidos-resumen-icono rosa">
                <Banknote size={21} />
              </div>
              <div>
                <span>Ventas confirmadas</span>
                <strong>{formatoColones(ventasConfirmadas)}</strong>
              </div>
            </article>
          </div>

          <div className="pedidos-historial-panel">
            <div className="pedidos-historial-cabecera">
              <div>
                <h2>Historial de pedidos</h2>
                <p>
                  Consultá las ventas registradas y sus detalles.
                </p>
              </div>

              <button
                type="button"
                className="pedidos-boton-secundario"
                onClick={cargarPedidos}
                disabled={cargandoPedidos}
              >
                <RefreshCw size={16} />
                Actualizar historial
              </button>
            </div>

            <div className="pedidos-filtros-historial">
              <label className="pedidos-busqueda">
                <Search size={18} />
                <input
                  value={busquedaPedido}
                  onChange={(e) => setBusquedaPedido(e.target.value)}
                  placeholder="Buscar por número, pago o producto..."
                  aria-label="Buscar en el historial"
                />
              </label>

              <div className="pedidos-filtro-estado">
                <span>Estado</span>

                <CustomSelect
                  value={filtroEstado}
                  onChange={setFiltroEstado}
                  ariaLabel="Filtrar pedidos por estado"
                  options={[
                    {
                      value: "todos",
                      label: "Todos los estados",
                    },
                    {
                      value: "confirmado",
                      label: "Confirmados",
                    },
                    {
                      value: "anulado",
                      label: "Anulados",
                    },
                  ]}
                />
              </div>
            </div>

            {cargandoPedidos ? (
              <div className="pedidos-estado">
                <RefreshCw
                  className="pedidos-girando"
                  size={25}
                />
                <p>Cargando historial...</p>
              </div>
            ) : !pedidosFiltrados.length ? (
              <div className="pedidos-estado pedidos-vacio">
                <History size={32} />
                <strong>No encontramos pedidos</strong>
                <p>
                  {pedidos.length
                    ? "Probá cambiar la búsqueda o el filtro."
                    : "Cuando registres ventas, aparecerán aquí."}
                </p>
              </div>
            ) : (
              <div className="pedidos-tabla-contenedor">
                <table className="pedidos-tabla">
                  <thead>
                    <tr>
                      <th>Pedido</th>
                      <th>Fecha</th>
                      <th>Pago</th>
                      <th>Total</th>
                      <th>Estado</th>
                      <th>Acciones</th>
                    </tr>
                  </thead>

                  <tbody>
                    {pedidosFiltrados.map((pedido) => (
                      <tr key={pedido.id}>
                        <td>
                          <strong className="pedidos-numero">
                            #{pedido.id}
                          </strong>
                          <span className="pedidos-tabla-productos">
                            {pedido.productos?.length || 0} productos
                          </span>
                        </td>

                        <td>
                          <span className="pedidos-fecha">
                            <CalendarDays size={14} />
                            {formatoFecha(pedido.fecha)}
                          </span>
                        </td>

                        <td>{nombreMetodo(pedido.metodo_pago)}</td>

                        <td className="pedidos-importe">
                          {formatoColones(pedido.total)}
                        </td>

                        <td>
                          <span
                            className={`pedidos-estado-badge ${
                              pedido.estado === "anulado"
                                ? "anulado"
                                : "confirmado"
                            }`}
                          >
                            {pedido.estado === "anulado"
                              ? "Anulado"
                              : "Confirmado"}
                          </span>
                        </td>

                        <td>
                          <div className="pedidos-acciones-tabla">
                            <button
                              type="button"
                              title="Ver detalle"
                              aria-label={`Ver pedido ${pedido.id}`}
                              onClick={() => verDetalle(pedido.id)}
                            >
                              <Eye size={16} />
                            </button>

                            {pedido.estado === "confirmado" && (
                              <button
                                type="button"
                                className="anular"
                                title="Solicitar anulación"
                                aria-label={`Anular pedido ${pedido.id}`}
                                onClick={() => setPedidoAnular(pedido)}
                              >
                                <Ban size={16} />
                              </button>
                            )}
                          </div>
                        </td>
                      </tr>
                    ))}
                  </tbody>
                </table>
              </div>
            )}

            <p className="pedidos-resultados">
              Mostrando {pedidosFiltrados.length} de {pedidos.length} pedidos.
            </p>
          </div>
        </section>
      )}

      {(pedidoDetalle || cargandoDetalle) && (
        <div
          className="pedidos-modal-fondo"
          onMouseDown={(e) => {
            if (
              e.target === e.currentTarget &&
              !cargandoDetalle
            ) {
              setPedidoDetalle(null);
            }
          }}
        >
          <section
            className="pedidos-modal"
            role="dialog"
            aria-modal="true"
            aria-labelledby="pedido-detalle-titulo"
          >
            <header className="pedidos-modal-header">
              <div>
                <span className="pedidos-etiqueta">
                  DETALLE DE VENTA
                </span>
                <h2 id="pedido-detalle-titulo">
                  {pedidoDetalle
                    ? `Pedido #${pedidoDetalle.id}`
                    : "Cargando pedido..."}
                </h2>
              </div>

              <button
                type="button"
                className="pedidos-modal-cerrar"
                onClick={() => setPedidoDetalle(null)}
                aria-label="Cerrar detalle"
              >
                <X size={19} />
              </button>
            </header>

            {cargandoDetalle ? (
              <div className="pedidos-estado">
                <RefreshCw
                  className="pedidos-girando"
                  size={24}
                />
                <p>Cargando detalle...</p>
              </div>
            ) : pedidoDetalle && (
              <>
                <div className="pedidos-detalle-datos">
                  <div>
                    <span>Fecha</span>
                    <strong>
                      {formatoFecha(pedidoDetalle.fecha)}
                    </strong>
                  </div>

                  <div>
                    <span>Método de pago</span>
                    <strong>
                      {nombreMetodo(pedidoDetalle.metodo_pago)}
                    </strong>
                  </div>

                  <div>
                    <span>Estado</span>
                    <strong>
                      {pedidoDetalle.estado === "anulado"
                        ? "Anulado"
                        : "Confirmado"}
                    </strong>
                  </div>
                </div>

                <h3 className="pedidos-detalle-subtitulo">
                  Productos vendidos
                </h3>

                <div className="pedidos-detalle-lineas">
                  {(pedidoDetalle.productos || []).map((item) => (
                    <div
                      key={
                        item.id ||
                        `${item.producto_id}-${item.producto}`
                      }
                    >
                      <div>
                        <strong>
                          {item.producto || item.nombre}
                        </strong>
                        <span>
                          {item.cantidad} ×{" "}
                          {formatoColones(item.precio_unitario)}
                        </span>
                      </div>

                      <strong>
                        {formatoColones(
                          item.importe ??
                            Number(item.cantidad) *
                              Number(item.precio_unitario)
                        )}
                      </strong>
                    </div>
                  ))}
                </div>

                <div className="pedidos-totales detalle">
                  <div>
                    <span>Subtotal</span>
                    <span>
                      {formatoColones(pedidoDetalle.subtotal)}
                    </span>
                  </div>

                  <div>
                    <span>Impuesto</span>
                    <span>
                      {formatoColones(pedidoDetalle.impuesto)}
                    </span>
                  </div>

                  <div className="pedidos-total-final">
                    <strong>Total</strong>
                    <strong>
                      {formatoColones(pedidoDetalle.total)}
                    </strong>
                  </div>
                </div>

                {pedidoDetalle.estado === "confirmado" && (
                  <button
                    type="button"
                    className="pedidos-boton-anular-modal"
                    onClick={() => setPedidoAnular(pedidoDetalle)}
                  >
                    <Ban size={17} />
                    Anular este pedido
                  </button>
                )}
              </>
            )}
          </section>
        </div>
      )}

      {pedidoAnular && (
        <div
          className="pedidos-modal-fondo"
          onMouseDown={(e) => {
            if (e.target === e.currentTarget && !anulando) {
              setPedidoAnular(null);
            }
          }}
        >
          <section
            className="pedidos-modal pedidos-modal-confirmacion"
            role="dialog"
            aria-modal="true"
            aria-labelledby="pedido-anular-titulo"
          >
            <div className="pedidos-confirmacion-icono">
              <AlertTriangle size={26} />
            </div>

            <h2 id="pedido-anular-titulo">
              ¿Anular el pedido #{pedidoAnular.id}?
            </h2>

            <p>
              El sistema intentará devolver los insumos utilizados.
              Esta acción solo se permite durante los primeros 15
              minutos y si existe el registro histórico necesario.
            </p>

            <div className="pedidos-confirmacion-resumen">
              <span>Total del pedido</span>
              <strong>
                {formatoColones(pedidoAnular.total)}
              </strong>
            </div>

            <div className="pedidos-modal-acciones">
              <button
                type="button"
                className="pedidos-boton-secundario"
                onClick={() => setPedidoAnular(null)}
                disabled={anulando}
              >
                Volver
              </button>

              <button
                type="button"
                className="pedidos-boton-peligro"
                onClick={confirmarAnulacion}
                disabled={anulando}
              >
                {anulando ? (
                  <>
                    <RefreshCw
                      className="pedidos-girando"
                      size={16}
                    />
                    Anulando...
                  </>
                ) : (
                  <>
                    <Ban size={16} />
                    Confirmar anulación
                  </>
                )}
              </button>
            </div>
          </section>
        </div>
      )}
    </main>
  );
}
