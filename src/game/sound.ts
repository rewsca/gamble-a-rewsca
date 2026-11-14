class SoundEngine {
  private ctx: AudioContext | null = null;
  private bgmGain: GainNode | null = null;
  private bgmTimer: number | null = null;
  private bgmTrack: 'lobby' | 'battle' | null = null;
  private bgmStep: number = 0;
  public enabled: boolean = true;
  public volume: number = 0.7;
  public musicVolume: number = 0.45;

  private ensureAudioContext(): AudioContext | null {
    if (typeof window === 'undefined') return null;
    if (!this.ctx) {
      const AudioCtx = window.AudioContext || (window as unknown as { webkitAudioContext: typeof AudioContext }).webkitAudioContext;
      if (AudioCtx) {
        this.ctx = new AudioCtx();
      }
    }
    if (this.ctx && this.ctx.state === 'suspended') {
      this.ctx.resume().catch(() => {});
    }
    return this.ctx;
  }

  private getContext(): AudioContext | null {
    if (!this.enabled || this.volume <= 0) return null;
    return this.ensureAudioContext();
  }

  public playClick() {
    const ctx = this.getContext();
    if (!ctx) return;
    const now = ctx.currentTime;
    const osc = ctx.createOscillator();
    const gain = ctx.createGain();
    osc.type = 'triangle';
    osc.frequency.setValueAtTime(520, now);
    osc.frequency.exponentialRampToValueAtTime(240, now + 0.055);
    gain.gain.setValueAtTime(0.18 * this.volume, now);
    gain.gain.exponentialRampToValueAtTime(0.001, now + 0.06);
    osc.connect(gain);
    gain.connect(ctx.destination);
    osc.start(now);
    osc.stop(now + 0.065);
  }

  public playCoin() {
    const ctx = this.getContext();
    if (!ctx) return;
    const now = ctx.currentTime;
    [880, 1320].forEach((freq, idx) => {
      const osc = ctx.createOscillator();
      const gain = ctx.createGain();
      osc.type = 'sine';
      osc.frequency.setValueAtTime(freq, now + idx * 0.06);
      gain.gain.setValueAtTime(0.2 * this.volume, now + idx * 0.06);
      gain.gain.exponentialRampToValueAtTime(0.001, now + idx * 0.06 + 0.14);
      osc.connect(gain);
      gain.connect(ctx.destination);
      osc.start(now + idx * 0.06);
      osc.stop(now + idx * 0.06 + 0.15);
    });
  }

  public playWallBounce() {
    const ctx = this.getContext();
    if (!ctx) return;
    const now = ctx.currentTime;
    const osc = ctx.createOscillator();
    const gain = ctx.createGain();
    const pitchJitter = 0.94 + Math.random() * 0.12;
    osc.type = 'sine';
    osc.frequency.setValueAtTime(160 * pitchJitter, now);
    osc.frequency.exponentialRampToValueAtTime(65, now + 0.05);
    gain.gain.setValueAtTime(0.14 * this.volume, now);
    gain.gain.exponentialRampToValueAtTime(0.001, now + 0.055);
    osc.connect(gain);
    gain.connect(ctx.destination);
    osc.start(now);
    osc.stop(now + 0.06);
  }

  public playBallCollision() {
    const ctx = this.getContext();
    if (!ctx) return;
    const now = ctx.currentTime;
    const osc = ctx.createOscillator();
    const gain = ctx.createGain();
    osc.type = 'triangle';
    osc.frequency.setValueAtTime(220, now);
    osc.frequency.exponentialRampToValueAtTime(80, now + 0.08);
    gain.gain.setValueAtTime(0.25 * this.volume, now);
    gain.gain.exponentialRampToValueAtTime(0.001, now + 0.085);
    osc.connect(gain);
    gain.connect(ctx.destination);
    osc.start(now);
    osc.stop(now + 0.09);
  }

  public playBowShoot() {
    const ctx = this.getContext();
    if (!ctx) return;
    const now = ctx.currentTime;
    const osc = ctx.createOscillator();
    const gain = ctx.createGain();
    osc.type = 'sawtooth';
    osc.frequency.setValueAtTime(640, now);
    osc.frequency.exponentialRampToValueAtTime(180, now + 0.09);
    gain.gain.setValueAtTime(0.16 * this.volume, now);
    gain.gain.exponentialRampToValueAtTime(0.001, now + 0.095);
    osc.connect(gain);
    gain.connect(ctx.destination);
    osc.start(now);
    osc.stop(now + 0.1);
  }

  public playSwordSlash() {
    const ctx = this.getContext();
    if (!ctx) return;
    const now = ctx.currentTime;
    const osc = ctx.createOscillator();
    const gain = ctx.createGain();
    osc.type = 'sawtooth';
    osc.frequency.setValueAtTime(820, now);
    osc.frequency.exponentialRampToValueAtTime(210, now + 0.11);
    gain.gain.setValueAtTime(0.22 * this.volume, now);
    gain.gain.exponentialRampToValueAtTime(0.001, now + 0.12);
    osc.connect(gain);
    gain.connect(ctx.destination);
    osc.start(now);
    osc.stop(now + 0.13);
  }

  public playBladeVortexSpin() {
    const ctx = this.getContext();
    if (!ctx) return;
    const now = ctx.currentTime;
    // Tiếng đại kiếm xoay lốc xoáy nặng và sắc như Video 210451
    [0, 0.11].forEach((offset, idx) => {
      const osc = ctx.createOscillator();
      const gain = ctx.createGain();
      osc.type = idx === 0 ? 'sawtooth' : 'triangle';
      osc.frequency.setValueAtTime(idx === 0 ? 440 : 620, now + offset);
      osc.frequency.exponentialRampToValueAtTime(140, now + offset + 0.18);
      gain.gain.setValueAtTime(0.24 * this.volume, now + offset);
      gain.gain.exponentialRampToValueAtTime(0.001, now + offset + 0.19);
      osc.connect(gain);
      gain.connect(ctx.destination);
      osc.start(now + offset);
      osc.stop(now + offset + 0.2);
    });
  }

  public playSwordPlungeImpact() {
    const ctx = this.getContext();
    if (!ctx) return;
    const now = ctx.currentTime;
    // Tiếng đại kiếm giáng xuống mặt đất nổ chấn động như Video 210725
    [180, 92, 680].forEach((freq, idx) => {
      const osc = ctx.createOscillator();
      const gain = ctx.createGain();
      osc.type = idx === 2 ? 'sawtooth' : 'square';
      osc.frequency.setValueAtTime(freq, now);
      osc.frequency.exponentialRampToValueAtTime(idx === 2 ? 190 : 38, now + 0.26);
      gain.gain.setValueAtTime((idx === 0 ? 0.3 : 0.2) * this.volume, now);
      gain.gain.exponentialRampToValueAtTime(0.001, now + 0.28);
      osc.connect(gain);
      gain.connect(ctx.destination);
      osc.start(now);
      osc.stop(now + 0.29);
    });
  }

  public playShieldClang() {
    const ctx = this.getContext();
    if (!ctx) return;
    const now = ctx.currentTime;
    [540, 810].forEach((freq) => {
      const osc = ctx.createOscillator();
      const gain = ctx.createGain();
      osc.type = 'square';
      osc.frequency.setValueAtTime(freq, now);
      osc.frequency.exponentialRampToValueAtTime(freq * 0.7, now + 0.12);
      gain.gain.setValueAtTime(0.14 * this.volume, now);
      gain.gain.exponentialRampToValueAtTime(0.001, now + 0.13);
      osc.connect(gain);
      gain.connect(ctx.destination);
      osc.start(now);
      osc.stop(now + 0.14);
    });
  }

  public playHit(isCrit: boolean = false) {
    const ctx = this.getContext();
    if (!ctx) return;
    const now = ctx.currentTime;
    const osc = ctx.createOscillator();
    const gain = ctx.createGain();
    osc.type = isCrit ? 'sawtooth' : 'square';
    osc.frequency.setValueAtTime(isCrit ? 480 : 280, now);
    osc.frequency.exponentialRampToValueAtTime(65, now + (isCrit ? 0.16 : 0.1));
    gain.gain.setValueAtTime((isCrit ? 0.32 : 0.22) * this.volume, now);
    gain.gain.exponentialRampToValueAtTime(0.001, now + (isCrit ? 0.17 : 0.11));
    osc.connect(gain);
    gain.connect(ctx.destination);
    osc.start(now);
    osc.stop(now + 0.18);
  }

  public playSkillCast() {
    const ctx = this.getContext();
    if (!ctx) return;
    const now = ctx.currentTime;
    const osc = ctx.createOscillator();
    const gain = ctx.createGain();
    osc.type = 'triangle';
    osc.frequency.setValueAtTime(320, now);
    osc.frequency.exponentialRampToValueAtTime(760, now + 0.18);
    gain.gain.setValueAtTime(0.24 * this.volume, now);
    gain.gain.exponentialRampToValueAtTime(0.001, now + 0.2);
    osc.connect(gain);
    gain.connect(ctx.destination);
    osc.start(now);
    osc.stop(now + 0.21);
  }

  public playVictory() {
    const ctx = this.getContext();
    if (!ctx) return;
    const now = ctx.currentTime;
    const notes = [523.25, 659.25, 783.99, 1046.5];
    notes.forEach((freq, i) => {
      const osc = ctx.createOscillator();
      const gain = ctx.createGain();
      osc.type = 'triangle';
      osc.frequency.setValueAtTime(freq, now + i * 0.11);
      gain.gain.setValueAtTime(0.25 * this.volume, now + i * 0.11);
      gain.gain.exponentialRampToValueAtTime(0.001, now + i * 0.11 + 0.28);
      osc.connect(gain);
      gain.connect(ctx.destination);
      osc.start(now + i * 0.11);
      osc.stop(now + i * 0.11 + 0.3);
    });
  }

  public playDefeat() {
    const ctx = this.getContext();
    if (!ctx) return;
    const now = ctx.currentTime;
    const notes = [392.0, 349.23, 311.13, 261.63];
    notes.forEach((freq, i) => {
      const osc = ctx.createOscillator();
      const gain = ctx.createGain();
      osc.type = 'sawtooth';
      osc.frequency.setValueAtTime(freq, now + i * 0.13);
      gain.gain.setValueAtTime(0.22 * this.volume, now + i * 0.13);
      gain.gain.exponentialRampToValueAtTime(0.001, now + i * 0.13 + 0.3);
      osc.connect(gain);
      gain.connect(ctx.destination);
      osc.start(now + i * 0.13);
      osc.stop(now + i * 0.13 + 0.32);
    });
  }

  public playFireCast() {
    const ctx = this.getContext();
    if (!ctx) return;
    const now = ctx.currentTime;
    const osc = ctx.createOscillator();
    const gain = ctx.createGain();
    osc.type = 'sawtooth';
    osc.frequency.setValueAtTime(280, now);
    osc.frequency.exponentialRampToValueAtTime(620, now + 0.14);
    gain.gain.setValueAtTime(0.18 * this.volume, now);
    gain.gain.exponentialRampToValueAtTime(0.001, now + 0.16);
    osc.connect(gain);
    gain.connect(ctx.destination);
    osc.start(now);
    osc.stop(now + 0.17);
  }

  public playFireExplosion() {
    const ctx = this.getContext();
    if (!ctx) return;
    const now = ctx.currentTime;
    [140, 85].forEach((freq, idx) => {
      const osc = ctx.createOscillator();
      const gain = ctx.createGain();
      osc.type = idx === 0 ? 'sawtooth' : 'square';
      osc.frequency.setValueAtTime(freq, now);
      osc.frequency.exponentialRampToValueAtTime(34, now + 0.24);
      gain.gain.setValueAtTime(0.24 * this.volume, now);
      gain.gain.exponentialRampToValueAtTime(0.001, now + 0.25);
      osc.connect(gain);
      gain.connect(ctx.destination);
      osc.start(now);
      osc.stop(now + 0.26);
    });
  }

  public playPhoenixBeam() {
    const ctx = this.getContext();
    if (!ctx) return;
    const now = ctx.currentTime;
    [520, 780, 260].forEach((freq, idx) => {
      const osc = ctx.createOscillator();
      const gain = ctx.createGain();
      osc.type = idx === 2 ? 'sawtooth' : 'triangle';
      osc.frequency.setValueAtTime(freq, now);
      osc.frequency.exponentialRampToValueAtTime(freq * 1.35, now + 0.28);
      gain.gain.setValueAtTime(0.18 * this.volume, now);
      gain.gain.exponentialRampToValueAtTime(0.001, now + 0.32);
      osc.connect(gain);
      gain.connect(ctx.destination);
      osc.start(now);
      osc.stop(now + 0.34);
    });
  }

  public playIceCast() {
    const ctx = this.getContext();
    if (!ctx) return;
    const now = ctx.currentTime;
    const osc = ctx.createOscillator();
    const gain = ctx.createGain();
    osc.type = 'sine';
    osc.frequency.setValueAtTime(980, now);
    osc.frequency.exponentialRampToValueAtTime(1480, now + 0.14);
    gain.gain.setValueAtTime(0.14 * this.volume, now);
    gain.gain.exponentialRampToValueAtTime(0.001, now + 0.16);
    osc.connect(gain);
    gain.connect(ctx.destination);
    osc.start(now);
    osc.stop(now + 0.17);
  }

  public playIceShatter() {
    const ctx = this.getContext();
    if (!ctx) return;
    const now = ctx.currentTime;
    [1320, 1760, 880].forEach((freq, idx) => {
      const osc = ctx.createOscillator();
      const gain = ctx.createGain();
      osc.type = 'triangle';
      osc.frequency.setValueAtTime(freq, now + idx * 0.02);
      osc.frequency.exponentialRampToValueAtTime(freq * 0.45, now + idx * 0.02 + 0.14);
      gain.gain.setValueAtTime(0.14 * this.volume, now + idx * 0.02);
      gain.gain.exponentialRampToValueAtTime(0.001, now + idx * 0.02 + 0.15);
      osc.connect(gain);
      gain.connect(ctx.destination);
      osc.start(now + idx * 0.02);
      osc.stop(now + idx * 0.02 + 0.16);
    });
  }

  public playIceFreeze() {
    const ctx = this.getContext();
    if (!ctx) return;
    const now = ctx.currentTime;
    [740, 1110].forEach((freq) => {
      const osc = ctx.createOscillator();
      const gain = ctx.createGain();
      osc.type = 'sine';
      osc.frequency.setValueAtTime(freq, now);
      osc.frequency.exponentialRampToValueAtTime(freq * 1.15, now + 0.22);
      gain.gain.setValueAtTime(0.15 * this.volume, now);
      gain.gain.exponentialRampToValueAtTime(0.001, now + 0.24);
      osc.connect(gain);
      gain.connect(ctx.destination);
      osc.start(now);
      osc.stop(now + 0.25);
    });
  }

  public playEarthCast() {
    const ctx = this.getContext();
    if (!ctx) return;
    const now = ctx.currentTime;
    const osc = ctx.createOscillator();
    const gain = ctx.createGain();
    osc.type = 'triangle';
    osc.frequency.setValueAtTime(210, now);
    osc.frequency.exponentialRampToValueAtTime(95, now + 0.16);
    gain.gain.setValueAtTime(0.22 * this.volume, now);
    gain.gain.exponentialRampToValueAtTime(0.001, now + 0.18);
    osc.connect(gain);
    gain.connect(ctx.destination);
    osc.start(now);
    osc.stop(now + 0.19);
  }

  public playEarthShatter() {
    const ctx = this.getContext();
    if (!ctx) return;
    const now = ctx.currentTime;
    [160, 110, 75].forEach((freq, idx) => {
      const osc = ctx.createOscillator();
      const gain = ctx.createGain();
      osc.type = 'square';
      osc.frequency.setValueAtTime(freq, now + idx * 0.02);
      osc.frequency.exponentialRampToValueAtTime(38, now + idx * 0.02 + 0.14);
      gain.gain.setValueAtTime(0.16 * this.volume, now + idx * 0.02);
      gain.gain.exponentialRampToValueAtTime(0.001, now + idx * 0.02 + 0.15);
      osc.connect(gain);
      gain.connect(ctx.destination);
      osc.start(now + idx * 0.02);
      osc.stop(now + idx * 0.02 + 0.16);
    });
  }

  public playEarthStomp() {
    const ctx = this.getContext();
    if (!ctx) return;
    const now = ctx.currentTime;
    [125, 68].forEach((freq, idx) => {
      const osc = ctx.createOscillator();
      const gain = ctx.createGain();
      osc.type = idx === 0 ? 'triangle' : 'sawtooth';
      osc.frequency.setValueAtTime(freq, now);
      osc.frequency.exponentialRampToValueAtTime(28, now + 0.28);
      gain.gain.setValueAtTime(0.28 * this.volume, now);
      gain.gain.exponentialRampToValueAtTime(0.001, now + 0.3);
      osc.connect(gain);
      gain.connect(ctx.destination);
      osc.start(now);
      osc.stop(now + 0.31);
    });
  }

  public playEarthWallSlam() {
    const ctx = this.getContext();
    if (!ctx) return;
    const now = ctx.currentTime;
    [195, 90].forEach((freq) => {
      const osc = ctx.createOscillator();
      const gain = ctx.createGain();
      osc.type = 'sawtooth';
      osc.frequency.setValueAtTime(freq, now);
      osc.frequency.exponentialRampToValueAtTime(42, now + 0.22);
      gain.gain.setValueAtTime(0.24 * this.volume, now);
      gain.gain.exponentialRampToValueAtTime(0.001, now + 0.24);
      osc.connect(gain);
      gain.connect(ctx.destination);
      osc.start(now);
      osc.stop(now + 0.25);
    });
  }

  public playWindBolt() {
    const ctx = this.getContext();
    if (!ctx) return;
    const now = ctx.currentTime;
    const osc = ctx.createOscillator();
    const gain = ctx.createGain();
    osc.type = 'sine';
    osc.frequency.setValueAtTime(480, now);
    osc.frequency.exponentialRampToValueAtTime(860, now + 0.08);
    osc.frequency.exponentialRampToValueAtTime(340, now + 0.16);
    gain.gain.setValueAtTime(0.16 * this.volume, now);
    gain.gain.exponentialRampToValueAtTime(0.001, now + 0.17);
    osc.connect(gain);
    gain.connect(ctx.destination);
    osc.start(now);
    osc.stop(now + 0.18);
  }

  public playWindTornado() {
    const ctx = this.getContext();
    if (!ctx) return;
    const now = ctx.currentTime;
    [360, 540].forEach((freq, idx) => {
      const osc = ctx.createOscillator();
      const gain = ctx.createGain();
      osc.type = idx === 0 ? 'triangle' : 'sine';
      osc.frequency.setValueAtTime(freq, now);
      osc.frequency.exponentialRampToValueAtTime(freq * 1.45, now + 0.12);
      osc.frequency.exponentialRampToValueAtTime(freq * 0.65, now + 0.24);
      gain.gain.setValueAtTime(0.16 * this.volume, now);
      gain.gain.exponentialRampToValueAtTime(0.001, now + 0.25);
      osc.connect(gain);
      gain.connect(ctx.destination);
      osc.start(now);
      osc.stop(now + 0.26);
    });
  }

  public playWindBurst() {
    const ctx = this.getContext();
    if (!ctx) return;
    const now = ctx.currentTime;
    [290, 460].forEach((freq, idx) => {
      const osc = ctx.createOscillator();
      const gain = ctx.createGain();
      osc.type = 'triangle';
      osc.frequency.setValueAtTime(freq, now + idx * 0.03);
      osc.frequency.exponentialRampToValueAtTime(freq * 1.5, now + idx * 0.03 + 0.18);
      gain.gain.setValueAtTime(0.17 * this.volume, now + idx * 0.03);
      gain.gain.exponentialRampToValueAtTime(0.001, now + idx * 0.03 + 0.2);
      osc.connect(gain);
      gain.connect(ctx.destination);
      osc.start(now + idx * 0.03);
      osc.stop(now + idx * 0.03 + 0.21);
    });
  }

  public playWindMaelstrom() {
    const ctx = this.getContext();
    if (!ctx) return;
    const now = ctx.currentTime;
    [210, 380, 640].forEach((freq, idx) => {
      const osc = ctx.createOscillator();
      const gain = ctx.createGain();
      osc.type = idx === 0 ? 'sawtooth' : 'triangle';
      osc.frequency.setValueAtTime(freq, now);
      osc.frequency.exponentialRampToValueAtTime(freq * 1.35, now + 0.18);
      osc.frequency.exponentialRampToValueAtTime(freq * 0.55, now + 0.34);
      gain.gain.setValueAtTime((idx === 0 ? 0.15 : 0.14) * this.volume, now);
      gain.gain.exponentialRampToValueAtTime(0.001, now + 0.36);
      osc.connect(gain);
      gain.connect(ctx.destination);
      osc.start(now);
      osc.stop(now + 0.37);
    });
  }

  public setMusicVolume(vol: number) {
    this.musicVolume = Math.max(0, Math.min(1, vol));
    if (this.bgmGain && this.ctx) {
      this.bgmGain.gain.setTargetAtTime(0.18 * this.musicVolume, this.ctx.currentTime, 0.04);
    }
    if (this.musicVolume <= 0) {
      this.stopFallbackBgm();
    }
  }

  public startFallbackBgm(track: 'lobby' | 'battle') {
    if (typeof window === 'undefined' || this.musicVolume <= 0) {
      this.stopFallbackBgm();
      return;
    }
    if (this.bgmTrack === track && this.bgmTimer !== null) return;
    this.stopFallbackBgm();
    const ctx = this.ensureAudioContext();
    if (!ctx) return;

    this.bgmTrack = track;
    this.bgmStep = 0;
    if (!this.bgmGain) {
      this.bgmGain = ctx.createGain();
      this.bgmGain.connect(ctx.destination);
    }
    this.bgmGain.gain.setValueAtTime(0.18 * this.musicVolume, ctx.currentTime);

    const stepMs = track === 'battle' ? 185 : 210; // ~162/143 BPM eighth-note groove
    const lobbyBass = [110, 0, 110, 130.81, 146.83, 0, 164.81, 130.81, 98, 0, 98, 110, 130.81, 0, 146.83, 164.81];
    const lobbyLead = [440, 0, 523.25, 0, 587.33, 659.25, 587.33, 0, 392, 0, 493.88, 0, 523.25, 587.33, 659.25, 523.25];
    const battleBass = [110, 220, 110, 220, 98, 196, 98, 196, 87.31, 174.61, 87.31, 174.61, 82.41, 164.81, 98, 196];
    const battleLead = [440, 493.88, 523.25, 659.25, 587.33, 523.25, 493.88, 440, 349.23, 392, 440, 523.25, 493.88, 440, 392, 329.63];

    const tick = () => {
      if (!this.ctx || !this.bgmGain || this.musicVolume <= 0 || !this.bgmTrack) return;
      if (this.ctx.state === 'suspended') return;
      const now = this.ctx.currentTime;
      const idx = this.bgmStep % 16;
      const bassArr = this.bgmTrack === 'battle' ? battleBass : lobbyBass;
      const leadArr = this.bgmTrack === 'battle' ? battleLead : lobbyLead;

      // Kick on beats 0, 4, 8, 12
      if (idx % 4 === 0) {
        const kick = this.ctx.createOscillator();
        const kGain = this.ctx.createGain();
        kick.type = 'sine';
        kick.frequency.setValueAtTime(this.bgmTrack === 'lobby' ? 128 : 118, now);
        kick.frequency.exponentialRampToValueAtTime(38, now + 0.11);
        kGain.gain.setValueAtTime(0.42, now);
        kGain.gain.exponentialRampToValueAtTime(0.001, now + 0.13);
        kick.connect(kGain);
        kGain.connect(this.bgmGain);
        kick.start(now);
        kick.stop(now + 0.14);
      }

      const bassF = bassArr[idx];
      if (bassF > 0) {
        const bass = this.ctx.createOscillator();
        const bGain = this.ctx.createGain();
        bass.type = this.bgmTrack === 'lobby' ? 'sawtooth' : 'triangle';
        bass.frequency.setValueAtTime(bassF, now);
        bGain.gain.setValueAtTime(0.16, now);
        bGain.gain.exponentialRampToValueAtTime(0.001, now + 0.16);
        bass.connect(bGain);
        bGain.connect(this.bgmGain);
        bass.start(now);
        bass.stop(now + 0.17);
      }

      const leadF = leadArr[idx];
      if (leadF > 0) {
        const lead = this.ctx.createOscillator();
        const lGain = this.ctx.createGain();
        lead.type = this.bgmTrack === 'battle' ? 'triangle' : 'sine';
        lead.frequency.setValueAtTime(leadF, now);
        lGain.gain.setValueAtTime(0.1, now);
        lGain.gain.exponentialRampToValueAtTime(0.001, now + 0.15);
        lead.connect(lGain);
        lGain.connect(this.bgmGain);
        lead.start(now);
        lead.stop(now + 0.16);
      }

      this.bgmStep += 1;
    };

    tick();
    this.bgmTimer = window.setInterval(tick, stepMs);
  }

  public stopFallbackBgm() {
    if (this.bgmTimer !== null && typeof window !== 'undefined') {
      window.clearInterval(this.bgmTimer);
      this.bgmTimer = null;
    }
    this.bgmTrack = null;
  }
}

export const sound = new SoundEngine();
