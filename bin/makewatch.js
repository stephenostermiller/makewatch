#!/usr/bin/env node

import { parseArgs } from 'node:util';
import { existsSync, readFileSync } from 'node:fs';
import { resolve, dirname, join } from 'node:path';
import { fileURLToPath } from 'node:url';
import { execSync } from 'node:child_process';
import { MakeWatcher } from '../src/watcher.js';
import { getDefaultTarget } from '../src/runner.js';

const __dirname = dirname(fileURLToPath(import.meta.url));
const VERSION = readFileSync(join(__dirname, '..', 'VERSION'), 'utf8').trim();

function getDisplayVersion() {
  const pkgRoot = join(__dirname, '..');
  try {
    // Check if we're in a git repo (fails gracefully if git is not installed)
    execSync('git rev-parse --git-dir', { stdio: 'pipe', cwd: pkgRoot });

    // We're in a git repo; check if working tree is clean
    try {
      execSync('git diff --quiet && git diff --cached --quiet', {
        stdio: 'pipe',
        cwd: pkgRoot,
        shell: true,
      });
    } catch {
      // Working tree has uncommitted/unstaged changes
      return VERSION + '+';
    }

    // Working tree is clean; check if we're exactly on a release tag
    try {
      execSync('git describe --tags --exact-match --match "VERSION_*" HEAD', {
        stdio: 'pipe',
        cwd: pkgRoot,
      });
      return VERSION; // Exactly on a release tag
    } catch {
      return VERSION + '+'; // Not on a tag (but working tree is clean)
    }
  } catch {
    // Not in a git repo (or git not installed) — zip distribution or npm global install
    return VERSION;
  }
}

const DISPLAY_VERSION = getDisplayVersion();

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
    console.log(`makewatch ${DISPLAY_VERSION}`);
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
