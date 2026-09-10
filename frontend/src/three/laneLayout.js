import * as THREE from "three";

// Convencion de mundo: X = este(+)/oeste(-), Z = sur(+)/norte(-), Y = arriba.
// El cruce esta centrado en el origen. Orden de afuera hacia adentro en cada
// brazo: edificios -> fila de vehiculos -> semaforo/linea de pare -> cebra ->
// borde de la interseccion (asfalto central).
//
// OJO: todas las distancias de vehiculos/semaforo/cebra se miden como
// "distancia extra MAS ALLA del borde de la interseccion" (HALF_INTERSECTION),
// nunca desde el origen directamente -- ese fue el bug que hacia que los
// carros de las 4 vias terminaran amontonados en el centro del cruce.

export const ROAD_WIDTH = 10;
export const LANE_WIDTH = ROAD_WIDTH / 2;
export const HALF_INTERSECTION = ROAD_WIDTH / 2; // 5: borde del cuadrado central

export const CROSSWALK_DEPTH = 2.4; // que tan "gruesa" es la cebra
export const CROSSWALK_START = HALF_INTERSECTION; // la cebra empieza justo en el borde del cruce
export const CROSSWALK_CENTER = HALF_INTERSECTION + CROSSWALK_DEPTH / 2;
export const CROSSWALK_END = HALF_INTERSECTION + CROSSWALK_DEPTH;

// Distancia (mas alla del borde del cruce) al CENTRO del primer vehiculo de la fila.
// Debe quedar despues de la cebra, con margen de sobra (los carros miden ~3.2 de largo).
export const STOP_LINE_GAP = 4.6;
// Separacion entre los CENTROS de dos vehiculos consecutivos en la fila (> largo de un carro,
// para que nunca se encimen aunque se mezclen carros y motos).
export const VEHICLE_SPACING = 3.8;
// Donde va el poste del semaforo: justo antes de donde arranca la fila, despues de la cebra.
export const TRAFFIC_POLE_DISTANCE = HALF_INTERSECTION + CROSSWALK_DEPTH + 0.4;

export const ARM_LENGTH = 72; // largo visible de cada brazo (con margen para que hasta el ultimo auto visible "aparezca" manejando, no de la nada)
export const TOTAL_ROAD_LENGTH = ARM_LENGTH * 2 + ROAD_WIDTH;

// --- Movimiento realista de vehiculos ---
// Velocidad constante (unidades de mundo por segundo) con la que un vehiculo
// se acerca a su lugar en la fila, avanza cuando el de adelante se va, y
// cruza el cruce cuando le toca verde. Una sola velocidad para todo el
// recorrido, como un carro real (no un salto ni una animacion elastica).
export const VEHICLE_DRIVE_SPEED = 12;
// Que tan lejos, mas alla de su lugar real en la fila, "aparece" un vehiculo
// nuevo -- para que se vea llegando manejando en vez de aparecer de la nada.
export const VEHICLE_SPAWN_EXTRA_DISTANCE = 14;

// Punto de destino cuando un vehiculo cruza: casi la punta del brazo OPUESTO
// (distancia negativa = del otro lado del cruce, en la direccion de viaje).
// Asi se ve manejando por toda la calle de salida y perdiendose a lo lejos,
// igual de progresivo que la llegada -no se esfuma cerca del semaforo-.
export const VEHICLE_EXIT_TARGET_DISTANCE = -(ARM_LENGTH + HALF_INTERSECTION - 6);
// Cota superior de cuanto puede llegar a recorrer un vehiculo saliendo (desde
// el frente de la fila hasta el punto de salida), para saber cuanto tiempo
// real hay que esperar antes de desmontarlo del todo.
export const VEHICLE_MAX_EXIT_TRAVEL =
  HALF_INTERSECTION + STOP_LINE_GAP + Math.abs(VEHICLE_EXIT_TARGET_DISTANCE) + 10;

export const LANES = ["N", "S", "E", "O"];

// Hacia donde avanza (se acerca al cruce) un vehiculo en cada via.
export const LANE_FACING = {
  N: { x: 0, z: 1 },
  S: { x: 0, z: -1 },
  E: { x: -1, z: 0 },
  O: { x: 1, z: 0 },
};

