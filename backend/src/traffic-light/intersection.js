const config = require("../config");
const { computeAdaptiveGreenSeconds } = require("./adaptiveAlgorithm");

const AXES = {
  NS: ["N", "S"],
  EO: ["E", "O"],
};

// A que grupo de peatones protege cada eje cuando esta en verde: mientras el
// eje EO esta en verde, la calle N-S esta en rojo, asi que los peatones del
// grupo "NS" pueden cruzarla; y viceversa.
const PEDESTRIAN_GROUP_WALKING_WHEN_AXIS_GREEN = { NS: "EO", EO: "NS" };

/**
 * Modela una intersección en cruz con 4 vías agrupadas en 2 ejes (N-S y E-O),
 * mas los 2 grupos de cruce peatonal asociados a esos ejes.
 *
 * Los ejes se alternan: mientras uno está en verde/amarillo, el otro está en
 * rojo. Cada vehiculo (carro o moto) es un objeto individual dentro de la
 * fila (this.lanes[via].queue), con un id estable, para que el frontend
 * pueda dibujar y animar vehiculos reales. Las motos cuentan como
 * MOTO_UNIT_WEIGHT "carros" tanto para decidir el verde como para descargar
 * (son mas agiles, ocupan menos tiempo de cruce).
 *
 * Los peatones tambien son simulados: mientras su grupo tiene "camine",
 * algunos de los que esperan empiezan a cruzar; y -muy importante- el
 * semaforo NO le da verde al eje que fuera a chocar con ellos hasta que
 * terminen de cruzar, sin importar que tan lleno este ese eje de vehiculos.
 * Esta regla de seguridad aplica igual en modo "adaptive" y "fixed".
 *
 * mode: "adaptive" -> el tiempo de verde lo decide el algoritmo segun la cola.
 *       "fixed"     -> el tiempo de verde siempre es FIXED_GREEN_SECONDS (linea base para comparar).
 */
class Intersection {
  constructor(mode) {
    this.mode = mode; // "adaptive" | "fixed"
    this.nextVehicleId = 1;
    this.nextPedestrianId = 1;

    this.lanes = {
      N: this._emptyLane(),
      S: this._emptyLane(),
      E: this._emptyLane(),
      O: this._emptyLane(),
    };

    // Acumulador fraccional de descarga por via (permite tasas como "0.5 veh/seg"
    // sin perder vehiculos por redondeo).
    this.dischargeAccumulator = { N: 0, S: 0, E: 0, O: 0 };

    this.pedestrians = {
      NS: this._emptyPedestrianGroup(),
      EO: this._emptyPedestrianGroup(),
    };
    this.pedestrianDepartureAccumulator = { NS: 0, EO: 0 };

    this.activeAxis = "NS";
    this.color = "green"; // "green" | "yellow" | "red" (red aplica al eje inactivo)
    this.timeRemaining = this._greenDurationFor("NS");
    this.greenElapsed = 0; // segundos que lleva encendido el verde actual (para el corte anticipado)

    // Metricas acumuladas para el dashboard comparativo.
    this.metrics = {
      totalArrived: 0,
      totalDeparted: 0,
      vehicleSecondsWaiting: 0, // suma de (vehiculos en cola * segundos) -> permite estimar espera promedio (Little's Law)
    };
  }

  _emptyLane() {
    return { queue: [], arrived: 0, departed: 0 };
  }

  _emptyPedestrianGroup() {
    return { waiting: 0, crossing: [] };
  }

  _laneDemandUnits(lane) {
    const queue = this.lanes[lane].queue;
    let units = 0;
    for (const vehicle of queue) {
      units += vehicle.type === "moto" ? config.MOTO_UNIT_WEIGHT : 1;
    }
    return units;
  }

  _greenDurationFor(axis) {
    if (this.mode === "fixed") return config.FIXED_GREEN_SECONDS;
    const [laneA, laneB] = AXES[axis];
    const demand = this._laneDemandUnits(laneA) + this._laneDemandUnits(laneB);
    return computeAdaptiveGreenSeconds(demand);
  }

