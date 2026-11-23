// preload.js
// Copyright (C) 2026 CadenceDesk Project
// Context-Isolated Preload Bridge

'use strict';

// 1. Establish the SmartSpectra native IPC bridge in its isolated world
require('@smartspectra/node-sdk/preload');

// 2. Expose application-specific securely scoped host APIs
const { contextBridge, ipcRenderer } = require('electron');

contextBridge.exposeInMainWorld('cadenceHost', {
  setConsent: (granted) => ipcRenderer.invoke('cadence:set-consent', granted),
  getApiKey: () => ipcRenderer.invoke('cadence:get-api-key'),
  exportReceipt: (jsonString) => ipcRenderer.invoke('cadence:export-receipt', jsonString),
});
