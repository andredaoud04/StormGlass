/**
 * Music, synthesized live with Web Audio from small note patterns (no audio files): a calm menu
 * theme, a battle theme for each Age, and a faster, lower boss variant. Original compositions.
 * A step sequencer schedules a little ahead of the audio clock; each track is an 8-bar loop.
 */

type Wave = OscillatorType;

interface Track {
  bpm: number;
  /** MIDI note of the scale root. */
  root: number;
  /** Scale as semitone offsets (one octave). */
  scale: number[];
  /** Chord root per bar, as a scale degree (8 bars). */
  chords: number[];
  /**
   * Lead line, 8 bars of 8 eighth-notes: a digit or letter is a scale degree (0-9, a-e = 10-14),
   * '.' a rest, '-' holds the note before it.
   */
  lead: string[];
  /** Bass rhythm per bar (8 eighths): 'x' root, 'o' octave up, '5' the fifth, '.' rest. */
  bass: string;
  /** Drum rows per bar (16 sixteenths): kick, snare, hat. */
  kick: string;
  snare: string;
  hat: string;
  leadWave: Wave;
  bassWave: Wave;
  /** Arpeggio on sixteenths through the bar's chord (thin, high), or none. */
  arp?: boolean;
  vol?: number;
}

const MINOR = [0, 2, 3, 5, 7, 8, 10];
const DORIAN = [0, 2, 3, 5, 7, 9, 10];
const MAJOR = [0, 2, 4, 5, 7, 9, 11];
const PENT_MIN = [0, 3, 5, 7, 10];
const PENT_MAJ = [0, 2, 4, 7, 9];
const PHRYG_DOM = [0, 1, 4, 5, 7, 8, 10];

const TRACKS: Record<string, Track> = {
  // Home: warm and unhurried.
  menu: {
    bpm: 84, root: 60, scale: PENT_MAJ, chords: [0, 0, 3, 3, 2, 2, 4, 0],
    lead: ['4-..5-4.', '2-----..', '5-..6-5.', '4-----..', '7-..6-5.', '4-2-4-..', '5-4-2-1.', '2-----..'],
    bass: 'x...5...', kick: 'x.......x.......', snare: '................', hat: '....x.......x...',
    leadWave: 'triangle', bassWave: 'sine', arp: true, vol: 0.8,
  },
  // Stone: drums first, a bare pentatonic call.
  stone: {
    bpm: 100, root: 57, scale: PENT_MIN, chords: [0, 0, 3, 0, 0, 0, 2, 0],
    lead: ['5...5.7.', '5.3.....', '5...5.7.', '8.7.5...', '7...7.8.', '7.5.....', '5.7.8.a.', '8.7.5...'],
    bass: 'x..x..x.', kick: 'x..x..x.x..x..x.', snare: '....x.......x.x.', hat: '..x...x...x...x.',
    leadWave: 'triangle', bassWave: 'triangle',
  },
  // Ancient: a hot, ornamented line over a slow pulse.
  ancient: {
    bpm: 104, root: 62, scale: PHRYG_DOM, chords: [0, 0, 1, 0, 3, 3, 1, 0],
    lead: ['7-8-9-8.', '7-5-4-..', '8-9-8-7.', '5-4-5-..', 'a-9-8-7.', '8-7-5-4.', '5-7-8-7.', '7-----..'],
    bass: 'x.x.5.x.', kick: 'x.......x..x....', snare: '....x.......x...', hat: 'x.x.x.x.x.x.x.x.',
    leadWave: 'square', bassWave: 'triangle',
  },
  // Crusader: a dorian march.
  crusader: {
    bpm: 108, root: 57, scale: DORIAN, chords: [0, 0, 3, 4, 0, 5, 3, 4],
    lead: ['7.7.9-7.', '8-7-5-..', 'a.a.9-8.', '9-----..', '7.7.9-b.', 'c-b-9-..', 'a-9-8-7.', '8-9-7-..'],
    bass: 'x.x.x.5.', kick: 'x...x...x...x...', snare: '....x.......x.xx', hat: '..x...x...x...x.',
    leadWave: 'square', bassWave: 'triangle',
  },
  // Gunpowder: bright, a snare-led parade.
  gunpowder: {
    bpm: 112, root: 60, scale: MAJOR, chords: [0, 3, 4, 0, 5, 3, 4, 0],
    lead: ['7.9.b-9.', 'a-9-7-..', 'b.9.7-8.', '9-----..', 'c.b.9-b.', 'a-9-7-9.', '8-7-8-9.', '7-----..'],
    bass: 'x.5.x.5.', kick: 'x.......x.......', snare: '..x.x.xx..x.x.xx', hat: 'x...x...x...x...',
    leadWave: 'square', bassWave: 'triangle',
  },
  // Industrial: grinding minor, a driving low end.
  industrial: {
    bpm: 118, root: 52, scale: MINOR, chords: [0, 0, 5, 4, 0, 0, 3, 4],
    lead: ['7...7.9.', '8.7.....', '7...7.9.', 'b.9.8.7.', '9...9.b.', 'a.9.....', '8.9.b.c.', 'b.9.8...'],
    bass: 'xxoxxxox', kick: 'x...x...x...x...', snare: '....x.......x...', hat: 'x.xxx.xxx.xxx.xx',
    leadWave: 'sawtooth', bassWave: 'sawtooth', vol: 0.85,
  },
  // Future: clean arpeggios over a four-on-the-floor.
  future: {
    bpm: 124, root: 57, scale: MINOR, chords: [0, 5, 3, 4, 0, 5, 6, 4],
    lead: ['b-9-7-..', 'c-b-9-..', 'a-9-7-9.', 'b-----..', 'e-c-b-..', 'c-b-9-7.', '8-9-b-c.', 'b-----..'],
    bass: 'x.o.x.o.', kick: 'x...x...x...x...', snare: '....x.......x...', hat: '..x...x...x...x.',
    leadWave: 'square', bassWave: 'sawtooth', arp: true, vol: 0.85,
  },
};

