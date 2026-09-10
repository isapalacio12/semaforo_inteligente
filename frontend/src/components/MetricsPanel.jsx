/**
 * Compara las metricas acumuladas del semaforo adaptativo contra el de
 * tiempo fijo, corriendo ambos con exactamente el mismo trafico simulado.
 */
export default function MetricsPanel({ adaptive, fixed }) {
  if (!adaptive || !fixed) return null;

  const improvementPct = fixed.metrics.averageWaitSeconds > 0
    ? ((fixed.metrics.averageWaitSeconds - adaptive.metrics.averageWaitSeconds) / fixed.metrics.averageWaitSeconds) * 100
    : 0;

  return (
    <div className="metrics-panel">
      <h2>Métricas: Adaptativo vs Tiempo fijo</h2>
      <div className="metrics-grid">
        <MetricCard label="Espera promedio" adaptiveValue={`${adaptive.metrics.averageWaitSeconds}s`} fixedValue={`${fixed.metrics.averageWaitSeconds}s`} />
        <MetricCard label="Vehículos totales detectados" adaptiveValue={adaptive.metrics.totalArrived} fixedValue={fixed.metrics.totalArrived} />
        <MetricCard label="Vehículos procesados" adaptiveValue={adaptive.metrics.totalDeparted} fixedValue={fixed.metrics.totalDeparted} />
      </div>
      <div className={`improvement-banner ${improvementPct >= 0 ? "positive" : "negative"}`}>
        {improvementPct >= 0
          ? `El algoritmo adaptativo reduce la espera promedio en ${improvementPct.toFixed(1)}% frente al semáforo de tiempo fijo.`
          : `En este momento el semáforo fijo tiene menor espera promedio (${Math.abs(improvementPct).toFixed(1)}% menos). Esto puede pasar con poco tráfico acumulado; observa la tendencia.`}
      </div>
    </div>
  );
}

function MetricCard({ label, adaptiveValue, fixedValue }) {
  return (
    <div className="metric-card">
      <div className="metric-label">{label}</div>
      <div className="metric-values">
        <div className="metric-value adaptive">
          <span className="metric-tag">Adaptativo</span>
          <span className="metric-number">{adaptiveValue}</span>
        </div>
        <div className="metric-value fixed">
          <span className="metric-tag">Fijo</span>
          <span className="metric-number">{fixedValue}</span>
        </div>
      </div>
    </div>
  );
}
