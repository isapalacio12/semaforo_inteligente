import { useEffect, useRef } from "react";
import { useFrame } from "@react-three/fiber";
import {
  LANE_FACING,
  LANE_ROTATION,
  VEHICLE_DRIVE_SPEED,
  VEHICLE_EXIT_TRAVEL_DISTANCE,
  laneVehiclePosition,
  laneVehicleSpawnPosition,
} from "./laneLayout.js";

const CAR_COLORS = ["#38bdf8", "#f97316", "#a3e635", "#f472b6", "#facc15", "#c084fc", "#fb7185"];
const MOTO_COLORS = ["#e2e8f0", "#fca5a5", "#93c5fd", "#fde68a"];

function colorFor(id, palette) {
  return palette[id % palette.length];
}

/**
 * Cuerpo de un carro: caja + "cabina" mas angosta arriba, con faros al frente.
 */
function CarBody({ id }) {
  const color = colorFor(id, CAR_COLORS);
  return (
    <group>
      <mesh castShadow position={[0, 0.35, 0]}>
        <boxGeometry args={[1.6, 0.7, 3.2]} />
        <meshStandardMaterial color={color} />
      </mesh>
      <mesh castShadow position={[0, 0.78, 0.1]}>
        <boxGeometry args={[1.3, 0.55, 1.6]} />
        <meshStandardMaterial color="#0f172a" opacity={0.85} transparent />
      </mesh>
      {[-0.55, 0.55].map((dx) => (
        <mesh key={dx} position={[dx, 0.4, 1.62]}>
          <sphereGeometry args={[0.09, 8, 8]} />
          <meshStandardMaterial color="#fef9c3" emissive="#fde68a" emissiveIntensity={1.5} />
        </mesh>
      ))}
    </group>
  );
}

/** Una moto: cuerpo delgado + una sola luz delantera. */
function MotoBody({ id }) {
  const color = colorFor(id, MOTO_COLORS);
  return (
    <group>
      <mesh castShadow position={[0, 0.32, 0]}>
        <boxGeometry args={[0.5, 0.45, 1.9]} />
        <meshStandardMaterial color={color} />
      </mesh>
      <mesh position={[0, 0.5, -0.3]}>
        <sphereGeometry args={[0.14, 8, 8]} />
        <meshStandardMaterial color="#1e293b" />
      </mesh>
      <mesh position={[0, 0.35, 0.97]}>
        <sphereGeometry args={[0.08, 8, 8]} />
        <meshStandardMaterial color="#fef9c3" emissive="#fde68a" emissiveIntensity={1.5} />
      </mesh>
    </group>
  );
}

/**
 * Un vehiculo dentro de la fila de una via, animado a velocidad constante
 * (como un carro real, no con un salto ni un resorte):
 *  - Al aparecer por primera vez, "spawnea" bastante mas atras de su lugar
 *    real en la fila y maneja hacia adelante hasta alcanzarlo -se ve llegando-.
 *  - Mientras espera, si el de adelante avanza (o sale), lo sigue a la misma
 *    velocidad constante.
 *  - Cuando le toca cruzar (el backend ya no lo manda en la fila = "exiting"),
 *    sigue de largo en su misma direccion una buena distancia -cruza TODO el
 *    cruce y se pierde del otro lado- antes de desmontarse.
 */
export default function Vehicle3D({ id, type, lane, index, exiting }) {
  const groupRef = useRef();
  const mounted = useRef(false);
  const exitTargetRef = useRef(null);

  useEffect(() => {
    if (groupRef.current && !mounted.current) {
      groupRef.current.position.copy(laneVehicleSpawnPosition(lane, index));
      mounted.current = true;
    }
    // Solo al montar: el punto de aparicion no debe recalcularse en cada render.
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  useFrame((_, delta) => {
    const node = groupRef.current;
    if (!node) return;

    let targetX;
    let targetZ;

    if (exiting) {
      if (!exitTargetRef.current) {
        const facing = LANE_FACING[lane];
        exitTargetRef.current = {
          x: node.position.x + facing.x * VEHICLE_EXIT_TRAVEL_DISTANCE,
          z: node.position.z + facing.z * VEHICLE_EXIT_TRAVEL_DISTANCE,
        };
      }
      targetX = exitTargetRef.current.x;
      targetZ = exitTargetRef.current.z;
    } else {
      const target = laneVehiclePosition(lane, index);
      targetX = target.x;
      targetZ = target.z;
    }

    const dx = targetX - node.position.x;
    const dz = targetZ - node.position.z;
    const distance = Math.hypot(dx, dz);
    const step = VEHICLE_DRIVE_SPEED * delta;

    if (distance <= step || distance < 0.001) {
      node.position.x = targetX;
      node.position.z = targetZ;
    } else {
      node.position.x += (dx / distance) * step;
      node.position.z += (dz / distance) * step;
    }
  });

  return (
    <group ref={groupRef} rotation-y={LANE_ROTATION[lane]}>
      {type === "moto" ? <MotoBody id={id} /> : <CarBody id={id} />}
    </group>
  );
}