export class Music {
  private ctx: AudioContext | null = null;
  private out: GainNode | null = null;
  private noise: AudioBuffer | null = null;
  private track: Track | null = null;
  private id = '';
  private step = 0;
  private nextTime = 0;
  /** Pitch shift in semitones and tempo multiplier (boss fights play lower and faster). */
  private shift = 0;
  private tempo = 1;
  private _enabled = true;
  volume = 0.2;

  attach(ctx: AudioContext, destination: AudioNode): void {
    this.ctx = ctx;
    this.out = ctx.createGain();
    this.out.gain.value = this._enabled ? this.volume : 0;
    this.out.connect(destination);
    const n = ctx.createBuffer(1, ctx.sampleRate, ctx.sampleRate);
    const d = n.getChannelData(0);
    let seed = 1234567;
    for (let i = 0; i < d.length; i++) {
      seed = (seed * 1103515245 + 12345) & 0x7fffffff;
      d[i] = (seed / 0x3fffffff) - 1;
    }
    this.noise = n;
  }

  get enabled(): boolean {
    return this._enabled;
  }
  set enabled(v: boolean) {
    this._enabled = v;
    if (this.out && this.ctx) this.out.gain.setTargetAtTime(v ? this.volume : 0, this.ctx.currentTime, 0.08);
  }

  /** Switch track (no-op if it is already playing). `boss` plays it lower and faster. */
  play(id: string, boss = false): void {
    const key = id + (boss ? '!' : '');
    if (key === this.id) return;
    const t = TRACKS[id] ?? TRACKS.menu;
    this.id = key;
    this.track = t;
    this.shift = boss ? -3 : 0;
    this.tempo = boss ? 1.14 : 1;
    this.step = 0;
    this.nextTime = this.ctx ? this.ctx.currentTime + 0.12 : 0;
  }

  stop(): void {
    this.id = '';
    this.track = null;
  }

  /** Schedule `seconds` of music at once (offline rendering in tests). */
  prime(seconds: number): void {
    const t = this.track;
    if (!this.ctx || !t) return;
    const sixteenth = 60 / (t.bpm * this.tempo) / 4;
    this.nextTime = 0.05;
    this.step = 0;
    while (this.nextTime < seconds) {
      this.schedule(t, this.step, this.nextTime, sixteenth);
      this.step = (this.step + 1) % (8 * 16);
      this.nextTime += sixteenth;
    }
  }

