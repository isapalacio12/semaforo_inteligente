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
