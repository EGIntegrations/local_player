import { Howl, Howler } from 'howler';

export class AudioService {
  private currentHowl: Howl | null = null;
  private _volume = 0.7;
  private onProgressCallback?: (progress: number) => void;
  private onEndCallback?: () => void;
  private onLoadCallback?: (duration: number) => void;
  private onErrorCallback?: (message: string) => void;
  private onDebugCallback?: (message: string) => void;
  private progressInterval: number | null = null;

  // Web Audio API for visualizations
  private audioContext: AudioContext | null = null;
  private analyser: AnalyserNode | null = null;
  private sourceNode: MediaElementAudioSourceNode | null = null;
  private sourceNodeByElement = new WeakMap<HTMLMediaElement, MediaElementAudioSourceNode>();
  private analyserConnectedToDestination = false;
  private loadSequence = 0;

  constructor() {
    Howler.volume(this._volume);
  }

  getAnalyser(): AnalyserNode | null {
    return this.analyser;
  }

  private emitDebug(message: string) {
    this.onDebugCallback?.(message);
  }

  private connectAnalyser(howl: Howl | null = this.currentHowl) {
    if (!howl) return;

    // Howler exposes the underlying HTML audio element via _sounds[0]._node
    const sounds = (howl as any)._sounds;
    if (!sounds || sounds.length === 0) {
      this.emitDebug('analyser: no active Howler sounds');
      return;
    }
    const audioElement: HTMLMediaElement | undefined =
      sounds.find((sound: any) => sound?._node instanceof HTMLMediaElement)?._node ??
      sounds[0]?._node;
    if (!audioElement) {
      this.emitDebug('analyser: no HTML media element found');
      return;
    }

    try {
      if (!this.audioContext) {
        const ContextCtor = window.AudioContext || (window as any).webkitAudioContext;
        if (!ContextCtor) {
          this.emitDebug('analyser: AudioContext API unavailable');
          return;
        }
        this.audioContext = new ContextCtor();
      }

      if (!this.analyser) {
        this.analyser = this.audioContext.createAnalyser();
        this.analyser.fftSize = 256;
        this.analyser.smoothingTimeConstant = 0.8;
      }
      if (!this.analyserConnectedToDestination) {
        this.analyser.connect(this.audioContext.destination);
        this.analyserConnectedToDestination = true;
      }

      let nextSourceNode = this.sourceNodeByElement.get(audioElement);
      if (!nextSourceNode) {
        nextSourceNode = this.audioContext.createMediaElementSource(audioElement);
        this.sourceNodeByElement.set(audioElement, nextSourceNode);
      }

      if (this.sourceNode !== nextSourceNode) {
        if (this.sourceNode) {
          try {
            this.sourceNode.disconnect(this.analyser);
          } catch {
            this.sourceNode.disconnect();
          }
        }
        nextSourceNode.connect(this.analyser);
        this.sourceNode = nextSourceNode;
      }

      this.emitDebug('analyser: connected');
    } catch (err) {
      const message = err instanceof Error ? err.message : String(err);
      this.emitDebug(`analyser: connect failed - ${message}`);
    }
  }

  async loadTrack(url: string): Promise<void> {
    const loadId = ++this.loadSequence;
    if (this.currentHowl) {
      this.currentHowl.unload();
      this.clearProgressInterval();
    }

    this.emitDebug(`track: loading ${url.slice(0, 80)}`);

    await new Promise<void>((resolve, reject) => {
      const howl = new Howl({
        src: [url],
        html5: true,
        volume: this._volume,
        onload: () => {
          if (this.loadSequence !== loadId || this.currentHowl !== howl) return;
          this.connectAnalyser(howl);
          if (this.onLoadCallback) {
            this.onLoadCallback(howl.duration());
          }
          this.emitDebug('track: loaded');
          resolve();
        },
        onplay: () => {
          if (this.loadSequence !== loadId || this.currentHowl !== howl) return;
          this.connectAnalyser(howl);
          if (this.audioContext?.state === 'suspended') {
            this.audioContext.resume().catch(() => undefined);
          }
          this.startProgressInterval();
        },
        onpause: () => {
          if (this.currentHowl !== howl) return;
          this.clearProgressInterval();
        },
        onstop: () => {
          if (this.currentHowl !== howl) return;
          this.clearProgressInterval();
        },
        onend: () => {
          if (this.currentHowl !== howl) return;
          this.clearProgressInterval();
          this.onEndCallback?.();
        },
        onloaderror: (_id, error) => {
          if (this.loadSequence !== loadId || this.currentHowl !== howl) return;
          const message = `load failed (${this.describeMediaError(error)})`;
          this.emitDebug(`track: ${message}`);
          reject(new Error(message));
        },
        onplayerror: (_id, error) => {
          if (this.currentHowl !== howl) return;
          this.onErrorCallback?.(`play failed (${this.describeMediaError(error)})`);
        },
      });
      this.currentHowl = howl;
    });
  }

