import chokidar from 'chokidar';
import { makeDebounce } from './debounce.js';
import { runParseDeps, runMake } from './runner.js';
import { parseMakePrintDatabase } from './parser.js';

export class MakeWatcher {
  constructor(target, opts) {
    this.target = target;
    this.opts = opts;
    this.verbose = opts.verbose || false;
    this.debounceMs = parseInt(opts.debounce || '300', 10);

    this.fileWatcher = null;
    this.dirWatcher = null;
    this.currentFileDeps = new Set();
    this.currentWatchDirs = new Set();
    this.buildInProgress = false;
    this.pendingRebuild = false;

    this.scheduleWork = makeDebounce(() => this.doRebuildAndReparse(), this.debounceMs);
  }

  async initialize() {
    // Initial parse to get the dependency list
    await this.doReparse();
    if (!this.targetFound) {
      throw new Error(`No rule to make target '${this.target || 'all'}'`);
    }

    // Now create watchers with the initial file list
    const initialFiles = Array.from(this.currentFileDeps);
    const initialDirs = Array.from(this.currentWatchDirs);

    this.fileWatcher = chokidar.watch(initialFiles, {
      persistent: true,
      ignoreInitial: true,
      depth: 0,
      awaitWriteFinish: {
        stabilityThreshold: 100,
        pollInterval: 100,
      },
    });

    this.dirWatcher = chokidar.watch(initialDirs, {
      persistent: true,
      ignoreInitial: true,
      depth: 0,
      awaitWriteFinish: {
        stabilityThreshold: 100,
        pollInterval: 100,
      },
    });

    // Set up event handlers
    this.fileWatcher.on('change', (path) => {
      if (this.verbose) console.log(`[change] ${path}`);
      this.scheduleWork();
    });

    this.fileWatcher.on('unlink', (path) => {
      if (this.verbose) console.log(`[unlink] ${path}`);
      this.scheduleWork();
    });

    this.dirWatcher.on('add', (path) => {
      if (this.verbose) console.log(`[add] ${path}`);
      this.scheduleWork();
    });

    // Set up error handlers
    this.fileWatcher.on('error', (err) => {
      console.error(`[makewatch] file watcher error: ${err.message}`);
    });

    this.dirWatcher.on('error', (err) => {
      console.error(`[makewatch] dir watcher error: ${err.message}`);
    });

    // Wait for both watchers to be ready
    await new Promise((resolve) => {
      let fileReady = false;
      let dirReady = false;
      const check = () => {
        if (fileReady && dirReady) resolve();
      };
      this.fileWatcher.on('ready', () => {
        fileReady = true;
        check();
      });
      this.dirWatcher.on('ready', () => {
        dirReady = true;
        check();
      });
    });

    return this;
  }

  async doRebuildAndReparse() {
    if (this.buildInProgress) {
      this.pendingRebuild = true;
      return;
    }

    this.buildInProgress = true;

    const exitCode = await runMake(this.target, this.opts);
    if (exitCode !== 0) {
      console.error(`[makewatch] make failed with exit code ${exitCode}`);
    }

    await this.doReparse();

    this.buildInProgress = false;
    if (this.pendingRebuild) {
      this.pendingRebuild = false;
      this.scheduleWork();
    }
  }

  async doReparse() {
    const { stdout, exitCode } = runParseDeps(this.target, this.opts);

    if (exitCode !== 0) {
      console.error(`[makewatch] make -pn failed with exit code ${exitCode}`);
      return;
    }

    const { fileDeps, makefiles, watchDirs, targetFound } = parseMakePrintDatabase(
      stdout,
      this.target,
      this.opts.cwd
    );

    this.targetFound = targetFound;

    // Merge file deps and makefiles
    const allFiles = new Set([...fileDeps, ...makefiles]);

    // If watchers don't exist yet, just store the state (initialize() will use it)
    if (!this.fileWatcher) {
      this.currentFileDeps = allFiles;
      this.currentWatchDirs = watchDirs;
      return;
    }

    // Compute diffs
    const filesToAdd = [...allFiles].filter((f) => !this.currentFileDeps.has(f));
    const filesToRemove = [...this.currentFileDeps].filter((f) => !allFiles.has(f));

    const dirsToAdd = [...watchDirs].filter((d) => !this.currentWatchDirs.has(d));
    const dirsToRemove = [...this.currentWatchDirs].filter((d) => !watchDirs.has(d));

    // Update watchers
    if (filesToAdd.length > 0) {
      this.fileWatcher.add(filesToAdd);
    }
    if (filesToRemove.length > 0) {
      await this.fileWatcher.unwatch(filesToRemove);
    }

    if (dirsToAdd.length > 0) {
      this.dirWatcher.add(dirsToAdd);
    }
    if (dirsToRemove.length > 0) {
      await this.dirWatcher.unwatch(dirsToRemove);
    }

    this.currentFileDeps = allFiles;
    this.currentWatchDirs = watchDirs;

    if (this.verbose) {
      console.log(`[makewatch] watching ${this.currentFileDeps.size} files across ${this.currentWatchDirs.size} directories`);
    }
  }

  async close() {
    if (this.fileWatcher) await this.fileWatcher.close();
    if (this.dirWatcher) await this.dirWatcher.close();
  }
}
