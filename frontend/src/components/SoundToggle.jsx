import { useEffect, useRef, useState } from "react";
import { playSignalChime, setCongestionLevel, setMuted, startCityAmbience } from "../audio/cityAmbience.js";

// A partir de cuantos vehiculos en fila (sumando las 4 vias) se considera
// "congestion maxima" para efectos de sonido (mas bocinazos).
const CONGESTION_REFERENCE = 40;

/**
 * Boton de sonido + puente entre el estado de la simulacion y el motor de
 * audio: ajusta que tan seguido se oyen bocinazos segun la congestion actual,
 * y suena un tono cuando el semaforo cambia de eje activo.
 */
export default function SoundToggle({ intersection }) {
  const [enabled, setEnabled] = useState(false);
  const startedRef = useRef(false);
  const prevAxisRef = useRef(null);

  useEffect(() => {
    if (!intersection) return;

    const totalQueued = Object.values(intersection.lanes).reduce((sum, lane) => sum + lane.queueLength, 0);
    setCongestionLevel(totalQueued / CONGESTION_REFERENCE);

    if (prevAxisRef.current !== null && prevAxisRef.current !== intersection.activeAxis) {
      playSignalChime();
    }
    prevAxisRef.current = intersection.activeAxis;
  }, [intersection]);

  const toggle = () => {
    if (!startedRef.current) {
      startCityAmbience();
      startedRef.current = true;
    }
    const next = !enabled;
    setMuted(!next);
    setEnabled(next);
  };

  return (
    <button type="button" className={`sound-toggle ${enabled ? "active" : ""}`} onClick={toggle}>
      Sonido: {enabled ? "activado" : "apagado"}
    </button>
  );
}
