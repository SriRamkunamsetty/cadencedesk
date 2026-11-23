# CadenceDesk (formerly PulseFlow Studio) — Production Implementation Plan V3.0

*Upgraded for the [Presage SmartSpectra SDK Challenge](https://dev.to/challenges/presage-2026-11-04) · Deadline: November 23, 2026 at 1:29 PM IST (November 22 at 11:59 PM PST)*

---

## 1. Strategic Repositioning (Why V3.0 Beats V2.0)

After auditing 56 verified `#presagechallenge` submissions, V3.0 resolves five critical risks in V2.0:

1. **Eliminates Name & Concept Collisions:** Renames **PulseFlow Studio** (which collided with an existing [PulseFlow](https://dev.to/ezequie1sc/pulseflow-turning-a-webcam-into-a-real-time-human-sensing-experience-2hj6) entry and closely overlapped [SpectraFlow](https://dev.to/ayushscodescs/spectraflow-bio-adaptive-deep-work-studio-polygraph-with-presage-smartspectra-2log) and [LIFEFORM](https://dev.to/purohitpriyanshu20/lifeform-your-pulse-and-breath-become-a-living-world-a-dashboard-and-a-piece-of-music-3fc6)) to **CadenceDesk** — a **Signal-Gated Bio-Adaptive Ergonomics & Focus Workstation**.
2. **Zero Prohibited Medical Claims:** Removes clinical/therapeutic language (*Asthenopia*, *Screen Apnea*, *therapeutic inhalation*, *6Hz theta entrainment*) that risks disqualification under the [Official Contest Rules](https://dev.to/page/presage-2026-11-04-contest-rules). Replaces them with transparent, non-medical ergonomic cues (**Breath-Hold Pause Cue**, **Blink-Cadence Reminder**, **Ambient Breath Audio**) and a persistent general-wellness disclaimer.
3. **Production-Grade SDK 3.5.0 Signal Gating:** Replaces the ungated 500 ms $S(t)$ vector with a unit-tested **Signal Trust Engine** enforcing warm-up tiers (0 s face, 12 s pulse, 30 s breathing, 60 s HRV), `stable` + confidence thresholds, `face.talking` 600 ms debounce (preventing speech from triggering false breath-hold alerts), and multi-face auto-pause.
4. **Gold-Standard Privacy & Consent Hardening:** Fixes `main.js` so camera permission is denied until explicit in-app consent sets a main-process boolean; sets `enableTelemetry: false`; encrypts the API key via Electron `safeStorage` (never exposed to renderer); adds a free 28 fps pre-flight camera check; and transparently discloses Presage API-key auth and SDK 3.5.0's automatic ~60 s insight check-in (discarded unread).
5. **Realistic 4-Hour P0/P1 Build Scope:** Cuts heavy boilerplate (4 Chart.js scopes + 350-node Delaunay triangulation) in favor of two razor-sharp native HTML5 Canvas visualizers and a strict **12:15 PM IST code freeze** so your live webcam demo video and DEV post ship on time.

---

## 2. Target Prize Alignment

| Prize Track | Award | How CadenceDesk V3.0 Scores 9.5–10/10 |
| :--- | :--- | :--- |
| **Best Thoughtful Real-World Use** (Primary) | $300 × 3 | Solves desk-worker breath-holding and low blink cadence without wearables; enforces main-process consent, multi-face auto-pause, honest SDK 3.5.0 disclosure, and a post-session **Signal Trust Receipt** showing exact % of valid frames (refusing to fake scores on noisy data). |
| **Best Overall Human-Sensing Experience** | $300 × 4 | Multi-modal closed-loop fusion across Face (0 s), Cardio (12 s), Breathing (30 s), and HRV (60 s) with empirical unit tests on the gating engine, monotonic timestamps, and real-time `validationStatus` coaching. |
| **Most Creative or Delightful Use** | $300 × 3 | Optional **Ambient Breath Synth & Horizon** where live `breathing.upperTrace` smoothly sweeps a Web Audio low-pass filter and `arterialPressureTrace` drives subtle visual pulse ripples—automatically fading to silence if signal trust drops. |

---

## 3. Hardened System Architecture (Electron + `@smartspectra/node-sdk` 3.5.0)

### Process & Security Boundaries

| Layer | Responsibility | Hardening Rule |
| :--- | :--- | :--- |
| **Main Process** (`main.js`) | Window lifecycle, `bindSmartSpectraIpc(win)`, consent state machine, `safeStorage` API key, IPC permission gate | `setPermissionRequestHandler` grants `'media'` **only** when `url.startsWith('file://')` AND `consentGranted === true`. Denies microphone (`audio: false`). Stops SDK cleanly via `stopAsync()` + `destroy()` on minimize, lock, or close. |
| **Preload Bridge** (`preload.js`) | Exposes `@smartspectra/node-sdk/preload` + narrow typed IPC (`setConsent`, `getApiKeyStatus`, `exportSession`, `purgeSession`) | `contextIsolation: true`, `sandbox: true`, `nodeIntegration: false`. API key never enters `localStorage` or renderer logs. |
| **Renderer Shell** (`src/renderer/`) | Strict CSP, Consent Gate, Pre-Flight FPS Check, Live Workstation UI, Signal Trust Engine, Ambient Audio, Session Receipt | CSP header MUST include `worker-src 'self' blob:;` (required by SmartSpectra renderer Web Worker). Handles `SMARTSPECTRA_IPC_TIMEOUT` (30 s default) gracefully. |
| **Pure-Function Core** (`src/core/`) | `signal-gate.js`, `baseline-tracker.js`, `ergonomics-engine.js`, `coherence.js` | Zero Electron/DOM dependencies so **20+ Vitest / Node test runner unit tests** run in <2 seconds and prove accuracy to judges. |

---

## 4. Upgraded Signal Processing & Trust Engine (`src/core/`)

### 4.1 Progressive Four-Tier Warm-Up & Gating Contract

Every incoming `decodeMetrics(buf)` packet passes through `signal-gate.js` before touching the UI or audio engine. Safe timestamp conversion handles protobuf `int64` / `Long` objects (`Number(ts)` or `ts.toNumber()`), rejecting stale packets (`age > 5000 ms`).

| Signal Bundle | Exact SDK Field | Warm-Up | Acceptance Gate | Failure-Mode Guard |
| :--- | :--- | :---: | :--- | :--- |
| **Face Presence & Speech** | `face.talking`, `face.blinking`, `face.landmarks` | Instant (0 s) | `validationStatus === kOk` | Multi-face (`MultipleFacesFound`) immediately pauses sensing and blanks metrics. |
| **Pulse Rate & Wave** | `cardio.pulseRate`, `cardio.arterialPressureTrace` | 12 s | `stable === true && confidence >= 40` (40–110 BPM) | Shows "Settling (12 s)..." during warm-up; dims on motion/flicker warnings. |
| **Breathing Rate & Chest Trace** | `breathing.rate`, `breathing.upperTrace` | 30 s | `stable === true && confidence >= 45` (5–40 br/min) | **Talking Guard:** Paused whenever `face.talking.detected === true` + 600 ms debounce. |
| **HRV & Autonomic Balance** | `cardio.hrv` (`rmssd`, `sdnn`, `baevsky`) | 60 s | `stable === true && confidence >= 50` | Displayed only in session summary / deep-work tier once 60 s window locks; omitted (never faked) if unstable. |

*Note on EDA Proxy:* Drop `edaMetrics` from the P0 default bundle to conserve CPU/frame rate and keep the UI focused on signals that stabilize within a 60–90 s demo video.

### 4.2 Personal Calm Baseline (First 45 Seconds)
- Captures a rolling median baseline for **Pulse Rate** (samples 12–45 s) and **Breathing Rate** (samples 30–45 s) while stationary and silent.
- All focus/ergonomics triggers react to **personal baseline deltas** (e.g., Pulse `+12 BPM` sustained for 20 s; Breathing `+25%` and `>= 3 br/min` above baseline across 2 consecutive readings), never arbitrary global thresholds.

### 4.3 Non-Medical Ergonomic Cues (`ergonomics-engine.js`)
1. **Breath-Hold Pause Cue (Replaces "Screen Apnea"):**
   - Because `breathing.apnea` is unpopulated in SDK 3.5.0, compute rolling variance $\sigma^2$ over the last 8 s of normalized `breathing.upperTrace`.
   - Trigger **only when** `breathingReady && !isTalking && validationOk && variance < threshold` for 8 continuous seconds.
   - Response: Soft peripheral breathing halo (4 s inhale / 6 s exhale) that fades smoothly as soon as live chest amplitude resumes.
2. **Blink-Cadence Reminder (Replaces "Asthenopia"):**
   - Track rolling 60-second blink rate from `face.blinking` AND eye-aspect ratio (EAR) from `face.landmarks` (for sustained eye-closure / fatigue detection).
   - If rolling blink rate drops below `8 blinks/min` (or time since last blink `> 12 s` while face is centered), pulse a subtle 40 ms peripheral border shimmer (`prefers-reduced-motion` respected via static badge fallback).
3. **Signal-Gated Ambient Breath Audio (Optional Toggle, Off by Default):**
   - Pure Web Audio API (zero external audio files): warm harmonic pad (C3/G3/D4, no pseudoscientific frequency claims) routed through a `BiquadFilterNode` whose cutoff (`180 Hz`–`850 Hz`) tracks normalized `breathing.upperTrace`.
   - **Honesty Rule:** Master gain smoothly fades to `0.0` whenever `signalTrust < 0.5` or `validationStatus !== kOk`—the app never fakes a rhythm when the camera loses lock.
4. **Honest Session Trust Receipt (`session-vault.js`):**
   - At session end, displays: Total duration, % of frames with `kOk`, Pulse coverage %, Breathing coverage %, Breath-hold pauses gently recovered, Blink reminders, and an explicit badge (**Full**, **Partial**, or **Low-Light / Insufficient**) plus one-click **Export Local JSON** and **Purge All Memory**.

---

## 5. Production Privacy & Consent Specification (Copy-Ready for DEV Post)

Include every item below in both the in-app **Consent Screen** and the **Consent and Data Handling** section of your DEV submission:

- **Explicit Per-Session Consent:** Camera cannot start until the user checks *"I am 18+, I am the only person on camera, and I consent to live webcam sensing"* (enforced in Electron's main process before `setPermissionRequestHandler` allows `'media'`). Microphone is never requested.
- **Multi-Face & Background Safeguards:** Sensing pauses automatically if a second face enters the frame (`validationStatus`), if the window is minimized, or on `Esc` / clicking the persistent red **Stop Camera** button.
- **On-Device Processing & Exact Network Disclosures:** Raw camera frames are processed in RAM locally via `@smartspectra/node-sdk` and are **never recorded, saved to disk, or uploaded**. However, the SDK contacts Presage's servers for API-key authentication and model delivery. Additionally, per independent community audits of SmartSpectra SDK v3.5.0, the SDK may dispatch periodic (~60 s) insight check-ins; CadenceDesk never invokes `requestInsight()`, discards any unsolicited insight payloads unread, and discloses this behavior upfront.
- **Telemetry Off by Default:** `enableTelemetry: false` is hardcoded at SDK initialization (and verified by a unit test). If a user explicitly opts into SDK diagnostics in Settings, the UI warns that Presage's telemetry requests are authenticated and therefore **not anonymous**.
- **Storage, Retention & Deletion:** Zero cloud storage, zero accounts, zero external AI services. Metrics live in RAM only; optional local JSON export occurs only on explicit click, and **Purge Session** zeroes memory immediately.
- **Non-Medical Framing:** Prominent banner on consent and live screens: *"General wellness and focus-ergonomics tool only. Not a medical device; does not diagnose, treat, or guide medical decisions."*

---

## 6. Lean, High-Velocity File Layout

```text
cadencedesk/
├── package.json                    # @smartspectra/node-sdk@^3.5.0, electron, esbuild, vitest
├── main.js                         # Main process: consent gate, safeStorage key, IPC, clean teardown
├── preload.js                      # @smartspectra/node-sdk/preload + narrow contextBridge API
├── README.md                       # Reproducible setup (Node 24 LTS, API key, npm start, npm test)
├── SUBMISSION_DRAFT.md             # Complete DEV post matching official template
├── tests/
│   ├── signal-gate.test.js         # Warm-up, confidence, Long timestamps, talking debounce, multi-face
│   ├── ergonomics-engine.test.js   # Breath-hold variance, blink cadence, baseline delta, receipt tiers
│   └── privacy-defaults.test.js    # Asserts enableTelemetry === false & consent-before-start invariant
└── src/
    ├── core/                       # Pure JS/TS logic (100% unit-testable without Electron)
    │   ├── signal-gate.js          # Progressive 4-tier trust & validation state machine
    │   ├── baseline-tracker.js     # 45s rolling median personal baseline
    │   ├── ergonomics-engine.js    # Breath-hold pause cue & blink-cadence reminder
    │   └── receipt-builder.js      # Full / Partial / Insufficient session trust receipt
    └── renderer/
        ├── index.html              # Strict CSP (worker-src 'self' blob:), accessible dark UI
        ├── styles.css              # Clean typography, reduced-motion support, live camera badge
        ├── renderer.js             # Orchestrator + 640x480 @ 30fps pre-flight camera check
        └── modules/
            ├── sdk-controller.js   # SmartSpectraSDK lifecycle, enableTelemetry: false, timeout handling
            ├── bio-simulator.js    # Clearly badged "SIMULATED TEST MODE" for judges without webcams
            ├── waveform-canvas.js  # Single crisp 60fps dual-trace Canvas (arterial + chest breath)
            ├── audio-engine.js     # Optional Web Audio breath filter (fades on low trust)
            └── consent-modal.js    # Explicit per-session consent + instant Stop/Purge controls
```

---

## 7. Strict 4-Hour Execution Sprint (9:20 AM – 1:29 PM IST)

| Time Window (IST) | Priority | Milestone & Concrete Exit Criteria |
| :--- | :---: | :--- |
| **09:20 – 10:00** (40 m) | **P0** | **Scaffold & Live SDK Lock:** `npm install @smartspectra/node-sdk electron esbuild vitest`. Wire `main.js` (consent-gated permission handler + `bindSmartSpectraIpc`), `preload.js`, `index.html` (with `worker-src 'self' blob:;`), and `sdk-controller.js` (`640x480 @ 30 fps`, `enableTelemetry: false`). **Exit check:** Live webcam prints real decoded pulse & breathing packets in DevTools. |
| **10:00 – 11:00** (60 m) | **P0** | **Core Signal Trust & Ergonomics + Tests:** Build `src/core/` (`signal-gate.js`, `baseline-tracker.js`, `ergonomics-engine.js`, `receipt-builder.js`) and write 15–20 Vitest unit tests (including `enableTelemetry: false`, talking debounce, and multi-face pause). **Exit check:** `npm test` passes 100%. |
| **11:00 – 12:00** (60 m) | **P0** | **Workstation UI, Consent Flow & Canvas:** Build `consent-modal.js`, 28 fps pre-flight check, single dual-trace `waveform-canvas.js`, live Signal Trust indicators (Settling -> Steady), ergonomic cues, and Session Trust Receipt + Purge/Export. |
| **12:00 – 12:15** (15 m) | **P1** | **Optional Polish (Hard Freeze at 12:15):** Wire `audio-engine.js` (breath-swept pad, muted by default) and badged `bio-simulator.js`. **Stop coding at 12:15 PM IST sharp.** |
| **12:15 – 12:55** (40 m) | **P0** | **Live Demo Video & GitHub Push:** Record a 90–120 s **live webcam** screen capture showing: (1) Consent screen + `enableTelemetry: false`, (2) Live warm-up progression (face 0 s -> pulse 12 s -> breath 30 s), (3) Speaking to show `face.talking` pausing breath cue + breath-hold recovery halo, (4) Session Trust Receipt + Purge. Push clean repo (`.env` gitignored) with complete `README.md`. |
| **12:55 – 13:20** (25 m) | **P0** | **Publish DEV Post (9-min buffer before 1:29 PM IST):** Fill official template with tags `devchallenge`, `presagechallenge`, declare Prize Categories, paste verified Consent & Data Handling disclosure, embed demo video + public repo + optional public Agent Session (API keys scrubbed), and hit Publish. |
