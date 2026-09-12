import { useMemo, useRef } from "react";
import { useFrame } from "@react-three/fiber";
import { HALF_INTERSECTION } from "./laneLayout.js";

// Un parque cuadrado en cada una de las 4 esquinas de la ciudad.
export const PARK_HALF_SIZE = 8;
export const PARK_CENTER_DISTANCE = HALF_INTERSECTION + 22;

const QUADRANTS = [
  { signX: 1, signZ: -1 },
  { signX: -1, signZ: -1 },
  { signX: 1, signZ: 1 },
  { signX: -1, signZ: 1 },
];

/** Para que Buildings.jsx no ponga un edificio encima de un parque. */
export function isInsideAnyPark(x, z, margin = 0) {
  return QUADRANTS.some(({ signX, signZ }) => {
    const cx = signX * PARK_CENTER_DISTANCE;
    const cz = signZ * PARK_CENTER_DISTANCE;
    return Math.abs(x - cx) < PARK_HALF_SIZE + margin && Math.abs(z - cz) < PARK_HALF_SIZE + margin;
  });
}

function randomBetween(min, max) {
  return min + Math.random() * (max - min);
}

function Tree({ x, z }) {
  const height = useMemo(() => randomBetween(2.2, 3.6), []);
  return (
    <group position={[x, 0, z]}>
      <mesh position={[0, height * 0.28, 0]} castShadow>
        <cylinderGeometry args={[0.14, 0.18, height * 0.55, 6]} />
        <meshStandardMaterial color="#5b4632" />
      </mesh>
      <mesh position={[0, height * 0.75, 0]} castShadow>
        <coneGeometry args={[height * 0.42, height * 0.9, 8]} />
        <meshStandardMaterial color="#2f6b3a" />
      </mesh>
    </group>
  );
}

function Bench({ x, z, rotationY = 0 }) {
  return (
    <group position={[x, 0, z]} rotation-y={rotationY}>
      <mesh position={[0, 0.28, 0]} castShadow>
        <boxGeometry args={[1.4, 0.08, 0.5]} />
        <meshStandardMaterial color="#8a5a3b" />
      </mesh>
      <mesh position={[0, 0.55, -0.2]} castShadow>
        <boxGeometry args={[1.4, 0.4, 0.08]} />
        <meshStandardMaterial color="#8a5a3b" />
      </mesh>
      {[-0.6, 0.6].map((dx) => (
        <mesh key={dx} position={[dx, 0.14, 0]}>
          <boxGeometry args={[0.08, 0.28, 0.5]} />
          <meshStandardMaterial color="#3f3f46" />
        </mesh>
      ))}
    </group>
  );
}

function Swing({ x, z }) {
  return (
    <group position={[x, 0, z]}>
      {[-1, 1].map((side) => (
        <mesh key={side} position={[side * 1.1, 1.1, 0]} rotation-z={side * 0.15} castShadow>
          <cylinderGeometry args={[0.06, 0.06, 2.3, 6]} />
          <meshStandardMaterial color="#b45309" />
        </mesh>
      ))}
      <mesh position={[0, 2.15, 0]} rotation-z={Math.PI / 2} castShadow>
        <cylinderGeometry args={[0.06, 0.06, 2.4, 6]} />
        <meshStandardMaterial color="#b45309" />
      </mesh>
      <mesh position={[0, 1, 0]}>
        <boxGeometry args={[0.5, 0.06, 0.3]} />
        <meshStandardMaterial color="#facc15" />
      </mesh>
    </group>
  );
}

const KID_COLORS = ["#f97316", "#38bdf8", "#facc15", "#f472b6", "#a3e635"];

/** Un niño jugando: corretea sin parar dentro de un radio alrededor de un punto del parque. */
function PlayingKid({ centerX, centerZ, seed }) {
  const ref = useRef();
  const params = useMemo(
    () => ({
      radius: randomBetween(1.5, 3.2),
      speed: randomBetween(0.35, 0.75),
      phase: Math.random() * Math.PI * 2,
      bounceSpeed: randomBetween(4, 6),
      color: KID_COLORS[seed % KID_COLORS.length],
    }),
    [seed]
  );

  useFrame(({ clock }) => {
    if (!ref.current) return;
    const t = clock.elapsedTime * params.speed + params.phase;
    const x = centerX + Math.cos(t) * params.radius;
    const z = centerZ + Math.sin(t * 1.3) * params.radius * 0.7;
    const bounce = Math.abs(Math.sin(clock.elapsedTime * params.bounceSpeed)) * 0.12;
    ref.current.position.set(x, bounce, z);
    ref.current.rotation.y = -t;
  });

  return (
    <group ref={ref}>
      <mesh position={[0, 0.28, 0]} castShadow>
        <capsuleGeometry args={[0.11, 0.32, 4, 8]} />
        <meshStandardMaterial color={params.color} />
      </mesh>
      <mesh position={[0, 0.56, 0]} castShadow>
        <sphereGeometry args={[0.1, 10, 10]} />
        <meshStandardMaterial color="#f1c8a0" />
      </mesh>
    </group>
  );
}

function ParkPlot({ signX, signZ }) {
  const cx = signX * PARK_CENTER_DISTANCE;
  const cz = signZ * PARK_CENTER_DISTANCE;

  const trees = useMemo(() => {
    const list = [];
    const count = 6;
    for (let i = 0; i < count; i += 1) {
      const angle = (i / count) * Math.PI * 2 + Math.random() * 0.5;
      const r = randomBetween(PARK_HALF_SIZE * 0.55, PARK_HALF_SIZE * 0.92);
      list.push({ x: Math.cos(angle) * r, z: Math.sin(angle) * r });
    }
    return list;
  }, []);

  return (
    <group position={[cx, 0, cz]}>
      <mesh rotation-x={-Math.PI / 2} position-y={0.012} receiveShadow>
        <planeGeometry args={[PARK_HALF_SIZE * 2, PARK_HALF_SIZE * 2]} />
        <meshStandardMaterial color="#2f6b3a" />
      </mesh>

      {trees.map((t, i) => (
        <Tree key={i} x={t.x} z={t.z} />
      ))}

      <Bench x={-2.6} z={PARK_HALF_SIZE * 0.55} rotationY={0.3} />
      <Bench x={2.6} z={-PARK_HALF_SIZE * 0.55} rotationY={Math.PI + 0.3} />
      <Swing x={0} z={-1.5} />

      {[0, 1, 2].map((i) => (
        <PlayingKid key={i} centerX={0} centerZ={1.8} seed={i} />
      ))}
    </group>
  );
}

/** Un parque con arboles, bancas, columpio y niños jugando, en cada esquina de la ciudad. */
export default function Parks() {
  return (
    <group>
      {QUADRANTS.map((q) => (
        <ParkPlot key={`${q.signX}-${q.signZ}`} signX={q.signX} signZ={q.signZ} />
      ))}
    </group>
  );
}
