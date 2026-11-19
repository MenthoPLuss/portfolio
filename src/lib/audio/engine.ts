/**
 * Original adaptive score and interface sound, synthesised with the Web Audio API.
 * 74 BPM, four-bar cycle: Dm(add9) · Bbmaj7 · F6/9 · C(add9).
 * Buses: music (ground, pad, bells, air, pulse) · movement · ui · overview → master → limiter.
 * No samples and no network requests.
 */

export type Section = "top" | "about" | "work" | "case" | "skills" | "experience" | "education" | "contact";
export type Cue =
  | "enter"
  | "exit"
  | "confirm"
  | "caseOpen"
  | "caseClose"
  | "creditsOpen"
  | "creditsClose"
  | "overviewOpen"
  | "overviewClose";

const BPM = 74;
const BEAT = 60 / BPM;
const BAR = BEAT * 4;

const mtof = (m: number) => 440 * Math.pow(2, (m - 69) / 12);

const ROOTS = [38, 34, 41, 36]; // D2 Bb1 F2 C2
const VOICING_A = [
  [50, 57, 64, 65], // Dm(add9): D A E F
  [46, 53, 57, 62], // Bbmaj7: Bb F A D
  [53, 60, 62, 67], // F6/9: F C D G
  [48, 55, 62, 64], // C(add9): C G D E
];
const VOICING_B = [
  [57, 62, 64, 69],
  [58, 62, 65, 69],
  [57, 62, 65, 67],
  [55, 60, 62, 67],
];
const BELL_TONES = [
  [74, 76, 77, 81],
  [70, 74, 77, 81],
  [72, 74, 77, 79],
  [72, 74, 76, 79],
];
type Phrase = [number, number][][]; // per bar: [beat offset, tone index]
const PHRASES: Record<string, Phrase> = {
  hero: [[[1, 2]], [], [[0.5, 0], [2.5, 3]], [[1.5, 1]]],
  about: [[[0, 3], [2, 1]], [[1.5, 2]], [], [[0.5, 0], [3, 2]]],
  work: [[], [], [[2, 2]], []],
  quiet: [[], [[1, 1]], [], []],
  contact: [[[0, 0], [1.5, 2]], [[1, 3]], [[0, 2], [2.5, 1]], [[1.5, 0]]],
};

interface Mix {
  ground: number;
  pad: number;
  bells: number;
  air: number;
  pulse: number;
  padCut: number;
  voicing: "A" | "B";
  phrase: keyof typeof PHRASES;
}

const MIXES: Record<Section, Mix> = {
  top: { ground: 0.55, pad: 0.5, bells: 0.55, air: 0.22, pulse: 0, padCut: 1400, voicing: "A", phrase: "hero" },
  about: { ground: 0.5, pad: 0.55, bells: 0.45, air: 0.22, pulse: 0, padCut: 1600, voicing: "B", phrase: "about" },
  work: { ground: 0.48, pad: 0.4, bells: 0.12, air: 0.18, pulse: 0, padCut: 800, voicing: "A", phrase: "work" },
  case: { ground: 0.42, pad: 0.36, bells: 0.06, air: 0.14, pulse: 0, padCut: 650, voicing: "A", phrase: "work" },
  skills: { ground: 0.38, pad: 0.34, bells: 0.14, air: 0.14, pulse: 0, padCut: 900, voicing: "A", phrase: "quiet" },
  experience: { ground: 0.38, pad: 0.34, bells: 0.14, air: 0.14, pulse: 0, padCut: 900, voicing: "A", phrase: "quiet" },
  education: { ground: 0.38, pad: 0.34, bells: 0.14, air: 0.14, pulse: 0, padCut: 900, voicing: "A", phrase: "quiet" },
  contact: { ground: 0.45, pad: 0.45, bells: 0.5, air: 0.18, pulse: 0.4, padCut: 1300, voicing: "A", phrase: "contact" },
};

const XFADE_TAU = 0.35; // ≈1.05 s to 95 %
const MAX_SHORT_VOICES = 10;

export interface FrameInput {
  pointer: { nx: number; ny: number; speed: number; inside: boolean };
  scrollAbsV: number;
}

