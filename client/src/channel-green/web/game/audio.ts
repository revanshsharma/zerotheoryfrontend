import { mulberry32, type SoundscapeDef, type TapeDef } from '@channel-green/shared';

/**
 * All sound in Channel Green is synthesised in the browser from plain data (see packages/content/packs).
 * Nothing is sampled, nothing is downloaded, and nothing plays until a person turns sound on.
 */

const SCALES: Record<TapeDef['scale'], number[]> = {
  major: [0, 2, 4, 5, 7, 9, 11],
  minor: [0, 2, 3, 5, 7, 8, 10],
  dorian: [0, 2, 3, 5, 7, 9, 10],
  pentatonic: [0, 2, 4, 7, 9],
  lydian: [0, 2, 4, 6, 7, 9, 11],
};

export function scaleMidi(scale: TapeDef['scale'], root: number, degree: number): number {
  const s = SCALES[scale];
  const oct = Math.floor(degree / s.length);
  const idx = ((degree % s.length) + s.length) % s.length;
  return root + s[idx] + 12 * oct;
}
const hz = (midi: number) => 440 * Math.pow(2, (midi - 69) / 12);

export interface TapeNote {
  /** seconds from the start of the tape */
  t: number;
  dur: number;
  midi: number;
  voice: 'pad' | 'bass' | 'lead' | 'tick';
  vel: number;
}

/** Deterministic: the same tape and the same position always give the same notes, on every machine. */
export function tapeNotesForStep(tape: TapeDef, step: number): TapeNote[] {
  const beat = 60 / tape.bpm;
  const eighth = beat / 2;
  const stepsPerBar = 8;
  const totalSteps = tape.bars * stepsPerBar;
  const s = ((step % totalSteps) + totalSteps) % totalSteps;
  const bar = Math.floor(s / stepsPerBar);
  const inBar = s % stepsPerBar;
  const chordDeg = tape.progression[bar % tape.progression.length];
  const rng = mulberry32((tape.seed * 7919 + s * 104729) >>> 0);
  const out: TapeNote[] = [];
  const t = s * eighth;
  if (inBar === 0) {
    for (const off of [0, 2, 4]) out.push({ t, dur: beat * 4.2, midi: scaleMidi(tape.scale, tape.root, chordDeg + off), voice: 'pad', vel: 0.5 });
    out.push({ t, dur: beat * 1.8, midi: scaleMidi(tape.scale, tape.root - 12, chordDeg), voice: 'bass', vel: 0.8 });
  }
  if (inBar === 4 && rng() < 0.7) out.push({ t, dur: beat * 1.4, midi: scaleMidi(tape.scale, tape.root - 12, chordDeg + (rng() < 0.5 ? 4 : 0)), voice: 'bass', vel: 0.55 });
  // a slow melody that leans on chord tones
  const phraseRng = mulberry32((tape.seed * 31 + bar * 977 + inBar) >>> 0);
  const chance = inBar % 2 === 0 ? 0.55 : 0.22;
  if (phraseRng() < chance) {
    const tones = [0, 2, 4, 1, 3, 5, 7];
    const pick = tones[Math.floor(rng() * (inBar % 2 === 0 ? 3 : tones.length))];
    out.push({ t, dur: eighth * (1 + Math.floor(rng() * 3)), midi: scaleMidi(tape.scale, tape.root + 12, chordDeg + pick), voice: 'lead', vel: 0.35 + rng() * 0.25 });
  }
  if (inBar % 2 === 1) out.push({ t, dur: 0.03, midi: 0, voice: 'tick', vel: 0.12 + rng() * 0.06 });
  return out;
}

export function tapeLength(tape: TapeDef): number {
  return tape.bars * 8 * (60 / tape.bpm / 2);
}

type Stop = () => void;

export class AudioEngine {
  private ctx: AudioContext | null = null;
  private master: GainNode | null = null;
  private bed: GainNode | null = null;
  private tapeBus: GainNode | null = null;
  private stopScape: Stop | null = null;
  private stopTape: Stop | null = null;
  private scapeId: string | null = null;
  private pendingScape: SoundscapeDef | null = null;
  private noiseBuf: AudioBuffer | null = null;
  enabled = false;
  volume = 0.6;
  private listeners = new Set<() => void>();

