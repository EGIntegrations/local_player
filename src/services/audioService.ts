import { Howl, Howler } from 'howler';
import type { EqualizerState } from '../types/settings';

const EQ_FREQUENCIES = [31, 62, 125, 250, 500, 1000, 2000, 4000, 8000, 16000];
const LEVEL_BUFFER_SIZE = 1024;

export type AudioSourceKind = 'asset' | 'blob';

export interface PlaybackDiagnostics {
  loadCount: number;
  fallbackCount: number;
  lastSource: AudioSourceKind | null;
  lastLoadMs: number;
  activeBlobCount: number;
}

function clamp(value: number, min: number, max: number): number {
  return Math.max(min, Math.min(max, value));
}

function dbToGain(db: number): number {
  return Math.pow(10, db / 20);
}

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
  private leftAnalyser: AnalyserNode | null = null;
  private rightAnalyser: AnalyserNode | null = null;
  private stereoSplitter: ChannelSplitterNode | null = null;
  private preampNode: GainNode | null = null;
  private outputNode: GainNode | null = null;
  private eqNodes: BiquadFilterNode[] = [];
  private graphInitialized = false;
  private sourceNode: MediaElementAudioSourceNode | null = null;
  private sourceNodeByElement = new WeakMap<HTMLMediaElement, MediaElementAudioSourceNode>();
  private loadSequence = 0;
  private levelBuffer = new Uint8Array(LEVEL_BUFFER_SIZE);
  private diagnostics: PlaybackDiagnostics = {
    loadCount: 0,
    fallbackCount: 0,
    lastSource: null,
    lastLoadMs: 0,
    activeBlobCount: 0,
  };
  private eqState: EqualizerState = {
    bands: [...EQ_FREQUENCIES.map(() => 0)],
    preampDb: 0,
    output: 1,
    bypass: false,
  };

  constructor() {
    Howler.volume(this._volume);
  }

  getAnalyser(): AnalyserNode | null {
    return this.analyser;
  }

  getStereoAnalysers(): { left: AnalyserNode | null; right: AnalyserNode | null } {
    return {
      left: this.leftAnalyser,
      right: this.rightAnalyser,
    };
  }

  getDiagnostics(): PlaybackDiagnostics {
    return { ...this.diagnostics };
  }

  setActiveBlobCount(count: number) {
    this.diagnostics.activeBlobCount = Math.max(0, Number.isFinite(count) ? Math.round(count) : 0);
  }

  private emitDebug(message: string) {
    this.onDebugCallback?.(message);
  }

  private ensureAudioGraph() {
    if (!this.audioContext) {
      const ContextCtor = window.AudioContext || (window as any).webkitAudioContext;
      if (!ContextCtor) {
        this.emitDebug('analyser: AudioContext API unavailable');
        return false;
      }
      this.audioContext = new ContextCtor();
    }

    if (!this.analyser) {
      this.analyser = this.audioContext.createAnalyser();
      this.analyser.fftSize = 1024;
      this.analyser.smoothingTimeConstant = 0.8;
    }
    if (!this.leftAnalyser) {
      this.leftAnalyser = this.audioContext.createAnalyser();
      this.leftAnalyser.fftSize = 1024;
      this.leftAnalyser.smoothingTimeConstant = 0.78;
    }
    if (!this.rightAnalyser) {
      this.rightAnalyser = this.audioContext.createAnalyser();
      this.rightAnalyser.fftSize = 1024;
      this.rightAnalyser.smoothingTimeConstant = 0.78;
    }
    if (!this.preampNode) {
      this.preampNode = this.audioContext.createGain();
    }
    if (!this.outputNode) {
      this.outputNode = this.audioContext.createGain();
    }
    if (!this.stereoSplitter) {
      this.stereoSplitter = this.audioContext.createChannelSplitter(2);
    }
    if (this.eqNodes.length === 0) {
      this.eqNodes = EQ_FREQUENCIES.map((frequency) => {
        const node = this.audioContext!.createBiquadFilter();
        node.type = 'peaking';
        node.frequency.value = frequency;
        node.Q.value = 1.0;
        node.gain.value = 0;
        return node;
      });
    }
    if (!this.graphInitialized) {
      let cursor: AudioNode = this.preampNode;
      for (const eqNode of this.eqNodes) {
        cursor.connect(eqNode);
        cursor = eqNode;
      }
      cursor.connect(this.outputNode);
      this.outputNode.connect(this.audioContext.destination);
      this.outputNode.connect(this.analyser);
      this.outputNode.connect(this.stereoSplitter);
      this.stereoSplitter.connect(this.leftAnalyser, 0);
      this.stereoSplitter.connect(this.rightAnalyser, 1);
      this.graphInitialized = true;
    }

    this.applyEqStateToNodes();
    return true;
  }

  private applyEqStateToNodes() {
    if (!this.preampNode || !this.outputNode) return;
    this.preampNode.gain.value = this.eqState.bypass ? 1 : dbToGain(this.eqState.preampDb);
    this.outputNode.gain.value = clamp(this.eqState.output, 0, 1);
    for (let i = 0; i < this.eqNodes.length; i += 1) {
      this.eqNodes[i].gain.value = this.eqState.bypass ? 0 : this.eqState.bands[i] ?? 0;
    }
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
      if (!this.ensureAudioGraph() || !this.preampNode) return;

      let nextSourceNode = this.sourceNodeByElement.get(audioElement);
      if (!nextSourceNode) {
        nextSourceNode = this.audioContext!.createMediaElementSource(audioElement);
        this.sourceNodeByElement.set(audioElement, nextSourceNode);
      }

      if (this.sourceNode !== nextSourceNode) {
        if (this.sourceNode) {
          try {
            this.sourceNode.disconnect(this.preampNode);
          } catch {
            this.sourceNode.disconnect();
          }
        }
        nextSourceNode.connect(this.preampNode);
        this.sourceNode = nextSourceNode;
      }

      this.emitDebug('analyser: connected');
    } catch (err) {
      const message = err instanceof Error ? err.message : String(err);
      this.emitDebug(`analyser: connect failed - ${message}`);
    }
  }

  async loadTrack(
    url: string,
    sourceKind: AudioSourceKind = 'asset',
    formatHints: string[] = []
  ): Promise<void> {
    const loadId = ++this.loadSequence;
    const startedAt = performance.now();
    this.diagnostics.loadCount += 1;
    this.diagnostics.lastSource = sourceKind;
    if (sourceKind === 'blob') {
      this.diagnostics.fallbackCount += 1;
    }

    if (this.currentHowl) {
      this.currentHowl.stop();
      this.currentHowl.unload();
      this.currentHowl = null;
      this.clearProgressInterval();
    }

    this.emitDebug(`track: loading ${url.slice(0, 80)}`);
    // Prefer HTMLMediaElement mode so the DSP/visualizer graph can attach consistently.
    const html5Order = [true, false];
    const failures: string[] = [];

    for (const html5 of html5Order) {
      try {
        await this.loadHowl(url, html5, loadId, formatHints);
        this.diagnostics.lastLoadMs = Math.round(performance.now() - startedAt);
        if (import.meta.env.DEV) {
          const d = this.diagnostics;
          this.emitDebug(
            `diag: source=${sourceKind} loadMs=${d.lastLoadMs} fallbackCount=${d.fallbackCount} blobs=${d.activeBlobCount}`
          );
        }
        return;
      } catch (error) {
        const message = error instanceof Error ? error.message : String(error);
        failures.push(`html5=${html5} ${message}`);
        const staleHowl = this.currentHowl;
        if (staleHowl) {
          (staleHowl as any).unload?.();
        }
        this.currentHowl = null;
      }
    }

    throw new Error(failures.join(' | '));
  }

  private async loadHowl(
    url: string,
    html5: boolean,
    loadId: number,
    formatHints: string[]
  ): Promise<void> {
    await new Promise<void>((resolve, reject) => {
      const howl = new Howl({
        src: [url],
        format: formatHints.length > 0 ? formatHints : undefined,
        html5,
        volume: this._volume,
        onload: () => {
          if (this.loadSequence !== loadId || this.currentHowl !== howl) return;
          this.connectAnalyser(howl);
          if (this.onLoadCallback) {
            this.onLoadCallback(howl.duration());
          }
          this.emitDebug(`track: loaded (html5=${html5})`);
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
          this.emitDebug(`track: ${message} (html5=${html5})`);
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

  getEqState(): EqualizerState {
    return {
      bands: [...this.eqState.bands],
      preampDb: this.eqState.preampDb,
      output: this.eqState.output,
      bypass: this.eqState.bypass,
    };
  }

  setEqBandGain(index: number, gainDb: number) {
    if (index < 0 || index >= this.eqState.bands.length) return;
    this.eqState.bands[index] = clamp(gainDb, -12, 12);
    this.applyEqStateToNodes();
  }

  setEqPreamp(gainDb: number) {
    this.eqState.preampDb = clamp(gainDb, -12, 12);
    this.applyEqStateToNodes();
  }

  setEqOutput(value: number) {
    this.eqState.output = clamp(value, 0, 1);
    this.applyEqStateToNodes();
  }

  setEqBypass(enabled: boolean) {
    this.eqState.bypass = Boolean(enabled);
    this.applyEqStateToNodes();
  }

  resetEq() {
    this.eqState = {
      bands: [...EQ_FREQUENCIES.map(() => 0)],
      preampDb: 0,
      output: 1,
      bypass: false,
    };
    this.applyEqStateToNodes();
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

  getOutputLevel(): number {
    if (!this.analyser) return 0;
    if (this.levelBuffer.length !== this.analyser.fftSize) {
      this.levelBuffer = new Uint8Array(this.analyser.fftSize);
    }
    this.analyser.getByteTimeDomainData(this.levelBuffer);
    let sumSquares = 0;
    for (let i = 0; i < this.levelBuffer.length; i += 1) {
      const sample = (this.levelBuffer[i] - 128) / 128;
      sumSquares += sample * sample;
    }
    const rms = Math.sqrt(sumSquares / this.levelBuffer.length);
    return clamp(rms * 4.2, 0, 1);
  }

  isOutputClipping(threshold = 0.985): boolean {
    if (!this.analyser) return false;
    if (this.levelBuffer.length !== this.analyser.fftSize) {
      this.levelBuffer = new Uint8Array(this.analyser.fftSize);
    }
    this.analyser.getByteTimeDomainData(this.levelBuffer);
    for (let i = 0; i < this.levelBuffer.length; i += 1) {
      const sample = Math.abs((this.levelBuffer[i] - 128) / 128);
      if (sample >= threshold) return true;
    }
    return false;
  }

  fillSpectrumData(target: Uint8Array): number {
    if (!this.analyser) return 0;
    const size = Math.min(target.length, this.analyser.frequencyBinCount);
    if (size <= 0) return 0;
    if (target.length !== this.analyser.frequencyBinCount) {
      const tmp = new Uint8Array(this.analyser.frequencyBinCount);
      this.analyser.getByteFrequencyData(tmp);
      target.set(tmp.subarray(0, size), 0);
      return size;
    }
    this.analyser.getByteFrequencyData(target);
    return size;
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
    this.graphInitialized = false;
    this.preampNode?.disconnect();
    this.outputNode?.disconnect();
    this.stereoSplitter?.disconnect();
    this.analyser?.disconnect();
    this.leftAnalyser?.disconnect();
    this.rightAnalyser?.disconnect();
    this.eqNodes.forEach((node) => node.disconnect());
    this.preampNode = null;
    this.outputNode = null;
    this.stereoSplitter = null;
    this.eqNodes = [];
    this.currentHowl?.unload();
    this.clearProgressInterval();
    this.audioContext?.close();
    this.audioContext = null;
    this.analyser = null;
    this.leftAnalyser = null;
    this.rightAnalyser = null;
    this.sourceNode = null;
    this.levelBuffer = new Uint8Array(LEVEL_BUFFER_SIZE);
    this.diagnostics.activeBlobCount = 0;
  }
}
