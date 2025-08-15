const chalk = require('chalk');
const ora = require('ora');
import { Config, createIgnoreConfig } from '../core/config.js';
import { getReportsDir, cleanReportsDir } from '../core/paths.js';
import { runEslint } from '../core/runners/eslint.js';
import { runDepCruise } from '../core/runners/depcruise.js';
import { runKnip } from '../core/runners/knip.js';
import { runCloc } from '../core/runners/cloc.js';
import { aggregateReports, AggregatedStats } from '../core/aggregate.js';

export async function printCommand(config: Config): Promise<void> {
  const spinner = ora('Running analysis...').start();
  
  try {
    // Set up reports directory
    const reportsDir = getReportsDir(config.cwd);
    cleanReportsDir(reportsDir);
    
    // Create ignore configuration
    const ignoreConfig = createIgnoreConfig(config);
    
    // Run all analyzers
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
    
    // Aggregate results
    const stats = await aggregateReports(reportsDir);
    
    spinner.stop();
    
    // Print results based on format
    if (config.format === 'json') {
      console.log(JSON.stringify(stats, null, 2));
    } else {
      printTextFormat(stats, config);
    }
    
    // Exit with appropriate code
    const hasIssues = checkThresholds(stats, config);
    if (hasIssues) {
      process.exit(1);
    }
    
  } catch (error) {
    spinner.fail('Analysis failed');
    console.error(error);
    process.exit(1);
  }
}

function printHeader(chalkInstance: any): void {
  console.log(chalkInstance.bold.blue('\n═══════════════════════════════════════'));
  console.log(chalkInstance.bold.blue('         CODE HEALTH REPORT'));
  console.log(chalkInstance.bold.blue('═══════════════════════════════════════\n'));
}

function printSummary(stats: AggregatedStats, chalkInstance: any): void {
  console.log(chalkInstance.bold('📊 Summary:'));
  console.log(`   Files analyzed: ${stats.largestFiles.length}`);
  const totalIssues = stats.complexFunctions.length +
    stats.maxLineOffenders.length +
    stats.cycles.length +
    stats.deadCode.length;
  console.log(`   Total issues: ${totalIssues}`);
}

function printLargestFiles(stats: AggregatedStats, chalkInstance: any): void {
  if (stats.largestFiles.length === 0) return;
  
  console.log(chalkInstance.bold('\n📁 Top 5 Largest Files:'));
  stats.largestFiles.slice(0, 5).forEach(file => {
    console.log(`   ${chalkInstance.yellow(file.loc.toString().padStart(5))} lines - ${file.file}`);
  });
}

function printComplexFunctions(stats: AggregatedStats, chalkInstance: any): void {
  if (stats.complexFunctions.length === 0) return;
  
  console.log(chalkInstance.bold(`\n🧠 Complex Functions (${stats.complexFunctions.length}):`));
  stats.complexFunctions.slice(0, 5).forEach(func => {
    const metric = func.metric ? ` [${func.metric}]` : '';
    console.log(`   ${chalkInstance.red('⚠')} ${func.file}:${func.line}${metric}`);
    console.log(`      ${chalkInstance.gray(func.message)}`);
  });
  if (stats.complexFunctions.length > 5) {
    console.log(chalkInstance.gray(`   ... and ${stats.complexFunctions.length - 5} more`));
  }
}

function printMaxLineViolations(stats: AggregatedStats, chalkInstance: any): void {
  if (stats.maxLineOffenders.length === 0) return;
  
  console.log(chalkInstance.bold(`\n📏 Max Lines Violations (${stats.maxLineOffenders.length}):`));
  stats.maxLineOffenders.slice(0, 5).forEach(offender => {
    const overBy = offender.value - offender.limit;
    console.log(`   ${chalkInstance.red('⚠')} ${offender.file}`);
    console.log(`      ${offender.kind}: ${offender.value} lines (limit: ${offender.limit}, +${overBy})`);
  });
  if (stats.maxLineOffenders.length > 5) {
    console.log(chalkInstance.gray(`   ... and ${stats.maxLineOffenders.length - 5} more`));
  }
}

