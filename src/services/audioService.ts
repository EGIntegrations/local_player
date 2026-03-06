import { Howl, Howler } from 'howler';

export class AudioService {
  private currentHowl: Howl | null = null;
  private _volume = 0.7;
  private onProgressCallback?: (progress: number) => void;
  private onEndCallback?: () => void;
  private onLoadCallback?: (duration: number) => void;
  private progressInterval: number | null = null;

  constructor() {
    Howler.volume(this._volume);
  }

  loadTrack(url: string) {
    if (this.currentHowl) {
      this.currentHowl.unload();
      this.clearProgressInterval();
    }

    this.currentHowl = new Howl({
      src: [url],
      html5: true,
      volume: this._volume,
      onload: () => {
        if (this.onLoadCallback && this.currentHowl) {
          this.onLoadCallback(this.currentHowl.duration());
        }
      },
      onplay: () => {
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
  }
}
