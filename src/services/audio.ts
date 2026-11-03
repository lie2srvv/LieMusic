import { Track, EqualizerPreset } from '../types';
import { getHighResThumbnail } from '../utils/thumbnail';

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
  private onErrorCallbacks: ((error: any) => void)[] = [];
  private onNextCallback: (() => void) | null = null;
  private onPrevCallback: (() => void) | null = null;

  private playPromise: Promise<void> | null = null;
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

    this.audio.addEventListener('error', () => {
      console.warn('[LieMusic] HTMLAudioElement error event:', this.audio.error);
      this.onPlayStateChangeCallbacks.forEach((cb) => cb(false));
      this.onErrorCallbacks.forEach((cb) => cb(this.audio.error));
      this.syncAndroidNotification(false);
    });

    this.audio.addEventListener('stalled', () => {
      console.warn('[LieMusic] HTMLAudioElement playback stalled');
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

    window.addEventListener('android_media_seek', (event: any) => {
      const seconds = event.detail;
      if (typeof seconds === 'number' && !isNaN(seconds)) {
        this.seek(seconds);
      }
    });
  }

  private syncAndroidNotification(isPlaying: boolean) {
    try {
      const bridge = (window as any).AndroidMediaNotification;
      if (bridge && this.currentTrack) {
        const posMs = Math.round((this.audio.currentTime || 0) * 1000);
        const durMs = Math.round(
          (isNaN(this.audio.duration) ? (this.currentTrack.duration || 0) : this.audio.duration) * 1000
        );
        bridge.updateState(
          this.currentTrack.title || 'LieMusic',
          this.currentTrack.artist || 'LieMusic',
          getHighResThumbnail(this.currentTrack.thumbnail) || '',
          isPlaying,
          posMs,
          durMs
        );
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

      // Connect graph: source -> bass -> eq[0]...eq[9] -> gain -> analyser -> destination
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
    } catch (err) {
      console.warn('[LieMusic] Web Audio API init warning (likely autoplay policy):', err);
    }
  }

  public async playTrack(track: Track, streamUrl: string) {
    this.currentTrack = { ...track, thumbnail: getHighResThumbnail(track.thumbnail) };
    this.initAudioNodes();

    if (this.audioCtx && this.audioCtx.state === 'suspended') {
      try {
        await this.audioCtx.resume();
      } catch (e) {
        console.warn('[LieMusic] AudioContext resume error:', e);
      }
    }

    // Set anonymous CORS so Web Audio API MediaElementSource does NOT silence the audio!
    if (streamUrl.startsWith('data:')) {
      this.audio.removeAttribute('crossorigin');
    } else {
      this.audio.crossOrigin = 'anonymous';
    }

    this.audio.src = streamUrl;
    this.audio.load();

    try {
      this.playPromise = this.audio.play();
      await this.playPromise;
    } catch (err: any) {
      if (err.name !== 'AbortError') {
        console.error('[LieMusic] Playback error in playTrack:', err);
        this.onErrorCallbacks.forEach((cb) => cb(err));
      }
    } finally {
      this.playPromise = null;
    }

    this.updateMediaSession();
    this.syncAndroidNotification(true);
  }

  /**
   * Instantly stops playback and detaches the previous audio source.
   * Prevents previous track from playing while a new track stream is resolving.
   */
  public stop() {
    this.playPromise = null;
    this.audio.pause();
    this.audio.currentTime = 0;
    this.audio.removeAttribute('src');
    this.audio.load();
    this.onPlayStateChangeCallbacks.forEach((cb) => cb(false));
    this.onTimeUpdateCallbacks.forEach((cb) => cb(0, 0));
    this.syncAndroidNotification(false);
  }

  public async togglePlayPause(): Promise<boolean> {
    if (this.audio.paused) {
      this.initAudioNodes();
      if (this.audioCtx && this.audioCtx.state === 'suspended') {
        try {
          await this.audioCtx.resume();
        } catch (e) {
          console.warn('[LieMusic] AudioContext resume error:', e);
        }
      }

      if (this.audio.error || !this.audio.src || this.audio.networkState === HTMLMediaElement.NETWORK_NO_SOURCE) {
        console.warn('[LieMusic] togglePlayPause: audio has error or no source');
        this.onErrorCallbacks.forEach((cb) => cb(this.audio.error || new Error('No audio source')));
        return false;
      }

      try {
        this.playPromise = this.audio.play();
        await this.playPromise;
        this.syncAndroidNotification(true);
        return true;
      } catch (err: any) {
        if (err.name !== 'AbortError') {
          console.error('[LieMusic] Playback error in togglePlayPause:', err);
          this.onErrorCallbacks.forEach((cb) => cb(err));
        }
        return false;
      } finally {
        this.playPromise = null;
      }
    } else {
      if (this.playPromise) {
        try {
          await this.playPromise;
        } catch {}
      }
      this.audio.pause();
      this.syncAndroidNotification(false);
      return false;
    }
  }

  public async pause() {
    if (this.playPromise) {
      try {
        await this.playPromise;
      } catch {}
    }
    this.audio.pause();
    this.syncAndroidNotification(false);
  }

  public seek(seconds: number) {
    if (!isNaN(seconds) && isFinite(seconds)) {
      this.audio.currentTime = Math.max(0, Math.min(seconds, this.audio.duration || 9999));
      this.syncAndroidNotification(!this.audio.paused);
    }
  }

  public setVolume(vol: number) {
    const clamped = Math.max(0, Math.min(1, vol));
    this.audio.volume = clamped;
  }

  public setEqualizerGain(bandIndex: number, gainDb: number) {
    this.initAudioNodes();
    if (this.filters[bandIndex]) {
      this.filters[bandIndex].gain.setTargetAtTime(gainDb, this.audioCtx?.currentTime || 0, 0.05);
    }
  }

  public setBandGain(bandIndex: number, gainDb: number) {
    this.setEqualizerGain(bandIndex, gainDb);
  }

  public setBassBoost(gainDb: number) {
    this.initAudioNodes();
    if (this.bassNode) {
      this.bassNode.gain.setTargetAtTime(gainDb, this.audioCtx?.currentTime || 0, 0.05);
    }
  }

  public applyPreset(preset: EqualizerPreset) {
    preset.bands.forEach((gain, i) => this.setEqualizerGain(i, gain));
    this.setBassBoost(preset.bassBoost ?? 0);
  }

  public getVisualizerData(): Uint8Array {
    if (!this.analyserNode) {
      return new Uint8Array(32);
    }
    const data = new Uint8Array(this.analyserNode.frequencyBinCount);
    this.analyserNode.getByteFrequencyData(data);
    return data;
  }

  public getCurrentTime(): number {
    return this.audio.currentTime || 0;
  }

  public getDuration(): number {
    return isNaN(this.audio.duration) ? (this.currentTrack?.duration || 0) : this.audio.duration;
  }

  public isPlaying(): boolean {
    return !this.audio.paused;
  }

  public hasError(): boolean {
    return !!this.audio.error;
  }

  public hasSource(): boolean {
    return !!this.audio.src && this.audio.networkState !== HTMLMediaElement.NETWORK_NO_SOURCE;
  }

  private updateMediaSession() {
    if (!('mediaSession' in navigator) || !this.currentTrack) return;

    try {
      navigator.mediaSession.metadata = new MediaMetadata({
        title: this.currentTrack.title,
        artist: this.currentTrack.artist,
        album: this.currentTrack.album || 'LieMusic',
        artwork: [
          { src: getHighResThumbnail(this.currentTrack.thumbnail), sizes: '96x96', type: 'image/jpeg' },
          { src: getHighResThumbnail(this.currentTrack.thumbnail), sizes: '128x128', type: 'image/jpeg' },
          { src: getHighResThumbnail(this.currentTrack.thumbnail), sizes: '192x192', type: 'image/jpeg' },
          { src: getHighResThumbnail(this.currentTrack.thumbnail), sizes: '512x512', type: 'image/jpeg' },
        ],
      });

      navigator.mediaSession.playbackState = this.audio.paused ? 'paused' : 'playing';
    } catch (e) {
      console.warn('[LieMusic] MediaSession metadata error:', e);
    }
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

  public onError(cb: (error: any) => void) {
    this.onErrorCallbacks.push(cb);
    return () => {
      this.onErrorCallbacks = this.onErrorCallbacks.filter((c) => c !== cb);
    };
  }
}

export const audioEngine = new AudioEngine();
