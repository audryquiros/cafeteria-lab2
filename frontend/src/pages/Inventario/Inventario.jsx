
import { useMemo, useState } from "react";
import {
  Package,
  AlertTriangle,
  CircleCheck,
  Search,
  RefreshCw,
  Plus,
  Pencil,
  Trash2,
  X,
} from "lucide-react";

import { useApi } from "../../hooks/useApi";
import CustomSelect from "../../components/CustomSelect/CustomSelect";
import ConfirmDialog from "../../components/ConfirmDialog/ConfirmDialog";
import Notificacion from "../../components/Notificacion/Notificacion";
import "./Inventario.css";

const formularioInicial = {
  nombre: "",
  unidad: "g",
  stock: "",
  stock_minimo: "",
};

const unidades = [
  { value: "g", label: "Gramos (g)" },
  { value: "kg", label: "Kilogramos (kg)" },
  { value: "ml", label: "Mililitros (ml)" },
  { value: "l", label: "Litros (l)" },
  { value: "unidad", label: "Unidades" },
];

function Inventario() {
  const { datos, cargando, error, recargar } = useApi("/inventario");

  const [busqueda, setBusqueda] = useState("");
  const [filtroStock, setFiltroStock] = useState("todos");
  const [orden, setOrden] = useState("nombre");

  const [modalAbierto, setModalAbierto] = useState(false);
  const [insumoEditando, setInsumoEditando] = useState(null);
  const [formulario, setFormulario] = useState({ ...formularioInicial });
  const [guardando, setGuardando] = useState(false);
  const [errorFormulario, setErrorFormulario] = useState("");

  const [notificacion, setNotificacion] = useState(null);
  const [confirmacion, setConfirmacion] = useState(null);
  const [procesandoConfirmacion, setProcesandoConfirmacion] =
    useState(false);

  const listaCompleta = Array.isArray(datos) ? datos : [];

  const insumos = useMemo(() => {
    return listaCompleta
      .filter((insumo) =>
        String(insumo.nombre || "")
          .toLowerCase()
          .includes(busqueda.trim().toLowerCase())
      )
      .filter((insumo) => {
        if (filtroStock === "bajo") {
          return Number(insumo.necesita_reposicion) === 1;
        }

        if (filtroStock === "normal") {
          return Number(insumo.necesita_reposicion) === 0;
        }

        return true;
      })
      .sort((a, b) => {
        if (orden === "stockAsc") return a.stock - b.stock;
        if (orden === "stockDesc") return b.stock - a.stock;

        if (orden === "alertas") {
          return (
            Number(b.necesita_reposicion) -
              Number(a.necesita_reposicion) ||
            a.nombre.localeCompare(b.nombre)
          );
        }

        return a.nombre.localeCompare(b.nombre);
      });
  }, [listaCompleta, busqueda, filtroStock, orden]);

  const cantidadAlertas = listaCompleta.filter(
    (insumo) => Number(insumo.necesita_reposicion) === 1
  ).length;

  function mostrarNotificacion(tipo, titulo, descripcion) {
    setNotificacion({
      id: Date.now(),
      tipo,
      titulo,
      descripcion,
    });
    setErrorFormulario("");
  }

  function abrirNuevo() {
    setInsumoEditando(null);
    setFormulario({ ...formularioInicial });
    setErrorFormulario("");
    setNotificacion(null);
    setModalAbierto(true);
  }

  function abrirEdicion(insumo) {
    setInsumoEditando(insumo);

    setFormulario({
      nombre: insumo.nombre,
      unidad: insumo.unidad,
      stock: String(insumo.stock),
      stock_minimo: String(insumo.stock_minimo),
    });

    setErrorFormulario("");
    setNotificacion(null);
    setModalAbierto(true);
  }

  function cerrarModal() {
    if (guardando) return;

    setModalAbierto(false);
    setInsumoEditando(null);
    setFormulario({ ...formularioInicial });
    setErrorFormulario("");
  }

  function cambiarCampo(evento) {
    const { name, value } = evento.target;

    setFormulario((actual) => ({
      ...actual,
      [name]: value,
    }));
  }

  function formatoCantidad(cantidad) {
    return new Intl.NumberFormat("es-CR", {
      maximumFractionDigits: 3,
    }).format(Number(cantidad) || 0);
  }

  async function guardarInsumo(evento) {
    evento.preventDefault();
    setErrorFormulario("");
    setNotificacion(null);

    const nombre = formulario.nombre.trim();
    const unidad = formulario.unidad;
    const stock = Number(formulario.stock);
    const stock_minimo = Number(formulario.stock_minimo);
    const esEdicion = Boolean(insumoEditando);

    if (!nombre || !unidad) {
      setErrorFormulario("El nombre y la unidad son obligatorios.");
      return;
    }

    if (
      formulario.stock.trim() === "" ||
      formulario.stock_minimo.trim() === "" ||
      !Number.isFinite(stock) ||
      !Number.isFinite(stock_minimo) ||
      stock < 0 ||
      stock_minimo < 0
    ) {
      setErrorFormulario(
        "Las existencias y el stock mínimo deben ser números no negativos."
      );
      return;
    }

    const datosInsumo = {
      nombre,
      unidad,
      stock,
      stock_minimo,
    };

    setGuardando(true);

    try {
      const ruta = esEdicion
        ? `/inventario/${insumoEditando.id}`
        : "/inventario";

      const respuesta = await fetch(`http://localhost:3000/api${ruta}`, {
        method: esEdicion ? "PUT" : "POST",
        headers: {
          "Content-Type": "application/json",
        },
        body: JSON.stringify(datosInsumo),
      });

      const resultado = await respuesta.json().catch(() => null);

      if (!respuesta.ok) {
        throw new Error(
          resultado?.error ||
            resultado?.mensaje ||
            "No se pudo guardar el insumo."
        );
      }

      setModalAbierto(false);
      setInsumoEditando(null);
      setFormulario({ ...formularioInicial });

      await recargar();

      mostrarNotificacion(
        "exito",
        esEdicion ? "Insumo actualizado" : "Insumo registrado",
        esEdicion
          ? `Se actualizaron los datos de ${nombre}. Las existencias quedaron en ${formatoCantidad(stock)} ${unidad} y el stock mínimo en ${formatoCantidad(stock_minimo)} ${unidad}.`
          : `Se registró ${nombre} con ${formatoCantidad(stock)} ${unidad} disponibles y un stock mínimo de ${formatoCantidad(stock_minimo)} ${unidad}.`
      );
    } catch (err) {
      mostrarNotificacion(
        "error",
        esEdicion ? "No se pudo actualizar el insumo" : "No se pudo registrar el insumo",
        err.message || "No se pudo conectar con el servidor."
      );
    } finally {
      setGuardando(false);
    }
  }

  function solicitarEliminacion(insumo) {
    setErrorFormulario("");
    setNotificacion(null);

    setConfirmacion({
      titulo: "¿Eliminar insumo?",
      mensaje: `¿Deseás eliminar "${insumo.nombre}"? Si está relacionado con una receta, el sistema podría impedir la eliminación.`,
      textoConfirmar: "Sí, eliminar",
      peligro: true,

      ejecutar: async () => {
        const respuesta = await fetch(
          `http://localhost:3000/api/inventario/${insumo.id}`,
          { method: "DELETE" }
        );

        const resultado = await respuesta.json().catch(() => null);

        if (!respuesta.ok) {
          throw new Error(
            resultado?.error ||
              resultado?.mensaje ||
              "No se pudo eliminar el insumo."
          );
        }

        await recargar();

        mostrarNotificacion(
          "exito",
          "Insumo eliminado",
          `Se eliminó ${insumo.nombre} del inventario correctamente.`
        );
      },
    });
  }

  async function ejecutarConfirmacion() {
    if (!confirmacion || procesandoConfirmacion) return;

    setProcesandoConfirmacion(true);
    setErrorFormulario("");

    try {
      await confirmacion.ejecutar();
      setConfirmacion(null);
    } catch (err) {
      setConfirmacion(null);

      mostrarNotificacion(
        "error",
        "No se pudo eliminar el insumo",
        err.message || "Ocurrió un error al completar la operación."
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
    <section className="inventario-page">
      <header className="inventario-header">
        <div>
          <span className="inventario-eyebrow">
            MORI CAFÉ · CONTROL DE EXISTENCIAS
          </span>

          <h1>Inventario</h1>

          <p>
            Controlá los insumos y mantené tu cafetería siempre preparada.
          </p>
        </div>

        <div className="inventario-acciones-header">
          <button
            type="button"
            className="inventario-btn-secundario"
            onClick={() => {
              recargar();
              setNotificacion(null);
            }}
            disabled={cargando}
          >
            <RefreshCw size={17} />
            Actualizar
          </button>

          <button
            type="button"
            className="inventario-btn-principal"
            onClick={abrirNuevo}
          >
            <Plus size={18} />
            Nuevo insumo
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
        <div className="inventario-error" role="alert">
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

      <div className="inventario-resumen">
        <article className="inventario-tarjeta">
          <div className="inventario-tarjeta-icono morado">
            <Package size={23} strokeWidth={1.8} />
          </div>

          <div className="inventario-tarjeta-info">
            <span>Insumos registrados</span>
            <strong>{listaCompleta.length}</strong>
          </div>
        </article>

        <article className="inventario-tarjeta">
          <div className="inventario-tarjeta-icono rosa">
            <AlertTriangle size={23} strokeWidth={1.8} />
          </div>

          <div className="inventario-tarjeta-info">
            <span>Necesitan reposición</span>
            <strong className={cantidadAlertas > 0 ? "texto-alerta" : ""}>
              {cantidadAlertas}
            </strong>
          </div>
        </article>

        <article className="inventario-tarjeta">
          <div className="inventario-tarjeta-icono verde">
            <CircleCheck size={23} strokeWidth={1.8} />
          </div>

          <div className="inventario-tarjeta-info">
            <span>Existencias normales</span>
            <strong>{listaCompleta.length - cantidadAlertas}</strong>
          </div>
        </article>
      </div>

      <div className="inventario-filtros">
        <div className="inventario-busqueda">
          <Search size={18} aria-hidden="true" />

          <input
            type="search"
            placeholder="Buscar insumo..."
            aria-label="Buscar insumo por nombre"
            value={busqueda}
            onChange={(evento) => setBusqueda(evento.target.value)}
          />
        </div>

        <CustomSelect
          ariaLabel="Filtrar insumos por existencias"
          value={filtroStock}
          onChange={setFiltroStock}
          options={[
            { value: "todos", label: "Todos los insumos" },
            { value: "bajo", label: "Necesitan reposición" },
            { value: "normal", label: "Existencias normales" },
          ]}
        />

        <CustomSelect
          ariaLabel="Ordenar insumos"
          value={orden}
          onChange={setOrden}
          options={[
            { value: "nombre", label: "Ordenar por nombre" },
            { value: "stockAsc", label: "Menor existencia" },
            { value: "stockDesc", label: "Mayor existencia" },
            { value: "alertas", label: "Alertas primero" },
          ]}
        />
      </div>

      {cargando && (
        <p className="inventario-mensaje">Cargando inventario...</p>
      )}

      {!cargando && error && (
        <div className="inventario-error" role="alert">
          <p>{error}</p>
          <button type="button" onClick={recargar}>
            Intentar de nuevo
          </button>
        </div>
      )}

      {!cargando && !error && (
        <>
          <p className="inventario-contador">
            {insumos.length} insumo(s) encontrado(s)
          </p>

          {insumos.length === 0 ? (
            <div className="inventario-vacio">
              No hay insumos que coincidan con los filtros.
            </div>
          ) : (
            <div className="inventario-tabla-contenedor">
              <table className="inventario-tabla">
                <thead>
                  <tr>
                    <th>Insumo</th>
                    <th>Existencias</th>
                    <th>Stock mínimo</th>
                    <th>Estado</th>
                    <th>Acciones</th>
                  </tr>
                </thead>

                <tbody>
                  {insumos.map((insumo) => {
                    const necesitaReposicion =
                      Number(insumo.necesita_reposicion) === 1;

                    const porcentaje =
                      insumo.stock_minimo > 0
                        ? Math.min(
                            100,
                            (insumo.stock / insumo.stock_minimo) * 100
                          )
                        : insumo.stock > 0
                          ? 100
                          : 0;

                    return (
                      <tr key={insumo.id}>
                        <td>
                          <strong>{insumo.nombre}</strong>
                          <small>ID: {insumo.id}</small>
                        </td>

                        <td>
                          <div className="inventario-cantidad">
                            <strong>
                              {formatoCantidad(insumo.stock)}
                            </strong>
                            <span>{insumo.unidad}</span>
                          </div>

                          <div
                            className="inventario-barra"
                            aria-label={`Existencias respecto al mínimo: ${Math.round(
                              porcentaje
                            )}%`}
                          >
                            <span
                              className={
                                necesitaReposicion ? "baja" : "normal"
                              }
                              style={{ width: `${porcentaje}%` }}
                            />
                          </div>
                        </td>

                        <td>
                          {formatoCantidad(insumo.stock_minimo)}{" "}
                          {insumo.unidad}
                        </td>

                        <td>
                          <span
                            className={`inventario-estado ${
                              necesitaReposicion ? "bajo" : "normal"
                            }`}
                          >
                            {necesitaReposicion ? "Reponer" : "En orden"}
                          </span>
                        </td>

                        <td>
                          <div className="inventario-acciones-fila">
                            <button
                              type="button"
                              onClick={() => abrirEdicion(insumo)}
                            >
                              <Pencil size={14} />
                              Editar
                            </button>

                            <button
                              type="button"
                              className="inventario-btn-eliminar"
                              onClick={() => solicitarEliminacion(insumo)}
                            >
                              <Trash2 size={14} />
                              Eliminar
                            </button>
                          </div>
                        </td>
                      </tr>
                    );
                  })}
                </tbody>
              </table>
            </div>
          )}
        </>
      )}

      {modalAbierto && (
        <div
          className="inventario-modal-fondo"
          onMouseDown={(evento) => {
            if (evento.target === evento.currentTarget) cerrarModal();
          }}
        >
          <section
            className="inventario-modal"
            role="dialog"
            aria-modal="true"
            aria-labelledby="inventario-modal-titulo"
          >
            <header className="inventario-modal-header">
              <div>
                <span className="inventario-eyebrow">MORI CAFÉ</span>
                <h2 id="inventario-modal-titulo">
                  {insumoEditando ? "Editar insumo" : "Nuevo insumo"}
                </h2>
              </div>

              <button
                type="button"
                className="inventario-modal-cerrar"
                onClick={cerrarModal}
                disabled={guardando}
                aria-label="Cerrar formulario"
              >
                <X size={20} />
              </button>
            </header>

            <form onSubmit={guardarInsumo}>
              <label>
                Nombre del insumo
                <input
                  name="nombre"
                  value={formulario.nombre}
                  onChange={cambiarCampo}
                  maxLength={100}
                  required
                  autoFocus
                  placeholder="Ej. Café molido"
                />
              </label>

              <label>
                Unidad de medida
                <CustomSelect
                  ariaLabel="Unidad de medida"
                  value={formulario.unidad}
                  onChange={(valor) =>
                    setFormulario((actual) => ({
                      ...actual,
                      unidad: valor,
                    }))
                  }
                  options={unidades}
                />
              </label>

              <div className="inventario-form-grid">
                <label>
                  Existencias actuales
                  <input
                    name="stock"
                    type="number"
                    min="0"
                    step="any"
                    value={formulario.stock}
                    onChange={cambiarCampo}
                    required
                    placeholder="0"
                  />
                </label>

                <label>
                  Stock mínimo
                  <input
                    name="stock_minimo"
                    type="number"
                    min="0"
                    step="any"
                    value={formulario.stock_minimo}
                    onChange={cambiarCampo}
                    required
                    placeholder="0"
                  />
                </label>
              </div>

              {errorFormulario && (
                <div className="inventario-error" role="alert">
                  {errorFormulario}
                </div>
              )}

              <footer className="inventario-modal-acciones">
                <button
                  type="button"
                  className="inventario-btn-secundario"
                  onClick={cerrarModal}
                  disabled={guardando}
                >
                  Cancelar
                </button>

                <button
                  type="submit"
                  className="inventario-btn-principal"
                  disabled={guardando}
                >
                  {guardando
                    ? "Guardando..."
                    : insumoEditando
                      ? "Guardar cambios"
                      : "Registrar insumo"}
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

export default Inventario;
