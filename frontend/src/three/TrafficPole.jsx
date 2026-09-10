import { laneStopLightPosition } from "./laneLayout.js";

const BULB_COLORS = {
  red: "#ef4444",
  yellow: "#eab308",
  green: "#22c55e",
};

function Bulb({ y, on, color }) {
  return (
    <group position={[0, y, 0.19]}>
      <mesh>
        <sphereGeometry args={[0.24, 16, 16]} />
        <meshStandardMaterial
          color={on ? color : "#1e293b"}
          emissive={on ? color : "#000000"}
          emissiveIntensity={on ? 2.8 : 0}
        />
      </mesh>
      {on && (
        <mesh>
          <sphereGeometry args={[0.4, 16, 16]} />
          <meshBasicMaterial color={color} transparent opacity={0.28} />
        </mesh>
      )}
    </group>
  );
}

/** Poste de semaforo en la linea de pare de una via, con las 3 luces reales (rojo/amarillo/verde). */
export default function TrafficPole({ lane, color }) {
  const position = laneStopLightPosition(lane);

  return (
    <group position={position}>
      <mesh position={[0, 1.6, 0]} castShadow>
        <cylinderGeometry args={[0.09, 0.09, 3.2, 8]} />
        <meshStandardMaterial color="#334155" />
      </mesh>
      <mesh position={[0, 3.55, 0]} castShadow>
        <boxGeometry args={[0.55, 1.5, 0.45]} />
        <meshStandardMaterial color="#0f172a" />
      </mesh>
      <Bulb y={4.05} on={color === "red"} color={BULB_COLORS.red} />
      <Bulb y={3.55} on={color === "yellow"} color={BULB_COLORS.yellow} />
      <Bulb y={3.05} on={color === "green"} color={BULB_COLORS.green} />
    </group>
  );
}