  onChange(fn: () => void) {
    this.listeners.add(fn);
    return () => {
      this.listeners.delete(fn);
    };
  }
  private emit() {
    this.listeners.forEach((f) => f());
  }

  /** Must be called from a click or key press. Sound stays off until then. */
  enable() {
    if (this.enabled) return;
    const AC = window.AudioContext || (window as unknown as { webkitAudioContext: typeof AudioContext }).webkitAudioContext;
    if (!AC) return;
    this.ctx = this.ctx ?? new AC();
    void this.ctx.resume();
    if (!this.master) {
      this.master = this.ctx.createGain();
      this.master.gain.value = this.volume;
      this.master.connect(this.ctx.destination);
      this.bed = this.ctx.createGain();
      this.bed.gain.value = 1;
      this.bed.connect(this.master);
      this.tapeBus = this.ctx.createGain();
      this.tapeBus.gain.value = 1;
      this.tapeBus.connect(this.master);
    }
    this.enabled = true;
    if (this.pendingScape) this.setSoundscape(this.pendingScape);
    this.emit();
  }

  disable() {
    this.enabled = false;
    this.stopScape?.();
    this.stopScape = null;
    this.scapeId = null;
    this.stopTape?.();
    this.stopTape = null;
    void this.ctx?.suspend();
    this.emit();
  }

  toggle() {
    if (this.enabled) this.disable();
    else this.enable();
  }

  setVolume(v: number) {
    this.volume = Math.min(1, Math.max(0, v));
    if (this.master && this.ctx) this.master.gain.setTargetAtTime(this.volume, this.ctx.currentTime, 0.05);
  }

  private noise(): AudioBuffer {
    const ctx = this.ctx as AudioContext;
    if (this.noiseBuf) return this.noiseBuf;
    const len = ctx.sampleRate * 3;
    const b = ctx.createBuffer(1, len, ctx.sampleRate);
    const d = b.getChannelData(0);
    let last = 0;
    for (let i = 0; i < len; i++) {
      const w = Math.random() * 2 - 1;
      last = (last + 0.02 * w) / 1.02; // brown-ish noise
      d[i] = last * 3.5;
    }
    this.noiseBuf = b;
    return b;
  }

  /** Remember the room's soundscape; it starts when sound is enabled. */
  setSoundscape(def: SoundscapeDef | null) {
    this.pendingScape = def;
    if (!this.enabled || !this.ctx || !this.bed) return;
    if ((def?.id ?? null) === this.scapeId) return;
    const ctx = this.ctx;
    const old = this.stopScape;
    this.stopScape = null;
    this.scapeId = def?.id ?? null;
    old?.();
    if (!def) return;
    const out = ctx.createGain();
    out.gain.value = 0;
    out.gain.setTargetAtTime(1, ctx.currentTime, 1.2);
    out.connect(this.bed);
    const stops: Stop[] = [];
    for (const layer of def.layers) stops.push(this.layer(layer, out));
    this.stopScape = () => {
      out.gain.setTargetAtTime(0, ctx.currentTime, 0.4);
      setTimeout(() => {
        stops.forEach((s) => s());
        out.disconnect();
      }, 1800);
    };
  }

