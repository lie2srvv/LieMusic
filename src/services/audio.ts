import { Track, EqualizerPreset } from '../types';

export const EQUALIZER_FREQUENCIES = [32, 64, 125, 250, 500, 1000, 2000, 4000, 8000, 16000];

export const DEFAULT_PRESETS: EqualizerPreset[] = [
  { id: 'flat', name: 'Flat (По умолчанию)', bands: [0, 0, 0, 0, 0, 0, 0, 0, 0, 0], bassBoost: 0 },
  { id: 'bass_boost', name: 'Bass Boost (Мощный бас)', bands: [6, 5, 4, 2, 0, 0, 1, 2, 3, 4], bassBoost: 25 },
  { id: 'vocal', name: 'Vocal Booster (Чистый голос)', bands: [-2, -2, 0, 3, 5, 5, 4, 2, 0, -1], bassBoost: 0 },
  { id: 'rock', name: 'Rock / Metal', bands: [4, 3, 2, 0, -1, 1, 3, 4, 4, 3], bassBoost: 10 },
  { id: 'electronic', name: 'Electronic / Club', bands: [5, 4, 2, 0, -2, 2, 1, 3, 4, 4], bassBoost: 20 },
  { id: 'pop', name: 'Pop Hits', bands: [-1, 1, 3, 4, 3, 1, 0, 2, 3, 3], bassBoost: 5 },
];

type AudioCallback = () => void;
type TimeCallback = (currentTime: number, duration: number) => void;

class AudioEngine {
  private audio: HTMLAudioElement;
  private audioCtx: AudioContext | null = null;
  private sourceNode: MediaElementAudioSourceNode | null = null;
  private filters: BiquadFilterNode[] = [];
  private bassNode: BiquadFilterNode | null = null;
  private gainNode: GainNode | null = null;
  private analyserNode: AnalyserNode | null = null;

  private currentTrack: Track | null = null;
  private onTrackEndCallbacks: AudioCallback[] = [];
  private onTimeUpdateCallbacks: TimeCallback[] = [];
  private onPlayStateChangeCallbacks: ((isPlaying: boolean) => void)[] = [];
  private onNextCallback: (() => void) | null = null;
  private onPrevCallback: (() => void) | null = null;

  private isInitialized = false;

  constructor() {
    this.audio = new Audio();
    this.audio.preload = 'auto';

    this.audio.addEventListener('ended', () => {
      this.onTrackEndCallbacks.forEach((cb) => cb());
    });

    this.audio.addEventListener('timeupdate', () => {
      const dur = isNaN(this.audio.duration) ? (this.currentTrack?.duration || 0) : this.audio.duration;
      this.onTimeUpdateCallbacks.forEach((cb) => cb(this.audio.currentTime, dur));
    });

    this.audio.addEventListener('play', () => {
      this.onPlayStateChangeCallbacks.forEach((cb) => cb(true));
      this.updateMediaSession();
      this.syncAndroidNotification(true);
    });

    this.audio.addEventListener('pause', () => {
      this.onPlayStateChangeCallbacks.forEach((cb) => cb(false));
      this.updateMediaSession();
      this.syncAndroidNotification(false);
    });

    this.setupMediaSessionHandlers();
    this.setupAndroidMediaActionListener();
  }

  private setupAndroidMediaActionListener() {
    if (typeof window === 'undefined') return;
    window.addEventListener('android_media_action', (event: any) => {
      const action = event.detail;
      if (action === 'toggle') {
        this.togglePlayPause();
      } else if (action === 'next') {
        if (this.onNextCallback) this.onNextCallback();
      } else if (action === 'prev') {
        if (this.onPrevCallback) this.onPrevCallback();
      }
    });
  }

  private syncAndroidNotification(isPlaying: boolean) {
    try {
      const bridge = (window as any).AndroidMediaNotification;
      if (bridge && this.currentTrack) {
        bridge.updateState(this.currentTrack.title, this.currentTrack.artist, isPlaying);
      }
    } catch (e) {
      console.warn('[LieMusic] Android notification bridge sync error:', e);
    }
  }

  private initAudioNodes() {
    if (this.isInitialized) return;

    try {
      const AudioCtxClass = window.AudioContext || (window as any).webkitAudioContext;
      if (!AudioCtxClass) return;

      this.audioCtx = new AudioCtxClass();
      this.sourceNode = this.audioCtx.createMediaElementSource(this.audio);

      // Create 10 biquad peaking filters
      this.filters = EQUALIZER_FREQUENCIES.map((freq) => {
        const filter = this.audioCtx!.createBiquadFilter();
        filter.type = 'peaking';
        filter.frequency.value = freq;
        filter.Q.value = 1.4;
        filter.gain.value = 0;
        return filter;
      });

      // Bass boost filter (lowshelf at 80Hz)
      this.bassNode = this.audioCtx.createBiquadFilter();
      this.bassNode.type = 'lowshelf';
      this.bassNode.frequency.value = 80;
      this.bassNode.gain.value = 0;

      // Gain and Analyser
      this.gainNode = this.audioCtx.createGain();
      this.analyserNode = this.audioCtx.createAnalyser();
      this.analyserNode.fftSize = 64;
      this.analyserNode.smoothingTimeConstant = 0.8;

      // Connect chain: source -> bass -> filter1 -> ... -> filter10 -> gain -> analyser -> destination
      let lastNode: AudioNode = this.sourceNode;
      lastNode.connect(this.bassNode);
      lastNode = this.bassNode;

      for (const filter of this.filters) {
        lastNode.connect(filter);
        lastNode = filter;
      }

      lastNode.connect(this.gainNode);
      this.gainNode.connect(this.analyserNode);
      this.analyserNode.connect(this.audioCtx.destination);

      this.isInitialized = true;
    } catch (e) {
      console.warn('[LieMusic] Web Audio API init warning:', e);
    }
  }

