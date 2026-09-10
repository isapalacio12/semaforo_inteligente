import { useEffect, useRef, useState } from "react";
import { VEHICLE_DRIVE_SPEED, VEHICLE_EXIT_TRAVEL_DISTANCE } from "./laneLayout.js";

// Cuanto tiempo real le toma a un vehiculo cruzar y perderse del otro lado a
// VEHICLE_DRIVE_SPEED, mas un margen -asi no se lo poda de la lista antes de
// que la animacion en Vehicle3D termine de moverlo-.
const EXIT_DURATION_MS = (VEHICLE_EXIT_TRAVEL_DISTANCE / VEHICLE_DRIVE_SPEED) * 1000 + 300;

/**
 * Reconcilia la fila de vehiculos que manda el backend (por id) contra el
 * estado local: a los que ya no vienen en la lista (porque cruzaron) los deja
 * un rato mas marcados como "exiting" para que el componente 3D los siga
 * moviendo hacia adelante antes de desaparecer, en vez de que se esfumen de
 * golpe justo en la linea de pare. Se limpian en la siguiente reconciliacion
 * (el backend manda un tick por segundo, bastante mas que EXIT_DURATION_MS).
 */
export function useVehicleFleet(queue) {
  const [entries, setEntries] = useState(() => queue.map((v, index) => ({ ...v, index, exiting: false })));
  const prevIdsRef = useRef(queue.map((v) => v.id));

  useEffect(() => {
    const newIds = queue.map((v) => v.id);
    const newIdSet = new Set(newIds);
    const now = Date.now();

    setEntries((current) => {
      const byId = new Map(current.map((e) => [e.id, e]));

      prevIdsRef.current.forEach((id) => {
        const existing = byId.get(id);
        if (existing && !newIdSet.has(id) && !existing.exiting) {
          byId.set(id, { ...existing, exiting: true, exitStartedAt: now });
        }
      });

      queue.forEach((v, index) => {
        byId.set(v.id, { ...v, index, exiting: false });
      });

      return Array.from(byId.values()).filter(
        (e) => !e.exiting || now - e.exitStartedAt < EXIT_DURATION_MS
      );
    });

    prevIdsRef.current = newIds;
  }, [queue]);

  return entries;
}
