import { spawnSync, spawn } from 'node:child_process';
import { createWriteStream } from 'node:fs';

export function getDefaultTarget({ cwd, makefilePath }) {
  const args = ['-p'];
  if (cwd) args.push('-C', cwd);
  if (makefilePath) args.push('-f', makefilePath);

  const result = spawnSync('make', args, {
    encoding: 'utf-8',
    maxBuffer: 10 * 1024 * 1024,
    stdio: ['pipe', 'pipe', 'pipe'],
  });

  // Parse output to find the LAST .DEFAULT_GOAL (make's final decision)
  const lines = result.stdout.split('\n');
  let defaultGoal = '';
  for (const line of lines) {
    const match = line.match(/^\.DEFAULT_GOAL\s*:=\s*(\S*)/);
    if (match) {
      defaultGoal = match[1]; // Keep updating to get the last one
    }
  }
  return defaultGoal;
}

export function runParseDeps(target, { cwd, makefilePath }) {
  const args = ['-pn', '--silent'];
  if (cwd) args.push('-C', cwd);
  if (makefilePath) args.push('-f', makefilePath);
  if (target) args.push(target);

  const result = spawnSync('make', args, {
    encoding: 'utf-8',
    maxBuffer: 10 * 1024 * 1024,
    stdio: ['pipe', 'pipe', 'pipe'],
  });

  return {
    stdout: result.stdout || '',
    exitCode: result.status || 0,
    stderr: result.stderr || '',
  };
}

export function runMake(target, { cwd, makefilePath, verbose, quiet, tee }) {
  return new Promise((resolve) => {
    const args = [];
    if (!verbose) args.push('--no-print-directory');
    if (target) args.push(target);
    if (cwd) args.push('-C', cwd);
    if (makefilePath) args.push('-f', makefilePath);

    const stdio = (quiet || tee) ? ['inherit', 'pipe', 'pipe'] : 'inherit';
    const proc = spawn('make', args, {
      stdio,
      cwd,
    });

    let teeStream = null;
    if (tee) {
      teeStream = createWriteStream(tee, { flags: 'w' });
    }

    if (tee && proc.stdout) {
      proc.stdout.on('data', (chunk) => {
        process.stdout.write(chunk);
        teeStream.write(chunk);
      });
    }

    if (tee && proc.stderr) {
      proc.stderr.on('data', (chunk) => {
        process.stderr.write(chunk);
        teeStream.write(chunk);
      });
    }

    proc.on('close', (code) => {
      if (teeStream) teeStream.end();
      resolve(code || 0);
    });

    proc.on('error', (err) => {
      console.error('[makewatch] error spawning make:', err.message);
      if (teeStream) teeStream.end();
      resolve(1);
    });
  });
}