  play() {
    this.currentHowl?.play();
  }

  async playWithConfirm(timeoutMs = 2500): Promise<void> {
    const howl = this.currentHowl;
    if (!howl) {
      throw new Error('No track loaded');
    }

    const playId = howl.play();
    if (typeof playId !== 'number') {
      throw new Error('Unable to start playback');
    }
    if (howl.playing(playId)) {
      this.connectAnalyser(howl);
      return;
    }

    await new Promise<void>((resolve, reject) => {
      let timeoutHandle: number | null = null;

      const cleanup = () => {
        howl.off('play', handlePlay, playId);
        howl.off('playerror', handlePlayError, playId);
        if (timeoutHandle !== null) {
          window.clearTimeout(timeoutHandle);
          timeoutHandle = null;
        }
      };

      const handlePlay = (id: number) => {
        if (id !== playId) return;
        cleanup();
        this.connectAnalyser(howl);
        resolve();
      };

      const handlePlayError = (id: number, error: unknown) => {
        if (id !== playId) return;
        cleanup();
        reject(new Error(`play failed (${this.describeMediaError(error)})`));
      };

      howl.once('play', handlePlay, playId);
      howl.once('playerror', handlePlayError, playId);
      timeoutHandle = window.setTimeout(() => {
        cleanup();
        reject(new Error('play start timeout'));
      }, timeoutMs);
    });
  }

  pause() {
    this.currentHowl?.pause();
  }

  stop() {
    this.currentHowl?.stop();
  }

  seek(position: number) {
    this.currentHowl?.seek(position);
  }

  getSeek(): number {
    return (this.currentHowl?.seek() as number) ?? 0;
  }

  getDuration(): number {
    return this.currentHowl?.duration() ?? 0;
  }

  setVolume(volume: number) {
    this._volume = Math.max(0, Math.min(1, volume));
    if (this.currentHowl) {
      this.currentHowl.volume(this._volume);
    }
  }

  getVolume(): number {
    return this._volume;
  }

  isPlaying(): boolean {
    return this.currentHowl?.playing() ?? false;
  }

  onProgress(callback: (progress: number) => void) {
    this.onProgressCallback = callback;
  }

  onEnd(callback: () => void) {
    this.onEndCallback = callback;
  }

  onLoad(callback: (duration: number) => void) {
    this.onLoadCallback = callback;
  }

  onError(callback: (message: string) => void) {
    this.onErrorCallback = callback;
  }

  onDebug(callback: (message: string) => void) {
    this.onDebugCallback = callback;
  }

  private describeMediaError(error: unknown): string {
    const code = Number(error);
    if (code === 1) return 'MEDIA_ERR_ABORTED';
    if (code === 2) return 'MEDIA_ERR_NETWORK';
    if (code === 3) return 'MEDIA_ERR_DECODE';
    if (code === 4) return 'MEDIA_ERR_SRC_NOT_SUPPORTED';
    return String(error);
  }

  private startProgressInterval() {
    this.clearProgressInterval();
    this.progressInterval = window.setInterval(() => {
      if (this.onProgressCallback && this.currentHowl) {
        this.onProgressCallback(this.getSeek());
      }
    }, 100);
  }

  private clearProgressInterval() {
    if (this.progressInterval) {
      clearInterval(this.progressInterval);
      this.progressInterval = null;
    }
  }

  cleanup() {
    this.stop();
    this.sourceNode?.disconnect();
    this.sourceNode = null;
    this.sourceNodeByElement = new WeakMap<HTMLMediaElement, MediaElementAudioSourceNode>();
    this.analyserConnectedToDestination = false;
    this.currentHowl?.unload();
    this.clearProgressInterval();
    this.audioContext?.close();
    this.audioContext = null;
    this.analyser = null;
    this.sourceNode = null;
  }
}
