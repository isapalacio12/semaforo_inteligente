const express = require("express");
const cors = require("cors");
const http = require("http");
const { Server } = require("socket.io");

const config = require("./config");
const { generateArrivals } = require("./sensors/trafficSimulator");
const { generatePedestrianArrivals } = require("./sensors/pedestrianSimulator");
const { Intersection } = require("./traffic-light/intersection");
const { appendSnapshot, readHistory } = require("./metrics/historyLogger");

const app = express();
app.use(cors());
app.use(express.json());

const server = http.createServer(app);
const io = new Server(server, { cors: { origin: "*" } });

// Dos intersecciones simuladas en paralelo, alimentadas con las MISMAS
// llegadas de vehiculos en cada tick, para que la comparacion sea justa:
// una decide sus tiempos de verde con el algoritmo adaptativo, la otra usa
// tiempos fijos como linea base.
const adaptiveIntersection = new Intersection("adaptive");
const fixedIntersection = new Intersection("fixed");

let tickCount = 0;

function runTick() {
  const arrivals = generateArrivals();
  const pedestrianArrivals = generatePedestrianArrivals();

  adaptiveIntersection.tick(arrivals, pedestrianArrivals);
  fixedIntersection.tick(arrivals, pedestrianArrivals);

  tickCount += 1;

  const state = {
    tick: tickCount,
    config: {
      minGreen: config.MIN_GREEN_SECONDS,
      maxGreen: config.MAX_GREEN_SECONDS,
      yellow: config.YELLOW_SECONDS,
      fixedGreen: config.FIXED_GREEN_SECONDS,
    },
    adaptive: adaptiveIntersection.toJSON(),
    fixed: fixedIntersection.toJSON(),
  };

  io.emit("state", state);

  // Cada 10 segundos simulados, guardamos un snapshot para el historial (fase 2).
  if (tickCount % 10 === 0) {
    appendSnapshot({
      tick: tickCount,
      adaptive: state.adaptive.metrics,
      fixed: state.fixed.metrics,
    });
  }
}

// --- Rutas REST (utiles para depurar o para un cliente sin websockets) ---

app.get("/api/health", (_req, res) => res.json({ ok: true }));

app.get("/api/state", (_req, res) => {
  res.json({
    adaptive: adaptiveIntersection.toJSON(),
    fixed: fixedIntersection.toJSON(),
  });
});

app.get("/api/history", (_req, res) => {
  res.json(readHistory());
});

io.on("connection", (socket) => {
  // Al conectarse, mandamos el estado actual de una vez para no esperar el siguiente tick.
  socket.emit("state", {
    tick: tickCount,
    config: {
      minGreen: config.MIN_GREEN_SECONDS,
      maxGreen: config.MAX_GREEN_SECONDS,
      yellow: config.YELLOW_SECONDS,
      fixedGreen: config.FIXED_GREEN_SECONDS,
    },
    adaptive: adaptiveIntersection.toJSON(),
    fixed: fixedIntersection.toJSON(),
  });
});

const PORT = process.env.PORT || 4000;
server.listen(PORT, () => {
  console.log(`Servidor del semaforo inteligente escuchando en http://localhost:${PORT}`);
  setInterval(runTick, config.TICK_INTERVAL_MS);
});
