import { Howl, Howler } from 'howler';

export class AudioService {
  private currentHowl: Howl | null = null;
  private _volume = 0.7;
  private onProgressCallback?: (progress: number) => void;
  private onEndCallback?: () => void;
  private onLoadCallback?: (duration: number) => void;
  private progressInterval: number | null = null;

  // Web Audio API for visualizations
  private audioContext: AudioContext | null = null;
  private analyser: AnalyserNode | null = null;
  private sourceNode: MediaElementAudioSourceNode | null = null;
  private connectedElement: HTMLMediaElement | null = null;

  constructor() {
    Howler.volume(this._volume);
  }

  getAnalyser(): AnalyserNode | null {
    return this.analyser;
  }

  private connectAnalyser() {
    if (!this.currentHowl) return;

    // Howler exposes the underlying HTML audio element via _sounds[0]._node
    const sounds = (this.currentHowl as any)._sounds;
    if (!sounds || sounds.length === 0) return;
    const audioElement: HTMLMediaElement | undefined = sounds[0]?._node;
    if (!audioElement) return;

    // Don't reconnect the same element
    if (this.connectedElement === audioElement) return;

    try {
      if (!this.audioContext) {
        this.audioContext = new AudioContext();
      }

      this.analyser = this.audioContext.createAnalyser();
      this.analyser.fftSize = 256;
      this.analyser.smoothingTimeConstant = 0.8;

      this.sourceNode = this.audioContext.createMediaElementSource(audioElement);
      this.sourceNode.connect(this.analyser);
      this.analyser.connect(this.audioContext.destination);
      this.connectedElement = audioElement;
    } catch {
      // May fail if element already connected - that's OK
    }
  }

  loadTrack(url: string) {
    if (this.currentHowl) {
      this.currentHowl.unload();
      this.clearProgressInterval();
    }

    // Reset source tracking so new element gets connected
    this.connectedElement = null;
    this.sourceNode = null;

    this.currentHowl = new Howl({
      src: [url],
      html5: true,
      volume: this._volume,
      onload: () => {
        this.connectAnalyser();
        if (this.onLoadCallback && this.currentHowl) {
          this.onLoadCallback(this.currentHowl.duration());
        }
      },
      onplay: () => {
        this.connectAnalyser();
        if (this.audioContext?.state === 'suspended') {
          this.audioContext.resume();
        }
        this.startProgressInterval();
      },
      onpause: () => {
        this.clearProgressInterval();
      },
      onstop: () => {
        this.clearProgressInterval();
      },
      onend: () => {
        this.clearProgressInterval();
        this.onEndCallback?.();
      },
    });
  }

  play() {
    this.currentHowl?.play();
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
    this.currentHowl?.unload();
    this.clearProgressInterval();
    this.audioContext?.close();
    this.audioContext = null;
    this.analyser = null;
    this.sourceNode = null;
    this.connectedElement = null;
  }
}
