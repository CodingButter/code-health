import chokidar from 'chokidar';
import { Config, IgnoreConfig, createIgnoreConfig } from './config.js';
import { runEslint } from './runners/eslint.js';
import { runDepCruise } from './runners/depcruise.js';
import { runKnip } from './runners/knip.js';
import { runCloc } from './runners/cloc.js';
import { aggregateReports } from './aggregate.js';
import { EventEmitter } from 'events';

export class WatchManager extends EventEmitter {
  private watcher: chokidar.FSWatcher | null = null;
  private debounceTimer: NodeJS.Timeout | null = null;
  private isRunning = false;
  
  constructor(
    private config: Config,
    private ignoreConfig: IgnoreConfig,
    private reportsDir: string
  ) {
    super();
  }
  
  start(): void {
    if (this.watcher) {
      return;
    }
    
    console.log('Starting file watcher...');
    
    // Create watcher with ignore patterns
    this.watcher = chokidar.watch('.', {
      cwd: this.config.cwd,
      ignored: this.ignoreConfig.patterns,
      persistent: true,
      ignoreInitial: true,
      depth: 99
    });
    
    // Set up event handlers
    this.watcher
      .on('add', (path) => this.handleChange('add', path))
      .on('change', (path) => this.handleChange('change', path))
      .on('unlink', (path) => this.handleChange('unlink', path))
      .on('error', (error) => console.error('Watcher error:', error));
    
    console.log('File watcher started. Watching for changes...');
  }
  
  stop(): void {
    if (this.watcher) {
      this.watcher.close();
      this.watcher = null;
    }
    
    if (this.debounceTimer) {
      clearTimeout(this.debounceTimer);
      this.debounceTimer = null;
    }
    
    console.log('File watcher stopped');
  }
  
  private handleChange(event: string, path: string): void {
    // Skip if we're already running analysis
    if (this.isRunning) {
      return;
    }
    
    console.log(`File ${event}: ${path}`);
    
    // Debounce changes (as specified in Project.md: 500-1000ms)
    if (this.debounceTimer) {
      clearTimeout(this.debounceTimer);
    }
    
    this.debounceTimer = setTimeout(() => {
      this.runAnalysis();
    }, 750); // 750ms debounce
  }
  
  private async runAnalysis(): Promise<void> {
    if (this.isRunning) {
      return;
    }
    
    this.isRunning = true;
    console.log('\nRe-running analysis...');
    
    try {
      // Emit start event
      this.emit('analysis:start');
      
      // Run all analyzers
      // In v1, we re-run all as mentioned in Project.md
      // Future optimization: run targeted analyzers based on file type
      await Promise.all([
        runEslint(this.config, this.ignoreConfig, this.reportsDir),
        runDepCruise(this.config, this.ignoreConfig, this.reportsDir),
        runKnip(this.config, this.ignoreConfig, this.reportsDir),
        runCloc(this.config, this.ignoreConfig, this.reportsDir)
      ]);
      
      // Aggregate results
      const stats = await aggregateReports(this.reportsDir);
      
      // Emit complete event with new stats
      this.emit('analysis:complete', stats);
      
      console.log('Analysis complete\n');
      
    } catch (error) {
      console.error('Analysis failed:', error);
      this.emit('analysis:error', error);
    } finally {
      this.isRunning = false;
    }
  }
  
  // Manual trigger for initial analysis
  async runOnce(): Promise<void> {
    await this.runAnalysis();
  }
}

/**
 * Simple file watcher for MCP integration
 */
export function watchForChanges(config: Config, callback: () => void): chokidar.FSWatcher {
  const ignoreConfig = createIgnoreConfig(config);
  
  const watcher = chokidar.watch('.', {
    cwd: config.cwd,
    ignored: ignoreConfig.patterns,
    persistent: true,
    ignoreInitial: true,
    depth: 99
  });
  
  let debounceTimer: NodeJS.Timeout | null = null;
  
  const debouncedCallback = () => {
    if (debounceTimer) {
      clearTimeout(debounceTimer);
    }
    debounceTimer = setTimeout(callback, 1000);
  };
  
  watcher.on('change', debouncedCallback);
  watcher.on('add', debouncedCallback);
  watcher.on('unlink', debouncedCallback);
  
  return watcher;
}