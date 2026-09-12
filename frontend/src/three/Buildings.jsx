import { useMemo } from "react";
import { ARM_LENGTH, HALF_INTERSECTION } from "./laneLayout.js";
import { isInsideAnyPark } from "./Parks.jsx";

const BUILDING_COLORS = ["#334155", "#3f4d68", "#2c3a52", "#425273"];
const SIDEWALK_GAP = 2.5;
const BUILDINGS_PER_QUADRANT = 7;
const MAX_PLACEMENT_ATTEMPTS = 6;

// Las 4 esquinas de la ciudad (fuera de las dos calles que cruzan por el centro).
const QUADRANTS = [
  { signX: 1, signZ: -1 }, // noreste
  { signX: -1, signZ: -1 }, // noroeste
  { signX: 1, signZ: 1 }, // sureste
  { signX: -1, signZ: 1 }, // suroeste
];

function randomBetween(min, max) {
  return min + Math.random() * (max - min);
}

function generateBuildings() {
  const buildings = [];
  let id = 0;

  for (const { signX, signZ } of QUADRANTS) {
    for (let i = 0; i < BUILDINGS_PER_QUADRANT; i += 1) {
      const width = randomBetween(2.5, 5);
      const depth = randomBetween(2.5, 5);

      // Varios intentos para no caer encima del parque de esa esquina; si no
      // encuentra lugar libre en pocos intentos, simplemente se salta ese
      // edificio (esta bien que algunas esquinas tengan un poco menos).
      let x;
      let z;
      let placed = false;
      for (let attempt = 0; attempt < MAX_PLACEMENT_ATTEMPTS; attempt += 1) {
        x = signX * randomBetween(HALF_INTERSECTION + SIDEWALK_GAP + width, ARM_LENGTH - width);
        z = signZ * randomBetween(HALF_INTERSECTION + SIDEWALK_GAP + depth, ARM_LENGTH - depth);
        if (!isInsideAnyPark(x, z, Math.max(width, depth) / 2)) {
          placed = true;
          break;
        }
      }
      if (!placed) continue;

      const height = randomBetween(3, 16);
      const color = BUILDING_COLORS[id % BUILDING_COLORS.length];
      const litWindows = Math.random() < 0.5;
      buildings.push({ id: id++, x, z, width, depth, height, color, litWindows });
    }
  }

  return buildings;
}

function Building({ x, z, width, depth, height, color, litWindows }) {
  return (
    <group position={[x, 0, z]}>
      <mesh position={[0, height / 2, 0]} castShadow receiveShadow>
        <boxGeometry args={[width, height, depth]} />
        <meshStandardMaterial
          color={color}
          emissive={litWindows ? "#fde68a" : "#000000"}
          emissiveIntensity={litWindows ? 0.15 : 0}
        />
      </mesh>
      <mesh position={[0, height + 0.05, 0]}>
        <boxGeometry args={[width * 0.6, 0.1, depth * 0.6]} />
        <meshStandardMaterial color="#1e293b" />
      </mesh>
    </group>
  );
}

/** Los edificios de la ciudad, en las 4 esquinas fuera de las calles. Se generan una sola vez. */
export default function Buildings() {
  const buildings = useMemo(() => generateBuildings(), []);
  return (
    <group>
      {buildings.map((b) => (
        <Building key={b.id} {...b} />
      ))}
    </group>
  );
}
