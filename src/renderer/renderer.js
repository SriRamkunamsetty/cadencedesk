// src/renderer/renderer.js
// Copyright (C) 2026 CadenceDesk Project
// Main Renderer Orchestrator for CadenceDesk

'use strict';

const { SignalGate, ValidationCode } = require('../core/signal-gate.js');
const { BaselineTracker } = require('../core/baseline-tracker.js');
const { ErgonomicsEngine } = require('../core/ergonomics-engine.js');
const { ReceiptBuilder } = require('../core/receipt-builder.js');
const { WaveformCanvas } = require('./modules/waveform-canvas.js');
const { AudioEngine } = require('./modules/audio-engine.js');
const { BioSimulator } = require('./modules/bio-simulator.js');
const { SdkController, ProcessingStatus } = require('./modules/sdk-controller.js');

// DOM Element Handles
const $ = (id) => document.getElementById(id);
const els = {
  // Disclaimer & App Header
  chipMode: $('chip-mode'),
  lblMode: $('lbl-mode'),
  chipStatus: $('chip-status'),
  lblStatus: $('lbl-status'),
  chipTrust: $('chip-trust'),
  lblTrust: $('lbl-trust'),
  chipHint: $('chip-hint'),
  lblHint: $('lbl-hint'),
  btnToggleMode: $('btn-toggle-mode'),
  btnToggleAudio: $('btn-toggle-audio'),
  btnReceipt: $('btn-receipt'),
  btnStart: $('btn-start'),
  btnStop: $('btn-stop'),

  // Preview & Halo
  preview: $('preview'),
  videoOverlay: $('video-overlay'),
  overlayMsg: $('overlay-msg'),
  breathHalo: $('breath-halo'),
  tagCameraStatus: $('tag-camera-status'),

  // Baseline Card
  badgeBaseline: $('badge-baseline'),
  valBasePulse: $('val-base-pulse'),
  valBaseBreath: $('val-base-breath'),

  // Metrics Grid
  tilePulse: $('tile-pulse'),
  statusPulse: $('status-pulse'),
  numPulse: $('num-pulse'),
  deltaPulse: $('delta-pulse'),

  tileBreath: $('tile-breath'),
  statusBreath: $('status-breath'),
  numBreath: $('num-breath'),
  deltaBreath: $('delta-breath'),

  tileBlink: $('tile-blink'),
  statusBlink: $('status-blink'),
  numBlink: $('num-blink'),
  deltaBlink: $('delta-blink'),

  tileApnea: $('tile-apnea'),
  statusApnea: $('status-apnea'),
  numHolds: $('num-holds'),
  deltaVariance: $('delta-variance'),

  // HRV
  valHrv: $('val-hrv'),
  badgeHrvStable: $('badge-hrv-stable'),

  // Consent Modal
  modalConsent: $('modal-consent'),
  chkConsent: $('chk-consent'),
  btnGrantConsent: $('btn-grant-consent'),

  // Receipt Modal
  modalReceipt: $('modal-receipt'),
  receiptTierBadge: $('receipt-tier-badge'),
  receiptExplanation: $('receipt-explanation'),
  rcptDuration: $('rcpt-duration'),
  rcptValidFrames: $('rcpt-valid-frames'),
  rcptPulseCov: $('rcpt-pulse-cov'),
  rcptBreathCov: $('rcpt-breath-cov'),
  rcptHolds: $('rcpt-holds'),
  rcptBlinks: $('rcpt-blinks'),
  btnExportReceipt: $('btn-export-receipt'),
  btnPurgeSession: $('btn-purge-session'),
  btnCloseReceipt: $('btn-close-receipt'),

  // Pre-flight warning
  preflightWarning: $('preflight-warning'),
};

// Core Systems
let isSimulatorMode = false;
let sessionActive = false;
let sessionStartTimestamp = 0;
let currentReceiptData = null;

const signalGate = new SignalGate();
const baselineTracker = new BaselineTracker();
const ergonomicsEngine = new ErgonomicsEngine();
const waveformCanvas = new WaveformCanvas('waveform-canvas');
const audioEngine = new AudioEngine();

let sdkController = null;
let bioSimulator = null;
let currentApiKey = '';