  /** Call every frame: schedules the notes that fall inside the next quarter second. */
  update(): void {
    const ctx = this.ctx;
    const t = this.track;
    if (!ctx || !t || !this.out || ctx.state !== 'running') return;
    const sixteenth = 60 / (t.bpm * this.tempo) / 4;
    // After a pause (hidden tab) restart cleanly instead of racing to catch up.
    if (this.nextTime < ctx.currentTime - 0.3) this.nextTime = ctx.currentTime + 0.05;
    while (this.nextTime < ctx.currentTime + 0.25) {
      this.schedule(t, this.step, this.nextTime, sixteenth);
      this.step = (this.step + 1) % (8 * 16);
      this.nextTime += sixteenth;
    }
  }

  private freq(t: Track, degree: number, octave = 0): number {
    const n = t.scale.length;
    const midi = t.root + this.shift + t.scale[((degree % n) + n) % n] + 12 * Math.floor(degree / n) + 12 * octave;
    return 440 * Math.pow(2, (midi - 69) / 12);
  }

  private schedule(t: Track, step: number, when: number, s16: number): void {
    const bar = Math.floor(step / 16);
    const in16 = step % 16;
    const vol = t.vol ?? 1;
    const chord = t.chords[bar % t.chords.length];
    // Drums.
    if (t.kick[in16] === 'x') this.kick(when, 0.9 * vol);
    if (t.snare[in16] === 'x') this.hiss(when, 0.11, 1800, 0.34 * vol);
    if (t.hat[in16] === 'x') this.hiss(when, 0.03, 7000, 0.12 * vol);
    if (in16 % 2 === 0) {
      const e = in16 / 2;
      // Bass.
      const b = t.bass[e];
      // The fifth is always a true fifth (seven semitones), whatever the scale.
      if (b && b !== '.') this.tone(this.freq(t, chord, b === 'o' ? -1 : -2) * (b === '5' ? 1.4983 : 1), when, s16 * 1.8, t.bassWave, 0.5 * vol);
      // Lead: a note sounds for itself plus any holds after it.
      const line = t.lead[bar % t.lead.length];
      const c = line[e];
      if (c && c !== '.' && c !== '-') {
        let len = 1;
        while (e + len < 8 && line[e + len] === '-') len++;
        const degree = parseInt(c, 36);
        this.tone(this.freq(t, degree, 0), when, s16 * 2 * len * 0.95, t.leadWave, (t.leadWave === 'triangle' ? 0.5 : 0.22) * vol, 0.012);
      }
    }
    // Arpeggio: root, third, fifth, octave of the bar's chord.
    if (t.arp) {
      const order = [0, 2, 4, 7, 4, 2, 0, 2];
      this.tone(this.freq(t, chord + order[in16 % 8], 1), when, s16 * 0.9, 'triangle', 0.1 * vol);
    }
  }

  private tone(freq: number, when: number, dur: number, wave: Wave, vol: number, attack = 0.006): void {
    const ctx = this.ctx!;
    const o = ctx.createOscillator();
    o.type = wave;
    o.frequency.value = freq;
    const g = ctx.createGain();
    g.gain.setValueAtTime(0, when);
    g.gain.linearRampToValueAtTime(vol, when + attack);
    g.gain.setValueAtTime(vol, when + Math.max(attack, dur * 0.6));
    g.gain.linearRampToValueAtTime(0, when + dur);
    o.connect(g).connect(this.out!);
    o.start(when);
    o.stop(when + dur + 0.02);
  }

  private kick(when: number, vol: number): void {
    const ctx = this.ctx!;
    const o = ctx.createOscillator();
    o.type = 'sine';
    o.frequency.setValueAtTime(130, when);
    o.frequency.exponentialRampToValueAtTime(42, when + 0.11);
    const g = ctx.createGain();
    g.gain.setValueAtTime(vol, when);
    g.gain.exponentialRampToValueAtTime(0.001, when + 0.16);
    o.connect(g).connect(this.out!);
    o.start(when);
    o.stop(when + 0.18);
  }

  private hiss(when: number, dur: number, cutoff: number, vol: number): void {
    const ctx = this.ctx!;
    if (!this.noise) return;
    const src = ctx.createBufferSource();
    src.buffer = this.noise;
    const f = ctx.createBiquadFilter();
    f.type = 'highpass';
    f.frequency.value = cutoff;
    const g = ctx.createGain();
    g.gain.setValueAtTime(vol, when);
    g.gain.exponentialRampToValueAtTime(0.001, when + dur);
    src.connect(f).connect(g).connect(this.out!);
    src.start(when, (when * 7.3) % 0.5);
    src.stop(when + dur + 0.02);
  }
}

/** Track ids, for tests. */
export const MUSIC_TRACKS = TRACKS;
