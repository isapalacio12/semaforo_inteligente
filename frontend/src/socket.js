import { io } from "socket.io-client";

// URL del backend. En desarrollo apunta directo a localhost:4000.
const BACKEND_URL = import.meta.env.VITE_BACKEND_URL || "http://localhost:4000";

export const socket = io(BACKEND_URL, {
  autoConnect: true,
});
