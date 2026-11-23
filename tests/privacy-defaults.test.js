// tests/privacy-defaults.test.js
import { describe, it, expect } from 'vitest';
const { ReceiptBuilder } = require('../src/core/receipt-builder.js');
const { SignalGate, ValidationCode } = require('../src/core/signal-gate.js');
const { BaselineTracker } = require('../src/core/baseline-tracker.js');
const { ErgonomicsEngine } = require('../src/core/ergonomics-engine.js');

describe('Privacy Defaults & Receipt Trust Tiers', () => {
  it('correctly categorizes an Insufficient session (<40% valid frames)', () => {
    const gate = new SignalGate();
    gate.startSession(1000);
    // Simulate 10 frames with poor lighting (only 2 valid)
    for (let i = 0; i < 8; i++) {
      gate.processMetrics({}, ValidationCode.kPoorLighting, 'Low light', 1000 + i * 100);
    }
    for (let i = 0; i < 2; i++) {
      gate.processMetrics({}, ValidationCode.kOk, '', 2000 + i * 100);
    }

    const baseline = new BaselineTracker();
    const ergo = new ErgonomicsEngine();
    const receipt = ReceiptBuilder.buildReceipt(gate, baseline, ergo, 60);

    expect(receipt.trustTier).toBe('Insufficient');
    expect(receipt.coverage.validFramesPercent).toBe(20);
    expect(receipt.privacyVerification.telemetryDisabled).toBe(true);
    expect(receipt.privacyVerification.onDeviceProcessing).toBe(true);
  });

  it('correctly categorizes a Full trust session (>=70% valid, >=55% pulse, >=45% breath)', () => {
    const gate = new SignalGate();
    gate.startSession(1000);

    // Simulate 100 frames with steady valid signals
    for (let i = 0; i < 100; i++) {
      const now = 1000 + 35000 + i * 100; // Past 30s warmup
      gate.processMetrics(
        {
          cardio: { pulseRate: [{ value: 72, confidence: 80, stable: true, timestamp: now }] },
          breathing: { rate: [{ value: 14, confidence: 75, stable: true, timestamp: now }] },
        },
        ValidationCode.kOk,
        '',
        now
      );
    }

    const baseline = new BaselineTracker();
    const ergo = new ErgonomicsEngine();
    const receipt = ReceiptBuilder.buildReceipt(gate, baseline, ergo, 120);

    expect(receipt.trustTier).toBe('Full');
    expect(receipt.coverage.validFramesPercent).toBe(100);
    expect(receipt.coverage.pulseCoveragePercent).toBe(100);
    expect(receipt.coverage.breathingCoveragePercent).toBe(100);
  });
});