export class AudioEngine {
  readonly ctx: AudioContext;
  private master: GainNode;
  private music: GainNode;
  private movement: GainNode;
  private uiBus: GainNode;
  private overview: GainNode;
  private layers: Record<"ground" | "pad" | "bells" | "air" | "pulse", GainNode>;
  private padFilter: BiquadFilterNode;
  private airFilter: BiquadFilterNode;
  private airPan: StereoPannerNode;
  private moveEnv: GainNode;
  private swishFilter: BiquadFilterNode;
  private movePan: StereoPannerNode;
  private scrollGain: GainNode;
  private scrollFilter: BiquadFilterNode;
  private groundOsc: OscillatorNode[] = [];
  private humGain: GainNode;
  private noise: AudioBuffer;
  private crackle: AudioBuffer;
  private loops: AudioScheduledSourceNode[] = [];
  private nextBar = 0;
  private bar = 0;
  private section: Section = "top";
  private mix: Mix = MIXES.top;
  private shortVoices = 0;
  private lastTick = 0;
  private volume = 0.7;
  private enabled = false;
  private overviewPlaying = false;
  private overviewNextBar = 0;
  private overviewBar = 0;
  onAccent: (v: number) => void = () => {};

  constructor(ctx: AudioContext) {
    this.ctx = ctx;
    const c = ctx;
    this.master = c.createGain();
    this.master.gain.value = 0;
    const limiter = c.createDynamicsCompressor();
    limiter.threshold.value = -12;
    limiter.knee.value = 6;
    limiter.ratio.value = 12;
    limiter.attack.value = 0.003;
    limiter.release.value = 0.25;
    this.master.connect(limiter).connect(c.destination);

    this.music = this.bus(1);
    this.movement = this.bus(0.9);
    this.uiBus = this.bus(0.9);
    this.overview = this.bus(0);

    this.noise = this.makeNoise(2.5);
    this.crackle = this.makeCrackle(3);

    // music layers
    this.layers = {
      ground: this.layer(this.music),
      pad: this.layer(this.music),
      bells: this.layer(this.music),
      air: this.layer(this.music),
      pulse: this.layer(this.music),
    };
    this.padFilter = c.createBiquadFilter();
    this.padFilter.type = "lowpass";
    this.padFilter.frequency.value = 1400;
    this.padFilter.Q.value = 0.5;
    this.padFilter.connect(this.layers.pad);

    // bell space: soft feedback delay
    const delay = c.createDelay(2);
    delay.delayTime.value = BEAT * 0.75;
    const fb = c.createGain();
    fb.gain.value = 0.32;
    const dl = c.createBiquadFilter();
    dl.type = "lowpass";
    dl.frequency.value = 2200;
    this.bellSend = c.createGain();
    this.bellSend.gain.value = 0.35;
    this.bellSend.connect(delay);
    delay.connect(dl).connect(fb).connect(delay);
    dl.connect(this.layers.bells);

    // ground: sustained root + quiet hum tied to the mark's glow period
    const groundFilter = c.createBiquadFilter();
    groundFilter.type = "lowpass";
    groundFilter.frequency.value = 260;
    groundFilter.connect(this.layers.ground);
    const g1 = c.createOscillator();
    g1.type = "sine";
    const g2 = c.createOscillator();
    g2.type = "triangle";
    const g2g = c.createGain();
    g2g.gain.value = 0.18;
    const g1g = c.createGain();
    g1g.gain.value = 0.32;
    g1.connect(g1g).connect(groundFilter);
    g2.connect(g2g).connect(groundFilter);
    g1.frequency.value = mtof(ROOTS[0]);
    g2.frequency.value = mtof(ROOTS[0] + 12);
    this.groundOsc = [g1, g2];
    const hum = c.createOscillator();
    hum.type = "sine";
    hum.frequency.value = mtof(ROOTS[0] + 24);
    this.humGain = c.createGain();
    this.humGain.gain.value = 0.02;
    const lfo = c.createOscillator();
    lfo.frequency.value = 1 / 6.5; // same period as the visual glow breathing
    const lfoAmt = c.createGain();
    lfoAmt.gain.value = 0.015;
    lfo.connect(lfoAmt).connect(this.humGain.gain);
    hum.connect(this.humGain).connect(this.layers.ground);
    [g1, g2, hum, lfo].forEach((o) => {
      o.start();
      this.loops.push(o);
    });
    this.humOsc = hum;

    // air: filtered noise, pointer-panned, cutoff mapped to pointer height
    const air = this.loopNoise(this.noise);
    this.airFilter = c.createBiquadFilter();
    this.airFilter.type = "lowpass";
    this.airFilter.frequency.value = 800;
    this.airFilter.Q.value = 0.3;
    const airHP = c.createBiquadFilter();
    airHP.type = "highpass";
    airHP.frequency.value = 120;
    this.airPan = c.createStereoPanner();
    const airG = c.createGain();
    airG.gain.value = 0.08;
    air.connect(airHP).connect(this.airFilter).connect(this.airPan).connect(airG).connect(this.layers.air);

    // pointer movement: one envelope over a soft swish and a dry fabric-like rustle
    this.moveEnv = c.createGain();
    this.moveEnv.gain.value = 0;
    this.movePan = c.createStereoPanner();
    this.moveEnv.connect(this.movePan).connect(this.movement);
    const swish = this.loopNoise(this.noise, 0.7);
    this.swishFilter = c.createBiquadFilter();
    this.swishFilter.type = "bandpass";
    this.swishFilter.frequency.value = 1400;
    this.swishFilter.Q.value = 0.9;
    const swishG = c.createGain();
    swishG.gain.value = 0.055;
    swish.connect(this.swishFilter).connect(swishG).connect(this.moveEnv);
    const rustle = this.loopNoise(this.crackle);
    const rustleHP = c.createBiquadFilter();
    rustleHP.type = "highpass";
    rustleHP.frequency.value = 2400;
    const rustleLP = c.createBiquadFilter();
    rustleLP.type = "lowpass";
    rustleLP.frequency.value = 7000;
    const rustleG = c.createGain();
    rustleG.gain.value = 0.03;
    rustle.connect(rustleHP).connect(rustleLP).connect(rustleG).connect(this.moveEnv);

    // scroll: its own filtered air
    const scrollSrc = this.loopNoise(this.noise, 1.3);
    this.scrollFilter = c.createBiquadFilter();
    this.scrollFilter.type = "lowpass";
    this.scrollFilter.frequency.value = 200;
    this.scrollFilter.Q.value = 0.6;
    this.scrollGain = c.createGain();
    this.scrollGain.gain.value = 0;
    scrollSrc.connect(this.scrollFilter).connect(this.scrollGain).connect(this.movement);

    this.applyMix(true);
    this.nextBar = c.currentTime + 0.15;
  }