  /**
   * Avanza la simulacion un tick: registra llegadas de vehiculos y peatones,
   * descarga vehiculos y peatones que ya cruzaron, y corre la maquina de
   * estados del semaforo (incluida la espera de seguridad por peatones).
   * @param {{N:{cars,motos}, S:..., E:..., O:...}} vehicleArrivals
   * @param {{NS:number, EO:number}} pedestrianArrivals
   */
  tick(vehicleArrivals, pedestrianArrivals) {
    const dt = config.TICK_SECONDS;

    this._processVehicleArrivals(vehicleArrivals);
    this._dischargeVehicles(dt);
    this._processPedestrians(dt, pedestrianArrivals);

    // Acumular espera (para la metrica de tiempo promedio de espera de vehiculos).
    const totalQueued = Object.values(this.lanes).reduce((sum, l) => sum + l.queue.length, 0);
    this.metrics.vehicleSecondsWaiting += totalQueued * dt;

    this._advanceSignalTimer(dt);
  }

  _processVehicleArrivals(vehicleArrivals) {
    for (const lane of Object.keys(this.lanes)) {
      const { cars = 0, motos = 0 } = vehicleArrivals[lane] || {};
      for (let i = 0; i < cars; i += 1) {
        this.lanes[lane].queue.push({ id: this.nextVehicleId++, type: "car" });
      }
      for (let i = 0; i < motos; i += 1) {
        this.lanes[lane].queue.push({ id: this.nextVehicleId++, type: "moto" });
      }
      const n = cars + motos;
      this.lanes[lane].arrived += n;
      this.metrics.totalArrived += n;
    }
  }

  _dischargeVehicles(dt) {
    if (this.color !== "green") return;
    for (const lane of AXES[this.activeAxis]) {
      this.dischargeAccumulator[lane] += config.DISCHARGE_RATE_PER_SECOND * dt;
      // El costo de sacar el vehiculo de adelante depende de su tipo: una moto
      // "gasta" menos capacidad de descarga que un carro.
      while (this.lanes[lane].queue.length > 0) {
        const front = this.lanes[lane].queue[0];
        const cost = front.type === "moto" ? config.MOTO_UNIT_WEIGHT : 1;
        if (this.dischargeAccumulator[lane] < cost) break;
        this.lanes[lane].queue.shift();
        this.dischargeAccumulator[lane] -= cost;
        this.lanes[lane].departed += 1;
        this.metrics.totalDeparted += 1;
      }
    }
  }

  _processPedestrians(dt, pedestrianArrivals) {
    // Grupo que tiene "camine" ahora mismo: el que cruza la calle del eje que esta en ROJO.
    const walkingGroup = this.color === "green" ? PEDESTRIAN_GROUP_WALKING_WHEN_AXIS_GREEN[this.activeAxis] : null;

    for (const group of Object.keys(this.pedestrians)) {
      const state = this.pedestrians[group];

      // 1. Llegadas de nuevos peatones a esperar.
      state.waiting += (pedestrianArrivals && pedestrianArrivals[group]) || 0;

      // 2. Si este grupo tiene "camine", algunos de los que esperan arrancan a cruzar.
      if (group === walkingGroup && state.waiting > 0) {
        this.pedestrianDepartureAccumulator[group] += config.PEDESTRIAN_DEPARTURE_PER_SECOND * dt;
        while (this.pedestrianDepartureAccumulator[group] >= 1 && state.waiting > 0) {
          state.waiting -= 1;
          state.crossing.push({ id: this.nextPedestrianId++, elapsed: 0 });
          this.pedestrianDepartureAccumulator[group] -= 1;
        }
      }

      // 3. Los que ya estan cruzando avanzan; se remueven al terminar de cruzar.
      state.crossing = state.crossing
        .map((p) => ({ ...p, elapsed: p.elapsed + dt }))
        .filter((p) => p.elapsed < config.PED_CROSSING_SECONDS);
    }
  }

