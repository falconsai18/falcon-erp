// TypeScript declarations for the Electron context bridge

interface ElectronAPI {
  invoke: (channel: string, args?: any) => Promise<any>
  isElectron: boolean
}

declare global {
  interface Window {
    electron: ElectronAPI
    __ELECTRON__: boolean
  }
}

export {}
