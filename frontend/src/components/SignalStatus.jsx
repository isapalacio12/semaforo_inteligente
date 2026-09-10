const LANE_LABELS = { N: "Norte", S: "Sur", E: "Este", O: "Oeste" };

/**
 * Resumen textual del estado del semaforo (que via esta en verde/amarillo/rojo
 * y cuanto falta), como complemento explicito a la escena 3D -en 3D a veces
 * cuesta distinguir el color a la distancia, esto lo deja inequivoco-.
 */
export default function SignalStatus({ intersection }) {
  if (!intersection) return null;
  const { activeAxis, color, timeRemaining } = intersection;

  return (
    <div className="signal-status">
      <div className="signal-status-main">
        Eje activo: <strong>{activeAxis === "NS" ? "Norte–Sur" : "Este–Oeste"}</strong>
        <span className={`signal-chip signal-chip-${color}`}>{color.toUpperCase()}</span>
        <span className="signal-time">{timeRemaining}s</span>
      </div>
      <div className="signal-status-lanes">
        {["N", "S", "E", "O"].map((lane) => (
          <span key={lane} className="signal-lane">
            <span className={`signal-dot signal-dot-${intersection.lanes[lane].color}`} />
            {LANE_LABELS[lane]}
          </span>
        ))}
      </div>
    </div>
  );
}
