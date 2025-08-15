# @butter/code-health

A global Node.js CLI tool that analyzes code health in TypeScript/JavaScript projects and provides a beautiful browser-based dashboard for visualizing static analysis results.

## Features

- 🔍 **Multi-tool Analysis**: Combines ESLint, dependency-cruiser, knip, and cloc
- 📊 **Browser Dashboard**: Beautiful, interactive web UI for exploring results
- 👁️ **Watch Mode**: Live updates as you code
- 🏗️ **Monorepo Support**: Works with npm/yarn/pnpm workspaces
- 🚫 **Zero Config**: No files added to your repo by default
- 🎯 **Smart Defaults**: Sensible rules and thresholds out of the box

## Installation

Install globally:
```bash
npm install -g @butter/code-health
```

Or run directly with npx:
```bash
npx @butter/code-health dashboard
```

## Usage

### Dashboard Mode (Recommended)
Launch an interactive dashboard to explore your code health:

```bash
# Basic dashboard
code-health dashboard

# With file watching and auto-refresh
code-health dashboard --watch

# Auto-open browser
code-health dashboard --open
```

### Analyze Mode
Run a one-time analysis and view results:

```bash
code-health analyze

# With custom directory
code-health analyze --cwd /path/to/project
```

### Print Mode (CI-Friendly)
Output analysis results to stdout:

```bash
# Text format (default)
code-health print

# JSON format for CI/CD pipelines
code-health print --format json

# Fails with exit code 1 if thresholds exceeded
code-health print --max-lines 300 --complexity-threshold 10
```

## CLI Options

### Global Options
- `--cwd <path>` - Set root directory for analysis (default: current directory)
- `--include <glob,glob>` - Include specific file patterns
- `--exclude <glob,glob>` - Exclude specific file patterns
- `--no-gitignore` - Don't use .gitignore for exclusions
- `--port <number>` - Dashboard server port (default: 43110)
- `--open` - Auto-open browser when server starts

### Threshold Options
- `--max-lines <n>` - Max lines per file (default: 400)
- `--max-lines-per-function <n>` - Max lines per function (default: 80)
- `--complexity-threshold <n>` - Cognitive complexity threshold (default: 15)

## What It Analyzes

### 📏 Code Size
- Lines of code per file
- Identifies largest files
- Tracks code vs comments vs blank lines

### 🧠 Cognitive Complexity
- Functions with high cognitive complexity
- Based on SonarJS rules
- Helps identify hard-to-maintain code

### 🔄 Dependency Cycles
- Circular dependencies between modules
- Helps maintain clean architecture
- Essential for large codebases

### 💀 Dead Code
- Unused files and exports
- Powered by knip
- Reduce bundle size and maintenance burden

### 📐 Code Standards
- Max lines violations
- TypeScript best practices
- Performance anti-patterns

## Dashboard Features

The browser dashboard provides:

- **Sortable Tables**: Click headers to sort by any column
- **Search & Filter**: Quick filtering for all tables
- **Live Updates**: Auto-refresh in watch mode
- **Copy to Clipboard**: Easy sharing of findings
- **Detailed Views**: Expandable rows for more context

## Default Ignore Patterns

The tool automatically ignores:
- `node_modules/`
- `.git/`
- Build outputs (`dist/`, `build/`, `.next/`)
- Cache directories
- Lock files
- Environment files
- Config files

Plus anything in your `.gitignore` (unless `--no-gitignore` is used).

## Monorepo Support

Automatically detects and analyzes:
- npm/yarn workspaces (via `package.json`)
- pnpm workspaces (via `pnpm-workspace.yaml`)
- Common patterns (`apps/*`, `packages/*`)

## Configuration

While the tool works with zero configuration, it respects existing project configs:
- ESLint configurations (flat or legacy)
- TypeScript configs for path resolution
- `.gitignore` for file exclusions

## Examples

### Analyze a TypeScript monorepo
```bash
cd /path/to/monorepo
npx @butter/code-health dashboard --watch --open
```

### CI/CD Integration
```bash
# In your CI pipeline
npx @butter/code-health print --format json > code-health.json

# Or fail on violations
npx @butter/code-health print --max-lines 500 --complexity-threshold 20
```

### Custom Analysis
```bash
# Analyze specific directories
code-health analyze --include "src/**/*.ts" --exclude "**/*.test.ts"

# Override thresholds
code-health dashboard --max-lines 600 --max-lines-per-function 100
```

## MCP Integration (Model Context Protocol)

This tool can be used as an MCP server, making it available to AI assistants like Claude Code for automatic code analysis.

### Installation for MCP

Install globally:
```bash
npm install -g @butter/code-health
```

Add to your `.mcp.json` file in your project root:
```json
{
  "mcpServers": {
    "code-health": {
      "command": "code-health-mcp",
      "args": []
    }
  }
}
```

Or use with npx (if not installed globally):
```json
{
  "mcpServers": {
    "code-health": {
      "command": "npx",
      "args": ["@butter/code-health", "code-health-mcp"]
    }
  }
}
```

### MCP Tools Available

Once configured, the following tools are available to AI assistants:

- **`code_health_analyze`**: Run comprehensive code health analysis
- **`code_health_dashboard`**: Start the dashboard server with browser UI  
- **`code_health_stop_dashboard`**: Stop the running dashboard server
- **`code_health_summary`**: Get a quick summary of code health metrics

### Example MCP Usage

AI assistants can now run commands like:
- "Analyze the code health of this project"
- "Start a code health dashboard for this codebase"  
- "Show me a summary of code quality issues"

The dashboard will be automatically available at `http://localhost:43110` when started via MCP.

## Requirements

- Node.js 18 or higher
- Works with any JavaScript/TypeScript project

## License

MIT

## Contributing

Contributions are welcome! Please feel free to submit a Pull Request.