// Motor de sonido ambiente de la ciudad.
//
// - La cama de fondo es la grabacion real de ambiente de ciudad que se nos
//   dio (public/sounds/city-ambience.mp3), en loop. Si por algun motivo no
//   carga (404, sin conexion, etc.), cae de respaldo a un ruido sintetizado
//   -para nunca quedarse sin sonido de fondo-.
// - Sonidos de motor acelerando, disparados por eventos REALES: cada vez que
//   un carro o moto arranca a cruzar el semaforo en la escena 3D.
// - Un tono suave cuando el semaforo cambia de eje.
//
// Los navegadores bloquean el audio hasta que hay una interaccion real del
// usuario (por eso todo arranca desde el boton de sonido, nunca solo).

const CITY_AMBIENCE_URL = "/sounds/city-ambience.mp3";

let ctx = null;
let masterGain = null;
let started = false;
let cityBufferPromise = null;

function ensureContext() {
  if (!ctx) {
    const AudioCtx = window.AudioContext || window.webkitAudioContext;
    ctx = new AudioCtx();
    masterGain = ctx.createGain();
    masterGain.gain.value = 0.5;
    masterGain.connect(ctx.destination);
  }
  return ctx;
}

export async function startCityAmbience() {
  // OJO: resume() debe llamarse de forma sincronica dentro del gesto del
  // usuario (el clic en el boton) para que el navegador permita el audio.
  // Lo que puede esperar (cargar y decodificar el mp3) va despues.
  const context = ensureContext();
  if (context.state === "suspended") context.resume();
  if (started) return;
  started = true;

  try {
    const buffer = await loadCityAmbienceBuffer(context);
    const citySource = context.createBufferSource();
    citySource.buffer = buffer;
    citySource.loop = true;

    const cityGain = context.createGain();
    cityGain.gain.value = 0.5;

    citySource.connect(cityGain).connect(masterGain);
    citySource.start();
  } catch (err) {
    console.warn("No se pudo cargar el sonido de ciudad real, usando el sintetizado:", err);
    startSyntheticTrafficHum(context);
  }
}

function loadCityAmbienceBuffer(context) {
  if (!cityBufferPromise) {
    cityBufferPromise = fetch(CITY_AMBIENCE_URL)
      .then((res) => {
        if (!res.ok) throw new Error(`No se encontro ${CITY_AMBIENCE_URL} (${res.status})`);
        return res.arrayBuffer();
      })
      .then((data) => context.decodeAudioData(data));
  }
  return cityBufferPromise;
}

// Ruido marron (ruido blanco integrado, mas grave y suave): unico respaldo si
// el archivo real de ambiente no se pudo cargar por algun motivo.
function createBrownNoiseBuffer(context, seconds) {
  const bufferSize = Math.floor(context.sampleRate * seconds);
  const buffer = context.createBuffer(1, bufferSize, context.sampleRate);
  const data = buffer.getChannelData(0);
  let lastOut = 0;
  for (let i = 0; i < bufferSize; i += 1) {
    const white = Math.random() * 2 - 1;
    lastOut = (lastOut + 0.02 * white) / 1.02;
    data[i] = lastOut * 3.5;
  }
  return buffer;
}

function startSyntheticTrafficHum(context) {
  const noiseSource = context.createBufferSource();
  noiseSource.buffer = createBrownNoiseBuffer(context, 4);
  noiseSource.loop = true;

  const highpass = context.createBiquadFilter();
  highpass.type = "highpass";
  highpass.frequency.value = 80;

  const lowpass = context.createBiquadFilter();
  lowpass.type = "lowpass";
  lowpass.frequency.value = 500;

  const ambienceGain = context.createGain();
  ambienceGain.gain.value = 0.18;

  noiseSource.connect(highpass).connect(lowpass).connect(ambienceGain).connect(masterGain);
  noiseSource.start();
}

export function setMuted(muted) {
  if (masterGain) {
    masterGain.gain.value = muted ? 0 : 0.5;
  }
}

// Para que no se amontonen muchos motores sonando encima si varios vehiculos
// cruzan casi al mismo tiempo (un carril descargando rapido).
let lastEngineSoundAt = 0;
const ENGINE_SOUND_MIN_GAP_MS = 280;

function canPlayEngineSound() {
  const now = performance.now();
  if (now - lastEngineSoundAt < ENGINE_SOUND_MIN_GAP_MS) return false;
  lastEngineSoundAt = now;
  return true;
}

/** Motor de carro acelerando: se dispara cuando un carro arranca a cruzar el semaforo. */
export function playCarAccelerate() {
  if (!ctx || !started || !canPlayEngineSound()) return;
  const now = ctx.currentTime;
  const duration = 0.9;

  const osc = ctx.createOscillator();
  osc.type = "sawtooth";
  osc.frequency.setValueAtTime(90, now);
  osc.frequency.exponentialRampToValueAtTime(220, now + duration);

  const filter = ctx.createBiquadFilter();
  filter.type = "lowpass";
  filter.frequency.setValueAtTime(400, now);
  filter.frequency.exponentialRampToValueAtTime(1200, now + duration);

  const gain = ctx.createGain();
  gain.gain.setValueAtTime(0, now);
  gain.gain.linearRampToValueAtTime(0.14, now + 0.08);
  gain.gain.linearRampToValueAtTime(0, now + duration);

  osc.connect(filter).connect(gain).connect(masterGain);
  osc.start(now);
  osc.stop(now + duration);
}

/** Motor de moto acelerando: mas agudo y corto que el de carro. */
export function playMotoAccelerate() {
  if (!ctx || !started || !canPlayEngineSound()) return;
  const now = ctx.currentTime;
  const duration = 0.6;

  const osc = ctx.createOscillator();
  osc.type = "square";
  osc.frequency.setValueAtTime(180, now);
  osc.frequency.exponentialRampToValueAtTime(560, now + duration);

  const filter = ctx.createBiquadFilter();
  filter.type = "bandpass";
  filter.frequency.setValueAtTime(600, now);
  filter.frequency.exponentialRampToValueAtTime(1800, now + duration);
  filter.Q.value = 3;

  const gain = ctx.createGain();
  gain.gain.setValueAtTime(0, now);
  gain.gain.linearRampToValueAtTime(0.1, now + 0.05);
  gain.gain.linearRampToValueAtTime(0, now + duration);

  osc.connect(filter).connect(gain).connect(masterGain);
  osc.start(now);
  osc.stop(now + duration);
}

/** Tono suave (dos notas) cuando el semaforo cambia de eje activo. */
export function playSignalChime() {
  if (!ctx || !started) return;
  const now = ctx.currentTime;
  const gain = ctx.createGain();
  gain.gain.setValueAtTime(0, now);
  gain.gain.linearRampToValueAtTime(0.12, now + 0.03);
  gain.gain.linearRampToValueAtTime(0, now + 0.5);
  gain.connect(masterGain);

  const osc = ctx.createOscillator();
  osc.type = "sine";
  osc.frequency.setValueAtTime(660, now);
  osc.frequency.setValueAtTime(880, now + 0.15);
  osc.connect(gain);
  osc.start(now);
  osc.stop(now + 0.5);
}
