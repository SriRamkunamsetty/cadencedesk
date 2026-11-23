// tests/signal-gate.test.js
import { describe, it, expect, beforeEach } from 'vitest';
const { SignalGate, ValidationCode, WARMUP_DURATIONS, tsToNumber } = require('../src/core/signal-gate.js');

describe('SignalGate Engine', () => {
  let gate;
  const t0 = 1000000;

  beforeEach(() => {
    gate = new SignalGate();
    gate.startSession(t0);
  });

  it('safely converts protobuf int64 / Long objects and BigInts', () => {
    expect(tsToNumber(12345)).toBe(12345);
    expect(tsToNumber(BigInt(999999))).toBe(999999);
    expect(tsToNumber({ toNumber: () => 7777 })).toBe(7777);
    expect(tsToNumber({ low: 50, high: 0 })).toBe(50);
  });

  it('accepts face at 0s warm-up when validation is kOk', () => {
    const metrics = { face: { talking: [{ detected: false }], blinking: [{ detected: true }] } };
    const res = gate.processMetrics(metrics, ValidationCode.kOk, '', t0 + 100);
    expect(res.isFaceValid).toBe(true);
    expect(res.isPulseReady).toBe(false); // <12s
    expect(res.isBreathingReady).toBe(false); // <30s
  });

  it('enforces 12s warm-up on pulse rate', () => {
    const pulseSample = { value: 72, confidence: 85, stable: true, timestamp: t0 + 5000 };
    const metrics = { cardio: { pulseRate: [pulseSample] } };

    // At 5 seconds (< 12s), pulse must NOT be ready
    const resEarly = gate.processMetrics(metrics, ValidationCode.kOk, '', t0 + 5000);
    expect(resEarly.isPulseReady).toBe(false);

    // At 13 seconds (>= 12s), pulse must be ready
    const resReady = gate.processMetrics(metrics, ValidationCode.kOk, '', t0 + 13000);
    expect(resReady.isPulseReady).toBe(true);
    expect(resReady.pulse.bpm).toBe(72);
  });

  it('rejects unstable or low-confidence pulse samples', () => {
    const metricsUnstable = {
      cardio: { pulseRate: [{ value: 72, confidence: 85, stable: false, timestamp: t0 + 15000 }] },
    };
    const res = gate.processMetrics(metricsUnstable, ValidationCode.kOk, '', t0 + 15000);
    expect(res.isPulseReady).toBe(false);

    const metricsLowConf = {
      cardio: { pulseRate: [{ value: 72, confidence: 25, stable: true, timestamp: t0 + 15000 }] },
    };
    const res2 = gate.processMetrics(metricsLowConf, ValidationCode.kOk, '', t0 + 15000);
    expect(res2.isPulseReady).toBe(false);
  });

  it('enforces 30s warm-up on breathing and pauses during speech (talking guard)', () => {
    const breathSample = { value: 14, confidence: 80, stable: true, timestamp: t0 + 35000 };

    // At 35s without speech -> Ready
    const metricsSilent = {
      face: { talking: [{ detected: false }] },
      breathing: { rate: [breathSample] },
    };
    const resSilent = gate.processMetrics(metricsSilent, ValidationCode.kOk, '', t0 + 35000);
    expect(resSilent.isBreathingReady).toBe(true);
    expect(resSilent.breathing.rate).toBe(14);

    // When talking is detected -> Breathing pauses
    const metricsTalking = {
      face: { talking: [{ detected: true }] },
      breathing: { rate: [breathSample] },
    };
    const resTalking = gate.processMetrics(metricsTalking, ValidationCode.kOk, '', t0 + 36000);
    expect(resTalking.isTalking).toBe(true);
    expect(resTalking.isBreathingReady).toBe(false);

    // 300ms after speech ends -> Still in 600ms debounce window!
    const metricsDebounce = {
      face: { talking: [{ detected: false }] },
      breathing: { rate: [breathSample] },
    };
    const resDebounce = gate.processMetrics(metricsDebounce, ValidationCode.kOk, '', t0 + 36300);
    expect(resDebounce.isTalking).toBe(true);
    expect(resDebounce.isBreathingReady).toBe(false);

    // 800ms after speech ends -> Debounce cleared, breathing unpauses!
    const resCleared = gate.processMetrics(metricsDebounce, ValidationCode.kOk, '', t0 + 36800);
    expect(resCleared.isTalking).toBe(false);
    expect(resCleared.isBreathingReady).toBe(true);
  });

  it('immediately pauses sensing on multi-face detection', () => {
    const metrics = {
      cardio: { pulseRate: [{ value: 75, confidence: 90, stable: true, timestamp: t0 + 20000 }] },
    };
    const res = gate.processMetrics(metrics, ValidationCode.kMultipleFacesFound, 'Multiple faces in frame', t0 + 20000);
    expect(res.isMultiFace).toBe(true);
    expect(res.signalTrust).toBe(0.0);
    expect(res.isPulseReady).toBe(false);
  });
});
