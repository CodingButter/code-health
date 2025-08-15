# CLAUDE.md

This file provides guidance to Claude Code (claude.ai/code) when working with code in this repository.

## Project Overview

This repository will contain `@butter/code-health`, a global Node.js CLI tool for analyzing code health in TypeScript/JavaScript projects. The tool provides static analysis, dependency visualization, and code quality metrics through a browser-based dashboard.

## Architecture

### Core Components

1. **CLI Entry Point** (`src/index.ts`)
   - Commands: `analyze`, `dashboard`, `print`
   - Uses commander or sade for CLI parsing
   - Global installation via `npm i -g` or runnable with `npx`

2. **Analysis Runners** (`src/core/runners/`)
   - ESLint runner with TypeScript, SonarJS, Unicorn, and Regexp plugins
   - Dependency-cruiser for dependency graph analysis
   - Knip for dead code detection
   - Cloc for line counting

3. **Dashboard Server** (`src/server/`)
   - Fastify-based API server
   - WebSocket support for live updates
   - Serves Vite-built React UI from `dist/ui`

4. **React UI** (`ui/`)
   - Vite + React single-page application
   - Tables for: largest files, complexity metrics, dependency cycles, dead code, max-lines violations
   - Auto-refresh via WebSocket in watch mode

### Key Implementation Patterns

- **Zero repo churn**: All reports written to temp directories (`~/.butter-code-health/<hash>/.reports/` or OS temp)
- **Monorepo-aware**: Detects workspaces via package.json, pnpm-workspace.yaml
- **Config resolution**: Respects existing ESLint/TypeScript configs, falls back to internal defaults
- **Unified ignore strategy**: Combines .gitignore with built-in patterns (node_modules, dist, build, etc.)

## Development Commands

```bash
# Initial setup (once codebase exists)
pnpm install

# Build the CLI and UI
pnpm build        # Build both CLI (to dist/cli.cjs) and UI (to dist/ui)
pnpm build:cli    # Build CLI only
pnpm build:ui     # Build UI only

# Development
pnpm dev          # Run CLI in watch mode
pnpm dev:ui       # Run Vite dev server for UI

# Testing
pnpm test         # Run tests
pnpm test:watch   # Run tests in watch mode

# Linting & Type Checking
pnpm lint         # Run ESLint
pnpm typecheck    # Run TypeScript type checking

# Local testing of the CLI
pnpm link         # Link package globally for testing
npx @butter/code-health analyze    # Test analyze command
npx @butter/code-health dashboard  # Test dashboard command
```

## Testing the CLI

When developing, test the CLI against various project structures:

```bash
# Test in a simple TypeScript project
cd /path/to/simple-ts-project
node /path/to/quali-t/dist/cli.cjs analyze

# Test in a monorepo
cd /path/to/monorepo
node /path/to/quali-t/dist/cli.cjs dashboard --watch

# Test with custom flags
node /path/to/quali-t/dist/cli.cjs print --max-lines 300 --complexity-threshold 10
```

## Implementation Priority

When building features, follow this order:

1. **Core infrastructure**: CLI structure, config resolution, ignore patterns
2. **Individual runners**: Start with ESLint, then cloc, dependency-cruiser, knip
3. **Report aggregation**: JSON schema implementation and aggregator
4. **Server & API**: Fastify setup with /api/stats endpoint
5. **Basic UI**: Static tables with data display
6. **Watch mode**: File watching with chokidar and WebSocket updates
7. **Polish**: Auto-open browser, better error handling, CLI output formatting

## Important Technical Details

### ESLint Configuration
- Use flat config format (ESLint 9+)
- Default thresholds: max-lines: 400, max-lines-per-function: 80, cognitive-complexity: 15
- Must work with or without existing project ESLint config

### Report Storage
Reports are stored as JSON in temp directory:
- `eslint.json`: ESLint results
- `depcruise.json`: Dependency analysis
- `knip.json`: Dead code detection
- `cloc.json`: Line counts by file
- `meta.json`: Tool versions, timestamps, configuration

### API Response Format
The `/api/stats` endpoint returns:
```typescript
{
  largestFiles: Array<{ file, loc, code, comment, blank }>,
  complexFunctions: Array<{ file, line, ruleId, metric?, message }>,
  maxLineOffenders: Array<{ file, kind: "file"|"function", value, limit }>,
  cycles: Array<{ paths: string[] }>,
  deadCode: Array<{ file, symbol?, kind: "file"|"export" }>,
  generatedAt: string
}
```

### Build Requirements
- Target Node 18+ with CommonJS output for CLI
- UI builds to static assets served by the CLI server
- Bundle all dependencies to avoid installation issues

## Common Issues & Solutions

### Issue: Tools not respecting ignore patterns
Ensure all runners receive the unified ignore set converted to their expected format:
- ESLint: use `ignorePatterns` in flat config
- Dependency-cruiser: use `doNotFollow` option
- Knip: use `ignore` configuration
- Cloc: use `--exclude-dir` and `--exclude-ext`

### Issue: Monorepo workspaces not detected
Check for workspace definitions in this order:
1. `package.json` workspaces field
2. `pnpm-workspace.yaml`
3. Fallback to common patterns: `apps/*`, `packages/*`

### Issue: Dashboard not updating in watch mode
Verify:
1. Chokidar is watching with correct ignore patterns
2. WebSocket connection is established
3. Debounce timing (500-1000ms) is appropriate
4. Reports are being written to correct location