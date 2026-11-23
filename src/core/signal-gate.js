// src/core/signal-gate.js
// Copyright (C) 2026 CadenceDesk Project
// Production Signal-Gated Trust Engine for Presage SmartSpectra SDK 3.5.0

'use strict';

// Presage Validation Codes from SDK
const ValidationCode = {
  kOk: 0,
  kCameraTuning: 1,
  kNoFaceFound: 2,
  kMultipleFacesFound: 3,
  kFaceNotCentered: 4,
  kPoorLighting: 5,
  kSubjectMovingTooMuch: 6,
  kFpsTooLow: 7,
};

// Warm-up durations in milliseconds
const WARMUP_DURATIONS = {
  FACE: 0,
  PULSE: 12000,      // 12 seconds
  BREATHING: 30000,  // 30 seconds
  HRV: 60000,        // 60 seconds
};

// Thresholds for valid readings
const GATES = {
  PULSE_MIN_CONF: 40,
  PULSE_MIN_BPM: 40,
  PULSE_MAX_BPM: 180,
  BREATH_MIN_CONF: 45,
  BREATH_MIN_RPM: 5,
  BREATH_MAX_RPM: 40,
  HRV_MIN_CONF: 50,
  MAX_PACKET_AGE_MS: 5000,
  TALKING_DEBOUNCE_MS: 600,
};

function tsToNumber(ts) {
  if (ts == null) return 0;
  if (typeof ts === 'number') return ts;
  if (typeof ts === 'bigint') return Number(ts);
  if (typeof ts.toNumber === 'function') return ts.toNumber();
  if (typeof ts.low === 'number' && typeof ts.high === 'number') {
    return ts.low + ts.high * 4294967296;
  }
  return Number(ts);
}

class SignalGate {
  constructor(options = {}) {
    this.sessionStartTime = null;
    this.lastTalkingTime = 0;
    this.lastValidPacketTime = 0;
    this.totalFramesReceived = 0;
    this.validFramesCount = 0;
    this.pulseFramesCount = 0;
    this.breathingFramesCount = 0;
    this.hrvFramesCount = 0;
    this.multiFaceDetected = false;
    this.latestState = {
      isFaceValid: false,
      isPulseReady: false,
      isBreathingReady: false,
      isHrvReady: false,
      isTalking: false,
      isMultiFace: false,
      signalTrust: 0.0,
      validationCode: ValidationCode.kOk,
      validationHint: '',
      pulse: null,
      breathing: null,
      hrv: null,
      face: null,
      latestArterialTrace: [],
      latestUpperTrace: [],
    };
  }

  startSession(startTimeMs = Date.now()) {
    this.sessionStartTime = startTimeMs;
    this.lastTalkingTime = 0;
    this.lastValidPacketTime = startTimeMs;
    this.totalFramesReceived = 0;
    this.validFramesCount = 0;
    this.pulseFramesCount = 0;
    this.breathingFramesCount = 0;
    this.hrvFramesCount = 0;
    this.multiFaceDetected = false;
  }

