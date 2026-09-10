const config = require("../config");
const { poissonSample } = require("./trafficSimulator");

const PEDESTRIAN_GROUPS = ["NS", "EO"];

/**
 * Simula cuantos peatones nuevos llegan a esperar en cada grupo de cruce
 * durante este tick (mismo enfoque tipo Poisson que los vehiculos).
 * @returns {{NS:number, EO:number}}
 */
function generatePedestrianArrivals() {
  const arrivals = {};
  for (const group of PEDESTRIAN_GROUPS) {
    arrivals[group] = poissonSample(config.PEDESTRIAN_ARRIVAL_RATE[group]);
  }
  return arrivals;
}

module.exports = { generatePedestrianArrivals, PEDESTRIAN_GROUPS };
