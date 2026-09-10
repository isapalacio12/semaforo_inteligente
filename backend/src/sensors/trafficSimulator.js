const config = require("../config");

const LANES = ["N", "S", "E", "O"];

/**
 * Simula lo que "verian" camaras/sensores IoT en cada via durante un tick.
 * Usa un proceso de llegadas semi-aleatorio (tipo Poisson) por via, con una
 * probabilidad baja de rafaga, y separa cuantos de esos vehiculos son motos
 * (mas agiles, cuentan menos para el algoritmo) contra carros normales.
 *
 * @returns {{N:{cars:number,motos:number}, S:..., E:..., O:...}}
 */
function generateArrivals() {
  const arrivals = {};

  for (const lane of LANES) {
    const rate = config.ARRIVAL_RATES[lane];
    let total = poissonSample(rate);

    if (Math.random() < config.BURST_PROBABILITY) {
      const [min, max] = config.BURST_EXTRA_VEHICLES;
      total += min + Math.floor(Math.random() * (max - min + 1));
    }

    let motos = 0;
    for (let i = 0; i < total; i += 1) {
      if (Math.random() < config.MOTO_SHARE) motos += 1;
    }

    arrivals[lane] = { cars: total - motos, motos };
  }

  return arrivals;
}

// Muestreo de una distribucion Poisson (algoritmo de Knuth), suficiente para
// tasas bajas como las de este simulador.
function poissonSample(lambda) {
  const L = Math.exp(-lambda);
  let k = 0;
  let p = 1;
  do {
    k += 1;
    p *= Math.random();
  } while (p > L);
  return k - 1;
}

module.exports = { generateArrivals, poissonSample, LANES };
