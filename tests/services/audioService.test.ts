import { describe, it, expect, vi, beforeEach } from 'vitest';

// Mock howler before importing AudioService
vi.mock('howler', () => {
  class MockHowl {
    play = vi.fn();
    pause = vi.fn();
    stop = vi.fn();
    seek = vi.fn().mockReturnValue(0);
    duration = vi.fn().mockReturnValue(180);
    volume = vi.fn();
    playing = vi.fn().mockReturnValue(false);
    unload = vi.fn();
    _sounds: any[] = [];
    constructor(_opts: any) {}
  }

  return {
    Howl: MockHowl,
    Howler: { volume: vi.fn() },
  };
});

import { AudioService } from '../../src/services/audioService';

describe('AudioService', () => {
  let audio: AudioService;

  beforeEach(() => {
    vi.clearAllMocks();
    audio = new AudioService();
  });

  it('should initialize with default volume', () => {
    expect(audio.getVolume()).toBe(0.7);
  });

  it('should clamp volume between 0 and 1', () => {
    audio.setVolume(1.5);
    expect(audio.getVolume()).toBe(1);

    audio.setVolume(-0.5);
    expect(audio.getVolume()).toBe(0);

    audio.setVolume(0.5);
    expect(audio.getVolume()).toBe(0.5);
  });

  it('should return false for isPlaying when no track loaded', () => {
    expect(audio.isPlaying()).toBe(false);
  });

  it('should return 0 for seek when no track loaded', () => {
    expect(audio.getSeek()).toBe(0);
  });

  it('should return 0 for duration when no track loaded', () => {
    expect(audio.getDuration()).toBe(0);
  });

  it('should return null analyser initially', () => {
    expect(audio.getAnalyser()).toBeNull();
  });

  it('should register callbacks', () => {
    const progressCb = vi.fn();
    const endCb = vi.fn();
    const loadCb = vi.fn();

    // These should not throw
    audio.onProgress(progressCb);
    audio.onEnd(endCb);
    audio.onLoad(loadCb);
  });

  it('should expose default equalizer state', () => {
    const eq = audio.getEqState();
    expect(eq.bands).toEqual([0, 0, 0, 0, 0, 0, 0, 0, 0, 0]);
    expect(eq.preampDb).toBe(0);
    expect(eq.output).toBe(1);
    expect(eq.bypass).toBe(false);
  });

  it('should clamp equalizer values', () => {
    audio.setEqBandGain(0, 20);
    audio.setEqBandGain(1, -17);
    audio.setEqPreamp(30);
    audio.setEqOutput(-5);
    audio.setEqBypass(true);

    const eq = audio.getEqState();
    expect(eq.bands[0]).toBe(12);
    expect(eq.bands[1]).toBe(-12);
    expect(eq.preampDb).toBe(12);
    expect(eq.output).toBe(0);
    expect(eq.bypass).toBe(true);
  });

  it('should reset equalizer state', () => {
    audio.setEqBandGain(4, 6);
    audio.setEqPreamp(5);
    audio.setEqOutput(0.4);
    audio.setEqBypass(true);
    audio.resetEq();

    const eq = audio.getEqState();
    expect(eq.bands).toEqual([0, 0, 0, 0, 0, 0, 0, 0, 0, 0]);
    expect(eq.preampDb).toBe(0);
    expect(eq.output).toBe(1);
    expect(eq.bypass).toBe(false);
  });

  it('should load a track without throwing', () => {
    expect(() => audio.loadTrack('/test.mp3')).not.toThrow();
  });

  it('should handle play/pause/stop on null howl', () => {
    // These should be no-ops, not errors
    expect(() => audio.play()).not.toThrow();
    expect(() => audio.pause()).not.toThrow();
    expect(() => audio.stop()).not.toThrow();
    expect(() => audio.seek(10)).not.toThrow();
  });

  it('should cleanup without errors', () => {
    expect(() => audio.cleanup()).not.toThrow();
  });

  it('should cleanup after loading a track', () => {
    audio.loadTrack('/test.mp3');
    expect(() => audio.cleanup()).not.toThrow();
  });
});
