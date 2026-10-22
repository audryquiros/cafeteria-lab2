
import { useCallback, useEffect, useState } from "react";
import { api } from "../services/api";

export function useApi(ruta) {
  const [datos, setDatos] = useState(null);
  const [cargando, setCargando] = useState(true);
  const [error, setError] = useState("");

  const cargar = useCallback(async () => {
    setCargando(true);
    setError("");

    try {
      const resultado = await api.obtener(ruta);
      setDatos(resultado);
    } catch (err) {
      setError(err.message || "Ocurrió un error al cargar los datos.");
    } finally {
      setCargando(false);
    }
  }, [ruta]);

  useEffect(() => {
    cargar();
  }, [cargar]);

  return {
    datos,
    cargando,
    error,
    recargar: cargar,
  };
}