// Pre-flight Camera Quality Check (640x480 @ 30fps)
async function runPreflightCheck() {
  try {
    const stream = await navigator.mediaDevices.getUserMedia({
      video: { width: 640, height: 480, frameRate: { ideal: 30 } },
      audio: false,
    });
    // Check tracks
    const track = stream.getVideoTracks()[0];
    const settings = track.getSettings();
    if (settings.frameRate && settings.frameRate < 27) {
      els.preflightWarning.classList.remove('hidden');
    }
    // Release probe stream immediately
    stream.getTracks().forEach((t) => t.stop());
  } catch (err) {
    console.warn('[preflight] Camera probe info:', err.message);
  }
}

// 1. Consent Gate Flow
els.chkConsent.addEventListener('change', () => {
  els.btnGrantConsent.disabled = !els.chkConsent.checked;
});

els.btnGrantConsent.addEventListener('click', async () => {
  if (window.cadenceHost?.setConsent) {
    await window.cadenceHost.setConsent(true);
  }
  els.modalConsent.classList.add('hidden');
  runPreflightCheck();
});

// 2. Mode Switching
els.btnToggleMode.addEventListener('click', () => {
  if (sessionActive) {
    stopSession();
  }
  isSimulatorMode = !isSimulatorMode;
  if (isSimulatorMode) {
    els.lblMode.textContent = 'Simulated Test';
    els.btnToggleMode.textContent = 'Switch to Live Camera';
    els.chipMode.style.borderColor = 'rgba(245, 158, 11, 0.4)';
  } else {
    els.lblMode.textContent = 'Live Camera';
    els.btnToggleMode.textContent = 'Switch to Simulator';
    els.chipMode.style.borderColor = 'rgba(255, 255, 255, 0.08)';
  }
});

// 3. Audio Toggle
els.btnToggleAudio.addEventListener('click', () => {
  const on = audioEngine.toggle();
  els.btnToggleAudio.textContent = on ? '🔊 Audio: On' : '🔇 Audio: Muted';
  els.btnToggleAudio.style.background = on ? 'rgba(0, 242, 254, 0.2)' : '';
});

// 4. Central Metrics Processor
function handleIncomingMetrics(metrics, validationCode = ValidationCode.kOk, validationHint = '', nowMs = Date.now()) {
  const gated = signalGate.processMetrics(metrics, validationCode, validationHint, nowMs);
  const elapsedMs = gated.elapsedMs || 0;
  const baseline = baselineTracker.update(gated, elapsedMs);
  const ergo = ergonomicsEngine.update(gated, nowMs);

  // Update canvas & audio
  waveformCanvas.addSamples(gated.latestArterialTrace, gated.latestUpperTrace);
  audioEngine.update(gated);

  // Update UI Elements
  updateUI(gated, baseline, ergo);
}

