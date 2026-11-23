---
title: CadenceDesk: Signal-Gated Bio-Adaptive Focus & Ergonomics Workstation
published: true
tags: devchallenge, presagechallenge, electron, privacy
---

*This is a submission for the [Presage SmartSpectra SDK Challenge](https://dev.to/challenges/presage-2026-11-04)*

---

> **General Wellness Disclaimer:** CadenceDesk is a focus-ergonomics and wellness companion tool. It is **not** a medical device, has not been evaluated by the FDA, and does not diagnose, treat, prevent, or guide clinical decisions for any condition.

---

## What I Built

Modern desk workers frequently fall victim to two invisible physical habits during deep focus:
1. **Desk-Worker Breath-Holding:** Unconsciously holding or shallowing one's breath during intense typing, code debugging, or reading stressful emails.
2. **Reduced Blink Cadence:** Prolonged screen staring causes natural blink frequency to plummet from ~18 blinks/minute down to fewer than 5, causing dry eyes and digital ocular fatigue.

**CadenceDesk** is an open-source, cross-platform desktop application built on **Electron + Node.js 24 + `@smartspectra/node-sdk` v3.5.0** that turns standard webcams into a contactless, privacy-hardened ergonomics workstation. 

Instead of building a passive medical dashboard that displays uncalibrated numbers, CadenceDesk implements a unit-tested **Signal Trust & Gating Engine** with closed-loop adaptive interventions:
* **Breath-Hold Pause Cue:** Real-time variance tracking on the chest respiratory trace triggers a soft, expanding peripheral breathing halo when an 8-second cessation occurs, gently restoring diaphragmatic pacing without jarring popups.
* **Blink-Cadence Reminder:** Tracks rolling blink rate and eye-closure intervals; when blink gaps exceed 12 seconds, subtle peripheral luminance reminders stimulate the natural involuntary blink reflex.
* **Dual-Trace Oscilloscope:** High-performance 60 FPS native HTML5 Canvas visualizer rendering live Arterial Pulse Plethysmogram and Chest Respiration waveforms side-by-side.
* **Signal-Gated Ambient Breath Audio:** Pure Web Audio API procedural synthesizer whose low-pass filter cutoff ($180\text{Hz} \rightarrow 850\text{Hz}$) sweeps with live chest expansion, fading to silence whenever signal confidence drops.
* **Honest Session Trust Receipt:** Generates a post-session verification report displaying exact valid-frame percentages and coverage metrics—refusing to fake scores on noisy or low-light data.

---

## Demo

<!-- Embed your demo video link below (e.g. YouTube, Vimeo, or Loom) -->
{% embed https://youtu.be/YOUR_DEMO_VIDEO_ID %}

*Key Demo Timestamps:*
* **0:00 – 0:20:** Explicit Onboarding Consent Shield & General Wellness Framing
* **0:20 – 0:50:** Live 4-Tier Warm-Up progression (Face 0s → Pulse 12s → Respiration 30s → HRV 60s)
* **0:50 – 1:15:** Speech Guard demonstration (`face.talking` pausing respiration scoring with 600ms debounce)
* **1:15 – 1:35:** Breath-Hold Pause detection & restorative breathing halo
* **1:35 – 1:55:** Session Signal Trust Receipt review, JSON export, and instant memory purge

*(Tip: CadenceDesk also features a built-in **Calibrated Bio-Simulator Mode** so reviewers can test all features even without camera access!)*

---

## Code

**GitHub Repository:** [https://github.com/YOUR_USERNAME/cadencedesk](https://github.com/YOUR_USERNAME/cadencedesk)

### Setup & Reproducible Execution:
```bash
# 1. Clone repository
git clone https://github.com/YOUR_USERNAME/cadencedesk.git
cd cadencedesk

# 2. Install dependencies (Node 24 LTS recommended)
npm install

# 3. Run the unit test suite (15 tests passing in <1s)
npm test

# 4. Configure your Presage API Key
export SMARTSPECTRA_API_KEY="YOUR_KEY_HERE"  # or $env:SMARTSPECTRA_API_KEY="YOUR_KEY_HERE" on Windows

# 5. Build and launch
npm start
```

---

## How It Responds to Human Signals

CadenceDesk integrates the official `@smartspectra/node-sdk` (v3.5.0) via Koffi C-ABI pure-FFI bindings into Electron. Every incoming protobuf packet decoded via `@smartspectra/node-sdk/messages` passes through our pure-function **Signal Gate (`src/core/signal-gate.js`)**:

```plaintext
┌────────────────────────┐      ┌────────────────────────┐      ┌────────────────────────┐
│  SmartSpectra SDK 3.5  │ ───► │   Signal Trust Gate    │ ───► │  Ergonomics & Work UI  │
│  - 640x480 @ 30fps     │      │ - Warm-Up Validation   │      │ - Dual-Trace Canvas    │
│  - decodeMetrics Proto │      │ - Speech Guard         │      │ - Breath Halo Cue      │
│  - Telemetry: Disabled │      │ - Multi-Face Pause     │      │ - Ambient Breath Synth │
└────────────────────────┘      └────────────────────────┘      └────────────────────────┘
```

### The Progressive 4-Tier Gating Contract:
1. **Face Presence & Speech Guard (0s Warm-Up):**
   * Validated on `validationStatus === kOk`.
   * **Multi-Face Auto-Pause:** If a second person enters the frame (`kMultipleFacesFound`), sensing pauses immediately and the screen blurs to protect bystander privacy.
   * **Speech Guard:** When `face.talking.detected === true`, breathing rate updates are temporarily held with a **600ms debounce** window after talking ends, preventing conversational speech from corrupting respiratory statistics.
2. **Pulse Rate & Arterial Waveform (12s Warm-Up):**
   * Gated on `stable === true && confidence >= 40` (40–180 BPM).
   * Feeds the cyan channel on our 60 FPS dual-trace oscilloscope.
3. **Respiration Rate & Chest Trace (30s Warm-Up):**
   * Gated on `stable === true && confidence >= 45` (5–40 BR/min).
   * Evaluates rolling variance $\sigma^2$ over the last 8 seconds of `breathing.upperTrace`. When $\sigma^2 < 0.035$ persists for 8 continuous seconds during silence, the **Breath-Hold Pause Cue** activates the recovery halo.
4. **Heart Rate Variability (60s Warm-Up):**
   * Gated on `stable === true && confidence >= 50`.
   * Displays RMSSD, SDNN, and Baevsky Stress Index only after the full 60s stabilization window locks; never faked or estimated prematurely.

---

## Prize Categories

### 1. Best Thoughtful Real-World Use (Primary Entry)
* **The Problem:** Modern desk workers unconsciously hold their breath during screen focus and blink far less frequently, leading to chronic autonomic tension and ocular fatigue.
* **Usability & Non-Punitive Design:** Unlike apps that lock users out or trigger stressful popups, CadenceDesk uses ambient peripheral cues (a soft breathing halo and gentle light pulses) that naturally guide recovery without breaking flow.
* **Responsible Data Handling:** Features main-process consent enforcement, multi-face auto-pause, explicit non-medical disclaimers, and a **Session Trust Receipt** that transparently scores session data fidelity.

### 2. Best Overall Human-Sensing Experience
* **Deep Multi-Modal Fusion:** Combines Face, Cardio, Respiration, and HRV into a unified 60 FPS workstation.
* **Production-Grade Engineering:** Verified with **15 automated Vitest unit tests** covering timestamp parsing, warm-up progression, talking debounce, and privacy invariants.
* **Pre-Flight Camera Diagnostics:** Automatically verifies camera capture is $\ge 28\text{ FPS}$ before initiating sensing to protect user developer credits from low-light degraded runs.

### 3. Most Creative or Delightful Use
* **Bio-Generative Ambient Audio:** Uses the Web Audio API to procedurally synthesize a warm harmonic drone whose low-pass filter tracks the user's real-time lung inflation (`upperTrace`), automatically fading to silence if signal trust drops.

---

## Consent and Data Handling

CadenceDesk was engineered under strict privacy-by-design principles in accordance with the official challenge rules:

1. **Explicit Per-Session Camera Consent:**
   * Electron's main process blocks all camera permissions by default. Camera access is granted **only** after the user reviews our in-app disclosure and checks: *"I am 18+, I am the only person in camera view, and I consent to live on-device optical sensing."*
   * Microphone access is denied unconditionally (`audio: false`).
2. **100% On-Device Processing in RAM:**
   * Raw video frames captured from the local camera feed are processed entirely in volatile memory (RAM) via `@smartspectra/node-sdk` and native Koffi FFI.
   * **Zero video or audio frames are ever recorded, saved to local disk, or transmitted over the internet.**
3. **SDK Telemetry Disabled by Default:**
   * `enableTelemetry: false` is hardcoded at SDK initialization (and validated by our automated test suite in `tests/privacy-defaults.test.js`).
4. **Network Access & Third-Party Disclosures:**
   * The application connects to Presage's servers (`https://*.presagetech.com`) strictly for API key authentication and license gating.
   * As disclosed in community audits of SmartSpectra SDK v3.5.0, the native SDK emits periodic background insight check-in events (~once per minute); CadenceDesk never requests insights and discards these payloads silently unread.
   * Zero external analytics, zero tracking cookies, and zero cloud AI services are used.
5. **Data Retention & Instant Memory Purge:**
   * All metrics exist solely in memory for the duration of the active session.
   * Users can click **"Export JSON"** to save an anonymized audit log locally, or click **"Purge Memory"** to immediately erase all buffers.

---

## Agent Session

This project was built with the assistance of Google Antigravity. The complete, curated development transcript showing architectural reasoning, unit test verification, and competitive auditing is available publicly:
[View Public Agent Session](https://dev.to/agent_sessions/new)
*(All API keys and credentials were scrubbed prior to publishing).*
