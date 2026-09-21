/// <reference types="vite/client" />

/** Verze buildu, doplňuje ji Vite. Viz vite.config.ts a src/ui/telemetrie.ts. */
declare const __VERZE__: string;
/// <reference types="vite-plugin-pwa/client" />

interface ImportMetaEnv {
  readonly VITE_WORKER_URL?: string;
}

interface ImportMeta {
  readonly env: ImportMetaEnv;
}
