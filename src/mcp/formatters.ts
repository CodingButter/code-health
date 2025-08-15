import { AggregatedStats } from '../core/aggregate.js';

/**
 * Format analysis results as text or JSON
 */
export function formatAnalysisResults(results: AggregatedStats, format: 'text' | 'json' = 'text'): string {
  if (format === 'json') {
    return JSON.stringify(results, null, 2);
  }

  return formatAsText(results);
}

/**
 * Format analysis results as human-readable text
 */
function formatAsText(results: AggregatedStats): string {
  const {
    largestFiles = [],
    complexFunctions = [],
    maxLineOffenders = [],
    cycles = [],
    deadCode = [],
  } = results;

  const totalIssues = complexFunctions.length + maxLineOffenders.length + cycles.length + deadCode.length;
  const filesAnalyzed = largestFiles.length;
  const linesOfCode = largestFiles.reduce((sum, file) => sum + file.loc, 0);

  let output = '═══════════════════════════════════════\n';
  output += '         CODE HEALTH REPORT\n';
  output += '═══════════════════════════════════════\n\n';

  output += '📊 Summary:\n';
  output += `   Files analyzed: ${filesAnalyzed}\n`;
  output += `   Lines of code: ${linesOfCode.toLocaleString()}\n`;
  output += `   Total issues: ${totalIssues}\n\n`;

  output += formatLargestFiles(largestFiles);
  output += formatComplexFunctions(complexFunctions);
  output += formatMaxLineOffenders(maxLineOffenders);
  output += formatCycles(cycles);
  output += formatDeadCode(deadCode);

  if (totalIssues === 0) {
    output += '✅ No issues found! Your code health looks excellent.\n\n';
  } else {
    output += `❌ Found ${totalIssues} issue${totalIssues > 1 ? 's' : ''} that need attention.\n\n`;
  }

  output += '═══════════════════════════════════════\n';

  return output;
}

function formatLargestFiles(files: AggregatedStats['largestFiles']): string {
  if (files.length === 0) return '';
  
  let output = '📁 Top 5 Largest Files:\n';
  files.slice(0, 5).forEach((file) => {
    output += `     ${file.loc.toLocaleString()} lines - ${file.file}\n`;
  });
  output += '\n';
  
  return output;
}

function formatComplexFunctions(functions: AggregatedStats['complexFunctions']): string {
  if (functions.length === 0) return '';
  
  let output = `🧠 Complex Functions (${functions.length}):\n`;
  functions.slice(0, 5).forEach((func) => {
    output += `   ⚠ ${func.file}:${func.line}\n`;
    output += `      ${func.message}\n`;
  });
  output += '\n';
  
  return output;
}

function formatMaxLineOffenders(offenders: AggregatedStats['maxLineOffenders']): string {
  if (offenders.length === 0) return '';
  
  let output = `📏 Max Lines Violations (${offenders.length}):\n`;
  offenders.forEach((offender) => {
    const excess = offender.value - offender.limit;
    output += `   ⚠ ${offender.file}\n`;
    output += `      ${offender.kind}: ${offender.value} lines (limit: ${offender.limit}, +${excess})\n`;
  });
  output += '\n';
  
  return output;
}

function formatCycles(cycles: AggregatedStats['cycles']): string {
  if (cycles.length === 0) return '';
  
  let output = `🔄 Circular Dependencies (${cycles.length}):\n`;
  cycles.slice(0, 3).forEach((cycle, index) => {
    output += `   ⚠ Cycle #${index + 1}:\n`;
    cycle.paths.forEach((path, pathIndex) => {
      output += `      ${pathIndex > 0 ? '↓ ' : ''}${path}\n`;
    });
  });
  output += '\n';
  
  return output;
}

function formatDeadCode(deadCode: AggregatedStats['deadCode']): string {
  if (deadCode.length === 0) return '';
  
  let output = `💀 Dead Code (${deadCode.length}):\n`;
  deadCode.slice(0, 5).forEach((item) => {
    output += `   ⚠ ${item.file}`;
    if (item.symbol) output += ` - ${item.symbol}`;
    output += ` (${item.kind})\n`;
  });
  output += '\n';
  
  return output;
}