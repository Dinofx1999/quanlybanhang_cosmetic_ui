// src/types/qz-tray.d.ts
declare module "qz-tray" {
  export const api: {
    setPromiseType: (factory: (resolver: any) => any) => void;
  };

  export const websocket: {
    isActive: () => boolean;
    connect: () => Promise<void>;
    disconnect: () => Promise<void>;
  };

  export const printers: {
    find: (query?: string) => Promise<string>;
    getDefault: () => Promise<string>;
  };

  export const configs: {
    create: (printer: string, opts?: any) => any;
  };

  export const print: (config: any, data: any[]) => Promise<void>;
}
