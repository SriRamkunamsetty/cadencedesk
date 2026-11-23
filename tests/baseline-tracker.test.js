// tests/baseline-tracker.test.js
import { describe, it, expect, beforeEach } from 'vitest';
const { BaselineTracker, calculateMedian } = require('../src/core/baseline-tracker.js');

describe('BaselineTracker', () => {
  let tracker;

  beforeEach(() => {
    tracker = new BaselineTracker({ calibrationPeriodMs: 45000 });
  });

  it('correctly calculates median values', () => {
    expect(calculateMedian([70, 72, 75])).toBe(72);
    expect(calculateMedian([70, 72, 74, 76])).toBe(73);
    expect(calculateMedian([])).toBe(null);
  });

  it('collects pulse samples after 12s and breathing after 30s, locking at 45s', () => {
    // 0-11s: No pulse samples collected
    tracker.update({ isFaceValid: true, isTalking: false, isPulseReady: true, pulse: { bpm: 70 } }, 5000);
    expect(tracker.pulseSamples.length).toBe(0);

    // 12-45s: Pulse samples collected
    for (let t = 12000; t <= 44000; t += 4000) {
      tracker.update({ isFaceValid: true, isTalking: false, isPulseReady: true, pulse: { bpm: 72 } }, t);
    }
    expect(tracker.pulseSamples.length).toBeGreaterThan(5);

    // 30-45s: Breathing samples collected
    for (let t = 30000; t <= 44000; t += 3000) {
      tracker.update({ isFaceValid: true, isTalking: false, isBreathingReady: true, breathing: { rate: 15 } }, t);
    }
    expect(tracker.breathingSamples.length).toBeGreaterThan(4);

    // At 45s: Baseline locks!
    const deltas = tracker.update(
      { isFaceValid: true, isTalking: false, isPulseReady: true, pulse: { bpm: 72 }, isBreathingReady: true, breathing: { rate: 15 } },
      45000
    );
    expect(deltas.isLocked).toBe(true);
    expect(deltas.baselinePulse).toBe(72);
    expect(deltas.baselineBreathing).toBe(15);
  });

  it('detects elevated pulse (+12 BPM) and elevated breathing (+25%) above calm baseline', () => {
    tracker.baselinePulse = 70;
    tracker.baselineBreathing = 14;
    tracker.isLocked = true;

    // Normal state
    const normalState = { isPulseReady: true, pulse: { bpm: 75 }, isBreathingReady: true, breathing: { rate: 15 } };
    const res1 = tracker.getDeltas(normalState);
    expect(res1.isElevatedPulse).toBe(false);
    expect(res1.isElevatedBreathing).toBe(false);

    // Stress spike: pulse 84 (+14 bpm), breathing 19 (+35%)
    const spikeState = { isPulseReady: true, pulse: { bpm: 84 }, isBreathingReady: true, breathing: { rate: 19 } };
    const res2 = tracker.getDeltas(spikeState);
    expect(res2.isElevatedPulse).toBe(true);
    expect(res2.deltaPulse).toBe(14);
    expect(res2.isElevatedBreathing).toBe(true);
    expect(res2.deltaBreathingPercent).toBeGreaterThanOrEqual(25);
  });
});
