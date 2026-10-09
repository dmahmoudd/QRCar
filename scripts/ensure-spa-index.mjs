import { copyFileSync, existsSync } from 'node:fs';

const browserDir = new URL('../dist/qr-car-app/browser/', import.meta.url);
const csrIndex = new URL('index.csr.html', browserDir);
const spaIndex = new URL('index.html', browserDir);

if (existsSync(csrIndex) && !existsSync(spaIndex)) {
  copyFileSync(csrIndex, spaIndex);
}