// Rotacion en Y para que el modelo (construido con el frente hacia +Z) apunte
// en la direccion de viaje de cada via.
export const LANE_ROTATION = {
  N: 0,
  S: Math.PI,
  E: -Math.PI / 2,
  O: Math.PI / 2,
};

// Desplazamiento lateral dentro de la calle: cada via circula por su derecha,
// ocupando solo la mitad del ancho de la calzada.
export const LANE_LATERAL_OFFSET = {
  N: { x: -LANE_WIDTH / 2, z: 0 },
  S: { x: LANE_WIDTH / 2, z: 0 },
  E: { x: 0, z: -LANE_WIDTH / 2 },
  O: { x: 0, z: LANE_WIDTH / 2 },
};

/** Posicion en el mundo de una via a una distancia arbitraria (con signo) del centro del cruce. */
export function laneOffsetPosition(lane, distanceFromCenter) {
  const facing = LANE_FACING[lane];
  const lateral = LANE_LATERAL_OFFSET[lane];
  return new THREE.Vector3(
    lateral.x - facing.x * distanceFromCenter,
    0,
    lateral.z - facing.z * distanceFromCenter
  );
}

/**
 * Posicion en el mundo del vehiculo #index (0 = el mas cercano al cruce) de una via.
 * distanceFromCenter = borde del cruce + espacio de seguridad + lo que avanza la fila.
 */
export function laneVehiclePosition(lane, index, spacing = VEHICLE_SPACING) {
  return laneOffsetPosition(lane, HALF_INTERSECTION + STOP_LINE_GAP + index * spacing);
}

/** Donde "aparece" (lejos, como si viniera manejando) un vehiculo nuevo en el indice dado. */
export function laneVehicleSpawnPosition(lane, index, spacing = VEHICLE_SPACING) {
  return laneOffsetPosition(
    lane,
    HALF_INTERSECTION + STOP_LINE_GAP + index * spacing + VEHICLE_SPAWN_EXTRA_DISTANCE
  );
}

/** Posicion del semaforo de una via: al costado del carril, justo antes de donde arranca la fila. */
export function laneStopLightPosition(lane) {
  const facing = LANE_FACING[lane];
  const lateral = LANE_LATERAL_OFFSET[lane];
  // Empujado hacia el borde de la calzada (como un poste junto a la acera), no en medio del carril.
  const sideOffset = { x: lateral.x * 1.9, z: lateral.z * 1.9 };
  return new THREE.Vector3(
    sideOffset.x - facing.x * TRAFFIC_POLE_DISTANCE,
    0,
    sideOffset.z - facing.z * TRAFFIC_POLE_DISTANCE
  );
}

export const PEDESTRIAN_CROSSINGS = {
  // Grupo "NS": cruza la calle N-S caminando sobre el eje X, ubicado al norte del cruce.
  NS: {
    axis: "x",
    fixed: -CROSSWALK_CENTER,
    from: -HALF_INTERSECTION * 0.92,
    to: HALF_INTERSECTION * 0.92,
  },
  // Grupo "EO": cruza la calle E-O caminando sobre el eje Z, ubicado al este del cruce.
  EO: {
    axis: "z",
    fixed: CROSSWALK_CENTER,
    from: -HALF_INTERSECTION * 0.92,
    to: HALF_INTERSECTION * 0.92,
  },
};

/** Posicion de un peaton cruzando, segun su progreso (0..1) y un pequeno offset para no pisarse. */
export function pedestrianCrossingPosition(group, progress, spread) {
  const cfg = PEDESTRIAN_CROSSINGS[group];
  const along = THREE.MathUtils.lerp(cfg.from, cfg.to, progress);
  if (cfg.axis === "x") {
    return new THREE.Vector3(along, 0, cfg.fixed + spread);
  }
  return new THREE.Vector3(cfg.fixed + spread, 0, along);
}

/** Posicion de un peaton esperando en la esquina correspondiente a su grupo (fuera de la cebra). */
export function pedestrianWaitingPosition(group, index) {
  const cfg = PEDESTRIAN_CROSSINGS[group];
  const spread = (index % 4) * 0.5;
  const corner = cfg.from - 1 - spread;
  if (cfg.axis === "x") {
    return new THREE.Vector3(corner, 0, cfg.fixed);
  }
  return new THREE.Vector3(cfg.fixed, 0, corner);
}
