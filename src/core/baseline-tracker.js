// src/core/baseline-tracker.js
// Copyright (C) 2026 CadenceDesk Project
// Personal Calm Baseline Tracker (45-second calibration)

'use strict';

function calculateMedian(values) {
  if (!values || values.length === 0) return null;
  const sorted = [...values].sort((a, b) => a - b);
  const mid = Math.floor(sorted.length / 2);
  if (sorted.length % 2 !== 0) {
    return sorted[mid];
  }
  return (sorted[mid - 1] + sorted[mid]) / 2;
}

class BaselineTracker {
  constructor(options = {}) {
    this.calibrationPeriodMs = options.calibrationPeriodMs || 45000; // 45 seconds
    this.pulseSamples = [];
    this.breathingSamples = [];
    this.baselinePulse = null;
    this.baselineBreathing = null;
    this.isLocked = false;
  }

  reset() {
    this.pulseSamples = [];
    this.breathingSamples = [];
    this.baselinePulse = null;
    this.baselineBreathing = null;
    this.isLocked = false;
  }

  update(gatedState, elapsedMs) {
    if (this.isLocked) {
      return this.getDeltas(gatedState);
    }

    // Only collect baseline samples when user is silent, single-face, and signal is valid
    if (gatedState.isFaceValid && !gatedState.isTalking && !gatedState.isMultiFace) {
      // Pulse baseline: collected between 12s and 45s
      if (elapsedMs >= 12000 && elapsedMs <= this.calibrationPeriodMs && gatedState.isPulseReady && gatedState.pulse?.bpm) {
        this.pulseSamples.push(gatedState.pulse.bpm);
      }

      // Breathing baseline: collected between 30s and 45s
      if (elapsedMs >= 30000 && elapsedMs <= this.calibrationPeriodMs && gatedState.isBreathingReady && gatedState.breathing?.rate) {
        this.breathingSamples.push(gatedState.breathing.rate);
      }
    }

    // Lock baseline at 45 seconds if we have sufficient samples
    if (elapsedMs >= this.calibrationPeriodMs) {
      if (this.pulseSamples.length >= 5) {
        this.baselinePulse = calculateMedian(this.pulseSamples);
      }
      if (this.breathingSamples.length >= 5) {
        this.baselineBreathing = calculateMedian(this.breathingSamples);
      }
      this.isLocked = true;
    }

    return this.getDeltas(gatedState);
  }

  getDeltas(gatedState) {
    let deltaPulse = 0;
    let deltaBreathingPercent = 0;
    let isElevatedPulse = false;
    let isElevatedBreathing = false;

    if (this.isLocked && this.baselinePulse && gatedState.isPulseReady && gatedState.pulse?.bpm) {
      deltaPulse = gatedState.pulse.bpm - this.baselinePulse;
      if (deltaPulse >= 12) {
        isElevatedPulse = true; // +12 BPM above personal baseline
      }
    }

    if (this.isLocked && this.baselineBreathing && gatedState.isBreathingReady && gatedState.breathing?.rate) {
      const current = gatedState.breathing.rate;
      deltaBreathingPercent = ((current - this.baselineBreathing) / this.baselineBreathing) * 100;
      if (deltaBreathingPercent >= 25 && (current - this.baselineBreathing) >= 3) {
        isElevatedBreathing = true; // +25% and >= 3 br/min above baseline
      }
    }

    return {
      isLocked: this.isLocked,
      baselinePulse: this.baselinePulse,
      baselineBreathing: this.baselineBreathing,
      deltaPulse,
      deltaBreathingPercent,
      isElevatedPulse,
      isElevatedBreathing,
      calibrationProgressPercent: Math.min(100, Math.round((this.pulseSamples.length / 20) * 100)),
    };
  }
}

module.exports = {
  BaselineTracker,
  calculateMedian,
};
