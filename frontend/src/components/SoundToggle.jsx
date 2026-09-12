import { useEffect, useRef, useState } from "react";
import { playSignalChime, setMuted, startCityAmbience } from "../audio/cityAmbience.js";

/**
 * Boton de sonido + puente entre el estado de la simulacion y el motor de
 * audio: suena un tono cuando el semaforo cambia de eje activo.
 */
export default function SoundToggle({ intersection }) {
  const [enabled, setEnabled] = useState(false);
  const startedRef = useRef(false);
  const prevAxisRef = useRef(null);

  useEffect(() => {
    if (!intersection) return;

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
