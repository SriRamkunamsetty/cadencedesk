# CadenceDesk 🫀🧘
**Signal-Gated Bio-Adaptive Ergonomics & Focus Workstation**  
*Powered by the [Presage SmartSpectra SDK](https://smartspectra.presagetech.com/) for the [DEV Community Presage Challenge](https://dev.to/challenges/presage-2026-11-04).*

---

> [!NOTE]  
> **General Wellness Disclaimer:** CadenceDesk is a focus-ergonomics and wellness companion tool. It is **not** a medical device, has not been evaluated by the FDA, and does not diagnose, treat, prevent, or guide clinical decisions for any condition.

---

## Overview

Modern knowledge workers face two silent productivity and ergonomic drains:
1. **Desk-Worker Breath-Holding:** Prolonged, shallow, or ceased breathing during intense focus, email triage, or debugging.
2. **Reduced Blink Cadence:** Prolonged screen staring causes blink frequency to drop by up to 60%, leading to ocular fatigue.

**CadenceDesk** transforms ordinary webcams into a contactless, real-time bio-adaptive ergonomics companion. Using the **Presage SmartSpectra SDK v3.5.0**, it tracks live arterial pressure waveforms, pulse rate, dual-trace respiration (chest and abdomen), facial landmarks, and eye blinks—all processed **100% on-device in RAM**.

Unlike traditional passive dashboards that merely display uncalibrated numbers, CadenceDesk features a unit-tested **Signal Trust & Gating Engine** that responds in closed loop:
* **Breath-Hold Pause Cue:** Gently guides diaphragmatic breath recovery when a sustained flatline is detected.
* **Blink-Cadence Reminder:** Emits subtle peripheral light reminders when blink intervals exceed ergonomic comfort thresholds.
* **Signal-Gated Ambient Breath Audio:** Real-time Web Audio low-pass synthesizer that smoothly tracks chest expansion and automatically fades to silence if camera lock is lost.
* **Honest Session Trust Receipt:** Evaluates session validity percentage and refuses to display faked scores on noisy data.

---

## System Architecture

```
┌─────────────────────────────────────────────────────────────────────────────┐
│                             CADENCEDESK HOST                                │
├─────────────────────────────────────────────────────────────────────────────┤
│                               ELECTRON HOST                                 │
│                                                                             │
│  ┌─────────────────────────┐          IPC Channel          ┌─────────────┐  │
│  │     Main Process        │ ◄───────────────────────────► │   Preload   │  │
│  │ (bindSmartSpectraIpc)   │                               │   Bridge    │  │
│  └───────────┬─────────────┘                               └──────┬──────┘  │
│              │                                                    │         │
│              ▼                                                    ▼         │
│  ┌─────────────────────────┐                               ┌─────────────┐  │
│  │  Native C-ABI Runtime   │                               │  Renderer   │  │
│  │ (smartspectra_capi.dll) │                               │   Process   │  │
│  │      via Koffi FFI      │                               └──────┬──────┘  │
│  └─────────────────────────┘                                      │         │
│                                                                   │         │
│  ┌────────────────────────────────────────────────────────────────┴──────┐  │
│  │                        SIGNAL TRUST ENGINE                            │  │
│  │                                                                       │  │
│  │  ┌───────────────────────┐   ┌─────────────────────────────────────┐  │  │
│  │  │  Live SmartSpectra SDK│   │  Progressive 4-Tier Warm-Up Gate:   │  │  │
│  │  │  - 640x480 @ 30fps    │   │  • Face Presence: 0s                │  │  │
│  │  │  - decodeMetrics      │   │  • Pulse Rate & Wave: 12s           │  │  │
│  │  │  - Telemetry: Disabled│   │  • Breathing & Trace: 30s           │  │  │
│  │  └───────────┬───────────┘   │  • HRV & Autonomic Balance: 60s     │  │  │
│  │              │               └──────────────────┬──────────────────┘  │  │
│  │              ▼                                  ▼                     │  │
│  │  ┌───────────────────────┐   ┌─────────────────────────────────────┐  │  │
│  │  │  Multi-Face Guard     │   │  Speech Guard (face.talking)        │  │  │
│  │  │  (Auto-pause sensing) │   │  (600ms debounce pauses breath cue) │  │  │
│  │  └───────────────────────┘   └─────────────────────────────────────┘  │  │
│  │                                                 │                     │  │
│  │            ┌────────────────────────────────────┼────────────────┐    │  │
│  │            ▼                                    ▼                ▼    │  │
│  │  ┌───────────────────┐        ┌───────────────────┐    ┌──────────┐  │  │
│  │  │ Dual-Trace Canvas │        │ Ambient Breath    │    │ Ergo Cues│  │  │
│  │  │ - Arterial Wave   │        │ Synthesizer       │    │ - Hold   │  │  │
│  │  │ - Chest Respiration│       │ - Web Audio Pad   │    │   Halo   │  │  │
│  │  │ - 60 FPS Native   │        │ - Breath Filter   │    │ - Blink  │  │  │
│  │  └───────────────────┘        └───────────────────┘    └──────────┘  │  │
│  └───────────────────────────────────────────────────────────────────────┘  │
└─────────────────────────────────────────────────────────────────────────────┘
```

---

## Signal Trust & Progressive Gating Contract

| Signal Bundle | SDK Field | Warm-Up | Acceptance Gate | Failure-Mode Guard |
| :--- | :--- | :---: | :--- | :--- |
| **Face Presence** | `face.talking`, `face.blinking` | 0 s | `validationStatus === kOk` | Multi-face (`kMultipleFacesFound`) pauses capture immediately. |
| **Pulse Rate & Wave** | `cardio.pulseRate`, `cardio.arterialPressureTrace` | 12 s | `stable === true && conf >= 40` (40–180 BPM) | Dims during camera motion or tuning warnings. |
| **Breathing & Trace** | `breathing.rate`, `breathing.upperTrace` | 30 s | `stable === true && conf >= 45` (5–40 BR/min) | **Speech Guard:** Pauses updates during `face.talking` + 600 ms debounce. |
| **HRV Balance** | `cardio.hrv` (`rmssd`, `sdnn`, `baevsky`) | 60 s | `stable === true && conf >= 50` | Displayed only once 60s analysis window locks. |

---

## Getting Started

### Prerequisites
* **Node.js**: v20+ (Node.js 24 LTS recommended)
* **npm**: v10+
* **Webcam**: Standard USB or built-in webcam
* **Presage Developer API Key**: Register at [physiology.presagetech.com](https://physiology.presagetech.com/)

### 1. Clone & Install
```bash
git clone https://github.com/YOUR_USERNAME/cadencedesk.git
cd cadencedesk
npm install
```

### 2. Configure API Key
Export your developer key in your shell:
```bash
# Windows (PowerShell)
$env:SMARTSPECTRA_API_KEY="YOUR_API_KEY_HERE"

# macOS / Linux
export SMARTSPECTRA_API_KEY="YOUR_API_KEY_HERE"
```

### 3. Run Unit Tests (15 tests passing in <1s)
```bash
npm test
```

### 4. Build & Launch
```bash
npm start
```
*(Tip: If you do not have a webcam or API key available, click **"Switch to Simulator"** in the top header to run CadenceDesk in full Calibrated Bio-Simulator mode!)*

---

## Privacy & Data Sovereignty

CadenceDesk was engineered under strict privacy-by-design standards:
* **Explicit In-App Consent:** Camera permission is denied in Electron's main process until the user reviews and clicks "Grant Consent & Launch".
* **100% On-Device Processing:** All video frames are processed locally in RAM by the native Koffi C-ABI runtime. Video frames, audio, and biometrics are never stored to disk or transmitted to any server.
* **Telemetry Disabled by Default:** `enableTelemetry: false` is hardcoded at SDK construction (verified via unit test).
* **Network Transparency:** Network connectivity is used solely by the SDK for license authentication. Unsolicited SDK 3.5.0 background insight events are discarded unread.
* **One-Click Memory Purge:** Users can export an anonymized Session Trust Receipt as JSON or click "Purge Memory" to instantly zero all buffers.

---

## License

Apache-2.0 © 2026 CadenceDesk Project