  private bellSend: GainNode;
  private humOsc: OscillatorNode;

  private bus(gain: number) {
    const g = this.ctx.createGain();
    g.gain.value = gain;
    g.connect(this.master);
    return g;
  }
  private layer(dest: AudioNode) {
    const g = this.ctx.createGain();
    g.gain.value = 0;
    g.connect(dest);
    return g;
  }
  private makeNoise(seconds: number) {
    const len = Math.floor(this.ctx.sampleRate * seconds);
    const buf = this.ctx.createBuffer(1, len, this.ctx.sampleRate);
    const d = buf.getChannelData(0);
    let b = 0;
    for (let i = 0; i < len; i++) {
      // gently pinked noise
      b = 0.97 * b + 0.03 * (Math.random() * 2 - 1);
      d[i] = (Math.random() * 2 - 1) * 0.55 + b * 2.2;
    }
    return buf;
  }
  /** Sparse, uneven micro-impulses: reads as dry cloth when high-passed. */
  private makeCrackle(seconds: number) {
    const len = Math.floor(this.ctx.sampleRate * seconds);
    const buf = this.ctx.createBuffer(1, len, this.ctx.sampleRate);
    const d = buf.getChannelData(0);
    let env = 0;
    for (let i = 0; i < len; i++) {
      if (Math.random() < 0.0016) env = 0.4 + Math.random() * 0.6;
      env *= 0.996;
      d[i] = (Math.random() * 2 - 1) * env;
    }
    return buf;
  }
  private loopNoise(buf: AudioBuffer, rate = 1) {
    const s = this.ctx.createBufferSource();
    s.buffer = buf;
    s.loop = true;
    s.playbackRate.value = rate;
    s.loopStart = Math.random() * 0.5;
    s.start();
    this.loops.push(s);
    return s;
  }

  /* ------------------------------------------------------------ state */

  setEnabled(on: boolean) {
    this.enabled = on;
    const t = this.ctx.currentTime;
    this.master.gain.cancelScheduledValues(t);
    this.master.gain.setValueAtTime(this.master.gain.value, t);
    this.master.gain.setTargetAtTime(on ? this.volume * 0.85 : 0, t, on ? 0.4 : 0.08);
    if (on) this.nextBar = Math.max(this.nextBar, t + 0.1);
  }

  setVolume(v: number) {
    this.volume = Math.min(1, Math.max(0, v));
    if (this.enabled) this.master.gain.setTargetAtTime(this.volume * 0.85, this.ctx.currentTime, 0.08);
  }

