export class SoundSynth {
  private ctx: AudioContext | null = null;
  private masterVolume: GainNode | null = null;
  private bgmInterval: NodeJS.Timeout | null = null;
  private currentBgmNodes: AudioNode[] = [];
  private isBgmPlaying = false;
  private isMuted = false;

  constructor() {
    // AudioContext will be initialized on first user interaction
  }

  private init() {
    if (this.ctx) return;
    try {
      const AudioContextClass = window.AudioContext || (window as any).webkitAudioContext;
      this.ctx = new AudioContextClass();
      this.masterVolume = this.ctx.createGain();
      this.masterVolume.gain.setValueAtTime(0.3, this.ctx.currentTime); // default volume 30%
      this.masterVolume.connect(this.ctx.destination);
    } catch (e) {
      console.error("Failed to initialize Web Audio Context", e);
    }
  }

  public resume() {
    this.init();
    if (this.ctx && this.ctx.state === "suspended") {
      this.ctx.resume();
    }
  }

  public setMute(mute: boolean) {
    this.isMuted = mute;
    if (this.masterVolume && this.ctx) {
      this.masterVolume.gain.setValueAtTime(mute ? 0 : 0.3, this.ctx.currentTime);
    }
  }

  public playSlash() {
    this.resume();
    if (!this.ctx || !this.masterVolume || this.isMuted) return;

    const osc = this.ctx.createOscillator();
    const gain = this.ctx.createGain();

    osc.connect(gain);
    gain.connect(this.masterVolume);

    // Retro swoosh sound: sweep frequency down quickly
    osc.type = "triangle";
    osc.frequency.setValueAtTime(800, this.ctx.currentTime);
    osc.frequency.exponentialRampToValueAtTime(150, this.ctx.currentTime + 0.15);

    gain.gain.setValueAtTime(0.4, this.ctx.currentTime);
    gain.gain.exponentialRampToValueAtTime(0.01, this.ctx.currentTime + 0.15);

    osc.start();
    osc.stop(this.ctx.currentTime + 0.16);
  }

  public playJustSlash() {
    this.resume();
    if (!this.ctx || !this.masterVolume || this.isMuted) return;

    // A metallic high-pitch chime sound with double triggers
    const playChime = (delay: number, freq: number) => {
      if (!this.ctx || !this.masterVolume) return;
      const osc1 = this.ctx.createOscillator();
      const osc2 = this.ctx.createOscillator();
      const gain = this.ctx.createGain();

      osc1.connect(gain);
      osc2.connect(gain);
      gain.connect(this.masterVolume);

      osc1.type = "sine";
      osc2.type = "sawtooth";

      const time = this.ctx.currentTime + delay;

      osc1.frequency.setValueAtTime(freq, time);
      osc1.frequency.exponentialRampToValueAtTime(freq * 1.5, time + 0.25);
      
      osc2.frequency.setValueAtTime(freq * 0.8, time);
      osc2.frequency.exponentialRampToValueAtTime(freq * 1.2, time + 0.25);

      gain.gain.setValueAtTime(0, time);
      gain.gain.linearRampToValueAtTime(0.5, time + 0.02);
      gain.gain.exponentialRampToValueAtTime(0.001, time + 0.35);

      osc1.start(time);
      osc1.stop(time + 0.4);
      osc2.start(time);
      osc2.stop(time + 0.4);
    };

    // Fast triple metallic sweep for burst action!
    playChime(0, 1000);
    playChime(0.08, 1200);
    playChime(0.16, 1500);
  }

  public playPlayerHit() {
    this.resume();
    if (!this.ctx || !this.masterVolume || this.isMuted) return;

    // Low harsh explosion/damage sound
    const osc = this.ctx.createOscillator();
    const noise = this.createNoiseNode();
    const gain = this.ctx.createGain();

    if (noise) {
      noise.connect(gain);
    }
    osc.connect(gain);
    gain.connect(this.masterVolume);

    osc.type = "sawtooth";
    osc.frequency.setValueAtTime(180, this.ctx.currentTime);
    osc.frequency.linearRampToValueAtTime(40, this.ctx.currentTime + 0.25);

    gain.gain.setValueAtTime(0.6, this.ctx.currentTime);
    gain.gain.exponentialRampToValueAtTime(0.01, this.ctx.currentTime + 0.25);

    osc.start();
    osc.stop(this.ctx.currentTime + 0.26);
    if (noise) {
      noise.start();
      noise.stop(this.ctx.currentTime + 0.26);
    }
  }

  public playEnemyExplode() {
    this.resume();
    if (!this.ctx || !this.masterVolume || this.isMuted) return;

    // Classic arcade white noise explosion
    const noise = this.createNoiseNode();
    if (!noise) return;

    const filter = this.ctx.createBiquadFilter();
    const gain = this.ctx.createGain();

    noise.connect(filter);
    filter.connect(gain);
    gain.connect(this.masterVolume);

    filter.type = "bandpass";
    filter.frequency.setValueAtTime(1000, this.ctx.currentTime);
    filter.frequency.exponentialRampToValueAtTime(100, this.ctx.currentTime + 0.2);

    gain.gain.setValueAtTime(0.4, this.ctx.currentTime);
    gain.gain.exponentialRampToValueAtTime(0.01, this.ctx.currentTime + 0.2);

    noise.start();
    noise.stop(this.ctx.currentTime + 0.21);
  }