  private layer(l: SoundscapeDef['layers'][number], dest: AudioNode): Stop {
    const ctx = this.ctx as AudioContext;
    const g = ctx.createGain();
    g.gain.value = l.gain * 0.6;
    g.connect(dest);
    const nodes: (AudioScheduledSourceNode | { stop(): void })[] = [];
    const timers: ReturnType<typeof setInterval>[] = [];
    const stopAll = () => {
      timers.forEach(clearInterval);
      nodes.forEach((n) => {
        try {
          n.stop();
        } catch {
          /* already stopped */
        }
      });
      g.disconnect();
    };
    const noiseSrc = (type: BiquadFilterType, freq: number, q: number) => {
      const src = ctx.createBufferSource();
      src.buffer = this.noise();
      src.loop = true;
      const f = ctx.createBiquadFilter();
      f.type = type;
      f.frequency.value = freq;
      f.Q.value = q;
      src.connect(f).connect(g);
      src.start();
      nodes.push(src);
      return f;
    };
    switch (l.type) {
      case 'noise': {
        noiseSrc('lowpass', l.freq ?? 500, l.q ?? 0.7);
        break;
      }
      case 'rain': {
        noiseSrc('highpass', l.freq ?? 1500, 0.5);
        const f2 = noiseSrc('bandpass', 3200, 0.8);
        const lfo = ctx.createOscillator();
        const lg = ctx.createGain();
        lfo.frequency.value = 0.13;
        lg.gain.value = 500;
        lfo.connect(lg).connect(f2.frequency);
        lfo.start();
        nodes.push(lfo);
        break;
      }
      case 'hum': {
        const o = ctx.createOscillator();
        o.type = 'sawtooth';
        o.frequency.value = l.freq ?? 55;
        const f = ctx.createBiquadFilter();
        f.type = 'lowpass';
        f.frequency.value = 180;
        o.connect(f).connect(g);
        o.start();
        nodes.push(o);
        break;
      }
      case 'drone': {
        for (const fr of l.freqs ?? [l.freq ?? 110]) {
          const o = ctx.createOscillator();
          o.type = 'sine';
          o.frequency.value = fr;
          o.detune.value = (Math.random() - 0.5) * 8;
          const og = ctx.createGain();
          og.gain.value = 1 / Math.max(1, (l.freqs ?? [1]).length);
          o.connect(og).connect(g);
          o.start();
          nodes.push(o);
        }
        break;
      }
      case 'crickets': {
        const rate = l.rate ?? 2;
        timers.push(
          setInterval(() => {
            if (Math.random() > 0.55) return;
            const t0 = ctx.currentTime;
            const base = 4200 + Math.random() * 600;
            for (let i = 0; i < 3; i++) {
              const o = ctx.createOscillator();
              const eg = ctx.createGain();
              o.frequency.value = base;
              eg.gain.setValueAtTime(0, t0 + i * 0.07);
              eg.gain.linearRampToValueAtTime(0.1, t0 + i * 0.07 + 0.01);
              eg.gain.linearRampToValueAtTime(0, t0 + i * 0.07 + 0.05);
              o.connect(eg).connect(g);
              o.start(t0 + i * 0.07);
              o.stop(t0 + i * 0.07 + 0.08);
            }
          }, 1000 / rate),
        );
        break;
      }
      case 'chimes': {
        const freqs = l.freqs ?? [523, 659, 784];
        const rate = l.rate ?? 0.15;
        timers.push(
          setInterval(() => {
            if (Math.random() > rate * 3) return;
            const o = ctx.createOscillator();
            const eg = ctx.createGain();
            const t0 = ctx.currentTime;
            o.type = 'sine';
            o.frequency.value = freqs[Math.floor(Math.random() * freqs.length)];
            eg.gain.setValueAtTime(0, t0);
            eg.gain.linearRampToValueAtTime(0.4, t0 + 0.02);
            eg.gain.exponentialRampToValueAtTime(0.001, t0 + 3);
            o.connect(eg).connect(g);
            o.start(t0);
            o.stop(t0 + 3.2);
          }, 1000),
        );
        break;
      }
    }
    return stopAll;
  }

