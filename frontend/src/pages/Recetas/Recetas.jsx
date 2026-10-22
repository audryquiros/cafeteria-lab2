
import { useMemo, useState } from "react";
import {
  BookOpen,
  Search,
  RefreshCw,
  Plus,
  Pencil,
  Trash2,
  X,
  ChefHat,
  Package,
  AlertCircle,
  CheckCircle2,
} from "lucide-react";

import { useApi } from "../../hooks/useApi";
import { api } from "../../services/api";
import CustomSelect from "../../components/CustomSelect/CustomSelect";
import ConfirmDialog from "../../components/ConfirmDialog/ConfirmDialog";
import Notificacion from "../../components/Notificacion/Notificacion";
import "./Recetas.css";

const formularioInicial = {
  producto_id: "",
  insumo_id: "",
  cantidad: "",
};

function Recetas() {
  const {
    datos: recetasDatos,
    cargando: cargandoRecetas,
    error: errorRecetas,
    recargar: recargarRecetas,
  } = useApi("/recetas");

  const {
    datos: productosDatos,
    cargando: cargandoProductos,
  } = useApi("/productos");

  const {
    datos: insumosDatos,
    cargando: cargandoInsumos,
    error: errorInsumos,
  } = useApi("/inventario");

  const [busqueda, setBusqueda] = useState("");
  const [filtroEstado, setFiltroEstado] = useState("todas");
  const [modalAbierto, setModalAbierto] = useState(false);
  const [ingredienteEditando, setIngredienteEditando] = useState(null);
  const [formulario, setFormulario] = useState({ ...formularioInicial });
  const [guardando, setGuardando] = useState(false);
  const [errorFormulario, setErrorFormulario] = useState("");
  const [notificacion, setNotificacion] = useState(null);
  const [confirmacion, setConfirmacion] = useState(null);
  const [procesandoConfirmacion, setProcesandoConfirmacion] =
    useState(false);

  const recetas = Array.isArray(recetasDatos) ? recetasDatos : [];
  const productos = Array.isArray(productosDatos) ? productosDatos : [];
  const insumos = Array.isArray(insumosDatos) ? insumosDatos : [];

  const productosActivos = useMemo(
    () => productos.filter((producto) => Boolean(producto.activo)),
    [productos]
  );

  const recetasFiltradas = useMemo(() => {
    const texto = busqueda.trim().toLowerCase();

    return recetas.filter((receta) => {
      const coincideTexto =
        receta.producto.toLowerCase().includes(texto) ||
        receta.insumos.some((insumo) =>
          insumo.insumo.toLowerCase().includes(texto)
        );

      const coincideEstado =
        filtroEstado === "todas" ||
        (filtroEstado === "disponibles" && receta.disponible) ||
        (filtroEstado === "noDisponibles" && !receta.disponible);

      return coincideTexto && coincideEstado;
    });
  }, [recetas, busqueda, filtroEstado]);

  const totalIngredientes = recetas.reduce(
    (total, receta) => total + receta.insumos.length,
    0
  );

  const recetasDisponibles = recetas.filter(
    (receta) => receta.disponible
  ).length;

  const productosSinReceta = productosActivos.filter(
    (producto) =>
      !recetas.some((receta) => receta.producto_id === producto.id)
  );

  function mostrarNotificacion(tipo, titulo, descripcion) {
    setNotificacion({
      tipo,
      titulo,
      descripcion,
      id: Date.now(),
    });
    setErrorFormulario("");
  }

  function abrirNuevo(productoId = "") {
    setIngredienteEditando(null);
    setFormulario({
      ...formularioInicial,
      producto_id: productoId ? String(productoId) : "",
    });
    setErrorFormulario("");
    setNotificacion(null);
    setModalAbierto(true);
  }

  function abrirEdicion(receta, ingrediente) {
    setIngredienteEditando({
      id: ingrediente.id,
      producto: receta.producto,
      insumo: ingrediente.insumo,
      cantidadAnterior: ingrediente.cantidad_necesaria,
      unidad: ingrediente.unidad,
    });

    setFormulario({
      producto_id: String(receta.producto_id),
      insumo_id: String(ingrediente.insumo_id),
      cantidad: String(ingrediente.cantidad_necesaria),
    });

    setErrorFormulario("");
    setNotificacion(null);
    setModalAbierto(true);
  }

  function cerrarModal() {
    if (guardando) return;

    setModalAbierto(false);
    setIngredienteEditando(null);
    setFormulario({ ...formularioInicial });
    setErrorFormulario("");
  }

  function cambiarCampo(evento) {
    const { name, value } = evento.target;

    setFormulario((actual) => ({
      ...actual,
      [name]: value,
      ...(name === "producto_id" ? { insumo_id: "" } : {}),
    }));
  }

  const productoSeleccionado = productos.find(
    (producto) => String(producto.id) === formulario.producto_id
  );

  const recetaSeleccionada = recetas.find(
    (receta) => String(receta.producto_id) === formulario.producto_id
  );

  const insumosDisponibles = insumos.filter((insumo) => {
    if (ingredienteEditando) {
      return String(insumo.id) === formulario.insumo_id;
    }

    const yaExiste = recetaSeleccionada?.insumos.some(
      (ingrediente) => ingrediente.insumo_id === insumo.id
    );

    return !yaExiste;
  });

  const formatoCantidad = (cantidad) =>
    new Intl.NumberFormat("es-CR", {
      maximumFractionDigits: 3,
    }).format(cantidad);

  async function guardarIngrediente(evento) {
    evento.preventDefault();
    setErrorFormulario("");
    setNotificacion(null);

    const cantidad = Number(formulario.cantidad);

    if (!ingredienteEditando && !formulario.producto_id) {
      setErrorFormulario("Seleccioná el producto de la receta.");
      return;
    }

    if (!ingredienteEditando && !formulario.insumo_id) {
      setErrorFormulario("Seleccioná un insumo.");
      return;
    }

    if (!Number.isFinite(cantidad) || cantidad <= 0) {
      setErrorFormulario("La cantidad debe ser mayor que cero.");
      return;
    }

    const esEdicion = Boolean(ingredienteEditando);

    const productoNombre = esEdicion
      ? ingredienteEditando.producto
      : productoSeleccionado?.nombre || "el producto seleccionado";

    const insumoSeleccionado = insumos.find(
      (insumo) => String(insumo.id) === formulario.insumo_id
    );

    const ingredienteNombre = esEdicion
      ? ingredienteEditando.insumo
      : insumoSeleccionado?.nombre || "el ingrediente";

    const unidad = esEdicion
      ? ingredienteEditando.unidad
      : insumoSeleccionado?.unidad || "";

    const cantidadAnterior = esEdicion
      ? formatoCantidad(ingredienteEditando.cantidadAnterior)
      : null;

    const cantidadNueva = formatoCantidad(cantidad);

    setGuardando(true);

    try {
      if (esEdicion) {
        await api.actualizar(`/recetas/${ingredienteEditando.id}`, {
          cantidad,
        });
      } else {
        await api.crear("/recetas", {
          producto_id: Number(formulario.producto_id),
          insumo_id: Number(formulario.insumo_id),
          cantidad,
        });
      }

      setModalAbierto(false);
      setIngredienteEditando(null);
      setFormulario({ ...formularioInicial });

      mostrarNotificacion(
        "exito",
        esEdicion ? "Ingrediente actualizado" : "Ingrediente agregado",
        esEdicion
          ? `La cantidad de ${ingredienteNombre} del producto ${productoNombre} se actualizó de ${cantidadAnterior} ${unidad} a ${cantidadNueva} ${unidad}.`
          : `Se agregó ${ingredienteNombre} a la receta de ${productoNombre}, con una cantidad de ${cantidadNueva} ${unidad} por preparación.`
      );

      await recargarRecetas();
    } catch (error) {
      setErrorFormulario(
        error.message || "No se pudo guardar el ingrediente."
      );
    } finally {
      setGuardando(false);
    }
  }

  function solicitarEliminacion(receta, ingrediente) {
    setNotificacion(null);

    const esUltimoIngrediente = receta.insumos.length === 1;

    setConfirmacion({
      titulo: esUltimoIngrediente
        ? "¿Dejar el producto sin receta?"
        : "¿Eliminar ingrediente?",

      mensaje: esUltimoIngrediente
        ? `Vas a eliminar el único ingrediente de ${receta.producto}. El producto quedará sin receta y no podrá prepararse hasta que agregues nuevos ingredientes. ¿Deseás continuar?`
        : `Se eliminará ${ingrediente.insumo} de la receta de ${receta.producto}. Esta acción no se puede deshacer.`,

      textoConfirmar: esUltimoIngrediente
        ? "Eliminar y dejar sin receta"
        : "Eliminar ingrediente",

      peligro: true,

      ejecutar: async () => {
        await api.eliminar(`/recetas/${ingrediente.id}`);
        await recargarRecetas();

        mostrarNotificacion(
          esUltimoIngrediente ? "aviso" : "exito",
          esUltimoIngrediente
            ? "Producto sin receta"
            : "Ingrediente eliminado",
          esUltimoIngrediente
            ? `Se eliminó ${ingrediente.insumo} (${formatoCantidad(ingrediente.cantidad_necesaria)} ${ingrediente.unidad}) de ${receta.producto}. El producto quedó sin ingredientes configurados.`
            : `Se eliminó ${ingrediente.insumo} (${formatoCantidad(ingrediente.cantidad_necesaria)} ${ingrediente.unidad}) de la receta de ${receta.producto}.`
        );
      },
    });
  }

  async function ejecutarConfirmacion() {
    if (!confirmacion || procesandoConfirmacion) return;

    setProcesandoConfirmacion(true);

    try {
      await confirmacion.ejecutar();
      setConfirmacion(null);
    } catch (error) {
      setConfirmacion(null);
      setErrorFormulario(
        error.message || "No se pudo eliminar el ingrediente."
      );
    } finally {
      setProcesandoConfirmacion(false);
    }
  }

  const cargando =
    cargandoRecetas || cargandoProductos || cargandoInsumos;

  return (
    <section className="recetas-page">
      <header className="recetas-header">
        <div>
          <span className="recetas-eyebrow">
            MORI CAFÉ · PREPARACIÓN
          </span>
          <h1>Recetas</h1>
          <p>
            Gestioná los ingredientes y las cantidades de cada producto.
          </p>
        </div>

        <div className="recetas-acciones-header">
          <button
            type="button"
            className="recetas-btn-secundario"
            onClick={() => {
              recargarRecetas();
              setNotificacion(null);
            }}
            disabled={cargando}
          >
            <RefreshCw size={17} />
            Actualizar
          </button>

          <button
            type="button"
            className="recetas-btn-principal"
            onClick={() => abrirNuevo()}
            disabled={productosActivos.length === 0}
          >
            <Plus size={18} />
            Agregar ingrediente
          </button>
        </div>
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

      {errorFormulario && !modalAbierto && (
        <div className="recetas-error" role="alert">
          <AlertCircle size={19} />
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

      <div className="recetas-resumen">
        <article className="recetas-tarjeta">
          <div className="recetas-tarjeta-icono lila">
            <BookOpen size={23} />
          </div>
          <div className="recetas-tarjeta-info">
            <span>Recetas registradas</span>
            <strong>{recetas.length}</strong>
          </div>
        </article>

        <article className="recetas-tarjeta">
          <div className="recetas-tarjeta-icono verde">
            <CheckCircle2 size={23} />
          </div>
          <div className="recetas-tarjeta-info">
            <span>Disponibles</span>
            <strong>{recetasDisponibles}</strong>
          </div>
        </article>

        <article className="recetas-tarjeta">
          <div className="recetas-tarjeta-icono rosa">
            <Package size={23} />
          </div>
          <div className="recetas-tarjeta-info">
            <span>Ingredientes asignados</span>
            <strong>{totalIngredientes}</strong>
          </div>
        </article>
      </div>

      {productosSinReceta.length > 0 && (
        <div className="recetas-aviso">
          <AlertCircle size={20} />
          <div>
            <strong>Hay productos sin receta</strong>
            <p>
              {productosSinReceta
                .map((producto) => producto.nombre)
                .join(", ")}
              . Agregales sus ingredientes cuando tengás definidas las
              cantidades.
            </p>
          </div>
        </div>
      )}

      <div className="recetas-filtros">
        <label className="recetas-busqueda">
          <Search size={19} />
          <input
            type="search"
            placeholder="Buscar producto o ingrediente..."
            aria-label="Buscar producto o ingrediente"
            value={busqueda}
            onChange={(evento) => setBusqueda(evento.target.value)}
          />
        </label>

        <CustomSelect
          ariaLabel="Filtrar recetas por disponibilidad"
          value={filtroEstado}
          onChange={setFiltroEstado}
          options={[
            { value: "todas", label: "Todas las recetas" },
            { value: "disponibles", label: "Disponibles" },
            { value: "noDisponibles", label: "No disponibles" },
          ]}
        />
      </div>

      {cargando && (
        <div className="recetas-estado">
          Cargando información de las recetas...
        </div>
      )}

      {!cargando && (errorRecetas || errorInsumos) && (
        <div className="recetas-error" role="alert">
          <AlertCircle size={19} />
          <span>{errorRecetas || errorInsumos}</span>
          <button
            type="button"
            onClick={() => recargarRecetas()}
          >
            Reintentar
          </button>
        </div>
      )}

      {!cargando && !errorRecetas && (
        <>
          {recetasFiltradas.length === 0 ? (
            <div className="recetas-vacio">
              <div className="recetas-vacio-icono">
                <ChefHat size={30} />
              </div>
              <h2>No hay recetas para mostrar</h2>
              <p>
                Probá cambiar la búsqueda o agregá ingredientes a un producto.
              </p>
              <button
                type="button"
                className="recetas-btn-principal"
                onClick={() => abrirNuevo()}
                disabled={productosActivos.length === 0}
              >
                <Plus size={18} />
                Agregar ingrediente
              </button>
            </div>
          ) : (
            <div className="recetas-lista">
              {recetasFiltradas.map((receta) => (
                <article
                  className="recetas-card"
                  key={receta.producto_id}
                >
                  <header className="recetas-card-header">
                    <div className="recetas-producto-icono">
                      <ChefHat size={23} />
                    </div>

                    <div className="recetas-producto-info">
                      <h2>{receta.producto}</h2>
                      <span>
                        {receta.insumos.length}{" "}
                        {receta.insumos.length === 1
                          ? "ingrediente"
                          : "ingredientes"}
                      </span>
                    </div>

                    <span
                      className={`recetas-estado-badge ${
                        receta.disponible
                          ? "disponible"
                          : "no-disponible"
                      }`}
                    >
                      {receta.disponible
                        ? "Disponible"
                        : "No disponible"}
                    </span>

                    <button
                      type="button"
                      className="recetas-agregar-mini"
                      onClick={() => abrirNuevo(receta.producto_id)}
                      aria-label={`Agregar ingrediente a ${receta.producto}`}
                      title="Agregar ingrediente"
                    >
                      <Plus size={19} />
                    </button>
                  </header>

                  <div className="recetas-ingredientes">
                    {receta.insumos.map((ingrediente) => {
                      const stockBajo =
                        ingrediente.stock_disponible <
                        ingrediente.cantidad_necesaria;

                      return (
                        <div
                          className="recetas-ingrediente"
                          key={ingrediente.id}
                        >
                          <div className="recetas-ingrediente-icono">
                            <Package size={18} />
                          </div>

                          <div className="recetas-ingrediente-info">
                            <strong>{ingrediente.insumo}</strong>
                            <span>
                              Stock:{" "}
                              {formatoCantidad(
                                ingrediente.stock_disponible
                              )}{" "}
                              {ingrediente.unidad}
                            </span>
                          </div>

                          <div className="recetas-cantidad">
                            <strong>
                              {formatoCantidad(
                                ingrediente.cantidad_necesaria
                              )}
                            </strong>
                            <span>
                              {ingrediente.unidad} / preparación
                            </span>
                          </div>

                          {stockBajo && (
                            <span className="recetas-stock-alerta">
                              Stock insuficiente
                            </span>
                          )}

                          <div className="recetas-acciones-ingrediente">
                            <button
                              type="button"
                              onClick={() =>
                                abrirEdicion(receta, ingrediente)
                              }
                              aria-label={`Editar ${ingrediente.insumo}`}
                              title="Editar cantidad"
                            >
                              <Pencil size={16} />
                            </button>

                            <button
                              type="button"
                              className="eliminar"
                              onClick={() =>
                                solicitarEliminacion(receta, ingrediente)
                              }
                              aria-label={`Eliminar ${ingrediente.insumo}`}
                              title="Eliminar ingrediente"
                            >
                              <Trash2 size={16} />
                            </button>
                          </div>
                        </div>
                      );
                    })}
                  </div>
                </article>
              ))}
            </div>
          )}
        </>
      )}

      {modalAbierto && (
        <div
          className="recetas-modal-fondo"
          onMouseDown={(evento) => {
            if (evento.target === evento.currentTarget) cerrarModal();
          }}
        >
          <section
            className="recetas-modal"
            role="dialog"
            aria-modal="true"
            aria-labelledby="recetas-modal-titulo"
          >
            <header className="recetas-modal-header">
              <div>
                <span className="recetas-eyebrow">
                  MORI CAFÉ · RECETAS
                </span>
                <h2 id="recetas-modal-titulo">
                  {ingredienteEditando
                    ? "Editar cantidad"
                    : "Agregar ingrediente"}
                </h2>
                <p>
                  {ingredienteEditando
                    ? `Actualizá la cantidad de ${ingredienteEditando.insumo}.`
                    : "Seleccioná el producto y el insumo que utiliza."}
                </p>
              </div>

              <button
                type="button"
                className="recetas-modal-cerrar"
                onClick={cerrarModal}
                disabled={guardando}
                aria-label="Cerrar formulario"
              >
                <X size={21} />
              </button>
            </header>

            {errorFormulario && (
              <div className="recetas-error" role="alert">
                <AlertCircle size={18} />
                <span>{errorFormulario}</span>
              </div>
            )}

            <form onSubmit={guardarIngrediente}>
              <label className="recetas-campo-select">
                Producto
                <CustomSelect
                  value={formulario.producto_id}
                  onChange={(valor) =>
                    setFormulario((actual) => ({
                      ...actual,
                      producto_id: valor,
                      insumo_id: "",
                    }))
                  }
                  options={[
                    {
                      value: "",
                      label: "Seleccioná un producto",
                    },
                    ...productosActivos.map((producto) => ({
                      value: String(producto.id),
                      label: producto.nombre,
                    })),
                  ]}
                  placeholder="Seleccioná un producto"
                  disabled={
                    Boolean(ingredienteEditando) || guardando
                  }
                />
              </label>

              <label className="recetas-campo-select">
                Insumo
                <CustomSelect
                  value={formulario.insumo_id}
                  onChange={(valor) =>
                    setFormulario((actual) => ({
                      ...actual,
                      insumo_id: valor,
                    }))
                  }
                  options={[
                    {
                      value: "",
                      label: "Seleccioná un insumo",
                    },
                    ...insumosDisponibles.map((insumo) => ({
                      value: String(insumo.id),
                      label: `${insumo.nombre} (${insumo.unidad})`,
                    })),
                  ]}
                  placeholder="Seleccioná un insumo"
                  disabled={
                    Boolean(ingredienteEditando) || guardando
                  }
                />
              </label>

              {productoSeleccionado && (
                <p className="recetas-ayuda-formulario">
                  Estás configurando la receta de{" "}
                  <strong>{productoSeleccionado.nombre}</strong>.
                </p>
              )}

              <label>
                Cantidad necesaria por preparación
                <div className="recetas-input-cantidad">
                  <input
                    type="number"
                    name="cantidad"
                    min="0.001"
                    step="any"
                    placeholder="Ej. 18"
                    value={formulario.cantidad}
                    onChange={cambiarCampo}
                    required
                  />
                  <span>
                    {insumos.find(
                      (insumo) =>
                        String(insumo.id) === formulario.insumo_id
                    )?.unidad || "Unidad"}
                  </span>
                </div>
              </label>

              <div className="recetas-modal-acciones">
                <button
                  type="button"
                  className="recetas-btn-secundario"
                  onClick={cerrarModal}
                  disabled={guardando}
                >
                  Cancelar
                </button>

                <button
                  type="submit"
                  className="recetas-btn-principal"
                  disabled={guardando}
                >
                  {guardando
                    ? "Guardando..."
                    : ingredienteEditando
                      ? "Guardar cambios"
                      : "Agregar ingrediente"}
                </button>
              </div>
            </form>
          </section>
        </div>
      )}

      <ConfirmDialog
        abierto={Boolean(confirmacion)}
        titulo={confirmacion?.titulo || ""}
        mensaje={confirmacion?.mensaje || ""}
        textoConfirmar={
          confirmacion?.textoConfirmar || "Confirmar"
        }
        textoCancelar="Cancelar"
        peligro={confirmacion?.peligro || false}
        cargando={procesandoConfirmacion}
        onConfirmar={ejecutarConfirmacion}
        onCancelar={() => {
          if (!procesandoConfirmacion) {
            setConfirmacion(null);
          }
        }}
      />
    </section>
  );
}

export default Recetas;
