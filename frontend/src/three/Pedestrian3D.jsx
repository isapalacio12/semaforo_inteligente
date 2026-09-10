import { useEffect, useRef } from "react";
import { useFrame } from "@react-three/fiber";
import { pedestrianCrossingPosition, pedestrianWaitingPosition } from "./laneLayout.js";

const SKIN_TONES = ["#f4c9a1", "#c68a5f", "#8d5a3c", "#f1d4b3"];
const SHIRT_COLORS = ["#f97316", "#38bdf8", "#a3e635", "#f472b6", "#facc15", "#e2e8f0"];

function PersonModel({ id }) {
  const shirt = SHIRT_COLORS[id % SHIRT_COLORS.length];
  const skin = SKIN_TONES[id % SKIN_TONES.length];
  return (
    <group>
      <mesh position={[0, 0.5, 0]} castShadow>
        <capsuleGeometry args={[0.16, 0.55, 4, 8]} />
        <meshStandardMaterial color={shirt} />
      </mesh>
      <mesh position={[0, 0.98, 0]} castShadow>
        <sphereGeometry args={[0.15, 10, 10]} />
        <meshStandardMaterial color={skin} />
      </mesh>
    </group>
  );
}

const LERP_SPEED = 6;

/** Un peaton cruzando la calle; su posicion de destino viene del backend (`progress`). */
export function CrossingPedestrian({ id, group, progress, spread }) {
  const ref = useRef();
  const mounted = useRef(false);

  useFrame((_, delta) => {
    if (!ref.current) return;
    const target = pedestrianCrossingPosition(group, progress, spread);
    if (!mounted.current) {
      ref.current.position.copy(target);
      mounted.current = true;
      return;
    }
    ref.current.position.lerp(target, Math.min(1, delta * LERP_SPEED));
  });

  return (
    <group ref={ref}>
      <PersonModel id={id} />
    </group>
  );
}

/** Peatones esperando en la esquina a que su grupo tenga "camine" (decorativo, sin animar). */
export function WaitingPedestrian({ id, group, index }) {
  const posRef = useRef(pedestrianWaitingPosition(group, index));
  return (
    <group position={posRef.current}>
      <PersonModel id={id} />
    </group>
  );
}
