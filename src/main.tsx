import { StrictMode } from 'react';
import { createRoot } from 'react-dom/client';
import App from './App';
import { spustitMereni } from './ui/telemetrie';

spustitMereni();

createRoot(document.getElementById('root')!).render(
  <StrictMode>
    <App />
  </StrictMode>,
);
