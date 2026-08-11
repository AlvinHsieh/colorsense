import { existsSync, readdirSync, rmSync } from 'node:fs';
import { join } from 'node:path';

const outputDirectory = join('apps', 'extension', '.output');

if (existsSync(outputDirectory)) {
  for (const fileName of readdirSync(outputDirectory)) {
    if (fileName.endsWith('-chrome.zip')) {
      rmSync(join(outputDirectory, fileName));
    }
  }
}
