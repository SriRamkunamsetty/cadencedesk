// src/renderer/modules/sdk-controller.js
// Copyright (C) 2026 CadenceDesk Project
// SmartSpectra SDK 3.5.0 Hardware Controller

'use strict';

const {
  SmartSpectraSDK,
  ProcessingStatus,
  ValidationCode,
  breathingMetrics,
  cardioMetrics,
  faceMetrics,
} = require('@smartspectra/node-sdk/renderer');

const { decodeMetrics } = require('@smartspectra/node-sdk/messages');

class SdkController {
  constructor(callbacks = {}) {
    this.callbacks = callbacks;
    this.sdk = null;
    this.activeStream = null;
    this.apiKey = '';
  }

  async init(apiKey) {
    this.apiKey = apiKey;
  }

  buildSdk() {
    // Requested bundles: breathing + cardio + face
    // Exclude edaMetrics from P0 default bundle to conserve frame rate
    const requested = [
      ...breathingMetrics,
      ...cardioMetrics,
      ...faceMetrics,
    ];

    this.sdk = new SmartSpectraSDK({
      apiKey: this.apiKey,
      requestedMetrics: requested,
      enableTelemetry: false, // Strict privacy: disabled by default
      enableAccumulatedOutput: false,
    });

    this.sdk.on('processingStatus', (status) => {
      if (typeof this.callbacks.onProcessingStatus === 'function') {
        this.callbacks.onProcessingStatus(status);
      }
    });

    this.sdk.on('validationStatus', (code, timestampUs, hint) => {
      if (typeof this.callbacks.onValidationStatus === 'function') {
        this.callbacks.onValidationStatus(code, timestampUs, hint);
      }
    });

    this.sdk.on('streamAvailable', (stream) => {
      this.activeStream = stream;
      if (typeof this.callbacks.onStreamAvailable === 'function') {
        this.callbacks.onStreamAvailable(stream);
      }
    });

    this.sdk.on('metrics', (buf, timestampUs) => {
      try {
        const decoded = decodeMetrics(buf);
        if (typeof this.callbacks.onMetrics === 'function') {
          this.callbacks.onMetrics(decoded, timestampUs);
        }
      } catch (err) {
        console.warn('[sdk-controller] Protobuf decode warning:', err);
      }
    });

    // SDK 3.5.0 automatic background insight handler:
    // Discard unread and unrequested to uphold user privacy
    this.sdk.on('insight', () => {
      // Intentionally silent discard
    });

    this.sdk.on('error', (code, message, retryable) => {
      console.error(`[sdk-controller] SDK error code=${code} (${message})`);
      if (typeof this.callbacks.onError === 'function') {
        this.callbacks.onError(code, message, retryable);
      }
    });
  }

  async start() {
    if (!this.sdk) {
      this.buildSdk();
    }
    await this.sdk.start();
  }

  async stop() {
    if (this.sdk) {
      try {
        await this.sdk.stop();
      } catch (e) {
        console.warn('[sdk-controller] stop error:', e);
      }
      this.destroy();
    }
  }

  destroy() {
    if (this.sdk) {
      try {
        this.sdk.destroy();
      } catch {}
      this.sdk = null;
    }
    this.activeStream = null;
  }
}

module.exports = {
  SdkController,
  ProcessingStatus,
  ValidationCode,
};