  /** Called after hysteresis by the bridge. Crossfades layers; never restarts the score. */
  setSection(s: Section) {
    if (s === this.section) return;
    this.section = s;
    this.mix = MIXES[s];
    this.applyMix(false);
  }

  private applyMix(immediate: boolean) {
    const t = this.ctx.currentTime;
    (Object.keys(this.layers) as (keyof typeof this.layers)[]).forEach((k) => {
      const p = this.layers[k].gain;
      if (immediate) p.value = this.mix[k];
      else p.setTargetAtTime(this.mix[k], t, XFADE_TAU);
    });
    this.padFilter.frequency.setTargetAtTime(this.mix.padCut, t, XFADE_TAU);
  }

  /* ------------------------------------------------------------ per frame */

  frame(input: FrameInput) {
    const c = this.ctx;
    if (c.state !== "running") return;
    const t = c.currentTime;
    // schedule score ahead
    if (this.nextBar < t - 0.2) this.nextBar = t + 0.1; // after resume: re-anchor, don't burst
    while (this.nextBar < t + 0.6) {
      this.scheduleBar(this.nextBar, this.bar);
      this.nextBar += BAR;
      this.bar++;
    }
    if (this.overviewPlaying) {
      if (this.overviewNextBar < t - 0.2) this.overviewNextBar = t + 0.05;
      while (this.overviewNextBar < t + 0.6) {
        this.scheduleOverviewBar(this.overviewNextBar, this.overviewBar);
        this.overviewNextBar += BAR;
        this.overviewBar++;
      }
    }

    // pointer → air pan + cutoff, movement envelope
    const { nx, ny, speed, inside } = input.pointer;
    const pan = (Math.min(1, Math.max(0, nx)) - 0.5) * 1.2;
    this.airPan.pan.setTargetAtTime(pan * 0.6, t, 0.15);
    this.movePan.pan.setTargetAtTime(pan, t, 0.05);
    const cutoff = 1200 * Math.pow(450 / 1200, Math.min(1, Math.max(0, ny))); // 1.2 kHz top → 450 Hz bottom
    this.airFilter.frequency.setTargetAtTime(cutoff, t, 0.2);
    const sp = inside ? Math.min(1, speed / 2200) : 0;
    const env = Math.pow(sp, 1.4) * 0.55;
    this.moveEnv.gain.setTargetAtTime(env, t, sp > 0.01 ? 0.05 : 0.12);
    this.swishFilter.frequency.setTargetAtTime(900 + sp * 2400, t, 0.06);

    // scroll → its own air, 200–600 Hz
    const s = Math.min(1, input.scrollAbsV / 3200);
    this.scrollFilter.frequency.setTargetAtTime(200 + s * 400, t, 0.08);
    this.scrollGain.gain.setTargetAtTime(Math.pow(s, 1.3) * 0.32, t, s > 0.02 ? 0.06 : 0.25);
  }

  /* ------------------------------------------------------------ score */

  private scheduleBar(t0: number, bar: number) {
    const ci = bar % 4;
    const g = this.groundOsc;
    g[0].frequency.setTargetAtTime(mtof(ROOTS[ci]), t0, 0.12);
    g[1].frequency.setTargetAtTime(mtof(ROOTS[ci] + 12), t0, 0.12);
    this.humOsc.frequency.setTargetAtTime(mtof(ROOTS[ci] + 24), t0, 0.3);

    const voicing = this.mix.voicing === "B" ? VOICING_B : VOICING_A;
    this.pad(voicing[ci], t0, BAR, this.padFilter, 0.05);

    if (this.mix.bells > 0.03) {
      const phrase = PHRASES[this.mix.phrase][ci];
      phrase.forEach(([beat, tone], i) => {
        const vel = 0.5 + 0.35 * ((bar + i) % 3 === 0 ? 1 : 0.6);
        this.bell(mtof(BELL_TONES[ci][tone]), t0 + beat * BEAT, this.layers.bells, vel, true);
      });
    }
    if (this.mix.pulse > 0.02) {
      [0, 2].forEach((b) => this.thump(t0 + b * BEAT, this.layers.pulse));
    }
  }

  private scheduleOverviewBar(t0: number, bar: number) {
    const ci = bar % 4;
    this.pad(VOICING_B[ci], t0, BAR, this.overview, 0.045);
    const tones = BELL_TONES[ci];
    [[0, 0], [1.5, 2], [3, 3]].forEach(([beat, tone]) => this.bell(mtof(tones[tone] + (bar % 2 ? 0 : 12)), t0 + beat * BEAT, this.overview, 0.45, false));
    this.thump(t0, this.overview, 0.5);
  }

