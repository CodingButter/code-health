import { readReport, writeReport, getReportsDir, cleanReportsDir } from './paths.js';
import { ESLintReport, runEslint } from './runners/eslint.js';
import { DepCruiseReport, runDepCruise } from './runners/depcruise.js';
import { KnipReport, runKnip } from './runners/knip.js';
import { ClocReport, runCloc } from './runners/cloc.js';
import { Config, createIgnoreConfig } from './config.js';
import {
  extractLargestFiles,
  extractComplexityIssues,
  extractCircularDependencies,
  extractDeadCode,
  createMetadata
} from './extractors.js';

export interface AggregatedStats {
  largestFiles: Array<{
    file: string;
    loc: number;
    code: number;
    comment: number;
    blank: number;
  }>;
  complexFunctions: Array<{
    file: string;
    line: number;
    ruleId: string;
    metric?: number;
    message: string;
  }>;
  maxLineOffenders: Array<{
    file: string;
    kind: 'file' | 'function';
    value: number;
    limit: number;
  }>;
  cycles: Array<{
    paths: string[];
  }>;
  deadCode: Array<{
    file: string;
    symbol?: string;
    kind: 'file' | 'export';
  }>;
  generatedAt: string;
}

export async function aggregateReports(reportsDir: string): Promise<AggregatedStats> {
  // Read all reports
  const eslintReport = readReport(reportsDir, 'eslint') as ESLintReport | null;
  const depCruiseReport = readReport(reportsDir, 'depcruise') as DepCruiseReport | null;
  const knipReport = readReport(reportsDir, 'knip') as KnipReport | null;
  const clocReport = readReport(reportsDir, 'cloc') as ClocReport | null;
  
  const generatedAt = new Date().toISOString();
  
  // Extract data from each report using dedicated extractors
  const largestFiles = extractLargestFiles(clocReport);
  const { complexFunctions, maxLineOffenders } = extractComplexityIssues(eslintReport);
  const cycles = extractCircularDependencies(depCruiseReport);
  const deadCode = extractDeadCode(knipReport);
  
  // Combine into aggregated stats
  const stats: AggregatedStats = {
    largestFiles,
    complexFunctions,
    maxLineOffenders,
    cycles,
    deadCode,
    generatedAt
  };
  
  // Write aggregated report
  writeReport(reportsDir, 'aggregated', stats);
  
  // Write metadata
  const meta = createMetadata(eslintReport, depCruiseReport, knipReport, clocReport, generatedAt);
  writeReport(reportsDir, 'meta', meta);
  
  return stats;
}

/**
 * Run full analysis pipeline and return aggregated results
 */
export async function runAnalysis(config: Config): Promise<AggregatedStats> {
  // Set up reports directory
  const reportsDir = getReportsDir(config.cwd);
  cleanReportsDir(reportsDir);
  
  // Create ignore configuration
  const ignoreConfig = createIgnoreConfig(config);
  
  // Run all analysis tools
  await Promise.all([
    runEslint(config, ignoreConfig, reportsDir).catch(err => {
      console.error('ESLint failed:', err.message);
    }),
    runDepCruise(config, ignoreConfig, reportsDir).catch(err => {
      console.error('Dependency-cruiser failed:', err.message);
    }),
    runKnip(config, ignoreConfig, reportsDir).catch(err => {
      console.error('Knip failed:', err.message);
    }),
    runCloc(config, ignoreConfig, reportsDir).catch(err => {
      console.error('Cloc failed:', err.message);
    })
  ]);
  
  // Aggregate and return results
  return await aggregateReports(reportsDir);
}