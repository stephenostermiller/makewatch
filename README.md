# makewatch

A Node.js CLI utility that watches a Makefile's dependency graph and automatically re-runs `make` whenever any dependency files change.

## Features

- **Automatic dependency extraction** — Uses `make -pn` to parse the dependency graph, so all Makefile features work: variables, wildcards, shell calls, includes, pattern rules
- **Smart file watching** — Watches only the files that actually depend on the target, avoiding unnecessary rebuilds
- **Wildcard support** — When new files are created that match `$(wildcard ...)` or `$(shell find ...)` patterns, the tool detects them automatically
- **Debounced rebuilds** — Rapid file changes are grouped into a single build (default: 300ms debounce)
- **Live output** — See full `make` output in real-time with colors and progress indicators
- **Graceful shutdown** — Press Ctrl+C to cleanly close watchers and exit

## Installation

```bash
npm install
# Or globally (requires sudo):
sudo npm install -g .
```

## Usage

```
makewatch [options] [target]

Options:
  -C <dir>         Run make in this directory (default: current directory)
  -f <file>        Specify Makefile path
  -d <ms>          Debounce delay in milliseconds (default: 300)
  -v               Verbose output (show file change events)
  -h               Show help
  --version        Show version
```

### Examples

Watch the default target and rebuild on changes:
```bash
makewatch
```

Watch a specific target in a subdirectory:
```bash
makewatch -C src build
```

Use a custom Makefile:
```bash
makewatch -f custom.mk clean
```

Verbose mode to see each file change:
```bash
makewatch -v all
```

Fast debounce (100ms) for responsive rebuilds:
```bash
makewatch -d 100 all
```

## How it works

1. **Parse dependencies** — Run `make -pn <target>` to get make's internal database of all rules and their prerequisites
2. **Extract file list** — Walk the dependency tree from the target, collecting all file paths (excluding phony targets)
3. **Watch files** — Use chokidar (inotify-based) to monitor those files for changes
4. **Rebuild** — When any file changes, debounce for ~300ms then run `make <target>`
5. **Re-parse** — After each rebuild, re-parse dependencies to pick up newly-created files that match wildcard patterns

## Architecture

```
bin/makewatch.js      # CLI entry point
src/
  parser.js           # make -pn output parser
  runner.js           # spawn make processes
  watcher.js          # chokidar event handling
  debounce.js         # simple debounce utility
test/
  parser.test.js      # parser unit tests
  runner.test.js      # runner integration tests
  debounce.test.js    # debounce tests
```

## Testing

```bash
npm test                # Run all tests
npm run test:watch      # Run tests in watch mode
```

The test suite includes:
- Parser tests for dependency graph extraction
- Runner tests for make process invocation
- Debounce tests for timing correctness

## Limitations

- Only tested on Linux (uses inotify via chokidar)
- Large projects with very deep dependency graphs may take a moment to parse
- Circular dependencies are handled gracefully (BFS visited set) but should be avoided

## License

MIT