  public async playTrack(track: Track, streamUrl: string) {
    this.currentTrack = track;

    // For local loopback or data URLs, do NOT use crossOrigin='anonymous'
    if (streamUrl.includes('127.0.0.1') || streamUrl.startsWith('data:') || streamUrl.startsWith('blob:')) {
      this.audio.removeAttribute('crossorigin');
    } else {
      this.audio.crossOrigin = 'anonymous';
    }

    this.initAudioNodes();

    if (this.audioCtx && this.audioCtx.state === 'suspended') {
      try {
        await this.audioCtx.resume();
      } catch {}
    }

    this.audio.src = streamUrl;
    this.audio.load();

    try {
      await this.audio.play();
    } catch (err) {
      console.error('[LieMusic] Playback error:', err);
    }

    this.updateMediaSession();
    this.syncAndroidNotification(true);
  }

  public togglePlayPause() {
    if (this.audio.paused) {
      this.initAudioNodes();
      if (this.audioCtx && this.audioCtx.state === 'suspended') {
        this.audioCtx.resume().catch(console.error);
      }
      this.audio.play().catch(console.error);
      this.syncAndroidNotification(true);
    } else {
      this.audio.pause();
      this.syncAndroidNotification(false);
    }
  }

  public pause() {
    this.audio.pause();
    this.syncAndroidNotification(false);
  }

  public seek(seconds: number) {
    if (!isNaN(seconds) && isFinite(seconds)) {
      this.audio.currentTime = Math.max(0, Math.min(seconds, this.audio.duration || 9999));
    }
  }

  public setVolume(vol: number) {
    const clamped = Math.max(0, Math.min(1, vol));
    this.audio.volume = clamped;
  }

  public getVolume(): number {
    return this.audio.volume;
  }

  public isPlaying(): boolean {
    return !this.audio.paused && !this.audio.ended && this.audio.readyState > 2;
  }

  public getCurrentTime(): number {
    return this.audio.currentTime || 0;
  }

  public getDuration(): number {
    return isNaN(this.audio.duration) ? (this.currentTrack?.duration || 0) : this.audio.duration;
  }

  public setBandGain(index: number, dbGain: number) {
    this.initAudioNodes();
    if (this.filters[index]) {
      this.filters[index].gain.value = Math.max(-12, Math.min(12, dbGain));
    }
  }

  public setBassBoost(level: number) {
    this.initAudioNodes();
    if (this.bassNode) {
      const gain = (Math.max(0, Math.min(100, level)) / 100) * 12;
      this.bassNode.gain.value = gain;
    }
  }

  public applyPreset(preset: EqualizerPreset) {
    this.initAudioNodes();
    preset.bands.forEach((gain, i) => {
      this.setBandGain(i, gain);
    });
    this.setBassBoost(preset.bassBoost || 0);
  }

  public getVisualizerData(): Uint8Array {
    if (!this.analyserNode) {
      return new Uint8Array(32);
    }
    const data = new Uint8Array(this.analyserNode.frequencyBinCount);
    this.analyserNode.getByteFrequencyData(data);
    return data;
  }

  private updateMediaSession() {
    if (!('mediaSession' in navigator) || !this.currentTrack) return;

    try {
      navigator.mediaSession.metadata = new MediaMetadata({
        title: this.currentTrack.title,
        artist: this.currentTrack.artist,
        album: this.currentTrack.album || 'LieMusic',
        artwork: [
          { src: this.currentTrack.thumbnail, sizes: '512x512', type: 'image/jpeg' },
        ],
      });

      navigator.mediaSession.playbackState = this.audio.paused ? 'paused' : 'playing';
    } catch {}
  }

  private setupMediaSessionHandlers() {
    if (!('mediaSession' in navigator)) return;

    try {
      navigator.mediaSession.setActionHandler('play', () => this.togglePlayPause());
      navigator.mediaSession.setActionHandler('pause', () => this.togglePlayPause());
      navigator.mediaSession.setActionHandler('seekto', (details) => {
        if (details.seekTime !== undefined) {
          this.seek(details.seekTime);
        }
      });
    } catch (e) {
      console.warn('[LieMusic] MediaSession action handler error:', e);
    }
  }

  public setActionHandlers(handlers: { onNext?: () => void; onPrev?: () => void }) {
    if (handlers.onNext) {
      this.onNextCallback = handlers.onNext;
      if ('mediaSession' in navigator) {
        try {
          navigator.mediaSession.setActionHandler('nexttrack', handlers.onNext);
        } catch {}
      }
    }
    if (handlers.onPrev) {
      this.onPrevCallback = handlers.onPrev;
      if ('mediaSession' in navigator) {
        try {
          navigator.mediaSession.setActionHandler('previoustrack', handlers.onPrev);
        } catch {}
      }
    }
  }

  public onTrackEnd(cb: AudioCallback) {
    this.onTrackEndCallbacks.push(cb);
    return () => {
      this.onTrackEndCallbacks = this.onTrackEndCallbacks.filter((c) => c !== cb);
    };
  }

  public onTimeUpdate(cb: TimeCallback) {
    this.onTimeUpdateCallbacks.push(cb);
    return () => {
      this.onTimeUpdateCallbacks = this.onTimeUpdateCallbacks.filter((c) => c !== cb);
    };
  }

  public onPlayStateChange(cb: (isPlaying: boolean) => void) {
    this.onPlayStateChangeCallbacks.push(cb);
    return () => {
      this.onPlayStateChangeCallbacks = this.onPlayStateChangeCallbacks.filter((c) => c !== cb);
    };
  }
}

export const audioEngine = new AudioEngine();
