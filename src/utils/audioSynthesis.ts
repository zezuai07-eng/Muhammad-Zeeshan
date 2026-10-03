/**
 * Procedural 3D Audio Synthesis for Dragon Sound Effects
 * Generates spatialized wing-flap whoosh, roaring flame audio buffers,
 * and deep mythical dragon bellows using Web Audio API without requiring external MP3/WAV files.
 */

let sharedAudioContext: AudioContext | null = null;

export function getAudioContext(): AudioContext {
  if (!sharedAudioContext) {
    const AudioCtx = window.AudioContext || (window as unknown as { webkitAudioContext: typeof AudioContext }).webkitAudioContext;
    sharedAudioContext = new AudioCtx();
  }
  if (sharedAudioContext.state === 'suspended') {
    sharedAudioContext.resume().catch(() => {});
  }
  return sharedAudioContext;
}

export function createWingFlapAudioBuffer(context: AudioContext): AudioBuffer {
  const sampleRate = context.sampleRate;
  const duration = 0.55; // 550ms wing beat whoosh
  const buffer = context.createBuffer(1, Math.floor(sampleRate * duration), sampleRate);
  const data = buffer.getChannelData(0);

  let b0 = 0;
  let b1 = 0;
  let b2 = 0;

  for (let i = 0; i < data.length; i++) {
    const t = i / (sampleRate * duration);
    // Envelope: aerodynamic pulse
    const envelope = Math.sin(t * Math.PI) * Math.exp(-t * 2.2);

    // Low-pass filtered noise burst
    const white = Math.random() * 2 - 1;
    b0 = 0.94 * b0 + white * 0.06;
    b1 = 0.94 * b1 + b0 * 0.06;
    b2 = 0.94 * b2 + b1 * 0.06;

    // Sub-bass down-pitch thud (65Hz down to 28Hz)
    const subBass = Math.sin(2 * Math.PI * (65 - t * 37) * t) * 0.85;

    data[i] = (b2 * 2.4 + subBass) * envelope;
  }

  return buffer;
}

export function createFireBreathAudioBuffer(context: AudioContext): AudioBuffer {
  const sampleRate = context.sampleRate;
  const duration = 2.5; // 2.5s seamless looping flame roar
  const buffer = context.createBuffer(1, Math.floor(sampleRate * duration), sampleRate);
  const data = buffer.getChannelData(0);

  // Pink noise filter poles
  let b0 = 0, b1 = 0, b2 = 0, b3 = 0, b4 = 0, b5 = 0, b6 = 0;

  for (let i = 0; i < data.length; i++) {
    const white = Math.random() * 2 - 1;

    b0 = 0.99886 * b0 + white * 0.0555179;
    b1 = 0.99332 * b1 + white * 0.0750759;
    b2 = 0.96900 * b2 + white * 0.1538520;
    b3 = 0.86650 * b3 + white * 0.3104856;
    b4 = 0.55000 * b4 + white * 0.5329522;
    b5 = -0.7616 * b5 - white * 0.0168980;
    const pink = b0 + b1 + b2 + b3 + b4 + b5 + b6 + white * 0.5362;
    b6 = white * 0.115926;

    const t = i / sampleRate;
    // Roaring turbulent modulation (11Hz - 22Hz fluctuations)
    const turbulence = 0.7 + 0.25 * Math.sin(2 * Math.PI * 13 * t) + 0.18 * Math.sin(2 * Math.PI * 6.5 * t);

    // Random ember crackles
    const crackle = Math.random() > 0.9982 ? (Math.random() * 2 - 1) * 0.65 : 0;

    // Crossfade edges for seamless looping
    let edgeFade = 1.0;
    const edgeSamples = sampleRate * 0.05;
    if (i < edgeSamples) {
      edgeFade = i / edgeSamples;
    } else if (i > data.length - edgeSamples) {
      edgeFade = (data.length - i) / edgeSamples;
    }

    data[i] = (pink * 0.24 * turbulence + crackle) * edgeFade;
  }

  return buffer;
}

export function createDragonRoarAudioBuffer(context: AudioContext): AudioBuffer {
  const sampleRate = context.sampleRate;
  const duration = 1.8; // 1.8s deep mythical dragon roar
  const buffer = context.createBuffer(1, Math.floor(sampleRate * duration), sampleRate);
  const data = buffer.getChannelData(0);

  let b0 = 0, b1 = 0, b2 = 0;

  for (let i = 0; i < data.length; i++) {
    const t = i / (sampleRate * duration);
    // Dynamic roar envelope: swell then slow menacing taper
    const envelope = t < 0.25 ? Math.sin((t / 0.25) * (Math.PI / 2)) : Math.exp(-(t - 0.25) * 2.5);

    // Deep sub-pitch growl sweeping from 110Hz down to 55Hz
    const pitch = 110 - t * 55 + Math.sin(2 * Math.PI * 18 * t) * 12;
    const growl = Math.sin(2 * Math.PI * pitch * t);

    // Cavernous chest resonance & raspy noise
    const white = Math.random() * 2 - 1;
    b0 = 0.88 * b0 + white * 0.12;
    b1 = 0.88 * b1 + b0 * 0.12;
    b2 = 0.88 * b2 + b1 * 0.12;

    const distortion = Math.tanh((growl * 1.5 + b2 * 2.2) * 1.8);
    data[i] = distortion * envelope * 0.85;
  }

  return buffer;
}

export function playDragonRoar(volume = 0.85) {
  try {
    const ctx = getAudioContext();
    const buffer = createDragonRoarAudioBuffer(ctx);
    const source = ctx.createBufferSource();
    const gainNode = ctx.createGain();

    source.buffer = buffer;
    gainNode.gain.value = Math.max(0, Math.min(1, volume));

    source.connect(gainNode);
    gainNode.connect(ctx.destination);
    source.start();
  } catch (err) {
    console.warn('Dragon roar audio error:', err);
  }
}
