// src/renderer/modules/bio-simulator.js
// Copyright (C) 2026 CadenceDesk Project
// Calibrated Deterministic Bio-Simulator (Offline / Judge Test Mode)

'use strict';

class BioSimulator {
  constructor(onMetricsCallback) {
    this.onMetrics = onMetricsCallback;
    this.isRunning = false;
    this.timerId = null;
    this.startTime = 0;
    this.frameIndex = 0;
    this.isApneaScenario = false;
    this.isStressScenario = false;
  }

  start() {
    if (this.isRunning) return;
    this.isRunning = true;
    this.startTime = Date.now();
    this.frameIndex = 0;

    // Run at 30 fps (every ~33ms)
    this.timerId = setInterval(() => {
      this.step();
    }, 33);
  }

  stop() {
    this.isRunning = false;
    if (this.timerId) {
      clearInterval(this.timerId);
      this.timerId = null;
    }
  }

  toggleApneaScenario() {
    this.isApneaScenario = !this.isApneaScenario;
    return this.isApneaScenario;
  }

  step() {
    if (!this.isRunning) return;
    this.frameIndex++;
    const now = Date.now();
    const tSec = (now - this.startTime) / 1000;

    // 1. Arterial Pulse Waveform (72 BPM base -> 1.2 Hz)
    const bpm = this.isStressScenario ? 88 : 72;
    const pulseFreq = bpm / 60;
    const pulsePhase = (tSec * pulseFreq) % 1.0;
    // Systolic peak + dicrotic notch
    let arterialVal = Math.sin(pulsePhase * Math.PI * 2);
    if (pulsePhase > 0.3 && pulsePhase < 0.6) {
      arterialVal += 0.35 * Math.sin((pulsePhase - 0.3) * Math.PI * 4); // dicrotic notch
    }

    // 2. Chest Respiration Trace (14 BR/min base -> ~0.233 Hz)
    let breathVal = 0.5;
    if (!this.isApneaScenario) {
      const breathFreq = 14 / 60;
      breathVal = Math.sin(tSec * breathFreq * Math.PI * 2);
    } else {
      // Flatline during apnea
      breathVal = 0.5 + 0.005 * Math.sin(tSec * 10);
    }

    // 3. Blinking (every ~4.2 seconds)
    const isBlinking = (this.frameIndex % 125 < 4);

    // Build payload matching decoded protobuf
    const mockPayload = {
      cardio: {
        pulseRate: [
          {
            value: bpm,
            confidence: 85,
            stable: true,
            timestamp: now * 1000,
          },
        ],
        arterialPressureTrace: [
          {
            value: arterialVal,
            confidence: 85,
            stable: true,
            timestamp: now * 1000,
          },
        ],
        hrv: [
          {
            rmssd: 42.5,
            sdnn: 48.0,
            baevsky: 82.0,
            confidence: 75,
            stable: true,
            timestamp: now * 1000,
          },
        ],
      },
      breathing: {
        rate: [
          {
            value: this.isApneaScenario ? 0 : 14,
            confidence: 80,
            stable: !this.isApneaScenario,
            timestamp: now * 1000,
          },
        ],
        upperTrace: [
          {
            value: breathVal,
            confidence: 80,
            stable: true,
            timestamp: now * 1000,
          },
        ],
      },
      face: {
        talking: [{ detected: false }],
        blinking: [{ detected: isBlinking }],
      },
    };

    if (typeof this.onMetrics === 'function') {
      this.onMetrics(mockPayload, 0, 'Simulator active (kOk)', now);
    }
  }
}

module.exports = {
  BioSimulator,
};
