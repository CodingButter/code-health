import { execSync } from 'child_process';
import * as path from 'path';
import * as fs from 'fs';
import { Config, IgnoreConfig } from '../config.js';
import { writeReport, getReportPath } from '../paths.js';
import { globSync } from 'glob';
import { logger } from '../logger.js';

export interface ClocReport {
  files: Array<{
    file: string;
    language: string;
    blank: number;
    comment: number;
    code: number;
    loc: number; // total lines
  }>;
  summary: {
    filesCount: number;
    totalBlank: number;
    totalComment: number;
    totalCode: number;
    totalLines: number;
  };
  version: string;
  timestamp: string;
}

export async function runCloc(
  config: Config,
  ignoreConfig: IgnoreConfig,
  reportsDir: string
): Promise<void> {
  logger.log('Running cloc for line counting...');
  
  try {
    // First, try to use cloc if it's installed
    let useNativeCloc = false;
    try {
      execSync('which cloc', { stdio: 'pipe' });
      useNativeCloc = true;
    } catch {
      // cloc not installed, we'll use a fallback
    }
    
    let clocData: any;
    
    if (useNativeCloc) {
      clocData = await runNativeCloc(config, ignoreConfig, reportsDir);
    } else {
      // Fallback: count lines manually
      clocData = await runManualLineCount(config, ignoreConfig);
    }
    
    // Create report
    const report: ClocReport = {
      files: clocData.files || [],
      summary: clocData.summary || {
        filesCount: 0,
        totalBlank: 0,
        totalComment: 0,
        totalCode: 0,
        totalLines: 0
      },
      version: '1.0.0',
      timestamp: new Date().toISOString()
    };
    
    // Write report
    writeReport(reportsDir, 'cloc', report);
    
    // Log summary
    logger.log(`Line counting complete: ${report.summary.filesCount} files, ${report.summary.totalCode} lines of code`);
    
  } catch (error) {
    logger.error('Cloc runner failed:', error);
    // Write empty report on failure
    writeReport(reportsDir, 'cloc', {
      files: [],
      summary: {
        filesCount: 0,
        totalBlank: 0,
        totalComment: 0,
        totalCode: 0,
        totalLines: 0
      },
      version: '1.0.0',
      timestamp: new Date().toISOString(),
      error: String(error)
    });
  }
}