function updateUI(gated, baseline, ergo) {
  // Signal Trust Chip
  const trustPct = Math.round(gated.signalTrust * 100);
  els.lblTrust.textContent = `${trustPct}%`;
  els.lblTrust.style.color = trustPct > 65 ? '#10b981' : trustPct > 35 ? '#f59e0b' : '#ef4444';

  // Guidance Hint
  if (gated.isMultiFace) {
    els.lblHint.textContent = 'Multiple faces in frame';
    els.videoOverlay.classList.remove('hidden');
    els.overlayMsg.textContent = 'Multi-Face Privacy Shield Active';
  } else {
    els.videoOverlay.classList.add('hidden');
    els.lblHint.textContent = gated.validationHint || (gated.isPulseReady ? 'Signal Steady' : 'Calibrating...');
  }

  // 1. Pulse Rate Tile
  if (gated.isPulseReady && gated.pulse) {
    els.statusPulse.textContent = 'Steady';
    els.numPulse.textContent = Math.round(gated.pulse.bpm);
    if (baseline.isLocked && baseline.baselinePulse) {
      const d = baseline.deltaPulse;
      els.deltaPulse.textContent = `Baseline: ${baseline.baselinePulse} (${d >= 0 ? '+' : ''}${d} BPM)`;
      els.deltaPulse.className = baseline.isElevatedPulse ? 'tile-delta alert' : 'tile-delta';
    } else {
      els.deltaPulse.textContent = 'Calibrating baseline...';
    }
  } else {
    const rem = Math.max(0, Math.ceil((12000 - gated.elapsedMs) / 1000));
    els.statusPulse.textContent = rem > 0 ? `Warm-Up (${rem}s)` : 'Searching...';
  }

  // 2. Respiration Rate Tile
  if (gated.isBreathingReady && gated.breathing) {
    els.statusBreath.textContent = gated.isTalking ? 'Speech Guard' : 'Steady';
    els.numBreath.textContent = gated.breathing.rate.toFixed(0);
    if (baseline.isLocked && baseline.baselineBreathing) {
      const dPct = Math.round(baseline.deltaBreathingPercent);
      els.deltaBreath.textContent = `Baseline: ${baseline.baselineBreathing.toFixed(1)} (${dPct >= 0 ? '+' : ''}${dPct}%)`;
      els.deltaBreath.className = baseline.isElevatedBreathing ? 'tile-delta alert' : 'tile-delta';
    } else {
      els.deltaBreath.textContent = gated.isTalking ? 'Paused during speech' : 'Calibrating baseline...';
    }
  } else {
    const rem = Math.max(0, Math.ceil((30000 - gated.elapsedMs) / 1000));
    els.statusBreath.textContent = rem > 0 ? `Warm-Up (${rem}s)` : (gated.isTalking ? 'Speech Guard' : 'Searching...');
  }

  // 3. Blink Cadence Tile
  els.numBlink.textContent = ergo.rollingBlinkRate;
  els.deltaBlink.textContent = `Last blink: ${ergo.secondsSinceLastBlink}s ago`;
  if (ergo.isBlinkReminderActive) {
    els.statusBlink.textContent = 'Blink Reminder';
    els.statusBlink.style.color = '#f59e0b';
    els.tileBlink.style.borderColor = 'rgba(245, 158, 11, 0.4)';
  } else {
    els.statusBlink.textContent = 'Comfortable';
    els.statusBlink.style.color = '';
    els.tileBlink.style.borderColor = '';
  }

  // 4. Breath-Hold Pause Tile
  els.numHolds.textContent = ergo.breathHoldCount;
  els.deltaVariance.textContent = `Trace variance: ${ergo.breathTraceVariance.toFixed(2)}`;
  if (ergo.isBreathHoldActive) {
    els.statusApnea.textContent = 'Pause Detected';
    els.statusApnea.style.color = '#00f2fe';
    els.breathHalo.classList.remove('hidden');
  } else {
    els.statusApnea.textContent = 'Steady';
    els.statusApnea.style.color = '';
    els.breathHalo.classList.add('hidden');
  }

  // Baseline Card Progress
  if (baseline.isLocked) {
    els.badgeBaseline.textContent = 'Locked (45s)';
    els.badgeBaseline.style.color = '#10b981';
    els.valBasePulse.textContent = Math.round(baseline.baselinePulse || 0);
    els.valBaseBreath.textContent = (baseline.baselineBreathing || 0).toFixed(1);
  } else {
    const prog = Math.min(100, Math.round((gated.elapsedMs / 45000) * 100));
    els.badgeBaseline.textContent = `Calibrating (${prog}%)`;
  }

  // HRV Footer
  if (gated.isHrvReady && gated.hrv) {
    els.valHrv.textContent = `${gated.hrv.rmssd.toFixed(1)} ms`;
    els.badgeHrvStable.textContent = 'Locked';
    els.badgeHrvStable.style.color = '#10b981';
  } else {
    const rem = Math.max(0, Math.ceil((60000 - gated.elapsedMs) / 1000));
    els.valHrv.textContent = rem > 0 ? `Locking (${rem}s)...` : 'Analyzing...';
  }
}

