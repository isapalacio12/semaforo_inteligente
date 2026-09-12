import { useCallback } from "react";
import { Canvas } from "@react-three/fiber";
import { OrbitControls } from "@react-three/drei";
import RoadNetwork from "./RoadNetwork.jsx";
import Buildings from "./Buildings.jsx";
import TrafficPole from "./TrafficPole.jsx";
import Vehicle3D from "./Vehicle3D.jsx";
import { CrossingPedestrian, WaitingPedestrian } from "./Pedestrian3D.jsx";
import { useVehicleFleet } from "./useVehicleFleet.js";
import { LANES } from "./laneLayout.js";
import { playCarAccelerate, playMotoAccelerate } from "../audio/cityAmbience.js";

const MAX_WAITING_PEDESTRIANS_SHOWN = 6;

function LaneVehicles({ lane, data }) {
  // Sonido de motor real: se dispara justo cuando un vehiculo arranca a
  // cruzar el semaforo (deja de venir en la fila que manda el backend).
  const handleDepart = useCallback((type) => {
    if (type === "moto") playMotoAccelerate();
    else playCarAccelerate();
  }, []);

  const fleet = useVehicleFleet(data.queue, handleDepart);
  return (
    <>
      {fleet.map((v) => (
        <Vehicle3D key={v.id} id={v.id} type={v.type} lane={lane} index={v.index} exiting={v.exiting} />
      ))}
    </>
  );
}

function PedestrianGroup({ group, data }) {
  return (
    <>
      {data.crossing.map((p) => (
        <CrossingPedestrian
          key={p.id}
          id={p.id}
          group={group}
          progress={p.progress}
          spread={((p.id % 5) - 2) * 0.35}
        />
      ))}
      {Array.from({ length: Math.min(data.waiting, MAX_WAITING_PEDESTRIANS_SHOWN) }).map((_, i) => (
        <WaitingPedestrian key={`waiting-${i}`} id={i} group={group} index={i} />
      ))}
    </>
  );
}

/**
 * Escena 3D de la interseccion: calles, edificios, semaforos, vehiculos y
 * peatones, todo dibujado a partir del ultimo estado que manda el backend.
 * La camara es orbital (se puede rotar/hacer zoom con el mouse).
 */
export default function CityScene({ intersection }) {
  if (!intersection) return null;

  return (
    <Canvas shadows dpr={[1, 2]} camera={{ position: [0, 24, 32], fov: 48 }}>
      <color attach="background" args={["#0b1220"]} />
      <fog attach="fog" args={["#0b1220", 55, 150]} />
      <ambientLight intensity={0.6} />
      <directionalLight
        position={[30, 45, 18]}
        intensity={1.2}
        castShadow
        shadow-mapSize-width={1024}
        shadow-mapSize-height={1024}
      />

      <mesh rotation-x={-Math.PI / 2} receiveShadow>
        <planeGeometry args={[240, 240]} />
        <meshStandardMaterial color="#141d19" />
      </mesh>

      <RoadNetwork />
      <Buildings />

      {LANES.map((lane) => (
        <TrafficPole key={lane} lane={lane} color={intersection.lanes[lane].color} />
      ))}

      {LANES.map((lane) => (
        <LaneVehicles key={lane} lane={lane} data={intersection.lanes[lane]} />
      ))}

      {Object.entries(intersection.pedestrians).map(([group, data]) => (
        <PedestrianGroup key={group} group={group} data={data} />
      ))}

      <OrbitControls
        enablePan={false}
        minDistance={14}
        maxDistance={120}
        minPolarAngle={0.35}
        maxPolarAngle={Math.PI / 2.15}
        target={[0, 0, 0]}
      />
    </Canvas>
  );
}
