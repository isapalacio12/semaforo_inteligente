// Sonido ambiente de la ciudad: unicamente la grabacion real que se
// proporciono (public/sounds/city-ambience.mp3), en loop. Nada sintetizado.
//
// Los navegadores bloquean el audio hasta que hay una interaccion real del
// usuario (por eso arranca desde el boton de sonido, nunca solo).

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
    masterGain.gain.value = 0.7;
    masterGain.connect(ctx.destination);
  }
  return ctx;
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
    citySource.connect(masterGain);
    citySource.start();
  } catch (err) {
    console.error("No se pudo cargar el sonido de ciudad:", err);
  }
}

export function setMuted(muted) {
  if (masterGain) {
    masterGain.gain.value = muted ? 0 : 0.7;
  }
}
