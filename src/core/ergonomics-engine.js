// src/core/ergonomics-engine.js
// Copyright (C) 2026 CadenceDesk Project
// Non-Medical Focus Ergonomics Engine (Breath-Hold & Blink-Cadence Cues)

'use strict';

function calculateVariance(samples) {
  if (!samples || samples.length < 2) return 0;
  const n = samples.length;
  const mean = samples.reduce((sum, v) => sum + v, 0) / n;
  const sqDiffs = samples.reduce((sum, v) => sum + Math.pow(v - mean, 2), 0);
  return sqDiffs / (n - 1);
}

class ErgonomicsEngine {
  constructor(options = {}) {
    this.varianceThreshold = options.varianceThreshold || 0.035;
    this.breathHoldDurationMs = options.breathHoldDurationMs || 8000; // 8 seconds
    this.maxBlinkIntervalMs = options.maxBlinkIntervalMs || 12000;    // 12 seconds
    this.minBlinksPerMin = options.minBlinksPerMin || 8;

    this.sessionStartTimeMs = null;
    this.traceWindow = []; // Stores { val, timeMs }
    this.blinkTimestamps = []; // Stores blink timestamps in last 60 seconds
    this.lastBlinkTimeMs = 0;
    this.flatlineStartTimeMs = null;

    this.breathHoldCount = 0;
    this.blinkReminderCount = 0;

    this.state = {
      isBreathHoldActive: false,
      isBlinkReminderActive: false,
      rollingBlinkRate: 15,
      secondsSinceLastBlink: 0,
      breathTraceVariance: 1.0,
      breathHoldCount: 0,
      blinkReminderCount: 0,
    };
  }

  reset(nowMs = Date.now()) {
    this.sessionStartTimeMs = nowMs;
    this.traceWindow = [];
    this.blinkTimestamps = [];
    this.lastBlinkTimeMs = nowMs;
    this.flatlineStartTimeMs = null;
    this.breathHoldCount = 0;
    this.blinkReminderCount = 0;
    this.state = {
      isBreathHoldActive: false,
      isBlinkReminderActive: false,
      rollingBlinkRate: 15,
      secondsSinceLastBlink: 0,
      breathTraceVariance: 1.0,
      breathHoldCount: 0,
      blinkReminderCount: 0,
    };
  }

  update(gatedState, nowMs = Date.now()) {
    if (!this.sessionStartTimeMs) {
      this.sessionStartTimeMs = nowMs;
    }
    if (!this.lastBlinkTimeMs) {
      this.lastBlinkTimeMs = nowMs;
    }

    // --- 1. Breath-Hold Pause Detection ---
    const newUpperSamples = gatedState.latestUpperTrace || [];
    const newRawValues = [];
    for (const s of newUpperSamples) {
      const val = typeof s === 'number' ? s : s.value;
      if (typeof val === 'number') {
        newRawValues.push(val);
        this.traceWindow.push({ val, timeMs: nowMs });
      }
    }

    // Keep only last 8 seconds of trace
    const cutoffMs = nowMs - this.breathHoldDurationMs;
    this.traceWindow = this.traceWindow.filter((item) => item.timeMs >= cutoffMs);

    // Compute rolling variance over the window
    const windowValues = this.traceWindow.map((item) => item.val);
    const windowVariance = windowValues.length >= 10 ? calculateVariance(windowValues) : 1.0;

    // Check if new incoming slice has strong dynamic amplitude (instant recovery)
    const newSliceVariance = newRawValues.length >= 4 ? calculateVariance(newRawValues) : 0;
    const isActivelyBreathingNow = newSliceVariance >= this.varianceThreshold;

    let isBreathHoldActive = false;
    const canEvaluateBreathHold = (
      gatedState.isBreathingReady &&
      !gatedState.isTalking &&
      !gatedState.isMultiFace &&
      gatedState.isFaceValid
    );

    if (canEvaluateBreathHold && !isActivelyBreathingNow && windowVariance < this.varianceThreshold && this.traceWindow.length >= 15) {
      if (!this.flatlineStartTimeMs) {
        this.flatlineStartTimeMs = nowMs;
      } else if (nowMs - this.flatlineStartTimeMs >= this.breathHoldDurationMs) {
        if (!this.state.isBreathHoldActive) {
          this.breathHoldCount++;
        }
        isBreathHoldActive = true;
      }
    } else {
      this.flatlineStartTimeMs = null;
      isBreathHoldActive = false;
    }

    // --- 2. Blink-Cadence & Eye Comfort Detection ---
    if (gatedState.isBlinking) {
      if (this.blinkTimestamps.length === 0 || nowMs - this.blinkTimestamps[this.blinkTimestamps.length - 1] > 150) {
        this.blinkTimestamps.push(nowMs);
        this.lastBlinkTimeMs = nowMs;
      }
    }

    // Keep blinks in last 60 seconds
    const blinkCutoffMs = nowMs - 60000;
    this.blinkTimestamps = this.blinkTimestamps.filter((t) => t >= blinkCutoffMs);
    const rollingBlinkRate = this.blinkTimestamps.length;

    const secondsSinceLastBlink = Math.max(0, Math.round((nowMs - this.lastBlinkTimeMs) / 1000));
    let isBlinkReminderActive = false;

    // A fresh blink within the last 1 second immediately clears any active reminder
    const hasFreshBlink = (nowMs - this.lastBlinkTimeMs) < 1000;

    if (gatedState.isFaceValid && !gatedState.isMultiFace && !hasFreshBlink) {
      const elapsedTotalMs = nowMs - this.sessionStartTimeMs;
      const isStaring = secondsSinceLastBlink >= Math.round(this.maxBlinkIntervalMs / 1000);
      const isLowRate = (elapsedTotalMs >= 60000 && rollingBlinkRate < this.minBlinksPerMin);

      if (isStaring || isLowRate) {
        if (!this.state.isBlinkReminderActive) {
          this.blinkReminderCount++;
        }
        isBlinkReminderActive = true;
      }
    }

    this.state = {
      isBreathHoldActive,
      isBlinkReminderActive,
      rollingBlinkRate,
      secondsSinceLastBlink,
      breathTraceVariance: windowVariance,
      breathHoldCount: this.breathHoldCount,
      blinkReminderCount: this.blinkReminderCount,
    };

    return this.state;
  }
}

module.exports = {
  ErgonomicsEngine,
  calculateVariance,
};
