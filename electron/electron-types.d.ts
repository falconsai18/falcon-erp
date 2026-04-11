/**
 * TypeScript type definitions for Electron API
 * Add this to your project for TypeScript support
 * 
 * Usage: import { ElectronAPI } from '../types/electron'
 * 
 * Or add to src/vite-env.d.ts:
 * /// <reference types="./electron-types" />
 */

export interface ElectronAPI {
  // IPC Communication
  invoke: (channel: string, ...args: any[]) => Promise<any>;
  send: (channel: string, ...args: any[]) => void;
  receive: (channel: string, callback: (event: any, ...args: any[]) => void) => (() => void);

  // Environment Info
  versions: {
    electron: string;
    chrome: string;
    node: string;
  };
  platform: string;
  isElectron: boolean;
  isWin7Compatible: boolean;

  // App Info
  appVersion: string;

  // Network Status
  getOnlineStatus: () => boolean;

  // Environment Variables
  getEnv: (key: string) => string;

  // Window Control
  minimizeWindow: () => Promise<void>;
  maximizeWindow: () => Promise<void>;
  closeWindow: () => Promise<void>;

  // File System
  fs: {
    exists: (filePath: string) => Promise<boolean>;
    createDir: (dirPath: string) => Promise<{ success: boolean }>;
    writeBinary: (filePath: string, buffer: Uint8Array) => Promise<{ success: boolean }>;
    readBinary: (filePath: string) => Promise<{ success: boolean; data?: number[]; error?: string }>;
    remove: (filePath: string) => Promise<{ success: boolean }>;
    join: (...paths: string[]) => Promise<string>;
    getAppDataDir: () => Promise<string>;
    getImagesDir: () => Promise<string>;
  };

  // Database
  db: {
    query: (sql: string, params?: any[]) => Promise<{ success: boolean; data: any[] }>;
    execute: (sql: string, params?: any[]) => Promise<{ success: boolean; changes: number; lastInsertRowid: number | bigint }>;
    executeBatch: (sql: string) => Promise<{ success: boolean }>;
  };
}

declare global {
  interface Window {
    electron: ElectronAPI;
    api: ElectronAPI;
  }
}

export {};
