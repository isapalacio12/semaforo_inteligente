import { useEffect, useRef, useState } from "react";
import { VEHICLE_DRIVE_SPEED, VEHICLE_MAX_EXIT_TRAVEL } from "./laneLayout.js";

// Cuanto tiempo real le puede tomar, en el peor caso, a un vehiculo cruzar y
// manejar hasta perderse por la punta del brazo opuesto a VEHICLE_DRIVE_SPEED
// -asi no se lo poda de la lista antes de que la animacion en Vehicle3D
// termine de recorrer todo ese trayecto-.
const EXIT_DURATION_MS = (VEHICLE_MAX_EXIT_TRAVEL / VEHICLE_DRIVE_SPEED) * 1000 + 300;

/**
 * Reconcilia la fila de vehiculos que manda el backend (por id) contra el
 * estado local: a los que ya no vienen en la lista (porque cruzaron) los deja
 * marcados como "exiting" durante EXIT_DURATION_MS para que el componente 3D
 * los siga manejando hacia adelante -por toda la calle de salida- en vez de
 * que se esfumen de golpe justo en la linea de pare. Se podan de la lista en
 * la primera reconciliacion (llega un tick del backend por segundo) despues
 * de que ese tiempo se cumple.
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
