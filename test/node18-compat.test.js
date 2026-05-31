import { describe, it, expect, beforeAll } from 'vitest';
import { execSync } from 'node:child_process';

describe('Node 18 compatibility', () => {
  beforeAll(() => {
    // Build the Docker image
    console.log('Building Node 18 test image...');
    execSync('docker build -f test/node18/Dockerfile -t makewatch:node18-test .', {
      stdio: 'inherit',
    });
  });

  it('should run compatibility tests in Node 18 Docker container', () => {
    const output = execSync('docker run makewatch:node18-test', {
      encoding: 'utf8',
    });

    expect(output).toContain('All Node 18 compatibility tests passed');
  });

  it('should output version', () => {
    const output = execSync('node bin/makewatch.js --version', {
      encoding: 'utf8',
    }).trim();
    expect(output).toMatch(/^makewatch \d+\.\d+\.\d+/);
  });

  it('should show help', () => {
    const output = execSync('node bin/makewatch.js --help', {
      encoding: 'utf8',
    }).trim();
    expect(output).toContain('Usage: makewatch');
  });
});