// 5. Session Start / Stop
async function startSession() {
  els.btnStart.disabled = true;
  els.btnStop.disabled = false;
  els.btnReceipt.disabled = true;
  sessionActive = true;
  sessionStartTimestamp = Date.now();

  signalGate.startSession(sessionStartTimestamp);
  baselineTracker.reset();
  ergonomicsEngine.reset(sessionStartTimestamp);
  waveformCanvas.clear();
  waveformCanvas.start();

  els.lblStatus.textContent = 'Starting...';
  els.tagCameraStatus.textContent = 'Active';
  els.tagCameraStatus.classList.add('active');

  if (isSimulatorMode) {
    // Simulator Mode
    bioSimulator = new BioSimulator((metrics, code, hint, now) => {
      handleIncomingMetrics(metrics, code, hint, now);
    });
    bioSimulator.start();
    els.lblStatus.textContent = 'Simulating';
  } else {
    // Live SDK Mode
    if (!sdkController) {
      if (window.cadenceHost?.getApiKey) {
        const keyInfo = await window.cadenceHost.getApiKey();
        currentApiKey = keyInfo.rawKey || 'YOUR_API_KEY_HERE';
      }
      sdkController = new SdkController({
        onProcessingStatus: (status) => {
          const names = ['kUninitialized', 'kIdle', 'kStarting', 'kRunning', 'kStopping', 'kError'];
          els.lblStatus.textContent = names[status] || `Status(${status})`;
        },
        onValidationStatus: (code, ts, hint) => {
          // Handled per packet in handleIncomingMetrics
        },
        onStreamAvailable: (stream) => {
          els.preview.srcObject = stream;
          els.preview.play().catch(() => {});
        },
        onMetrics: (decoded, tsUs) => {
          handleIncomingMetrics(decoded, ValidationCode.kOk, '', Date.now());
        },
        onError: (code, msg) => {
          els.lblHint.textContent = `Error: ${msg}`;
        },
      });
      await sdkController.init(currentApiKey);
    }
    try {
      await sdkController.start();
    } catch (err) {
      console.error('SDK start failed:', err);
      els.lblStatus.textContent = 'Error';
      els.lblHint.textContent = err.message || 'Start failed';
      stopSession();
    }
  }
}

async function stopSession() {
  els.btnStop.disabled = true;
  sessionActive = false;
  const durationSec = Math.round((Date.now() - sessionStartTimestamp) / 1000);

  if (bioSimulator) {
    bioSimulator.stop();
    bioSimulator = null;
  }

  if (sdkController) {
    await sdkController.stop();
    els.preview.srcObject = null;
  }

  waveformCanvas.stop();
  audioEngine.update({ signalTrust: 0 }); // Silence audio

  els.lblStatus.textContent = 'Idle';
  els.tagCameraStatus.textContent = 'Offline';
  els.tagCameraStatus.classList.remove('active');
  els.btnStart.disabled = false;
  els.btnReceipt.disabled = false;

  // Build Session Trust Receipt
  currentReceiptData = ReceiptBuilder.buildReceipt(signalGate, baselineTracker, ergonomicsEngine, durationSec);
  showReceiptModal(currentReceiptData);
}

function showReceiptModal(rcpt) {
  els.receiptTierBadge.textContent = `${rcpt.trustTier} Trust`;
  els.receiptExplanation.textContent = rcpt.trustExplanation;
  els.rcptDuration.textContent = `${rcpt.sessionDurationSeconds}s`;
  els.rcptValidFrames.textContent = `${rcpt.coverage.validFramesPercent}%`;
  els.rcptPulseCov.textContent = `${rcpt.coverage.pulseCoveragePercent}%`;
  els.rcptBreathCov.textContent = `${rcpt.coverage.breathingCoveragePercent}%`;
  els.rcptHolds.textContent = rcpt.ergonomics.breathHoldEventsCount;
  els.rcptBlinks.textContent = rcpt.ergonomics.blinkRemindersCount;

  els.modalReceipt.classList.remove('hidden');
}

// Receipt Modal Buttons
els.btnReceipt.addEventListener('click', () => {
  if (currentReceiptData) {
    showReceiptModal(currentReceiptData);
  }
});

els.btnCloseReceipt.addEventListener('click', () => {
  els.modalReceipt.classList.add('hidden');
});

els.btnExportReceipt.addEventListener('click', async () => {
  if (currentReceiptData && window.cadenceHost?.exportReceipt) {
    await window.cadenceHost.exportReceipt(JSON.stringify(currentReceiptData, null, 2));
  }
});

els.btnPurgeSession.addEventListener('click', () => {
  currentReceiptData = null;
  signalGate.startSession();
  baselineTracker.reset();
  ergonomicsEngine.reset();
  waveformCanvas.clear();
  els.modalReceipt.classList.add('hidden');
  els.btnReceipt.disabled = true;
  els.lblTrust.textContent = '0%';
  els.numPulse.textContent = '—';
  els.numBreath.textContent = '—';
});

els.btnStart.addEventListener('click', startSession);
els.btnStop.addEventListener('click', stopSession);

// Clean unload on window close
window.addEventListener('beforeunload', () => {
  if (sdkController) {
    sdkController.destroy();
  }
  if (audioEngine) {
    audioEngine.destroy();
  }
});
