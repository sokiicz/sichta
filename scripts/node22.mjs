#!/usr/bin/env node
// Spustí skript přenosným Node 22 z D:/ai/tools/node22. Systémový Node 20 nemá
// globální WebSocket, který integrační test potřebuje. Funguje z PowerShellu i bashe.
import { spawnSync } from 'node:child_process';
import { existsSync } from 'node:fs';

const NODE22 = 'D:/ai/tools/node22/node.exe';
if (!existsSync(NODE22)) {
  console.error(`Přenosný Node 22 nenalezen v ${NODE22}. Stáhni https://nodejs.org/dist/v22.23.2/node-v22.23.2-win-x64.zip`);
  process.exit(1);
}
const r = spawnSync(NODE22, process.argv.slice(2), { stdio: 'inherit' });
process.exit(r.status ?? 1);
