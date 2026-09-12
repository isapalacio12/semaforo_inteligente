import { useRef, useState } from "react";
import { setMuted, startCityAmbience } from "../audio/cityAmbience.js";

/** Boton que activa/silencia el sonido de ciudad (la grabacion real, sin nada mas). */
export default function SoundToggle() {
  const [enabled, setEnabled] = useState(false);
  const startedRef = useRef(false);

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