function printCycles(stats: AggregatedStats, chalkInstance: any): void {
  if (stats.cycles.length === 0) return;
  
  console.log(chalkInstance.bold(`\n🔄 Dependency Cycles (${stats.cycles.length}):`));
  stats.cycles.slice(0, 3).forEach((cycle, index) => {
    console.log(`   ${chalkInstance.red('Cycle')} ${index + 1}:`);
    cycle.paths.slice(0, 3).forEach((path, i) => {
      console.log(`      ${i === 0 ? '' : '↓ '}${path}`);
    });
    if (cycle.paths.length > 3) {
      console.log(`      ... ${cycle.paths.length - 3} more files`);
    }
  });
  if (stats.cycles.length > 3) {
    console.log(chalkInstance.gray(`   ... and ${stats.cycles.length - 3} more cycles`));
  }
}

function printDeadCode(stats: AggregatedStats, chalkInstance: any): void {
  if (stats.deadCode.length === 0) return;
  
  const deadFiles = stats.deadCode.filter(d => d.kind === 'file');
  const deadExports = stats.deadCode.filter(d => d.kind === 'export');
  
  console.log(chalkInstance.bold(`\n💀 Dead Code (${stats.deadCode.length} total):`));
  console.log(`   Unused files: ${deadFiles.length}`);
  console.log(`   Unused exports: ${deadExports.length}`);
  
  if (deadFiles.length > 0) {
    console.log(chalkInstance.gray('\n   Unused files:'));
    deadFiles.slice(0, 5).forEach(item => {
      console.log(`      ${item.file}`);
    });
    if (deadFiles.length > 5) {
      console.log(chalkInstance.gray(`      ... and ${deadFiles.length - 5} more`));
    }
  }
}

function printTextFormat(stats: AggregatedStats, config: Config): void {
  const chalkInstance = chalk;
  
  printHeader(chalkInstance);
  printSummary(stats, chalkInstance);
  printLargestFiles(stats, chalkInstance);
  printComplexFunctions(stats, chalkInstance);
  printMaxLineViolations(stats, chalkInstance);
  printCycles(stats, chalkInstance);
  printDeadCode(stats, chalkInstance);
  
  console.log(chalkInstance.bold.blue('\n═══════════════════════════════════════\n'));
}

function checkThresholds(stats: AggregatedStats, config: Config): boolean {
  const chalkInstance = chalk;
  let hasIssues = false;
  
  // Check for max-lines violations
  const maxLineViolations = stats.maxLineOffenders.filter(o => 
    o.kind === 'file' && o.value > config.maxLines
  ).length;
  
  const maxLineFunctionViolations = stats.maxLineOffenders.filter(o => 
    o.kind === 'function' && o.value > config.maxLinesPerFunction
  ).length;
  
  // Check for complexity violations
  const complexityViolations = stats.complexFunctions.filter(f => 
    f.metric && f.metric > config.complexityThreshold
  ).length;
  
  if (maxLineViolations > 0 || maxLineFunctionViolations > 0 || complexityViolations > 0) {
    hasIssues = true;
    console.log(chalkInstance.red.bold('\n❌ Threshold violations detected:'));
    
    if (maxLineViolations > 0) {
      console.log(chalkInstance.red(`   - ${maxLineViolations} files exceed ${config.maxLines} lines`));
    }
    if (maxLineFunctionViolations > 0) {
      console.log(chalkInstance.red(`   - ${maxLineFunctionViolations} functions exceed ${config.maxLinesPerFunction} lines`));
    }
    if (complexityViolations > 0) {
      console.log(chalkInstance.red(`   - ${complexityViolations} functions exceed complexity threshold of ${config.complexityThreshold}`));
    }
  } else {
    console.log(chalkInstance.green.bold('✅ All code health checks passed!'));
  }
  
  return hasIssues;
}