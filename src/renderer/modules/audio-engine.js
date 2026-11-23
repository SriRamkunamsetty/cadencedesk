// src/renderer/modules/audio-engine.js
// Copyright (C) 2026 CadenceDesk Project
// Signal-Gated Ambient Breath Synthesizer (Web Audio API)

'use strict';

class AudioEngine {
  constructor() {
    this.audioCtx = null;
    this.masterGain = null;
    this.filterNode = null;
    this.oscillators = [];
    this.isEnabled = false; // Muted by default
    this.baseGain = 0.08;   // Gentle ambient volume
  }

  init() {
    if (this.audioCtx) return;
    const AudioContext = window.AudioContext || window.webkitAudioContext;
    this.audioCtx = new AudioContext();

    this.masterGain = this.audioCtx.createGain();
    this.masterGain.gain.setValueAtTime(0, this.audioCtx.currentTime);
    this.masterGain.connect(this.audioCtx.destination);

    // Dynamic Low-Pass Filter tracked to breathing upperTrace
    this.filterNode = this.audioCtx.createBiquadFilter();
    this.filterNode.type = 'lowpass';
    this.filterNode.frequency.setValueAtTime(260, this.audioCtx.currentTime);
    this.filterNode.Q.setValueAtTime(1.8, this.audioCtx.currentTime);
    this.filterNode.connect(this.masterGain);

    // Warm harmonic chord (C3, G3, D4)
    const freqs = [130.81, 196.00, 293.66];
    freqs.forEach((freq) => {
      const osc = this.audioCtx.createOscillator();
      osc.type = 'triangle';
      osc.frequency.setValueAtTime(freq, this.audioCtx.currentTime);
      osc.connect(this.filterNode);
      osc.start();
      this.oscillators.push(osc);
    });
  }

  toggle() {
    if (!this.audioCtx) {
      this.init();
    }
    if (this.audioCtx.state === 'suspended') {
      this.audioCtx.resume();
    }

    this.isEnabled = !this.isEnabled;
    if (!this.isEnabled) {
      // Fade to silent
      this.masterGain.gain.setTargetAtTime(0, this.audioCtx.currentTime, 0.1);
    }
    return this.isEnabled;
  }

  update(gatedState) {
    if (!this.isEnabled || !this.audioCtx || !this.masterGain) return;

    // Signal Trust Gate: If trust is low or face lost, fade to silence immediately
    const isReliable = gatedState.signalTrust >= 0.4 && gatedState.isFaceValid && !gatedState.isMultiFace;
    if (!isReliable) {
      this.masterGain.gain.setTargetAtTime(0, this.audioCtx.currentTime, 0.2);
      return;
    }

    // Unmute to gentle volume if reliable
    this.masterGain.gain.setTargetAtTime(this.baseGain, this.audioCtx.currentTime, 0.15);

    // Sweep filter cutoff with upperTrace amplitude [180Hz - 850Hz]
    const upperSamples = gatedState.latestUpperTrace;
    if (upperSamples && upperSamples.length > 0) {
      const last = upperSamples[upperSamples.length - 1];
      const val = typeof last === 'number' ? last : last.value;
      if (typeof val === 'number') {
        // Clamp normalized value [0.0 - 1.0]
        const norm = Math.max(0, Math.min(1, (val + 1) / 2));
        const targetFreq = 180 + (norm * 670);
        this.filterNode.frequency.setTargetAtTime(targetFreq, this.audioCtx.currentTime, 0.08);
      }
    }
  }

  destroy() {
    if (this.audioCtx) {
      this.oscillators.forEach((osc) => {
        try { osc.stop(); } catch {}
      });
      this.audioCtx.close().catch(() => {});
      this.audioCtx = null;
    }
  }
}

module.exports = {
  AudioEngine,
};
