import { useMemo } from "react";
import { CROSSWALK_DEPTH, HALF_INTERSECTION, PEDESTRIAN_CROSSINGS, ROAD_WIDTH, TOTAL_ROAD_LENGTH } from "./laneLayout.js";

const ASPHALT = "#33415a";
const CROSSWALK_STRIPE_COUNT = 7;

function CenterLineDashes({ axis }) {
  const dashes = useMemo(() => {
    const list = [];
    // Arranca despues de la cebra + la linea de pare, para no encimarse con ellas.
    const start = HALF_INTERSECTION + CROSSWALK_DEPTH + 2.2;
    const end = TOTAL_ROAD_LENGTH / 2 - 2;
    for (let d = start; d < end; d += 3) {
      list.push(d);
      list.push(-d);
    }
    return list;
  }, []);

  return (
    <group position-y={0.03}>
      {dashes.map((d) => (
        <mesh key={d} position={axis === "z" ? [0, 0, d] : [d, 0, 0]}>
          <boxGeometry args={axis === "z" ? [0.18, 0.02, 1.4] : [1.4, 0.02, 0.18]} />
          <meshStandardMaterial color="#e2e8f0" />
        </mesh>
      ))}
    </group>
  );
}

/**
 * Zebra: varias franjas paralelas a la direccion de los carros (largas en el
 * sentido de la calle, angostas en el sentido en que camina el peaton),
 * repetidas a lo ancho de toda la calle que se cruza.
 */
function Crosswalk({ group }) {
  const cfg = PEDESTRIAN_CROSSINGS[group];
  const stripes = useMemo(() => {
    const list = [];
    const span = cfg.to - cfg.from;
    const step = span / (CROSSWALK_STRIPE_COUNT - 1);
    for (let i = 0; i < CROSSWALK_STRIPE_COUNT; i += 1) {
      list.push(cfg.from + step * i);
    }
    return list;
  }, [cfg]);

  const stripeDepth = CROSSWALK_DEPTH * 0.8;

  return (
    <group position-y={0.035}>
      {stripes.map((pos) => (
        <mesh key={pos} position={cfg.axis === "x" ? [pos, 0, cfg.fixed] : [cfg.fixed, 0, pos]}>
          <boxGeometry args={cfg.axis === "x" ? [0.7, 0.02, stripeDepth] : [stripeDepth, 0.02, 0.7]} />
          <meshStandardMaterial color="#e2e8f0" />
        </mesh>
      ))}
    </group>
  );
}

/** Las dos calles (asfalto), el cruce central, las lineas de carril y los cruces peatonales. */
export default function RoadNetwork() {
  return (
    <group>
      <mesh rotation-x={-Math.PI / 2} position-y={0.01}>
        <planeGeometry args={[ROAD_WIDTH, TOTAL_ROAD_LENGTH]} />
        <meshStandardMaterial color={ASPHALT} />
      </mesh>
      <mesh rotation-x={-Math.PI / 2} position-y={0.011}>
        <planeGeometry args={[TOTAL_ROAD_LENGTH, ROAD_WIDTH]} />
        <meshStandardMaterial color={ASPHALT} />
      </mesh>

      <mesh rotation-x={-Math.PI / 2} position-y={0.02}>
        <planeGeometry args={[ROAD_WIDTH, ROAD_WIDTH]} />
        <meshStandardMaterial color="#3d4d6b" />
      </mesh>

      <CenterLineDashes axis="z" />
      <CenterLineDashes axis="x" />

      <Crosswalk group="NS" />
      <Crosswalk group="EO" />
    </group>
  );
}
