import { ESLintReport } from './runners/eslint.js';
import { DepCruiseReport } from './runners/depcruise.js';
import { KnipReport } from './runners/knip.js';
import { ClocReport } from './runners/cloc.js';
import { AggregatedStats } from './aggregate.js';

/**
 * Extract largest files from cloc report
 */
export function extractLargestFiles(clocReport: ClocReport | null): AggregatedStats['largestFiles'] {
  if (!clocReport?.files) {
    return [];
  }

  return clocReport.files
    .sort((a, b) => b.loc - a.loc)
    .slice(0, 50) // Top 50 largest files
    .map(file => ({
      file: file.file,
      loc: file.loc,
      code: file.code,
      comment: file.comment,
      blank: file.blank
    }));
}

/**
 * Extract complexity violations from ESLint report
 */
export function extractComplexityIssues(eslintReport: ESLintReport | null): {
  complexFunctions: AggregatedStats['complexFunctions'];
  maxLineOffenders: AggregatedStats['maxLineOffenders'];
} {
  const complexFunctions: AggregatedStats['complexFunctions'] = [];
  const maxLineOffenders: AggregatedStats['maxLineOffenders'] = [];

  if (!eslintReport?.results) {
    return { complexFunctions, maxLineOffenders };
  }

  for (const result of eslintReport.results) {
    for (const message of result.messages) {
      if (message.ruleId === 'sonarjs/cognitive-complexity') {
        complexFunctions.push(extractComplexityMetric(result.filePath, message));
      } else if (isMaxLinesViolation(message.ruleId)) {
        maxLineOffenders.push(extractMaxLinesViolation(result.filePath, message));
      }
    }
  }

  // Sort results
  complexFunctions.sort((a, b) => {
    if (a.metric && b.metric) return b.metric - a.metric;
    return a.file.localeCompare(b.file);
  });
  
  maxLineOffenders.sort((a, b) => b.value - a.value);

  return { complexFunctions, maxLineOffenders };
}

/**
 * Extract a single complexity metric from an ESLint message
 */
function extractComplexityMetric(
  filePath: string, 
  message: any
): AggregatedStats['complexFunctions'][0] {
  const metricMatch = message.message.match(/complexity of (\d+)/);
  const metric = metricMatch ? parseInt(metricMatch[1]) : undefined;
  
  return {
    file: filePath,
    line: message.line,
    ruleId: message.ruleId,
    metric,
    message: message.message
  };
}

/**
 * Check if a rule ID is a max-lines violation
 */
function isMaxLinesViolation(ruleId: string): boolean {
  return ruleId === 'max-lines' || ruleId === 'max-lines-per-function';
}

/**
 * Extract max lines violation details
 */
function extractMaxLinesViolation(
  filePath: string,
  message: any
): AggregatedStats['maxLineOffenders'][0] {
  const valueMatch = message.message.match(/(\d+)/g);
  const value = valueMatch && valueMatch[0] ? parseInt(valueMatch[0]) : 0;
  const limit = valueMatch && valueMatch[1] ? parseInt(valueMatch[1]) : 0;
  
  return {
    file: filePath,
    kind: message.ruleId === 'max-lines' ? 'file' : 'function',
    value,
    limit
  };
}

/**
 * Extract circular dependencies from dependency-cruiser report
 */
export function extractCircularDependencies(
  depCruiseReport: DepCruiseReport | null
): AggregatedStats['cycles'] {
  if (!depCruiseReport?.summary?.violations) {
    return [];
  }

  const uniqueCycles = new Map<string, string[]>();
  
  for (const violation of depCruiseReport.summary.violations) {
    if (violation.cycle && violation.cycle.length > 0) {
      // Create a normalized cycle key to avoid duplicates
      const cycleKey = [...violation.cycle].sort().join('->');
      if (!uniqueCycles.has(cycleKey)) {
        uniqueCycles.set(cycleKey, violation.cycle);
      }
    }
  }

  return Array.from(uniqueCycles.values()).map(paths => ({ paths }));
}

/**
 * Extract dead code from knip report
 */
export function extractDeadCode(knipReport: KnipReport | null): AggregatedStats['deadCode'] {
  if (!knipReport) {
    return [];
  }

  const deadCode: AggregatedStats['deadCode'] = [];

  // Add unused files
  if (knipReport.files) {
    for (const file of knipReport.files) {
      deadCode.push({
        file: file.file,
        kind: 'file'
      });
    }
  }
  
  // Add unused exports
  if (knipReport.exports) {
    for (const exp of knipReport.exports) {
      deadCode.push({
        file: exp.file,
        symbol: exp.symbol,
        kind: 'export'
      });
    }
  }

  return deadCode;
}

/**
 * Create metadata object for the analysis
 */
export function createMetadata(
  eslintReport: ESLintReport | null,
  depCruiseReport: DepCruiseReport | null,
  knipReport: KnipReport | null,
  clocReport: ClocReport | null,
  generatedAt: string
) {
  return {
    generatedAt,
    reports: {
      eslint: !!eslintReport,
      depcruise: !!depCruiseReport,
      knip: !!knipReport,
      cloc: !!clocReport
    },
    versions: {
      eslint: eslintReport?.version || 'N/A',
      depcruise: depCruiseReport?.version || 'N/A',
      knip: knipReport?.version || 'N/A',
      cloc: clocReport?.version || 'N/A'
    }
  };
}