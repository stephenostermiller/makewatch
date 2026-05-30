#!/usr/bin/env node

import { parseArgs } from 'node:util';
import { existsSync } from 'node:fs';
import { resolve } from 'node:path';
import { MakeWatcher } from '../src/watcher.js';
import { getDefaultTarget } from '../src/runner.js';

const VERSION = '1.0.0';

async function main() {
  const { values, positionals } = parseArgs({
    options: {
      directory: { type: 'string', short: 'C' },
      file: { type: 'string', short: 'f' },
      debounce: { type: 'string', short: 'd', default: '300' },
      verbose: { type: 'boolean', short: 'v', default: false },
      tee: { type: 'string' },
      help: { type: 'boolean', short: 'h', default: false },
      version: { type: 'boolean', default: false },
    },
    allowPositionals: true,
  });

  if (values.help) {
    console.log(`makewatch - Watch Makefile dependencies and re-run make on changes

Usage: makewatch [options] [target]

Options:
  -C <dir>         Run make in this directory (default: current directory)
  -f <file>        Specify Makefile path
  -d <ms>          Debounce delay in milliseconds (default: 300)
  -v               Verbose output
  --tee <file>     Save latest output to given file
  -h               Show this help message
  --version        Show version

Examples:
  makewatch all
  makewatch -C src build
  makewatch -f custom.mk clean
  makewatch --tee build.log all
`);
    process.exit(0);
  }

  if (values.version) {
    console.log(`makewatch ${VERSION}`);
    process.exit(0);
  }

  const cwd = values.directory ? resolve(values.directory) : process.cwd();
  const makefilePath = values.file;
  let target = positionals[0] || '';

  // If no target specified, get make's default goal
  if (!target) {
    target = getDefaultTarget({ cwd, makefilePath });
  }

  // Validate Makefile exists
  if (makefilePath) {
    if (!existsSync(makefilePath)) {
      console.error(`[makewatch] error: Makefile not found: ${makefilePath}`);
      process.exit(1);
    }
  } else {
    // Check for standard Makefile names
    const candidates = ['Makefile', 'makefile', 'GNUmakefile'];
    let found = false;
    for (const candidate of candidates) {
      if (existsSync(resolve(cwd, candidate))) {
        found = true;
        break;
      }
    }
    if (!found) {
      console.error(`[makewatch] error: No Makefile found in ${cwd}`);
      process.exit(1);
    }
  }

  try {
    const watcher = await new MakeWatcher(target, {
      cwd,
      makefilePath,
      debounce: values.debounce,
      verbose: values.verbose,
      tee: values.tee,
    }).initialize();

    console.log(
      `[makewatch] watching ${watcher.currentFileDeps.size} files across ${watcher.currentWatchDirs.size} directories`
    );
    console.log(`[makewatch] running make ${target || '(default target)'} on changes (debounce: ${values.debounce}ms)`);

    // Handle graceful shutdown
    const cleanup = async () => {
      console.log('\n[makewatch] shutting down...');
      await watcher.close();
      process.exit(0);
    };

    process.on('SIGINT', cleanup);
    process.on('SIGTERM', cleanup);
  } catch (err) {
    console.error(`[makewatch] error: ${err.message}`);
    process.exit(1);
  }
}

main().catch((err) => {
  console.error('[makewatch] fatal error:', err);
  process.exit(1);
});
