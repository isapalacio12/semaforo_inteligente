const config = require("../config");

/**
 * Algoritmo de asignacion de tiempo de verde.
 *
 * Idea central: el tiempo de verde de un eje es proporcional a la cantidad
 * de vehiculos que tiene esperando (su "demanda"), pero siempre respetando
 * un minimo (para que un eje con poco trafico no quede sin paso nunca) y un
 * maximo (para que un eje muy cargado no deje esperando indefinidamente al
 * otro eje, por seguridad y equidad).
 *
 *   tiempoVerde = clamp(demanda * SECONDS_PER_VEHICLE, MIN_GREEN, MAX_GREEN)
 *
 * Ejemplo con SECONDS_PER_VEHICLE = 2.5, MIN=10, MAX=60:
 *   - 2 vehiculos esperando  -> 5s  -> se ajusta al minimo: 10s
 *   - 10 vehiculos esperando -> 25s -> se queda en 25s
 *   - 40 vehiculos esperando -> 100s -> se recorta al maximo: 60s
 *
 * @param {number} demandUnits vehiculos acumulados en el eje (suma de sus dos vias), en
 *   "unidades carro" -> un carro cuenta 1, una moto cuenta MOTO_UNIT_WEIGHT (ocupa menos verde)
 * @returns {number} segundos de luz verde a asignar
 */
function computeAdaptiveGreenSeconds(demandUnits) {
  const raw = demandUnits * config.SECONDS_PER_VEHICLE;
  return clamp(raw, config.MIN_GREEN_SECONDS, config.MAX_GREEN_SECONDS);
}

function clamp(value, min, max) {
  return Math.min(max, Math.max(min, value));
}

module.exports = { computeAdaptiveGreenSeconds };
