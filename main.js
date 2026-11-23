// main.js
// Copyright (C) 2026 CadenceDesk Project
// Hardened Main Process for CadenceDesk with Signal Gating & Consent Enforcement

'use strict';

const path = require('path');
const { app, BrowserWindow, session, ipcMain, dialog, safeStorage } = require('electron');

// Native C-ABI runtime resolution for packaged builds
if (app.isPackaged && !process.env.SMARTSPECTRA_CAPI_PATH) {
  const LIB = {
    darwin: 'libsmartspectra_capi.dylib',
    win32:  'smartspectra_capi.dll',
    linux:  'libsmartspectra_capi.so',
  }[process.platform];
  if (LIB) {
    process.env.SMARTSPECTRA_CAPI_PATH = path.join(process.resourcesPath, 'smartspectra', LIB);
  }
}

const { bindSmartSpectraIpc } = require('@smartspectra/node-sdk/main');

let mainWindow = null;
let consentGranted = false; // Main-process consent state machine

function createWindow() {
  mainWindow = new BrowserWindow({
    width: 1240,
    height: 840,
    minWidth: 1024,
    minHeight: 700,
    backgroundColor: '#0a0d14',
    title: 'CadenceDesk — Signal-Gated Bio-Adaptive Focus & Ergonomics',
    webPreferences: {
      preload: path.join(__dirname, 'preload.js'),
      contextIsolation: true,
      sandbox: true,
      nodeIntegration: false,
    },
  });

  // Bind official SmartSpectra IPC bridge
  bindSmartSpectraIpc(mainWindow);

  // Security: Deny all remote navigation and window opening
  mainWindow.webContents.setWindowOpenHandler(() => ({ action: 'deny' }));
  mainWindow.webContents.on('will-navigate', (event) => event.preventDefault());

  mainWindow.loadFile(path.join(__dirname, 'src/renderer/index.html'));

  mainWindow.on('closed', () => {
    mainWindow = null;
  });
}

// IPC Handlers
ipcMain.handle('cadence:set-consent', (event, granted) => {
  consentGranted = Boolean(granted);
  console.log(`[main] User consent state updated: ${consentGranted}`);
  return { success: true, consentGranted };
});

ipcMain.handle('cadence:get-api-key', () => {
  // Read from environment or safe storage
  const key = process.env.SMARTSPECTRA_API_KEY || '';
  const isConfigured = Boolean(key && key !== 'YOUR_API_KEY_HERE' && key.length > 5);
  return {
    isConfigured,
    maskedKey: isConfigured ? `${key.slice(0, 4)}...${key.slice(-4)}` : '',
    rawKey: key, // Delivered over isolated IPC to the renderer's internal SDK constructor
  };
});

ipcMain.handle('cadence:export-receipt', async (event, jsonString) => {
  if (!mainWindow) return { canceled: true };
  const { canceled, filePath } = await dialog.showSaveDialog(mainWindow, {
    title: 'Export CadenceDesk Session Trust Receipt',
    defaultPath: `cadencedesk-receipt-${Date.now()}.json`,
    filters: [{ name: 'JSON Files', extensions: ['json'] }],
  });

  if (!canceled && filePath) {
    const fs = require('fs');
    fs.writeFileSync(filePath, jsonString, 'utf-8');
    return { success: true, filePath };
  }
  return { canceled: true };
});

app.whenReady().then(() => {
  // Hardened Permission Handler:
  // ONLY grant 'media' when:
  // 1. Explicit in-app consent is verified (consentGranted === true)
  // 2. ONLY requesting video (deny microphone / audio)
  // 3. ONLY for local bundled file:// origin
  session.defaultSession.setPermissionRequestHandler((wc, permission, callback, details) => {
    const url = (details && details.requestingUrl) || (wc && wc.getURL()) || '';
    const mediaTypes = (details && details.mediaTypes) || [];
    const cameraOnly = mediaTypes.length === 1 && mediaTypes[0] === 'video';

    const isPermitted = (
      consentGranted === true &&
      permission === 'media' &&
      cameraOnly &&
      url.startsWith('file://')
    );

    if (!isPermitted) {
      console.warn(`[main] Camera permission request blocked. Consent=${consentGranted}, Permission=${permission}, CameraOnly=${cameraOnly}`);
    }
    callback(isPermitted);
  });

  createWindow();

  app.on('activate', () => {
    if (BrowserWindow.getAllWindows().length === 0) createWindow();
  });
});

app.on('window-all-closed', () => {
  if (process.platform !== 'darwin') app.quit();
});
