
import { useEffect } from "react";
import {
  CheckCircle2,
  AlertTriangle,
  XCircle,
  X,
  Info,
} from "lucide-react";
import "./Notificacion.css";

const CONFIGURACION = {
  exito: {
    icono: CheckCircle2,
    clase: "notificacion-exito",
    titulo: "Operación completada",
  },
  aviso: {
    icono: AlertTriangle,
    clase: "notificacion-aviso",
    titulo: "Atención",
  },
  error: {
    icono: XCircle,
    clase: "notificacion-error",
    titulo: "Ocurrió un error",
  },
  info: {
    icono: Info,
    clase: "notificacion-info",
    titulo: "Información",
  },
};

export default function Notificacion({
  tipo = "exito",
  titulo,
  mensaje,
  descripcion,
  onCerrar,
  duracion = 5000,
}) {
  const contenido = mensaje || descripcion || "";
  const configuracion = CONFIGURACION[tipo] || CONFIGURACION.exito;
  const Icono = configuracion.icono;

  useEffect(() => {
    if (!onCerrar || duracion <= 0) return undefined;

    const temporizador = setTimeout(onCerrar, duracion);

    return () => clearTimeout(temporizador);
  }, [onCerrar, duracion]);

  if (!contenido) return null;

  return (
    <div
      className={`notificacion ${configuracion.clase}`}
      role={tipo === "error" ? "alert" : "status"}
      aria-live={tipo === "error" ? "assertive" : "polite"}
    >
      <div className="notificacion-icono">
        <Icono size={25} strokeWidth={2.2} />
      </div>

      <div className="notificacion-contenido">
        <strong>{titulo || configuracion.titulo}</strong>
        <p>{contenido}</p>
      </div>

      {onCerrar && (
        <button
          type="button"
          className="notificacion-cerrar"
          onClick={onCerrar}
          aria-label="Cerrar notificación"
          title="Cerrar notificación"
        >
          <X size={19} />
        </button>
      )}

      {duracion > 0 && (
        <div
          className="notificacion-progreso"
          style={{ animationDuration: `${duracion}ms` }}
        />
      )}
    </div>
  );
}