async function runNativeCloc(
  config: Config,
  ignoreConfig: IgnoreConfig,
  reportsDir: string
): Promise<any> {
  const outputPath = getReportPath(reportsDir, 'cloc-raw');
  
  // Build exclude directories string
  const excludeDirs = ignoreConfig.patterns
    .filter(p => p.includes('/'))
    .map(p => p.replace(/\*\*/g, '').replace(/\*/g, '').replace(/\//g, ''))
    .filter(Boolean)
    .join(',');
  
  // Run cloc with JSON output
  const command = `cloc . --by-file --json --exclude-dir=${excludeDirs} > ${outputPath} 2>/dev/null`;
  
  try {
    execSync(command, {
      cwd: config.cwd,
      stdio: 'pipe'
    });
  } catch (error) {
    // cloc might exit with non-zero, check if output exists
    if (!fs.existsSync(outputPath)) {
      throw error;
    }
  }
  
  const rawOutput = fs.readFileSync(outputPath, 'utf-8');
  const clocJson = JSON.parse(rawOutput);
  
  // Clean up temp file
  fs.unlinkSync(outputPath);
  
  // Transform cloc output to our format
  const files: any[] = [];
  let summary = {
    filesCount: 0,
    totalBlank: 0,
    totalComment: 0,
    totalCode: 0,
    totalLines: 0
  };
  
  for (const [filePath, data] of Object.entries(clocJson)) {
    if (filePath === 'header' || filePath === 'SUM') continue;
    
    const fileData = data as any;
    files.push({
      file: filePath,
      language: fileData.language || 'Unknown',
      blank: fileData.blank || 0,
      comment: fileData.comment || 0,
      code: fileData.code || 0,
      loc: (fileData.blank || 0) + (fileData.comment || 0) + (fileData.code || 0)
    });
    
    summary.filesCount++;
    summary.totalBlank += fileData.blank || 0;
    summary.totalComment += fileData.comment || 0;
    summary.totalCode += fileData.code || 0;
  }
  
  summary.totalLines = summary.totalBlank + summary.totalComment + summary.totalCode;
  
  return { files, summary };
}

function isCommentLine(trimmed: string): boolean {
  return trimmed.startsWith('//') ||
         trimmed.startsWith('#') ||
         trimmed.startsWith('/*') ||
         trimmed.startsWith('*') ||
         trimmed.startsWith('<!--');
}

function countFileLines(content: string) {
  const lines = content.split('\n');
  let blank = 0;
  let comment = 0;
  let code = 0;
  
  for (const line of lines) {
    const trimmed = line.trim();
    if (!trimmed) {
      blank++;
    } else if (isCommentLine(trimmed)) {
      comment++;
    } else {
      code++;
    }
  }
  
  return { blank, comment, code };
}

function processFile(filePath: string, relativePath: string) {
  const content = fs.readFileSync(filePath, 'utf-8');
  const counts = countFileLines(content);
  
  return {
    file: relativePath,
    language: getLanguageFromExtension(path.extname(filePath)),
    blank: counts.blank,
    comment: counts.comment,
    code: counts.code,
    loc: counts.blank + counts.comment + counts.code
  };
}

async function runManualLineCount(
  config: Config,
  ignoreConfig: IgnoreConfig
): Promise<any> {
  const files: any[] = [];
  let summary = {
    filesCount: 0,
    totalBlank: 0,
    totalComment: 0,
    totalCode: 0,
    totalLines: 0
  };
  
  // Get all code files
  const patterns = [
    '**/*.{js,jsx,ts,tsx,mjs,cjs}',
    '**/*.{py,rb,go,rs,java,c,cpp,h,hpp}',
    '**/*.{css,scss,sass,less}',
    '**/*.{html,xml,yaml,yml,json}'
  ];
  
  for (const pattern of patterns) {
    const matchedFiles = globSync(pattern, {
      cwd: config.cwd,
      ignore: ignoreConfig.patterns,
      absolute: true
    });
    
    for (const filePath of matchedFiles) {
      const relativePath = path.relative(config.cwd, filePath);
      
      // Skip if ignored
      if (ignoreConfig.ignorer.ignores(relativePath)) {
        continue;
      }
      
      try {
        const fileInfo = processFile(filePath, relativePath);
        files.push(fileInfo);
        
        summary.filesCount++;
        summary.totalBlank += fileInfo.blank;
        summary.totalComment += fileInfo.comment;
        summary.totalCode += fileInfo.code;
        
      } catch (error) {
        // Skip files that can't be read
        continue;
      }
    }
  }
  
  summary.totalLines = summary.totalBlank + summary.totalComment + summary.totalCode;
  
  // Sort files by LOC descending
  files.sort((a, b) => b.loc - a.loc);
  
  return { files, summary };
}

function getLanguageFromExtension(ext: string): string {
  const languageMap: Record<string, string> = {
    '.js': 'JavaScript',
    '.jsx': 'JavaScript',
    '.ts': 'TypeScript',
    '.tsx': 'TypeScript',
    '.mjs': 'JavaScript',
    '.cjs': 'JavaScript',
    '.py': 'Python',
    '.rb': 'Ruby',
    '.go': 'Go',
    '.rs': 'Rust',
    '.java': 'Java',
    '.c': 'C',
    '.cpp': 'C++',
    '.h': 'C Header',
    '.hpp': 'C++ Header',
    '.css': 'CSS',
    '.scss': 'SCSS',
    '.sass': 'Sass',
    '.less': 'Less',
    '.html': 'HTML',
    '.xml': 'XML',
    '.yaml': 'YAML',
    '.yml': 'YAML',
    '.json': 'JSON'
  };
  
  return languageMap[ext] || 'Unknown';
}