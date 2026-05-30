import { spawnSync, spawn } from 'node:child_process';

export function runParseDeps(target, { cwd, makefilePath }) {
  const args = ['-pn'];
  if (target) args.push(target);
  if (cwd) args.push('-C', cwd);
  if (makefilePath) args.push('-f', makefilePath);

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

export function runMake(target, { cwd, makefilePath }) {
  return new Promise((resolve) => {
    const args = [];
    if (target) args.push(target);
    if (cwd) args.push('-C', cwd);
    if (makefilePath) args.push('-f', makefilePath);

    const proc = spawn('make', args, {
      stdio: 'inherit',
      cwd,
    });

    proc.on('close', (code) => {
      resolve(code || 0);
    });

    proc.on('error', (err) => {
      console.error('[makewatch] error spawning make:', err.message);
      resolve(1);
    });
  });
}
