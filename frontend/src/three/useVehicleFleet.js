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
 *
 * `onDepart(type)`, si se pasa, se llama una vez por cada vehiculo que recien
 * arranca a cruzar (para disparar el sonido de motor acelerando). Se calcula
 * fuera del updater de setEntries a proposito: los updaters de React deben
 * ser puros (sin efectos secundarios como reproducir audio).
 */
export function useVehicleFleet(queue, onDepart) {
  const [entries, setEntries] = useState(() => queue.map((v, index) => ({ ...v, index, exiting: false })));
  const prevIdsRef = useRef(queue.map((v) => v.id));
  const typeByIdRef = useRef(new Map(queue.map((v) => [v.id, v.type])));

  useEffect(() => {
    const newIds = queue.map((v) => v.id);
    const newIdSet = new Set(newIds);
    const now = Date.now();

    queue.forEach((v) => typeByIdRef.current.set(v.id, v.type));

    const departedIds = prevIdsRef.current.filter((id) => !newIdSet.has(id));

    if (onDepart) {
      departedIds.forEach((id) => {
        onDepart(typeByIdRef.current.get(id));
        typeByIdRef.current.delete(id);
      });
    }

    setEntries((current) => {
      const byId = new Map(current.map((e) => [e.id, e]));

      departedIds.forEach((id) => {
        const existing = byId.get(id);
        if (existing && !existing.exiting) {
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
  }, [queue, onDepart]);

  return entries;
}
