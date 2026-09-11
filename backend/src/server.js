const express = require("express");
const cors = require("cors");
const http = require("http");
const path = require("path");
const fs = require("fs");
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
const io = new Server(server, {
  cors: { origin: "*" },
  // Un poco mas tolerante que el default: detras de un reverse proxy (Traefik/
  // EasyPanel) un ping/pong puede tardar un poco mas en ir y volver, y no
  // queremos que eso se confunda con una desconexion real.
  pingInterval: 25000,
  pingTimeout: 30000,
});

// Si algo inesperado revienta fuera del try/catch de runTick (o en cualquier
// otro lado), lo dejamos registrado en los logs en vez de dejar que el
// proceso se caiga: un crash aqui reinicia todo el contenedor y con eso se
// pierde la simulacion completa (el semaforo "se descoordina" de la nada).
process.on("uncaughtException", (err) => {
  console.error("uncaughtException:", err);
});
process.on("unhandledRejection", (err) => {
  console.error("unhandledRejection:", err);
});

// Dos intersecciones simuladas en paralelo, alimentadas con las MISMAS
// llegadas de vehiculos en cada tick, para que la comparacion sea justa:
// una decide sus tiempos de verde con el algoritmo adaptativo, la otra usa
// tiempos fijos como linea base.
const adaptiveIntersection = new Intersection("adaptive");
const fixedIntersection = new Intersection("fixed");

let tickCount = 0;

function runTick() {
  // Si un solo tick falla por lo que sea, lo registramos y seguimos con el
  // siguiente en vez de tumbar el proceso entero (que reiniciaria el
  // contenedor y resetearia toda la simulacion en curso).
  try {
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
  } catch (err) {
    console.error("Error en runTick:", err);
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

// --- Frontend compilado (produccion) ---
// El Dockerfile copia el build de Vite (frontend/dist) a esta carpeta "public"
// para que un solo proceso/puerto sirva tanto la API/WebSocket como el sitio.
// En desarrollo esta carpeta no existe (se usa "npm run dev" en /frontend en su
// lugar), asi que todo esto queda inactivo sin romper nada.
const PUBLIC_DIR = path.join(__dirname, "..", "public");
if (fs.existsSync(PUBLIC_DIR)) {
  app.use(express.static(PUBLIC_DIR));
  app.get("*", (req, res, next) => {
    if (req.path.startsWith("/api")) return next();
    res.sendFile(path.join(PUBLIC_DIR, "index.html"));
  });
}

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
