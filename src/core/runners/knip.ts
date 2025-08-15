import { execSync } from 'child_process';
import * as path from 'path';
import * as fs from 'fs';
import { Config, IgnoreConfig } from '../config.js';
import { writeReport, getReportPath } from '../paths.js';
import { logger } from '../logger.js';

export interface KnipReport {
  files: Array<{
    file: string;
    type: 'file' | 'dependency' | 'devDependency' | 'unlisted' | 'binary';
  }>;
  exports: Array<{
    file: string;
    symbol: string;
    type: 'export' | 'nsExport' | 'classMembers' | 'types' | 'nsTypes' | 'enumMembers';
    line?: number;
    column?: number;
  }>;
  duplicates: Array<{
    file: string;
    symbols: string[];
  }>;
  version: string;
  timestamp: string;
}

export async function runKnip(
  config: Config,
  ignoreConfig: IgnoreConfig,
  reportsDir: string
): Promise<void> {
  logger.log('Running knip for dead code detection...');
  
  try {
    // Create a temporary knip config
    const knipConfig = {
      entry: ['src/index.{ts,js,tsx,jsx}', 'app.{ts,js,tsx,jsx}', 'server.{ts,js,tsx,jsx}'],
      project: ['**/*.{ts,js,tsx,jsx}'],
      ignore: ignoreConfig.patterns,
      ignoreDependencies: [],
      ignoreMembers: [],
      ignoreWorkspaces: [],
      reporter: 'json'
    };
    
    const knipConfigPath = path.join(reportsDir, 'knip.config.json');
    fs.writeFileSync(knipConfigPath, JSON.stringify(knipConfig, null, 2));
    
    const outputPath = getReportPath(reportsDir, 'knip-raw');
    
    try {
      // Run knip CLI with JSON output
      const command = `npx knip --config ${knipConfigPath} --reporter json > ${outputPath} 2>&1`;
      execSync(command, {
        cwd: config.cwd,
        stdio: 'pipe',
        encoding: 'utf-8'
      });
    } catch (error: any) {
      // Knip exits with non-zero when it finds issues, which is expected
      // Check if output file was created
      if (!fs.existsSync(outputPath)) {
        throw error;
      }
    }
    
    // Parse knip output
    let knipOutput: any = { files: [], exports: [], duplicates: [] };
    
    if (fs.existsSync(outputPath)) {
      const rawOutput = fs.readFileSync(outputPath, 'utf-8');
      try {
        knipOutput = JSON.parse(rawOutput);
      } catch (parseError) {
        // If JSON parsing fails, try to extract useful info from the output
        logger.warn('Failed to parse knip JSON output, using fallback parsing');
        knipOutput = parseKnipTextOutput(rawOutput);
      }
    }
    
    // Create report
    const report: KnipReport = {
      files: knipOutput.files || [],
      exports: knipOutput.exports || [],
      duplicates: knipOutput.duplicates || [],
      version: '5.0.0', // knip version
      timestamp: new Date().toISOString()
    };
    
    // Write report
    writeReport(reportsDir, 'knip', report);
    
    // Clean up temp files
    if (fs.existsSync(knipConfigPath)) {
      fs.unlinkSync(knipConfigPath);
    }
    if (fs.existsSync(outputPath)) {
      fs.unlinkSync(outputPath);
    }
    
    // Log summary
    const deadFiles = report.files.length;
    const deadExports = report.exports.length;
    logger.log(`Knip complete: ${deadFiles} unused files, ${deadExports} unused exports`);
    
  } catch (error) {
    logger.error('Knip runner failed:', error);
    // Write empty report on failure
    writeReport(reportsDir, 'knip', {
      files: [],
      exports: [],
      duplicates: [],
      version: '5.0.0',
      timestamp: new Date().toISOString(),
      error: String(error)
    });
  }
}

function detectSection(line: string): string | null {
  if (line.includes('Unused files')) return 'files';
  if (line.includes('Unused exports')) return 'exports';
  if (line.includes('Duplicate exports')) return 'duplicates';
  return null;
}

function processFilesSection(match: RegExpMatchArray): any {
  return {
    file: match[1].trim(),
    type: 'file'
  };
}

function processExportsSection(match: RegExpMatchArray): any | null {
  const [file, symbol] = match[1].split(':').map(s => s.trim());
  if (!file || !symbol) return null;
  
  return {
    file,
    symbol,
    type: 'export'
  };
}

function parseKnipTextOutput(output: string): any {
  // Fallback parser for text output
  const result = {
    files: [] as any[],
    exports: [] as any[],
    duplicates: [] as any[]
  };
  
  const lines = output.split('\n');
  let currentSection = '';
  
  for (const line of lines) {
    const section = detectSection(line);
    if (section) {
      currentSection = section;
      continue;
    }
    
    if (!line.trim() || !currentSection) continue;
    
    const match = line.match(/^\s*(.+?)(?:\s+\((.+?)\))?$/);
    if (!match) continue;
    
    if (currentSection === 'files') {
      result.files.push(processFilesSection(match));
    } else if (currentSection === 'exports') {
      const exportItem = processExportsSection(match);
      if (exportItem) {
        result.exports.push(exportItem);
      }
    }
  }
  
  return result;
}