
import { useEffect, useRef, useState } from "react";
import { createPortal } from "react-dom";
import "./CustomSelect.css";

function CustomSelect({
  value,
  options,
  onChange,
  ariaLabel,
  disabled = false,
}) {
  const [abierto, setAbierto] = useState(false);
  const [indiceActivo, setIndiceActivo] = useState(0);
  const [posicion, setPosicion] = useState(null);

  const contenedorRef = useRef(null);
  const triggerRef = useRef(null);
  const menuRef = useRef(null);

  const opcionesHabilitadas = options.filter((opcion) => !opcion.disabled);

  const seleccionada = options.find(
    (opcion) => String(opcion.value) === String(value)
  );

  function actualizarPosicion() {
    if (!triggerRef.current) return;

    const rect = triggerRef.current.getBoundingClientRect();
    const espacioAbajo = window.innerHeight - rect.bottom;
    const espacioArriba = rect.top;
    const abrirArriba =
      espacioAbajo < 220 && espacioArriba > espacioAbajo;

    setPosicion({
      left: rect.left,
      width: rect.width,
      abrirArriba,
      top: abrirArriba ? undefined : rect.bottom + 7,
      bottom: abrirArriba ? window.innerHeight - rect.top + 7 : undefined,
      maxHeight: Math.max(
        100,
        Math.min(260, (abrirArriba ? espacioArriba : espacioAbajo) - 16)
      ),
    });
  }

  useEffect(() => {
    if (!abierto) return;

    actualizarPosicion();

    function manejarClickExterior(evento) {
      if (
        !contenedorRef.current?.contains(evento.target) &&
        !menuRef.current?.contains(evento.target)
      ) {
        setAbierto(false);
      }
    }

    function manejarEscape(evento) {
      if (evento.key === "Escape") {
        setAbierto(false);
        triggerRef.current?.focus();
      }
    }

    function manejarReubicacion() {
      actualizarPosicion();
    }

    document.addEventListener("mousedown", manejarClickExterior);
    document.addEventListener("keydown", manejarEscape);
    window.addEventListener("resize", manejarReubicacion);
    window.addEventListener("scroll", manejarReubicacion, true);

    return () => {
      document.removeEventListener("mousedown", manejarClickExterior);
      document.removeEventListener("keydown", manejarEscape);
      window.removeEventListener("resize", manejarReubicacion);
      window.removeEventListener("scroll", manejarReubicacion, true);
    };
  }, [abierto]);

  function elegir(opcion) {
    if (!opcion || opcion.disabled) return;

    onChange(opcion.value);
    setAbierto(false);
    triggerRef.current?.focus();
  }

  function manejarTeclado(evento) {
    if (disabled) return;

    if (evento.key === "ArrowDown" || evento.key === "ArrowUp") {
      evento.preventDefault();

      if (!abierto) {
        actualizarPosicion();
        setAbierto(true);

        const indice = opcionesHabilitadas.findIndex(
          (opcion) => String(opcion.value) === String(value)
        );

        setIndiceActivo(Math.max(indice, 0));
        return;
      }

      const direccion = evento.key === "ArrowDown" ? 1 : -1;

      setIndiceActivo((actual) => {
        return (
          (actual + direccion + opcionesHabilitadas.length) %
          opcionesHabilitadas.length
        );
      });
    }

    if (evento.key === "Enter" && abierto) {
      evento.preventDefault();
      elegir(opcionesHabilitadas[indiceActivo]);
    }

    if (evento.key === "Tab") {
      setAbierto(false);
    }
  }

  const menu =
    abierto && posicion
      ? createPortal(
          <div
            ref={menuRef}
            className={`custom-select-menu ${
              posicion.abrirArriba ? "abre-arriba" : ""
            }`}
            role="listbox"
            aria-label={ariaLabel}
            style={{
              position: "fixed",
              left: posicion.left,
              width: posicion.width,
              top: posicion.top,
              bottom: posicion.bottom,
              maxHeight: posicion.maxHeight,
              zIndex: 2000,
            }}
          >
            {options.map((opcion) => {
              const seleccionadaActual =
                String(opcion.value) === String(value);

              const indice = opcionesHabilitadas.findIndex(
                (item) => String(item.value) === String(opcion.value)
              );

              return (
                <button
                  type="button"
                  key={String(opcion.value)}
                  role="option"
                  aria-selected={seleccionadaActual}
                  disabled={opcion.disabled}
                  className={[
                    "custom-select-opcion",
                    seleccionadaActual ? "seleccionada" : "",
                    indice === indiceActivo ? "activa" : "",
                  ]
                    .filter(Boolean)
                    .join(" ")}
                  onMouseEnter={() => {
                    if (indice >= 0) setIndiceActivo(indice);
                  }}
                  onClick={() => elegir(opcion)}
                >
                  <span>{opcion.label}</span>
                  {seleccionadaActual && (
                    <span className="custom-select-check" aria-hidden="true">
                      ✓
                    </span>
                  )}
                </button>
              );
            })}
          </div>,
          document.body
        )
      : null;

  return (
    <div className="custom-select" ref={contenedorRef}>
      <button
        ref={triggerRef}
        type="button"
        className={`custom-select-trigger ${abierto ? "abierto" : ""}`}
        aria-label={ariaLabel}
        aria-haspopup="listbox"
        aria-expanded={abierto}
        disabled={disabled}
        onClick={() => {
          if (!abierto) {
            actualizarPosicion();

            const indice = opcionesHabilitadas.findIndex(
              (opcion) => String(opcion.value) === String(value)
            );

            setIndiceActivo(Math.max(indice, 0));
          }

          setAbierto((actual) => !actual);
        }}
        onKeyDown={manejarTeclado}
      >
        <span>{seleccionada?.label ?? "Seleccionar..."}</span>

        <svg
          className={`custom-select-flecha ${abierto ? "girada" : ""}`}
          viewBox="0 0 24 24"
          aria-hidden="true"
        >
          <path d="m7 10 5 5 5-5" />
        </svg>
      </button>

      {menu}
    </div>
  );
}

export default CustomSelect;