  /** Soft detuned pad: ~1.2 s attack, ~2.4 s release. */
  private pad(notes: number[], t0: number, dur: number, dest: AudioNode, peak: number) {
    const c = this.ctx;
    const env = c.createGain();
    env.gain.setValueAtTime(0, t0);
    env.gain.linearRampToValueAtTime(peak, t0 + 1.2);
    env.gain.setValueAtTime(peak, t0 + dur);
    env.gain.setTargetAtTime(0, t0 + dur, 0.8);
    env.connect(dest);
    const stopAt = t0 + dur + 3.4;
    const per = 1 / (notes.length * 2);
    notes.forEach((n) => {
      [-7, 7].forEach((det) => {
        const o = c.createOscillator();
        o.type = "sawtooth";
        o.frequency.value = mtof(n);
        o.detune.value = det + (Math.random() - 0.5) * 3;
        const og = c.createGain();
        og.gain.value = per;
        o.connect(og).connect(env);
        o.start(t0);
        o.stop(stopAt);
        o.onended = () => og.disconnect();
      });
    });
    window.setTimeout(() => env.disconnect(), (stopAt - c.currentTime + 0.2) * 1000);
  }

  private bell(freq: number, t: number, dest: AudioNode, vel: number, accent: boolean) {
    if (this.shortVoices >= MAX_SHORT_VOICES) return;
    const c = this.ctx;
    this.shortVoices++;
    const out = c.createGain();
    out.gain.value = 0.06 * vel;
    out.connect(dest);
    if (dest === this.layers.bells) out.connect(this.bellSend);
    const partials: [number, number, number][] = [
      [1, 1, 2.4],
      [2.76, 0.32, 0.9],
      [5.4, 0.1, 0.35],
    ];
    let end = t;
    partials.forEach(([ratio, amp, decay]) => {
      const o = c.createOscillator();
      o.type = "sine";
      o.frequency.value = freq * ratio;
      const g = c.createGain();
      g.gain.setValueAtTime(0, t);
      g.gain.linearRampToValueAtTime(amp, t + 0.006);
      g.gain.setTargetAtTime(0, t + 0.006, decay / 3);
      o.connect(g).connect(out);
      o.start(t);
      o.stop(t + decay * 1.4);
      end = Math.max(end, t + decay * 1.4);
      o.onended = () => g.disconnect();
    });
    const ms = (end - c.currentTime + 0.1) * 1000;
    window.setTimeout(() => {
      out.disconnect();
      this.shortVoices = Math.max(0, this.shortVoices - 1);
    }, ms);
    if (accent) {
      const delayMs = Math.max(0, (t - c.currentTime) * 1000);
      window.setTimeout(() => this.onAccent(vel), delayMs);
    }
  }

  private thump(t: number, dest: AudioNode, level = 1) {
    if (this.shortVoices >= MAX_SHORT_VOICES) return;
    const c = this.ctx;
    this.shortVoices++;
    const o = c.createOscillator();
    o.type = "sine";
    o.frequency.setValueAtTime(92, t);
    o.frequency.exponentialRampToValueAtTime(48, t + 0.25);
    const g = c.createGain();
    g.gain.setValueAtTime(0, t);
    g.gain.linearRampToValueAtTime(0.16 * level, t + 0.02);
    g.gain.setTargetAtTime(0, t + 0.03, 0.12);
    o.connect(g).connect(dest);
    o.start(t);
    o.stop(t + 0.8);
    o.onended = () => {
      g.disconnect();
      this.shortVoices = Math.max(0, this.shortVoices - 1);
    };
  }

  /* ------------------------------------------------------------ interface cues */

