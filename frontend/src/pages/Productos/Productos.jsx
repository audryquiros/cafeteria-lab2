
import { useMemo, useState } from "react";
import {
  Package,
  RefreshCw,
  Plus,
  Pencil,
  Trash2,
  X,
  CheckCircle2,
  AlertCircle,
} from "lucide-react";
import { useApi } from "../../hooks/useApi";
import CustomSelect from "../../components/CustomSelect/CustomSelect";
import ConfirmDialog from "../../components/ConfirmDialog/ConfirmDialog";
import Notificacion from "../../components/Notificacion/Notificacion";
import "./Productos.css";

const formularioInicial = {
  nombre: "",
  precio: "",
  categoria: "Cafe",
  activo: 1,
};

const categorias = [
  { value: "Cafe", label: "Café" },
  { value: "Chocolate", label: "Chocolate" },
  { value: "Te", label: "Té" },
];

const opcionesEstado = [
  { value: "1", label: "Activo" },
  { value: "0", label: "Inactivo" },
];

function Productos() {
  const { datos, cargando, error, recargar } = useApi("/productos");

  const [busqueda, setBusqueda] = useState("");
  const [estado, setEstado] = useState("todos");
  const [orden, setOrden] = useState("nombre");

  const [modalAbierto, setModalAbierto] = useState(false);
  const [productoEditando, setProductoEditando] = useState(null);
  const [formulario, setFormulario] = useState({ ...formularioInicial });
  const [guardando, setGuardando] = useState(false);
  const [errorFormulario, setErrorFormulario] = useState("");

  const [notificacion, setNotificacion] = useState(null);
  const [confirmacion, setConfirmacion] = useState(null);
  const [procesandoConfirmacion, setProcesandoConfirmacion] =
    useState(false);

  const productos = useMemo(() => {
    const lista = Array.isArray(datos) ? datos : [];

    return lista
      .filter((producto) =>
        String(producto.nombre || "")
          .toLowerCase()
          .includes(busqueda.trim().toLowerCase())
      )
      .filter((producto) => {
        if (estado === "activos") return Number(producto.activo) === 1;
        if (estado === "inactivos") return Number(producto.activo) === 0;
        return true;
      })
      .sort((a, b) => {
        if (orden === "precioAsc") return a.precio - b.precio;
        if (orden === "precioDesc") return b.precio - a.precio;
        return a.nombre.localeCompare(b.nombre);
      });
  }, [datos, busqueda, estado, orden]);

  function mostrarNotificacion(tipo, titulo, descripcion) {
    setNotificacion({
      id: Date.now(),
      tipo,
      titulo,
      descripcion,
    });
    setErrorFormulario("");
  }

  function cerrarNotificacion() {
    setNotificacion(null);
  }

  function abrirNuevo() {
    setProductoEditando(null);
    setFormulario({ ...formularioInicial });
    setErrorFormulario("");
    setNotificacion(null);
    setModalAbierto(true);
  }

  function abrirEdicion(producto) {
    setProductoEditando(producto);
    setFormulario({
      nombre: producto.nombre,
      precio: String(producto.precio),
      categoria: producto.categoria,
      activo: Number(producto.activo),
    });
    setErrorFormulario("");
    setNotificacion(null);
    setModalAbierto(true);
  }

  function cerrarModal() {
    if (guardando) return;

    setModalAbierto(false);
    setProductoEditando(null);
    setFormulario({ ...formularioInicial });
    setErrorFormulario("");
  }

  function cambiarCampo(evento) {
    const { name, value } = evento.target;

    setFormulario((actual) => ({
      ...actual,
      [name]: name === "activo" ? Number(value) : value,
    }));
  }

  const formatoPrecio = (precio) =>
    new Intl.NumberFormat("es-CR", {
      style: "currency",
      currency: "CRC",
      minimumFractionDigits: 0,
      maximumFractionDigits: 2,
    }).format(Number(precio) || 0);

  async function guardarProducto(evento) {
    evento.preventDefault();
    setErrorFormulario("");
    setNotificacion(null);

    const nombre = formulario.nombre.trim();
    const precio = Number(formulario.precio);
    const categoria = formulario.categoria;
    const esEdicion = Boolean(productoEditando);

    if (!nombre || !categoria) {
      setErrorFormulario("Completá el nombre y la categoría.");
      return;
    }

    if (!Number.isFinite(precio) || precio <= 0) {
      setErrorFormulario("El precio debe ser un número mayor que cero.");
      return;
    }

    const datosProducto = { nombre, precio, categoria };

    if (esEdicion) {
      datosProducto.activo = Number(formulario.activo);
    }

    setGuardando(true);

    try {
      const url = esEdicion
        ? `/productos/${productoEditando.id}`
        : "/productos";

      const respuesta = await fetch(`http://localhost:3000/api${url}`, {
        method: esEdicion ? "PUT" : "POST",
        headers: {
          "Content-Type": "application/json",
        },
        body: JSON.stringify(datosProducto),
      });

      const resultado = await respuesta.json().catch(() => null);

      if (!respuesta.ok) {
        throw new Error(
          resultado?.error ||
            resultado?.mensaje ||
            "No se pudo guardar el producto."
        );
      }

      setModalAbierto(false);
      setProductoEditando(null);
      setFormulario({ ...formularioInicial });

      await recargar();

      mostrarNotificacion(
        "exito",
        esEdicion ? "Producto actualizado" : "Producto creado",
        esEdicion
          ? `Los datos de ${nombre} se actualizaron correctamente. Precio: ${formatoPrecio(precio)}.`
          : `Se agregó ${nombre} al catálogo con un precio de ${formatoPrecio(precio)}.`
      );
    } catch (err) {
      mostrarNotificacion(
        "error",
        esEdicion ? "No se pudo actualizar el producto" : "No se pudo crear el producto",
        err.message || "No se pudo conectar con el servidor."
      );
    } finally {
      setGuardando(false);
    }
  }

  function cambiarEstado(producto) {
    const nuevoEstado = Number(producto.activo) === 1 ? 0 : 1;
    const activar = nuevoEstado === 1;

    setErrorFormulario("");
    setNotificacion(null);

    setConfirmacion({
      titulo: activar ? "¿Activar producto?" : "¿Desactivar producto?",
      mensaje: activar
        ? `¿Deseás activar "${producto.nombre}"?`
        : `¿Deseás desactivar "${producto.nombre}"? El producto dejará de estar disponible como producto activo.`,
      textoConfirmar: activar ? "Sí, activar" : "Sí, desactivar",
      peligro: false,
      ejecutar: async () => {
        const respuesta = await fetch(
          `http://localhost:3000/api/productos/${producto.id}`,
          {
            method: "PUT",
            headers: {
              "Content-Type": "application/json",
            },
            body: JSON.stringify({
              nombre: producto.nombre,
              precio: producto.precio,
              categoria: producto.categoria,
              activo: nuevoEstado,
            }),
          }
        );

        const resultado = await respuesta.json().catch(() => null);

        if (!respuesta.ok) {
          throw new Error(
            resultado?.error ||
              resultado?.mensaje ||
              "No se pudo cambiar el estado del producto."
          );
        }

        await recargar();

        mostrarNotificacion(
          "exito",
          activar ? "Producto activado" : "Producto desactivado",
          activar
            ? `${producto.nombre} vuelve a estar activo en el catálogo.`
            : `${producto.nombre} quedó inactivo y ya no estará disponible como producto activo.`
        );
      },
    });
  }

  function eliminarProducto(producto) {
    setErrorFormulario("");
    setNotificacion(null);

    setConfirmacion({
      titulo: "¿Eliminar producto?",
      mensaje: `¿Seguro que deseás eliminar "${producto.nombre}"? Esta acción puede ser irreversible y el producto podría estar relacionado con recetas o pedidos.`,
      textoConfirmar: "Sí, eliminar",
      peligro: true,
      ejecutar: async () => {
        const respuesta = await fetch(
          `http://localhost:3000/api/productos/${producto.id}`,
          {
            method: "DELETE",
          }
        );

        const resultado = await respuesta.json().catch(() => null);

        if (!respuesta.ok) {
          throw new Error(
            resultado?.error ||
              resultado?.mensaje ||
              "No se pudo eliminar el producto."
          );
        }

        await recargar();

        mostrarNotificacion(
          "exito",
          "Producto eliminado",
          `${producto.nombre} se eliminó del catálogo correctamente.`
        );
      },
    });
  }

  async function ejecutarConfirmacion() {
    if (!confirmacion || procesandoConfirmacion) return;

    const accion = confirmacion.ejecutar;

    setProcesandoConfirmacion(true);
    setErrorFormulario("");

    try {
      await accion();
      setConfirmacion(null);
    } catch (err) {
      setConfirmacion(null);

      mostrarNotificacion(
        "error",
        "No se pudo completar la operación",
        err.message || "Ocurrió un error al procesar la solicitud."
      );
    } finally {
      setProcesandoConfirmacion(false);
    }
  }

  function cerrarConfirmacion() {
    if (procesandoConfirmacion) return;
    setConfirmacion(null);
  }

  return (
    <section className="productos-page">
      <header className="productos-header">
        <div>
          <span className="productos-eyebrow">MORI CAFÉ · CATÁLOGO</span>
          <h1>Productos</h1>
          <p>Administrá las bebidas y los productos de tu cafetería.</p>
        </div>

        <div className="productos-acciones-header">
          <button
            type="button"
            className="productos-btn-secundario"
            onClick={recargar}
            disabled={cargando}
          >
            <RefreshCw size={16} />
            Actualizar
          </button>

          <button
            type="button"
            className="productos-btn-principal"
            onClick={abrirNuevo}
          >
            <Plus size={17} />
            Nuevo producto
          </button>
        </div>
      </header>

      {notificacion && (
        <Notificacion
          key={notificacion.id}
          tipo={notificacion.tipo}
          titulo={notificacion.titulo}
          mensaje={notificacion.descripcion}
          onCerrar={cerrarNotificacion}
        />
      )}

      {errorFormulario && !modalAbierto && (
        <div className="productos-error" role="alert">
          <AlertCircle size={18} />
          <span>{errorFormulario}</span>
          <button
            type="button"
            onClick={() => setErrorFormulario("")}
            aria-label="Cerrar mensaje"
          >
            <X size={17} />
          </button>
        </div>
      )}

      <div className="productos-filtros">
        <input
          type="search"
          placeholder="Buscar producto..."
          aria-label="Buscar producto por nombre"
          value={busqueda}
          onChange={(evento) => setBusqueda(evento.target.value)}
        />

        <CustomSelect
          ariaLabel="Filtrar por estado"
          value={estado}
          onChange={setEstado}
          options={[
            { value: "todos", label: "Todos los estados" },
            { value: "activos", label: "Solo activos" },
            { value: "inactivos", label: "Solo inactivos" },
          ]}
        />

        <CustomSelect
          ariaLabel="Ordenar productos"
          value={orden}
          onChange={setOrden}
          options={[
            { value: "nombre", label: "Ordenar por nombre" },
            { value: "precioAsc", label: "Precio: menor a mayor" },
            { value: "precioDesc", label: "Precio: mayor a menor" },
          ]}
        />
      </div>

      {cargando && (
        <p className="productos-mensaje">Cargando productos...</p>
      )}

      {!cargando && error && (
        <div className="productos-error" role="alert">
          <AlertCircle size={18} />
          <span>{error}</span>
          <button type="button" onClick={recargar}>
            Intentar de nuevo
          </button>
        </div>
      )}

      {!cargando && !error && (
        <>
          <p className="productos-contador">
            {productos.length} producto(s) encontrado(s)
          </p>

          {productos.length === 0 ? (
            <div className="productos-vacio">
              No hay productos que coincidan con la búsqueda.
            </div>
          ) : (
            <div className="productos-tabla-contenedor">
              <table className="productos-tabla">
                <thead>
                  <tr>
                    <th>Producto</th>
                    <th>Categoría</th>
                    <th>Precio</th>
                    <th>Estado</th>
                    <th>Acciones</th>
                  </tr>
                </thead>

                <tbody>
                  {productos.map((producto) => (
                    <tr key={producto.id}>
                      <td>
                        <strong>{producto.nombre}</strong>
                        <small>ID: {producto.id}</small>
                      </td>

                      <td>{producto.categoria}</td>

                      <td className="productos-precio">
                        {formatoPrecio(producto.precio)}
                      </td>

                      <td>
                        <span
                          className={`productos-estado ${
                            Number(producto.activo) === 1
                              ? "activo"
                              : "inactivo"
                          }`}
                        >
                          {Number(producto.activo) === 1
                            ? "Activo"
                            : "Inactivo"}
                        </span>
                      </td>

                      <td>
                        <div className="productos-acciones-fila">
                          <button
                            type="button"
                            onClick={() => abrirEdicion(producto)}
                            aria-label={`Editar ${producto.nombre}`}
                          >
                            <Pencil size={15} />
                            Editar
                          </button>

                          <button
                            type="button"
                            onClick={() => cambiarEstado(producto)}
                          >
                            {Number(producto.activo) === 1
                              ? "Desactivar"
                              : "Activar"}
                          </button>

                          <button
                            type="button"
                            className="productos-btn-eliminar"
                            onClick={() => eliminarProducto(producto)}
                          >
                            <Trash2 size={15} />
                            Eliminar
                          </button>
                        </div>
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          )}
        </>
      )}

      {modalAbierto && (
        <div
          className="productos-modal-fondo"
          onMouseDown={(evento) => {
            if (evento.target === evento.currentTarget) cerrarModal();
          }}
        >
          <section
            className="productos-modal"
            role="dialog"
            aria-modal="true"
            aria-labelledby="productos-modal-titulo"
          >
            <header className="productos-modal-header">
              <div>
                <span className="productos-eyebrow">MORI CAFÉ</span>
                <h2 id="productos-modal-titulo">
                  {productoEditando ? "Editar producto" : "Nuevo producto"}
                </h2>
              </div>

              <button
                type="button"
                className="productos-modal-cerrar"
                onClick={cerrarModal}
                disabled={guardando}
                aria-label="Cerrar formulario"
              >
                <X size={20} />
              </button>
            </header>

            <form onSubmit={guardarProducto}>
              <label>
                Nombre del producto
                <input
                  name="nombre"
                  value={formulario.nombre}
                  onChange={cambiarCampo}
                  maxLength={100}
                  required
                  autoFocus
                />
              </label>

              <label>
                Precio (₡)
                <input
                  name="precio"
                  type="number"
                  min="0.01"
                  step="0.01"
                  value={formulario.precio}
                  onChange={cambiarCampo}
                  required
                />
              </label>

              <label>
                Categoría
                <CustomSelect
                  ariaLabel="Categoría del producto"
                  value={formulario.categoria}
                  onChange={(valor) =>
                    setFormulario((actual) => ({
                      ...actual,
                      categoria: valor,
                    }))
                  }
                  options={categorias}
                />
              </label>

              {productoEditando && (
                <label>
                  Estado
                  <CustomSelect
                    ariaLabel="Estado del producto"
                    value={String(formulario.activo)}
                    onChange={(valor) =>
                      setFormulario((actual) => ({
                        ...actual,
                        activo: Number(valor),
                      }))
                    }
                    options={opcionesEstado}
                  />
                </label>
              )}

              {errorFormulario && (
                <div className="productos-error" role="alert">
                  <AlertCircle size={18} />
                  <span>{errorFormulario}</span>
                </div>
              )}

              <footer className="productos-modal-acciones">
                <button
                  type="button"
                  className="productos-btn-secundario"
                  onClick={cerrarModal}
                  disabled={guardando}
                >
                  Cancelar
                </button>

                <button
                  type="submit"
                  className="productos-btn-principal"
                  disabled={guardando}
                >
                  {guardando ? (
                    <>
                      <RefreshCw size={16} />
                      Guardando...
                    </>
                  ) : (
                    <>
                      <CheckCircle2 size={16} />
                      {productoEditando
                        ? "Guardar cambios"
                        : "Crear producto"}
                    </>
                  )}
                </button>
              </footer>
            </form>
          </section>
        </div>
      )}

      <ConfirmDialog
        abierto={Boolean(confirmacion)}
        titulo={confirmacion?.titulo}
        mensaje={confirmacion?.mensaje}
        textoConfirmar={confirmacion?.textoConfirmar}
        peligro={confirmacion?.peligro}
        cargando={procesandoConfirmacion}
        onConfirmar={ejecutarConfirmacion}
        onCancelar={cerrarConfirmacion}
      />
    </section>
  );
}

export default Productos;
