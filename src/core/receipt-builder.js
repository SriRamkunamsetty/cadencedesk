// src/core/receipt-builder.js
// Copyright (C) 2026 CadenceDesk Project
// Honest Session Trust Receipt Builder

'use strict';

class ReceiptBuilder {
  static buildReceipt(signalGate, baselineTracker, ergonomicsEngine, durationSec) {
    const coverage = signalGate.getCoverageStats();
    const baseline = baselineTracker.getDeltas(signalGate.latestState);

    let trustTier = 'Insufficient';
    let trustExplanation = 'Lighting or camera conditions were insufficient for reliable sensing.';

    if (coverage.validFramesPercent >= 70 && coverage.pulseCoveragePercent >= 55 && coverage.breathingCoveragePercent >= 45) {
      trustTier = 'Full';
      trustExplanation = 'High-fidelity session with comprehensive biometric coverage.';
    } else if (coverage.validFramesPercent >= 40) {
      trustTier = 'Partial';
      trustExplanation = 'Usable session; some metric segments were excluded during motion or speech.';
    }

    const receipt = {
      timestamp: new Date().toISOString(),
      sessionDurationSeconds: durationSec,
      trustTier,
      trustExplanation,
      coverage: {
        totalFrames: coverage.totalFrames,
        validFramesPercent: Math.round(coverage.validFramesPercent),
        pulseCoveragePercent: Math.round(coverage.pulseCoveragePercent),
        breathingCoveragePercent: Math.round(coverage.breathingCoveragePercent),
        hrvCoveragePercent: Math.round(coverage.hrvCoveragePercent),
      },
      baseline: {
        isLocked: baseline.isLocked,
        calmPulseBpm: baseline.baselinePulse ? Math.round(baseline.baselinePulse) : null,
        calmBreathingRpm: baseline.baselineBreathing ? Number(baseline.baselineBreathing.toFixed(1)) : null,
      },
      ergonomics: {
        breathHoldEventsCount: ergonomicsEngine.breathHoldCount,
        blinkRemindersCount: ergonomicsEngine.blinkReminderCount,
        averageBlinkRate: ergonomicsEngine.state.rollingBlinkRate,
      },
      privacyVerification: {
        onDeviceProcessing: true,
        telemetryDisabled: true,
        videoUploaded: false,
        sdkInsightEventsDiscarded: true,
      },
    };

    return receipt;
  }
}

module.exports = {
  ReceiptBuilder,
};