  /** Plays a generated tape. `startAt` is seconds into the tape; `getPos` lets the caller re-sync later. */
  playTape(tape: TapeDef, startAt: number): void {
    this.stopTape?.();
    this.stopTape = null;
    if (!this.enabled || !this.ctx || !this.tapeBus) return;
    const ctx = this.ctx;
    const bus = this.tapeBus;
    // the room bed ducks while a tape plays so the music is the foreground
    this.bed?.gain.setTargetAtTime(0.25, ctx.currentTime, 0.5);
    const eighth = 60 / tape.bpm / 2;
    const total = tapeLength(tape);
    const startCtx = ctx.currentTime + 0.1;
    const tr = ctx.createBiquadFilter();
    tr.type = 'lowpass';
    tr.frequency.value = 2400;
    const out = ctx.createGain();
    out.gain.value = 0;
    out.gain.setTargetAtTime(0.7, ctx.currentTime, 0.4);
    tr.connect(out).connect(bus);
    // soft tape hiss
    const hiss = ctx.createBufferSource();
    hiss.buffer = this.noise();
    hiss.loop = true;
    const hf = ctx.createBiquadFilter();
    hf.type = 'highpass';
    hf.frequency.value = 5000;
    const hg = ctx.createGain();
    hg.gain.value = 0.012;
    hiss.connect(hf).connect(hg).connect(out);
    hiss.start();

    let nextStep = Math.ceil((startAt % total) / eighth - 1e-6);
    const origin = startAt - 0; // track-time at startCtx
    const lookahead = 0.6;
    const schedule = () => {
      const trackNow = origin + (ctx.currentTime - startCtx);
      const horizon = trackNow + lookahead;
      while (nextStep * eighth < horizon) {
        const notes = tapeNotesForStep(tape, nextStep);
        const base = startCtx + (nextStep * eighth - origin);
        for (const n of notes) this.voice(tr, n, Math.max(base + (n.t - (nextStep % (tape.bars * 8)) * eighth), ctx.currentTime));
        nextStep++;
      }
    };
    schedule();
    const timer = setInterval(schedule, 150);
    this.stopTape = () => {
      clearInterval(timer);
      out.gain.setTargetAtTime(0, ctx.currentTime, 0.15);
      setTimeout(() => {
        try {
          hiss.stop();
        } catch {
          /* ignore */
        }
        out.disconnect();
        tr.disconnect();
      }, 700);
      this.bed?.gain.setTargetAtTime(1, ctx.currentTime, 0.8);
    };
  }

  stopTapePlayback() {
    this.stopTape?.();
    this.stopTape = null;
  }

  private voice(dest: AudioNode, n: TapeNote, when: number) {
    const ctx = this.ctx as AudioContext;
    if (n.voice === 'tick') {
      const s = ctx.createBufferSource();
      s.buffer = this.noise();
      const f = ctx.createBiquadFilter();
      f.type = 'highpass';
      f.frequency.value = 6000;
      const g = ctx.createGain();
      g.gain.setValueAtTime(n.vel, when);
      g.gain.exponentialRampToValueAtTime(0.001, when + 0.04);
      s.connect(f).connect(g).connect(dest);
      s.start(when, Math.random());
      s.stop(when + 0.06);
      return;
    }
    const o = ctx.createOscillator();
    const g = ctx.createGain();
    const type: OscillatorType = n.voice === 'bass' ? 'sine' : n.voice === 'pad' ? 'triangle' : 'sine';
    o.type = type;
    o.frequency.value = hz(n.midi);
    o.detune.value = n.voice === 'pad' ? (Math.random() - 0.5) * 12 : 0;
    const peak = n.vel * (n.voice === 'pad' ? 0.1 : n.voice === 'bass' ? 0.22 : 0.16);
    const attack = n.voice === 'pad' ? 0.4 : 0.02;
    g.gain.setValueAtTime(0.0001, when);
    g.gain.linearRampToValueAtTime(peak, when + attack);
    g.gain.exponentialRampToValueAtTime(0.0001, when + Math.max(n.dur, attack + 0.1));
    o.connect(g).connect(dest);
    o.start(when);
    o.stop(when + n.dur + 0.1);
  }

  /** Small UI sounds. Silent unless sound is on. */
  blip(kind: 'door' | 'message' | 'wave' | 'heart' = 'message') {
    if (!this.enabled || !this.ctx || !this.master) return;
    const ctx = this.ctx;
    const t0 = ctx.currentTime;
    const notes = kind === 'door' ? [392, 523] : kind === 'wave' ? [523, 659, 784] : kind === 'heart' ? [659, 880] : [784];
    notes.forEach((f, i) => {
      const o = ctx.createOscillator();
      const g = ctx.createGain();
      o.type = 'triangle';
      o.frequency.value = f;
      g.gain.setValueAtTime(0.0001, t0 + i * 0.08);
      g.gain.linearRampToValueAtTime(0.12, t0 + i * 0.08 + 0.01);
      g.gain.exponentialRampToValueAtTime(0.0001, t0 + i * 0.08 + 0.25);
      o.connect(g).connect(this.master as GainNode);
      o.start(t0 + i * 0.08);
      o.stop(t0 + i * 0.08 + 0.3);
    });
  }
}

let shared: AudioEngine | null = null;
export function audio(): AudioEngine {
  if (!shared) shared = new AudioEngine();
  return shared;
}