  cue(kind: Cue) {
    if (!this.enabled || this.ctx.state !== "running") return;
    const now = this.ctx.currentTime;
    if (kind === "enter" || kind === "exit") {
      if (now - this.lastTick < 0.12) return; // cooldown
      this.lastTick = now;
    }
    const t = now + 0.005;
    switch (kind) {
      case "enter":
        return this.tone(2093, t, 0.06, 0.035, "sine", 2637);
      case "exit":
        return this.tone(1046, t, 0.09, 0.018, "sine", 880);
      case "confirm":
        this.tone(1318.5, t, 0.16, 0.05, "sine");
        return this.tone(1975.5, t + 0.09, 0.22, 0.045, "sine");
      case "caseOpen":
        return [587.3, 698.5, 880].forEach((f, i) => this.bell(f, t + i * 0.075, this.uiBus, 0.55, false));
      case "caseClose":
        return [880, 698.5, 587.3].forEach((f, i) => this.bell(f, t + i * 0.07, this.uiBus, 0.35, false));
      case "creditsOpen":
        return [523.3, 659.3].forEach((f, i) => this.bell(f, t + i * 0.08, this.uiBus, 0.4, false));
      case "creditsClose":
        return [659.3, 523.3].forEach((f, i) => this.bell(f, t + i * 0.08, this.uiBus, 0.3, false));
      case "overviewOpen":
        return [440, 587.3, 659.3, 880].forEach((f, i) => this.bell(f, t + i * 0.09, this.uiBus, 0.45, false));
      case "overviewClose":
        return [659.3, 440].forEach((f, i) => this.bell(f, t + i * 0.09, this.uiBus, 0.3, false));
    }
  }

  private tone(freq: number, t: number, dur: number, level: number, type: OscillatorType, glideTo?: number) {
    if (this.shortVoices >= MAX_SHORT_VOICES) return;
    const c = this.ctx;
    this.shortVoices++;
    const o = c.createOscillator();
    o.type = type;
    o.frequency.setValueAtTime(freq, t);
    if (glideTo) o.frequency.exponentialRampToValueAtTime(glideTo, t + dur);
    const g = c.createGain();
    g.gain.setValueAtTime(0, t);
    g.gain.linearRampToValueAtTime(level, t + 0.004);
    g.gain.setTargetAtTime(0, t + 0.006, dur / 3.5);
    o.connect(g).connect(this.uiBus);
    o.start(t);
    o.stop(t + dur * 1.6 + 0.05);
    o.onended = () => {
      g.disconnect();
      this.shortVoices = Math.max(0, this.shortVoices - 1);
    };
  }

  /* ------------------------------------------------------------ overview */

  overviewStart() {
    const t = this.ctx.currentTime;
    this.music.gain.cancelScheduledValues(t);
    this.music.gain.setValueAtTime(this.music.gain.value, t);
    this.music.gain.setTargetAtTime(0, t, 0.1); // ~300 ms fade
    this.movement.gain.setTargetAtTime(0.25, t, 0.1);
    this.overview.gain.cancelScheduledValues(t);
    this.overview.gain.setTargetAtTime(1, t, 0.1);
    this.overviewPlaying = true;
    this.overviewNextBar = t + 0.2;
    this.overviewBar = 0;
  }
  overviewPause(paused: boolean) {
    const t = this.ctx.currentTime;
    this.overviewPlaying = !paused;
    this.overview.gain.setTargetAtTime(paused ? 0 : 1, t, paused ? 0.06 : 0.15);
    if (!paused) this.overviewNextBar = t + 0.1;
  }
  overviewStop() {
    const t = this.ctx.currentTime;
    this.overviewPlaying = false;
    this.overview.gain.cancelScheduledValues(t);
    this.overview.gain.setTargetAtTime(0, t, 0.06);
    this.music.gain.setTargetAtTime(1, t, 0.25);
    this.movement.gain.setTargetAtTime(0.9, t, 0.25);
  }

  /* ------------------------------------------------------------ lifecycle */

  async suspendForHidden() {
    const t = this.ctx.currentTime;
    this.master.gain.setTargetAtTime(0, t, 0.06);
    await new Promise((r) => setTimeout(r, 260));
    if (document.hidden && this.ctx.state === "running") await this.ctx.suspend();
  }

  async resumeAfterVisible() {
    if (!this.enabled) return false;
    try {
      await this.ctx.resume();
    } catch {
      return false;
    }
    this.setEnabled(true);
    return this.ctx.state === "running";
  }

  /** Debug and test surface. */
  stats() {
    return {
      state: this.ctx.state,
      enabled: this.enabled,
      section: this.section,
      master: this.master.gain.value,
      music: this.music.gain.value,
      overview: this.overview.gain.value,
      shortVoices: this.shortVoices,
      move: this.moveEnv.gain.value,
      scroll: this.scrollGain.gain.value,
      airCutoff: this.airFilter.frequency.value,
      layers: Object.fromEntries(Object.entries(this.layers).map(([k, g]) => [k, +g.gain.value.toFixed(3)])),
    };
  }
}
