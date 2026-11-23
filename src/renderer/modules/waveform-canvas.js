// src/renderer/modules/waveform-canvas.js
// Copyright (C) 2026 CadenceDesk Project
// High-Performance 60fps Dual-Trace Canvas Visualizer

'use strict';

class WaveformCanvas {
  constructor(canvasId) {
    this.canvas = document.getElementById(canvasId);
    this.ctx = this.canvas.getContext('2d');
    this.pulseBuffer = [];     // { x, y }
    this.breathBuffer = [];    // { x, y }
    this.maxPoints = 300;      // ~10 seconds at 30Hz
    this.isRunning = false;
    this.animFrameId = null;

    this.resize();
    window.addEventListener('resize', () => this.resize());
  }

  resize() {
    if (!this.canvas) return;
    const rect = this.canvas.getBoundingClientRect();
    const dpr = window.devicePixelRatio || 1;
    this.width = rect.width;
    this.height = rect.height;
    this.canvas.width = Math.round(this.width * dpr);
    this.canvas.height = Math.round(this.height * dpr);
    this.ctx.resetTransform?.();
    this.ctx.scale(dpr, dpr);
  }

  addSamples(arterialSamples = [], upperBreathSamples = []) {
    // Add arterial samples
    for (const s of arterialSamples) {
      const val = typeof s === 'number' ? s : s.value;
      if (typeof val === 'number') {
        this.pulseBuffer.push(val);
        if (this.pulseBuffer.length > this.maxPoints) {
          this.pulseBuffer.shift();
        }
      }
    }

    // Add breathing upper trace samples
    for (const s of upperBreathSamples) {
      const val = typeof s === 'number' ? s : s.value;
      if (typeof val === 'number') {
        this.breathBuffer.push(val);
        if (this.breathBuffer.length > this.maxPoints) {
          this.breathBuffer.shift();
        }
      }
    }
  }

  clear() {
    this.pulseBuffer = [];
    this.breathBuffer = [];
    this.drawGrid();
  }

  start() {
    if (this.isRunning) return;
    this.isRunning = true;
    const renderLoop = () => {
      if (!this.isRunning) return;
      this.render();
      this.animFrameId = requestAnimationFrame(renderLoop);
    };
    this.animFrameId = requestAnimationFrame(renderLoop);
  }

  stop() {
    this.isRunning = false;
    if (this.animFrameId) {
      cancelAnimationFrame(this.animFrameId);
      this.animFrameId = null;
    }
  }

  drawGrid() {
    const ctx = this.ctx;
    const w = this.width;
    const h = this.height;

    ctx.fillStyle = '#030712';
    ctx.fillRect(0, 0, w, h);

    // Subtle horizontal channel divider
    ctx.strokeStyle = 'rgba(255, 255, 255, 0.06)';
    ctx.lineWidth = 1;
    ctx.beginPath();
    ctx.moveTo(0, h / 2);
    ctx.lineTo(w, h / 2);
    ctx.stroke();

    // Subtle grid lines
    ctx.strokeStyle = 'rgba(255, 255, 255, 0.03)';
    ctx.beginPath();
    for (let x = 0; x < w; x += 40) {
      ctx.moveTo(x, 0);
      ctx.lineTo(x, h);
    }
    for (let y = 0; y < h; y += 35) {
      ctx.moveTo(0, y);
      ctx.lineTo(w, y);
    }
    ctx.stroke();
  }

  render() {
    const ctx = this.ctx;
    const w = this.width;
    const h = this.height;

    this.drawGrid();

    const halfH = h / 2;

    // 1. Render Upper Channel: Arterial Pulse Plethysmogram (Cyan)
    if (this.pulseBuffer.length > 2) {
      this.renderTrace(
        this.pulseBuffer,
        0,
        halfH - 8,
        '#00f2fe',
        'rgba(0, 242, 254, 0.12)'
      );
    }

    // 2. Render Lower Channel: Chest Respiration Trace (Emerald)
    if (this.breathBuffer.length > 2) {
      this.renderTrace(
        this.breathBuffer,
        halfH + 8,
        h - 8,
        '#10b981',
        'rgba(16, 185, 129, 0.12)'
      );
    }
  }

  renderTrace(buffer, minY, maxY, strokeColor, fillColor) {
    const ctx = this.ctx;
    const w = this.width;
    const count = buffer.length;
    const step = w / Math.max(1, this.maxPoints - 1);
    const startX = w - (count * step);

    // Auto-scale min/max
    let minVal = Infinity;
    let maxVal = -Infinity;
    for (let i = 0; i < count; i++) {
      const v = buffer[i];
      if (v < minVal) minVal = v;
      if (v > maxVal) maxVal = v;
    }

    const range = (maxVal - minVal) || 1;
    const heightSpan = maxY - minY;

    ctx.save();
    ctx.beginPath();
    ctx.strokeStyle = strokeColor;
    ctx.lineWidth = 1.8;
    ctx.lineJoin = 'round';
    ctx.lineCap = 'round';

    for (let i = 0; i < count; i++) {
      const x = startX + i * step;
      // Invert Y so higher values go up
      const normY = (buffer[i] - minVal) / range;
      const y = maxY - (normY * heightSpan);

      if (i === 0) {
        ctx.moveTo(x, y);
      } else {
        ctx.lineTo(x, y);
      }
    }
    ctx.stroke();

    // Fill underneath the curve
    if (fillColor && count > 1) {
      const firstX = startX;
      const lastX = startX + (count - 1) * step;
      ctx.lineTo(lastX, maxY);
      ctx.lineTo(firstX, maxY);
      ctx.closePath();
      ctx.fillStyle = fillColor;
      ctx.fill();
    }

    ctx.restore();
  }
}

module.exports = {
  WaveformCanvas,
};
