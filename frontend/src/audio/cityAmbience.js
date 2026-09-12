// Motor de sonido ambiente de la ciudad, sintetizado con Web Audio API (sin
// archivos de audio externos: nada que descargar, licenciar ni alojar).
//
// - Un "ruido marron" filtrado en graves simula el murmullo de trafico lejano.
// - Ese mismo ruido, filtrado en las frecuencias de la voz humana, simula
//   gente conversando a lo lejos (una "cama" de murmullo, no palabras).
// - Bocinazos aleatorios, mas frecuentes mientras mas congestionada esta la
//   via que se esta viendo (asi el oido tambien nota la diferencia entre el
//   semaforo adaptativo y el de tiempo fijo).
// - Sonidos de motor acelerando, disparados por eventos REALES: cada vez que
//   un carro o moto arranca a cruzar el semaforo en la escena 3D.
// - Un tono suave cuando el semaforo cambia de eje.
//
// Los navegadores bloquean el audio hasta que hay una interaccion real del
// usuario (por eso todo arranca desde el boton de sonido, nunca solo).

let ctx = null;
let masterGain = null;
let started = false;
let honkTimer = null;
let congestionLevel = 0; // 0..1

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

// Ruido marron: ruido blanco integrado, suena mas grave/suave que el ruido
// blanco puro -mucho mas parecido a un murmullo de trafico que a "estatica"-.
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

export function startCityAmbience() {
  const context = ensureContext();
  if (context.state === "suspended") context.resume();
  if (started) return;
  started = true;

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

  startCrowdMurmur(context);
  scheduleHonks();
}

// Murmullo de gente: el mismo tipo de ruido de fondo, pero pasado por dos
// filtros "de campana" centrados en frecuencias tipicas de la voz (no forma
// palabras, es una cama de fondo, como se oiria una plaza desde lejos), con
// un LFO lento que la hace subir y bajar de volumen -asi no suena plana-.
function startCrowdMurmur(context) {
  const source = context.createBufferSource();
  source.buffer = createBrownNoiseBuffer(context, 5);
  source.loop = true;

  const voiceBandLow = context.createBiquadFilter();
  voiceBandLow.type = "bandpass";
  voiceBandLow.frequency.value = 450;
  voiceBandLow.Q.value = 1.1;

  const voiceBandHigh = context.createBiquadFilter();
  voiceBandHigh.type = "bandpass";
  voiceBandHigh.frequency.value = 1400;
  voiceBandHigh.Q.value = 1.4;

  const crowdGain = context.createGain();
  crowdGain.gain.value = 0.05;

  const lfo = context.createOscillator();
  lfo.type = "sine";
  lfo.frequency.value = 0.35;
  const lfoGain = context.createGain();
  lfoGain.gain.value = 0.02;
  lfo.connect(lfoGain).connect(crowdGain.gain);
  lfo.start();

  source.connect(voiceBandLow).connect(crowdGain);
  source.connect(voiceBandHigh).connect(crowdGain);
  crowdGain.connect(masterGain);
  source.start();
}

export function setMuted(muted) {
  if (masterGain) {
    masterGain.gain.value = muted ? 0 : 0.5;
  }
}

export function setCongestionLevel(level) {
  congestionLevel = Math.max(0, Math.min(1, level));
}

function playHonk() {
  if (!ctx) return;
  const now = ctx.currentTime;
  const gain = ctx.createGain();
  gain.gain.setValueAtTime(0, now);
  gain.gain.linearRampToValueAtTime(0.22, now + 0.02);
  gain.gain.linearRampToValueAtTime(0, now + 0.32);
  gain.connect(masterGain);

  [415, 500].forEach((freq) => {
    const osc = ctx.createOscillator();
    osc.type = "sawtooth";
    osc.frequency.value = freq;
    osc.connect(gain);
    osc.start(now);
    osc.stop(now + 0.32);
  });
}

function scheduleHonks() {
  const nextDelayMs = () => 9000 - congestionLevel * 7000 + Math.random() * 4000;

  const tick = () => {
    if (started && Math.random() < 0.3 + congestionLevel * 0.5) {
      playHonk();
    }
    honkTimer = setTimeout(tick, nextDelayMs());
  };

  honkTimer = setTimeout(tick, nextDelayMs());
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