  _advanceSignalTimer(dt) {
    this.timeRemaining -= dt;
    if (this.color === "green") {
      this.greenElapsed += dt;
    }

    let shouldAdvance = this.timeRemaining <= 0;

    // Corte anticipado ("gap-out"): si el algoritmo adaptativo le dio verde a un eje
    // pero ese eje ya se vacio antes de que se cumpliera el tiempo asignado, no tiene
    // sentido seguir en verde con la via vacia mientras el otro eje espera en rojo.
    // Solo se permite despues de cumplir el minimo de seguridad (MIN_GREEN_SECONDS).
    if (this.mode === "adaptive" && this.color === "green" && this.greenElapsed >= config.MIN_GREEN_SECONDS) {
      const activeAxisQueue = AXES[this.activeAxis].reduce(
        (sum, lane) => sum + this.lanes[lane].queue.length,
        0
      );
      if (activeAxisQueue === 0) {
        shouldAdvance = true;
      }
    }

    if (shouldAdvance) {
      this._advancePhase();
    }
  }

  _advancePhase() {
    if (this.color === "green") {
      this.color = "yellow";
      this.timeRemaining = config.YELLOW_SECONDS;
      return;
    }

    if (this.color === "yellow") {
      const nextAxis = this.activeAxis === "NS" ? "EO" : "NS";

      // Seguridad peatonal: el grupo que caminaba mientras el eje ANTERIOR estaba en
      // verde cruza justo la calle del eje que esta por encenderse (nextAxis). Si
      // todavia hay gente cruzando, no se le puede dar verde a los vehiculos: se
      // mantiene todo en amarillo/alto (se vuelve a revisar en el siguiente tick).
      const pedestriansStillCrossing = this.pedestrians[nextAxis].crossing.length > 0;
      if (pedestriansStillCrossing) {
        this.timeRemaining = 0;
        return;
      }

      this.activeAxis = nextAxis;
      this.color = "green";
      this.timeRemaining = this._greenDurationFor(this.activeAxis);
      this.greenElapsed = 0;
    }
  }

  /** Color visible de una via especifica (para pintar cada semaforo en el frontend). */
  colorForLane(lane) {
    const axisOfLane = AXES.NS.includes(lane) ? "NS" : "EO";
    if (axisOfLane !== this.activeAxis) return "red";
    return this.color; // "green" o "yellow"
  }

  /** Segundos de espera promedio por vehiculo procesado (aproximacion via Little's Law: W = L / throughput). */
  averageWaitSeconds() {
    if (this.metrics.totalDeparted === 0) return 0;
    return this.metrics.vehicleSecondsWaiting / this.metrics.totalDeparted;
  }

  toJSON() {
    return {
      mode: this.mode,
      activeAxis: this.activeAxis,
      color: this.color,
      timeRemaining: Math.max(0, Math.round(this.timeRemaining)),
      lanes: Object.fromEntries(
        Object.entries(this.lanes).map(([lane, data]) => [
          lane,
          {
            // Solo mandamos los N vehiculos mas cercanos al cruce para dibujar; el resto de la
            // fila se resume en queueLength (evita listas gigantes si se forma un trancon grande).
            queue: data.queue.slice(0, config.MAX_VISIBLE_VEHICLES_PER_LANE),
            queueLength: data.queue.length,
            arrived: data.arrived,
            departed: data.departed,
            color: this.colorForLane(lane),
          },
        ])
      ),
      pedestrians: Object.fromEntries(
        Object.entries(this.pedestrians).map(([group, state]) => [
          group,
          {
            waiting: state.waiting,
            crossing: state.crossing.slice(0, config.MAX_VISIBLE_PEDESTRIANS_PER_GROUP).map((p) => ({
              id: p.id,
              progress: Math.min(1, p.elapsed / config.PED_CROSSING_SECONDS),
            })),
            crossingCount: state.crossing.length,
            walking: this.color === "green" && PEDESTRIAN_GROUP_WALKING_WHEN_AXIS_GREEN[this.activeAxis] === group,
          },
        ])
      ),
      metrics: {
        totalArrived: this.metrics.totalArrived,
        totalDeparted: this.metrics.totalDeparted,
        averageWaitSeconds: Number(this.averageWaitSeconds().toFixed(1)),
      },
    };
  }
}

module.exports = { Intersection, AXES };
