
import { useEffect } from "react";
import "./ConfirmDialog.css";

function ConfirmDialog({
  abierto,
  titulo = "¿Estás seguro?",
  mensaje,
  textoConfirmar = "Confirmar",
  textoCancelar = "Cancelar",
  peligro = false,
  cargando = false,
  onConfirmar,
  onCancelar,
}) {
  useEffect(() => {
    if (!abierto) return;

    function manejarTecla(evento) {
      if (evento.key === "Escape" && !cargando) {
        onCancelar();
      }
    }

    document.addEventListener("keydown", manejarTecla);

    return () => {
      document.removeEventListener("keydown", manejarTecla);
    };
  }, [abierto, cargando, onCancelar]);

  if (!abierto) return null;

  return (
    <div
      className="confirm-dialog-fondo"
      onMouseDown={(evento) => {
        if (evento.target === evento.currentTarget && !cargando) {
          onCancelar();
        }
      }}
    >
      <section
        className="confirm-dialog"
        role="alertdialog"
        aria-modal="true"
        aria-labelledby="confirm-dialog-titulo"
        aria-describedby="confirm-dialog-mensaje"
      >
        <div
          className={`confirm-dialog-icono ${
            peligro ? "peligro" : ""
          }`}
          aria-hidden="true"
        >
          {peligro ? "!" : "?"}
        </div>

        <h2 id="confirm-dialog-titulo">{titulo}</h2>

        <p id="confirm-dialog-mensaje">{mensaje}</p>

        <div className="confirm-dialog-acciones">
          <button
            type="button"
            className="confirm-dialog-cancelar"
            onClick={onCancelar}
            disabled={cargando}
          >
            {textoCancelar}
          </button>

          <button
            type="button"
            className={`confirm-dialog-confirmar ${
              peligro ? "peligro" : ""
            }`}
            onClick={onConfirmar}
            disabled={cargando}
          >
            {cargando ? "Procesando..." : textoConfirmar}
          </button>
        </div>
      </section>
    </div>
  );
}

export default ConfirmDialog;
