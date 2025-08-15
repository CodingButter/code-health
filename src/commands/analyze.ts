const ora = require('ora');
const open = require('open');
import { Config, createIgnoreConfig } from '../core/config.js';
import { getReportsDir, cleanReportsDir } from '../core/paths.js';
import { runEslint } from '../core/runners/eslint.js';
import { runDepCruise } from '../core/runners/depcruise.js';
import { runKnip } from '../core/runners/knip.js';
import { runCloc } from '../core/runners/cloc.js';
import { aggregateReports } from '../core/aggregate.js';
import { startServer } from '../server/api.js';

export async function analyzeCommand(config: Config): Promise<void> {
  const spinner = ora('Initializing analysis...').start();
  
  try {
    // Set up reports directory
    const reportsDir = getReportsDir(config.cwd);
    cleanReportsDir(reportsDir);
    
    // Create ignore configuration
    const ignoreConfig = createIgnoreConfig(config);
    
    spinner.text = 'Running analyzers...';
    
    // Run all analyzers in parallel
    await Promise.all([
      runEslint(config, ignoreConfig, reportsDir).catch(err => {
        console.error('\nESLint failed:', err.message);
      }),
      runDepCruise(config, ignoreConfig, reportsDir).catch(err => {
        console.error('\nDependency-cruiser failed:', err.message);
      }),
      runKnip(config, ignoreConfig, reportsDir).catch(err => {
        console.error('\nKnip failed:', err.message);
      }),
      runCloc(config, ignoreConfig, reportsDir).catch(err => {
        console.error('\nCloc failed:', err.message);
      })
    ]);
    
    spinner.text = 'Aggregating results...';
    
    // Aggregate results
    const stats = await aggregateReports(reportsDir);
    
    spinner.succeed('Analysis complete!');
    
    // Print summary
    console.log('\n📊 Analysis Summary:');
    console.log(`   Files analyzed: ${stats.largestFiles.length}`);
    console.log(`   Complex functions: ${stats.complexFunctions.length}`);
    console.log(`   Max-lines violations: ${stats.maxLineOffenders.length}`);
    console.log(`   Dependency cycles: ${stats.cycles.length}`);
    console.log(`   Dead code items: ${stats.deadCode.length}`);
    
    // Start server for viewing results
    console.log('\n🚀 Starting dashboard server...');
    await startServer({
      port: config.port,
      reportsDir
    });
    
    // Open browser if requested
    if (config.open) {
      await open(`http://localhost:${config.port}`);
    }
    
  } catch (error) {
    spinner.fail('Analysis failed');
    console.error(error);
    process.exit(1);
  }
}