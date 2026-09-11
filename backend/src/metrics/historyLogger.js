const fs = require("fs");
const path = require("path");

const HISTORY_FILE = path.join(__dirname, "..", "..", "data", "history.json");
const MAX_SNAPSHOTS = 500; // evita que el archivo crezca sin limite en el MVP

/**
 * Guarda snapshots periodicos de las metricas (adaptativo vs fijo) en un
 * archivo JSON local. Es deliberadamente simple para el MVP; en fase 2 esto
 * se puede reemplazar por SQLite sin tocar el resto del backend.
 */
function appendSnapshot(snapshot) {
  const history = readHistory();
  history.push({ ...snapshot, timestamp: Date.now() });

  if (history.length > MAX_SNAPSHOTS) {
    history.splice(0, history.length - MAX_SNAPSHOTS);
  }

  // La carpeta "data" no se sube a git (solo el .json generado esta en
  // .gitignore, la carpeta en si no queda registrada si nunca tuvo otro
  // archivo). Sin este mkdir, en un contenedor recien clonado esta carpeta
  // no existe y writeFileSync tira ENOENT -cada 10 segundos-, tumbando el
  // proceso entero una y otra vez.
  fs.mkdirSync(path.dirname(HISTORY_FILE), { recursive: true });
  fs.writeFileSync(HISTORY_FILE, JSON.stringify(history, null, 2));
}

function readHistory() {
  try {
    const raw = fs.readFileSync(HISTORY_FILE, "utf-8");
    return JSON.parse(raw);
  } catch (err) {
    return [];
  }
}

module.exports = { appendSnapshot, readHistory };
