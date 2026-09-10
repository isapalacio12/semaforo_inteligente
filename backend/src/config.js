// Parametros de simulacion. Todo ajustable desde un solo lugar.
module.exports = {
  // Duracion de un "paso" de simulacion, en segundos simulados por tick.
  TICK_SECONDS: 1,
  // Cada cuanto tiempo real (ms) avanza la simulacion un tick.
  TICK_INTERVAL_MS: 1000,

  // Limites de seguridad para la luz verde adaptativa (vialidad minima/maxima).
  MIN_GREEN_SECONDS: 10,
  MAX_GREEN_SECONDS: 60,
  YELLOW_SECONDS: 3,

  // Duracion fija de verde para el semaforo "de referencia" (no adaptativo).
  FIXED_GREEN_SECONDS: 25,

  // Cuantos segundos de verde se le dan por cada vehiculo en cola (antes de aplicar min/max).
  SECONDS_PER_VEHICLE: 2.5,

  // Vehiculos que logran salir por segundo mientras el eje esta en verde (flujo de saturacion).
  DISCHARGE_RATE_PER_SECOND: 0.5,

  // Tasa promedio BASE de llegada de vehiculos por via (vehiculos/segundo), usada por el simulador de sensores.
  // Cada via tiene un promedio distinto para que unas esten naturalmente mas congestionadas que otras.
  // OJO: la tasa EFECTIVA es esta + la contribucion promedio de las rafagas (ver mas abajo). Se eligieron
  // estos valores para que, sumando rafagas, el sistema quede por debajo de su capacidad de descarga
  // (si no, la fila crece sin limite sin importar que tan bueno sea el algoritmo adaptativo).
  ARRIVAL_RATES: {
    N: 0.20,
    S: 0.17,
    E: 0.12,
    O: 0.13,
  },

  // Probabilidad por tick de que ocurra una "rafaga" de trafico en una via (semaforo en rojo cercano, evento, etc).
  // Contribucion promedio a la tasa de llegada = BURST_PROBABILITY * promedio(BURST_EXTRA_VEHICLES).
  BURST_PROBABILITY: 0.01,
  BURST_EXTRA_VEHICLES: [2, 4],

  // Cuantos vehiculos (los mas cercanos al cruce) se envian al frontend para dibujar por via.
  // El resto de la fila solo se reporta como numero (queueLength) para no saturar la animacion.
  MAX_VISIBLE_VEHICLES_PER_LANE: 12,

  // --- Motos ---
  // Fraccion de los vehiculos que llegan que son motos en vez de carros.
  MOTO_SHARE: 0.25,
  // "Equivalente en carro" de una moto: ocupa menos tiempo de verde y estorba menos al descargar
  // (una moto cuenta como 0.5 carros para calcular el verde adaptativo y para la tasa de descarga).
  MOTO_UNIT_WEIGHT: 0.5,

  // --- Peatones ---
  // Hay 2 grupos de cruce peatonal: "NS" (cruzan la calle N-S, caminan cuando ese eje esta en rojo,
  // es decir cuando el eje EO esta en verde) y "EO" (cruzan la calle E-O, caminan cuando NS esta en verde).
  PEDESTRIAN_ARRIVAL_RATE: {
    NS: 0.05,
    EO: 0.045,
  },
  // Cuantos peatones en espera empiezan a cruzar por segundo mientras su grupo tiene "camine".
  PEDESTRIAN_DEPARTURE_PER_SECOND: 1.2,
  // Cuanto tarda un peaton en cruzar la calle (segundos).
  PED_CROSSING_SECONDS: 7,
  // Cuantos peatones cruzando se mandan al frontend por grupo (para no saturar la animacion).
  MAX_VISIBLE_PEDESTRIANS_PER_GROUP: 10,
};