  public playBossExplode() {
    this.resume();
    if (!this.ctx || !this.masterVolume || this.isMuted) return;

    // Long deep rumbling explosion for boss defeat
    const duration = 1.8;
    const time = this.ctx.currentTime;

    const playRumble = (delay: number, freq: number, vol: number) => {
      if (!this.ctx || !this.masterVolume) return;
      const osc = this.ctx.createOscillator();
      const gain = this.ctx.createGain();
      osc.connect(gain);
      gain.connect(this.masterVolume);

      osc.type = "sawtooth";
      osc.frequency.setValueAtTime(freq, time + delay);
      osc.frequency.linearRampToValueAtTime(20, time + delay + 0.4);

      gain.gain.setValueAtTime(vol, time + delay);
      gain.gain.exponentialRampToValueAtTime(0.001, time + delay + 0.4);

      osc.start(time + delay);
      osc.stop(time + delay + 0.45);
    };

    for (let i = 0; i < 8; i++) {
      playRumble(i * 0.2, 100 - i * 8, 0.5 - i * 0.03);
    }
  }

  public playHeal() {
    this.resume();
    if (!this.ctx || !this.masterVolume || this.isMuted) return;

    // Classic retro ascending chime sweep
    const playTick = (delay: number, freq: number) => {
      if (!this.ctx || !this.masterVolume) return;
      const osc = this.ctx.createOscillator();
      const gain = this.ctx.createGain();
      
      osc.connect(gain);
      gain.connect(this.masterVolume);
      
      osc.type = "sine";
      const time = this.ctx.currentTime + delay;
      
      osc.frequency.setValueAtTime(freq, time);
      gain.gain.setValueAtTime(0, time);
      gain.gain.linearRampToValueAtTime(0.2, time + 0.02);
      gain.gain.exponentialRampToValueAtTime(0.001, time + 0.12);
      
      osc.start(time);
      osc.stop(time + 0.15);
    };

    // Ascending arpeggio chime (C major style chord)
    playTick(0, 523.25); // C5
    playTick(0.06, 659.25); // E5
    playTick(0.12, 783.99); // G5
    playTick(0.18, 1046.50); // C6
  }

  private createNoiseNode(): AudioBufferSourceNode | null {
    if (!this.ctx) return null;
    const bufferSize = this.ctx.sampleRate * 0.4;
    const buffer = this.ctx.createBuffer(1, bufferSize, this.ctx.sampleRate);
    const data = buffer.getChannelData(0);
    for (let i = 0; i < bufferSize; i++) {
      data[i] = Math.random() * 2 - 1;
    }
    const source = this.ctx.createBufferSource();
    source.buffer = buffer;
    return source;
  }

  public startBGM(level: number) {
    this.resume();
    if (this.isBgmPlaying) return;
    this.isBgmPlaying = true;
    if (!this.ctx || !this.masterVolume || this.isMuted) return;

    // Simple procedural synth arpeggiator playing cyber-punk beat
    let step = 0;
    const tempo = 130; // BPM
    const stepDuration = 60 / tempo / 2; // eighth notes

    // Cyberpunk synthwave minor chords progression (A minor, F major, G major, E minor)
    const chords = [
      [220, 261.63, 329.63, 440], // Am
      [174.61, 220, 261.63, 349.23], // F
      [196, 246.94, 293.66, 392], // G
      [164.81, 207.65, 246.94, 329.63] // E
    ];

    const playSynthNote = (freq: number, time: number, type: "sawtooth" | "triangle" = "sawtooth", dur = 0.15, gainVal = 0.08) => {
      if (!this.ctx || !this.masterVolume) return;
      const osc = this.ctx.createOscillator();
      const gain = this.ctx.createGain();
      osc.connect(gain);
      gain.connect(this.masterVolume);

      osc.type = type;
      osc.frequency.setValueAtTime(freq, time);

      gain.gain.setValueAtTime(gainVal, time);
      gain.gain.exponentialRampToValueAtTime(0.001, time + dur);

      osc.start(time);
      osc.stop(time + dur + 0.05);

      this.currentBgmNodes.push(osc);
      this.currentBgmNodes.push(gain);
    };

    const nextStep = () => {
      if (!this.isBgmPlaying || !this.ctx) return;

      const chordIdx = Math.floor(step / 16) % chords.length;
      const chord = chords[chordIdx];
      const time = this.ctx.currentTime;

      // Bass note on beat 1 and 3 (every 8 steps)
      if (step % 8 === 0) {
        playSynthNote(chord[0] / 2, time, "sawtooth", stepDuration * 3, 0.15); // Deep bass
      } else if (step % 8 === 4) {
        playSynthNote(chord[1] / 2, time, "sawtooth", stepDuration * 2, 0.12);
      }

      // Arpeggiator pattern (different speed/order based on level difficulty)
      const notePatterns = [
        [0, 1, 2, 3, 2, 1, 0, 1], // Lv 1-3
        [0, 2, 1, 3, 0, 2, 1, 3], // Lv 4-6
        [3, 2, 1, 0, 3, 1, 2, 0]  // Lv 7+
      ];
      const patternIdx = Math.min(Math.floor((level - 1) / 3.4), 2);
      const pattern = notePatterns[patternIdx];
      const noteFreq = chord[pattern[step % pattern.length]];

      // Play melody note
      playSynthNote(noteFreq, time, "triangle", stepDuration * 0.8, 0.05 + (step % 4 === 0 ? 0.03 : 0));

      step = (step + 1) % 64;
    };

    // Trigger arpeggiator tick loop
    this.bgmInterval = setInterval(nextStep, stepDuration * 1000);
  }

  public stopBGM() {
    this.isBgmPlaying = false;
    if (this.bgmInterval) {
      clearInterval(this.bgmInterval);
      this.bgmInterval = null;
    }
    // Stop all active nodes
    this.currentBgmNodes.forEach((node) => {
      try {
        (node as any).stop();
      } catch (e) {}
      try {
        node.disconnect();
      } catch (e) {}
    });
    this.currentBgmNodes = [];
  }
}

export const soundSynth = new SoundSynth();
