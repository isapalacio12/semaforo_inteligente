import { useEffect, useState } from "react";
import { socket } from "./socket.js";
import CityScene from "./three/CityScene.jsx";
import MetricsPanel from "./components/MetricsPanel.jsx";
import SignalStatus from "./components/SignalStatus.jsx";

export default function App() {
  const [state, setState] = useState(null);
  const [connected, setConnected] = useState(socket.connected);
  const [view, setView] = useState("adaptive"); // "adaptive" | "fixed"

  useEffect(() => {
    function onState(payload) {
      setState(payload);
    }
    function onConnect() {
      setConnected(true);
    }
    function onDisconnect() {
      setConnected(false);
    }

    socket.on("state", onState);
    socket.on("connect", onConnect);
    socket.on("disconnect", onDisconnect);

    return () => {
      socket.off("state", onState);
      socket.off("connect", onConnect);
      socket.off("disconnect", onDisconnect);
    };
  }, []);

  return (
    <div className="app">
      <header className="app-header">
        <h1>Semáforo Inteligente</h1>
        <span className={`connection-badge ${connected ? "online" : "offline"}`}>
          {connected ? "Conectado" : "Sin conexión al backend"}
        </span>
      </header>

      {!state ? (
        <p className="loading">Esperando datos del backend...</p>
      ) : (
        <>
          <div className="view-toggle">
            <button
              type="button"
              className={view === "adaptive" ? "active" : ""}
              onClick={() => setView("adaptive")}
            >
              Ciudad: Adaptativo
            </button>
            <button type="button" className={view === "fixed" ? "active" : ""} onClick={() => setView("fixed")}>
              Ciudad: Tiempo fijo
            </button>
          </div>

          <SignalStatus intersection={view === "adaptive" ? state.adaptive : state.fixed} />

          <div className="city-canvas-wrap">
            <CityScene intersection={view === "adaptive" ? state.adaptive : state.fixed} />
          </div>
          <p className="canvas-hint">Arrastra para rotar la cámara · rueda del mouse para hacer zoom</p>

          <MetricsPanel adaptive={state.adaptive} fixed={state.fixed} />

          <footer className="config-footer">
            Verde adaptativo: {state.config.minGreen}s – {state.config.maxGreen}s · Amarillo:{" "}
            {state.config.yellow}s · Verde fijo de referencia: {state.config.fixedGreen}s
          </footer>
        </>
      )}
    </div>
  );
}