  processMetrics(metrics, validationCode = ValidationCode.kOk, validationHint = '', nowMs = Date.now()) {
    if (!this.sessionStartTime) {
      this.startSession(nowMs);
    }

    this.totalFramesReceived++;
    const elapsedMs = Math.max(0, nowMs - this.sessionStartTime);

    // Multi-face auto-pause guard
    const isMultiFace = (
      validationCode === ValidationCode.kMultipleFacesFound ||
      (typeof validationHint === 'string' && validationHint.toLowerCase().includes('multiple faces'))
    );

    if (isMultiFace) {
      this.multiFaceDetected = true;
      this.latestState = {
        ...this.latestState,
        isFaceValid: false,
        isPulseReady: false,
        isBreathingReady: false,
        isHrvReady: false,
        isMultiFace: true,
        signalTrust: 0.0,
        validationCode,
        validationHint: 'Multiple faces detected — sensing paused for privacy.',
      };
      return this.latestState;
    }
    this.multiFaceDetected = false;

    const isValidationOk = (validationCode === ValidationCode.kOk || validationCode === ValidationCode.kCameraTuning);
    if (isValidationOk) {
      this.validFramesCount++;
    }

    // 1. Face Presence & Speech Gate (0s warm-up)
    const isFaceValid = isValidationOk;
    let isTalking = false;
    let isBlinking = false;
    let landmarks = null;

    if (metrics.face) {
      const talkSample = metrics.face.talking?.at?.(-1) ?? (metrics.face.talking && metrics.face.talking[metrics.face.talking.length - 1]);
      if (talkSample && talkSample.detected) {
        this.lastTalkingTime = nowMs;
        isTalking = true;
      } else if (nowMs - this.lastTalkingTime < GATES.TALKING_DEBOUNCE_MS) {
        isTalking = true; // within 600ms debounce
      }

      const blinkSample = metrics.face.blinking?.at?.(-1) ?? (metrics.face.blinking && metrics.face.blinking[metrics.face.blinking.length - 1]);
      if (blinkSample) {
        isBlinking = Boolean(blinkSample.detected);
      }

      const lmSample = metrics.face.landmarks?.at?.(-1) ?? (metrics.face.landmarks && metrics.face.landmarks[metrics.face.landmarks.length - 1]);
      if (lmSample) {
        landmarks = lmSample.value || lmSample;
      }
    }

    // 2. Pulse Rate & Wave Gate (12s warm-up)
    let pulseData = null;
    let isPulseReady = false;
    const pulseSample = metrics.cardio?.pulseRate?.at?.(-1) ?? (metrics.cardio?.pulseRate && metrics.cardio.pulseRate[metrics.cardio.pulseRate.length - 1]);
    
    if (pulseSample) {
      const ts = tsToNumber(pulseSample.timestamp);
      const val = pulseSample.value;
      const conf = pulseSample.confidence ?? 0;
      const stable = pulseSample.stable ?? false;

      if (
        elapsedMs >= WARMUP_DURATIONS.PULSE &&
        stable &&
        conf >= GATES.PULSE_MIN_CONF &&
        val >= GATES.PULSE_MIN_BPM &&
        val <= GATES.PULSE_MAX_BPM
      ) {
        isPulseReady = true;
        this.pulseFramesCount++;
        pulseData = {
          bpm: val,
          confidence: conf,
          stable: stable,
          timestamp: ts,
        };
      }
    }

    // 3. Breathing Rate & Trace Gate (30s warm-up + Speech Guard)
    let breathingData = null;
    let isBreathingReady = false;
    const breathSample = metrics.breathing?.rate?.at?.(-1) ?? (metrics.breathing?.rate && metrics.breathing.rate[metrics.breathing.rate.length - 1]);

    if (breathSample) {
      const ts = tsToNumber(breathSample.timestamp);
      const val = breathSample.value;
      const conf = breathSample.confidence ?? 0;
      const stable = breathSample.stable ?? false;

      // Talking guard: pause breathing metric updates during speech
      if (
        elapsedMs >= WARMUP_DURATIONS.BREATHING &&
        !isTalking &&
        stable &&
        conf >= GATES.BREATH_MIN_CONF &&
        val >= GATES.BREATH_MIN_RPM &&
        val <= GATES.BREATH_MAX_RPM
      ) {
        isBreathingReady = true;
        this.breathingFramesCount++;
        breathingData = {
          rate: val,
          confidence: conf,
          stable: stable,
          timestamp: ts,
        };
      }
    }

    // 4. HRV Gate (60s warm-up)
    let hrvData = null;
    let isHrvReady = false;
    const hrvSample = metrics.cardio?.hrv?.at?.(-1) ?? (metrics.cardio?.hrv && metrics.cardio.hrv[metrics.cardio.hrv.length - 1]);

    if (hrvSample && elapsedMs >= WARMUP_DURATIONS.HRV) {
      const conf = hrvSample.confidence ?? 0;
      const stable = hrvSample.stable ?? false;
      const rmssd = hrvSample.rmssd ?? 0;

      if (stable && conf >= GATES.HRV_MIN_CONF && rmssd > 0) {
        isHrvReady = true;
        this.hrvFramesCount++;
        hrvData = {
          rmssd: rmssd,
          sdnn: hrvSample.sdnn ?? 0,
          baevsky: hrvSample.baevsky ?? 0,
          confidence: conf,
          stable: stable,
          timestamp: tsToNumber(hrvSample.timestamp),
        };
      }
    }

    // Compute composite Signal Trust score [0.0 - 1.0]
    let trustScore = 0.0;
    if (isValidationOk) trustScore += 0.25;
    if (isFaceValid && !isMultiFace) trustScore += 0.15;
    if (isPulseReady) trustScore += 0.30;
    if (isBreathingReady) trustScore += 0.20;
    if (isHrvReady) trustScore += 0.10;

    // Collect traces for waveform canvas
    const arterialTrace = metrics.cardio?.arterialPressureTrace || [];
    const upperTrace = metrics.breathing?.upperTrace || [];

    this.latestState = {
      elapsedMs,
      isFaceValid,
      isPulseReady,
      isBreathingReady,
      isHrvReady,
      isTalking,
      isBlinking,
      isMultiFace: false,
      signalTrust: trustScore,
      validationCode,
      validationHint,
      pulse: pulseData || this.latestState.pulse, // keep last good reading if within grace period
      breathing: breathingData || this.latestState.breathing,
      hrv: hrvData || this.latestState.hrv,
      face: {
        talking: isTalking,
        blinking: isBlinking,
        landmarks: landmarks,
      },
      latestArterialTrace: arterialTrace,
      latestUpperTrace: upperTrace,
    };

    return this.latestState;
  }

  getCoverageStats() {
    const total = Math.max(1, this.totalFramesReceived);
    return {
      totalFrames: this.totalFramesReceived,
      validFramesPercent: Math.min(100, (this.validFramesCount / total) * 100),
      pulseCoveragePercent: Math.min(100, (this.pulseFramesCount / total) * 100),
      breathingCoveragePercent: Math.min(100, (this.breathingFramesCount / total) * 100),
      hrvCoveragePercent: Math.min(100, (this.hrvFramesCount / total) * 100),
    };
  }
}

module.exports = {
  SignalGate,
  ValidationCode,
  WARMUP_DURATIONS,
  GATES,
  tsToNumber,
};
