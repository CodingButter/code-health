import * as path from 'path';
import * as fs from 'fs';
import * as os from 'os';
import { createHash } from 'crypto';

export function getReportsDir(cwd: string): string {
  // Create a hash of the cwd for unique temp directory
  const hash = createHash('md5').update(cwd).digest('hex').substring(0, 8);
  
  // Use home directory approach as specified in Project.md
  const homeDir = os.homedir();
  const reportsDir = path.join(homeDir, '.butter-code-health', hash, '.reports');
  
  // Ensure directory exists
  fs.mkdirSync(reportsDir, { recursive: true });
  
  return reportsDir;
}

export function getTempDir(): string {
  return os.tmpdir();
}

export function ensureDir(dirPath: string): void {
  if (!fs.existsSync(dirPath)) {
    fs.mkdirSync(dirPath, { recursive: true });
  }
}

export function getReportPath(reportsDir: string, reportName: string): string {
  return path.join(reportsDir, `${reportName}.json`);
}

export function writeReport(reportsDir: string, reportName: string, data: any): void {
  const reportPath = getReportPath(reportsDir, reportName);
  fs.writeFileSync(reportPath, JSON.stringify(data, null, 2));
}

export function readReport(reportsDir: string, reportName: string): any {
  const reportPath = getReportPath(reportsDir, reportName);
  if (!fs.existsSync(reportPath)) {
    return null;
  }
  return JSON.parse(fs.readFileSync(reportPath, 'utf-8'));
}

export function cleanReportsDir(reportsDir: string): void {
  if (fs.existsSync(reportsDir)) {
    fs.rmSync(reportsDir, { recursive: true, force: true });
  }
  fs.mkdirSync(reportsDir, { recursive: true });
}