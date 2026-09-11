import { io } from "socket.io-client";

// URL del backend. En desarrollo (npm run dev) el frontend y el backend corren
// en puertos distintos, asi que por defecto apunta a localhost:4000. En
// produccion el backend sirve el frontend ya compilado desde el MISMO origen
// (mismo dominio y puerto), asi que ahi no hace falta indicar nada -socket.io
// se conecta automaticamente al origen actual (funciona con http/https y
// ws/wss segun corresponda)-.
const BACKEND_URL = import.meta.env.VITE_BACKEND_URL || (import.meta.env.DEV ? "http://localhost:4000" : undefined);

export const socket = io(BACKEND_URL, {
  autoConnect: true,
});
