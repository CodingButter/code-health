#!/usr/bin/env node
import { Command } from 'commander';
import { analyzeCommand } from './commands/analyze.js';
import { dashboardCommand } from './commands/dashboard.js';
import { printCommand } from './commands/print.js';
import { Config } from './core/config.js';
import * as fs from 'fs';
import * as path from 'path';

// Read package.json for version
// In CJS, __dirname is available, we'll rely on the build process to handle this
const packageJsonPath = path.join(process.cwd(), 'package.json');
let packageJson = { version: '1.0.0' }; // Default fallback
try {
  if (fs.existsSync(packageJsonPath)) {
    packageJson = JSON.parse(fs.readFileSync(packageJsonPath, 'utf-8'));
  }
} catch (error) {
  // Use default version
}

const program = new Command();

program
  .name('code-health')
  .description('Global Node.js CLI for code health analysis with browser dashboard')
  .version(packageJson.version);

// Global options
program
  .option('--cwd <path>', 'set root of analysis', process.cwd())
  .option('--include <glob>', 'include patterns (comma-separated)', '')
  .option('--exclude <glob>', 'exclude patterns (comma-separated)', '')
  .option('--no-gitignore', 'ignore .gitignore entirely')
  .option('--max-lines <n>', 'override max lines threshold', '400')
  .option('--max-lines-per-function <n>', 'override max lines per function threshold', '80')
  .option('--complexity-threshold <n>', 'override cognitive complexity threshold', '15')
  .option('--port <number>', 'dashboard port', '43110')
  .option('--open', 'auto-open browser when server starts');

// Analyze command
program
  .command('analyze')
  .description('one-shot analysis → starts a static report server')
  .action(async (options) => {
    const config = parseConfig(program.opts());
    await analyzeCommand(config);
  });

// Dashboard command
program
  .command('dashboard')
  .description('run analyzers + serve live browser UI')
  .option('--watch', 'enable watch mode with auto-refresh')
  .action(async (options) => {
    const globalOpts = program.opts();
    const config = parseConfig(globalOpts);
    await dashboardCommand(config, options.watch || false);
  });

// Print command
program
  .command('print')
  .description('run analyzers and print compact findings to stdout')
  .option('--format <format>', 'output format (json|text)', 'text')
  .action(async (options) => {
    const globalOpts = program.opts();
    const config = parseConfig({ ...globalOpts, format: options.format });
    await printCommand(config);
  });

// Default command (no subcommand provided)
program
  .action(async () => {
    // Default to dashboard command
    const config = parseConfig(program.opts());
    await dashboardCommand(config, false);
  });

function parseConfig(options: any): Config {
  return {
    cwd: path.resolve(options.cwd || process.cwd()),
    include: options.include ? options.include.split(',').map((s: string) => s.trim()) : [],
    exclude: options.exclude ? options.exclude.split(',').map((s: string) => s.trim()) : [],
    ignoreGitignore: !options.gitignore,
    maxLines: parseInt(options.maxLines || '400'),
    maxLinesPerFunction: parseInt(options.maxLinesPerFunction || '80'),
    complexityThreshold: parseInt(options.complexityThreshold || '15'),
    port: parseInt(options.port || '43110'),
    format: options.format || 'text',
    open: options.open || false
  };
}

// Parse arguments and run
program.parse(process.argv);