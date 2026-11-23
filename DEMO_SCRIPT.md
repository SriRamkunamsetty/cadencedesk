# CadenceDesk — 90-Second Demo Video Recording Script
*Guide for recording the required submission demo video for the Presage SmartSpectra SDK Challenge.*

---

## Recording Checklist
* **Resolution:** 1080p (1920x1080) or 720p (1280x720) 60 FPS.
* **Audio:** Clear voiceover or quiet ambient sound.
* **Lighting:** Sit in front of good, even room lighting so `validationStatus` remains `kOk`.
* **Recommended Recording Tool:** OBS Studio, Windows Game Bar (`Win + G`), or Loom.

---

## Step-by-Step Storyboard (0:00 – 1:45)

### Scene 1: Introduction & Consent Gate (0:00 – 0:20)
* **On Screen:** The CadenceDesk app launches. The **Privacy & Camera Consent** modal is prominently visible with the non-medical disclaimer banner at the top.
* **Action:** 
  1. Point out the three privacy pillars (100% on-device processing in RAM, multi-face privacy shield, telemetry disabled).
  2. Check the box: *"I am 18+, I am the only person in camera view, and I consent..."*
  3. Click **"Grant Consent & Launch"**.
* **Voiceover:**  
  *"Hi everyone, this is CadenceDesk — a signal-gated bio-adaptive ergonomics workstation built with the Presage SmartSpectra SDK. We start with explicit, per-session in-app consent: raw video frames are processed entirely in RAM and never leave the device."*

---

### Scene 2: Live Optical Sensing & 4-Tier Warm-Up (0:20 – 0:50)
* **On Screen:** Click **"Start Sensing"**. The webcam preview lights up.
* **Action:**
  1. Show the **Signal Trust** meter climbing.
  2. Watch the warm-up progression in real time:
     * Face presence & blink cadence locks at **0s**.
     * Pulse Rate unlocks at **12s** as the cyan Arterial Waveform streams across the dual-trace canvas.
     * Respiration Rate unlocks at **30s** as the emerald Chest Waveform locks in.
* **Voiceover:**  
  *"When we start sensing, CadenceDesk doesn't show fake or uncalibrated numbers. It implements a strict 4-tier warm-up gate: face locks immediately, pulse settles at 12 seconds, and breathing stabilizes at 30 seconds. On the canvas, you can see our dual-trace oscilloscope rendering both arterial pulse and chest respiration at 60 FPS."*

---

### Scene 3: Speech Guard & Multi-Face Safeguard (0:50 – 1:15)
* **On Screen:** Begin speaking naturally to the camera.
* **Action:**
  1. Point out the Respiration tile switching to **"Speech Guard: Active"**.
  2. Stop speaking: notice the 600ms debounce clearing before breathing updates resume.
  3. (Optional) Toggle the **"🔊 Audio: On"** button to let viewers hear the gentle Web Audio harmonic drone sweeping with your chest expansion.
* **Voiceover:**  
  *"A common flaw in webcam vitals apps is that talking corrupts breathing measurements. CadenceDesk includes a unit-tested Speech Guard: when I speak, breathing scoring pauses with a 600ms debounce to prevent false alarms. We also have an optional ambient breath synthesizer that sweeps a low-pass filter with your live chest expansion."*

---

### Scene 4: Breath-Hold Pause Cue & Recovery Halo (1:15 – 1:35)
* **On Screen:** Hold your breath quietly for 8 seconds.
* **Action:**
  1. The breath trace flatlines on the canvas.
  2. At 8 seconds, the **Breath-Hold Pause Cue** activates: a soft cyan breathing halo pulses on the camera preview: *"Inhale gently..."*
  3. Take a normal deep breath: the halo smoothly disappears as dynamic variance resumes.
* **Voiceover:**  
  *"Over 80% of desk workers experience breath-holding during intense focus. If my respiratory trace flatlines for 8 continuous seconds, CadenceDesk triggers a gentle recovery halo, guiding me back to a natural diaphragmatic cadence without jarring popups."*

---

### Scene 5: Stop & Honest Session Trust Receipt (1:35 – 1:55)
* **On Screen:** Click **"Stop"**. The **Session Signal Trust Receipt** modal opens automatically.
* **Action:**
  1. Highlight the receipt: Total Duration, Valid Frame %, Pulse Coverage %, and the **Full Trust** badge.
  2. Click **"Export JSON"** (or show the formatted receipt).
  3. Click **"Purge Memory"** to demonstrate instant zeroing of all session buffers.
* **Voiceover:**  
  *"When our session ends, CadenceDesk generates an honest Session Trust Receipt showing exact valid frame percentages and trust tiers. We refuse to fake scores on noisy data. With one click, all session metrics can be exported as local JSON or completely purged from memory. Thank you!"*
