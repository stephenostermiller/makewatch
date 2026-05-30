import { resolve, dirname } from 'node:path';

const SPECIAL_TARGETS = new Set([
  '.PHONY', '.DEFAULT', '.PRECIOUS', '.INTERMEDIATE',
  '.SECONDARY', '.SECONDEXPANSION', '.DELETE_ON_ERROR',
  '.IGNORE', '.SILENT', '.EXPORT_ALL_VARIABLES',
  '.NOTPARALLEL', '.ONESHELL', '.POSIX',
  '.SUFFIXES', '.MAKE', '.VARIABLES', '.FEATURES',
  '.INCLUDE_DIRS'
]);

export function parseMakePrintDatabase(stdout, requestedTarget, cwd) {
  const lines = stdout.split('\n');
  const graph = new Map();
  const phonySet = new Set();
  const makefiles = new Set();

  // Pass 1: Extract MAKEFILE_LIST and .PHONY from anywhere in output
  for (const line of lines) {
    const makefileMatch = line.match(/^MAKEFILE_LIST\s*:?=\s*(.+)/);
    if (makefileMatch) {
      for (const path of makefileMatch[1].split(/\s+/).filter(Boolean)) {
        makefiles.add(resolve(cwd, path));
      }
    }

    const phonyMatch = line.match(/^\.PHONY:\s*(.+)/);
    if (phonyMatch) {
      for (const name of phonyMatch[1].split(/\s+/).filter(Boolean)) {
        phonySet.add(name);
      }
    }
  }

  // Pass 2: Parse rules from "# Files" section only
  let inFilesSection = false;
  let notTargetNext = false;

  for (const line of lines) {
    if (line === '# Files') {
      inFilesSection = true;
      continue;
    }

    if (!inFilesSection) {
      continue;
    }

    if (line === '# Not a target:') {
      notTargetNext = true;
      continue;
    }

    if (line.startsWith('\t') || line.startsWith('#') || line.length === 0) {
      if (line.startsWith('#')) {
        notTargetNext = false;
      }
      continue;
    }

    // Non-empty, non-comment, non-recipe line = a rule line
    if (line.match(/^[^ \t]/)) {
      // Skip pattern rules and suffix rules
      if (line.includes('%') || line.match(/^\.[a-zA-Z]+(\.[a-zA-Z]+)?:/)) {
        notTargetNext = false;
        continue;
      }

      const colonPos = line.indexOf(':');
      if (colonPos === -1) {
        notTargetNext = false;
        continue;
      }

      const target = line.substring(0, colonPos).trim();
      let rest = line.substring(colonPos + 1).trimStart();

      // Handle double-colon
      if (rest.startsWith(':')) {
        rest = rest.substring(1).trimStart();
      }

      // Split on order-only separator |, take only normal prereqs
      const prereqPart = rest.split('|')[0];
      const prereqs = prereqPart.split(/\s+/).filter(Boolean);

      // Add to graph (merge if target seen before)
      if (graph.has(target)) {
        graph.set(target, [...graph.get(target), ...prereqs]);
      } else {
        graph.set(target, prereqs);
      }

      notTargetNext = false;
    } else {
      notTargetNext = false;
    }
  }

  // BFS from requestedTarget
  const fileDeps = new Set();
  const visited = new Set();
  const queue = [requestedTarget];
  let targetFound = graph.has(requestedTarget) || phonySet.has(requestedTarget);

  while (queue.length > 0) {
    const current = queue.shift();
    if (visited.has(current)) continue;
    visited.add(current);

    const isPhony = phonySet.has(current);
    const isSpecial = SPECIAL_TARGETS.has(current);

    // Add to watch list if it's a real file (not phony, not special, not the target itself)
    if (current !== requestedTarget && !isPhony && !isSpecial && !current.includes('%')) {
      fileDeps.add(resolve(cwd, current));
    }

    // Follow prerequisites
    const prereqs = graph.get(current) || [];
    for (const prereq of prereqs) {
      if (!visited.has(prereq)) {
        queue.push(prereq);
      }
    }
  }

  // Parent directories to watch for wildcard support
  const watchDirs = new Set();
  for (const f of fileDeps) {
    watchDirs.add(dirname(f));
  }

  return {
    fileDeps,
    makefiles,
    watchDirs,
    targetFound,
  };
}
