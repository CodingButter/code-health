import { execSync } from 'child_process';
import * as path from 'path';
import * as fs from 'fs';
import { Config, IgnoreConfig } from '../config.js';
import { writeReport, getReportPath } from '../paths.js';
import { detectTsConfig } from '../config.js';
import { logger } from '../logger.js';

function createDepCruiseConfig(ignoreConfig: IgnoreConfig, tsConfigPath: string | null) {
  const config = {
    forbidden: [
      {
        name: 'no-circular',
        severity: 'warn',
        comment: 'Circular dependencies',
        from: {},
        to: { circular: true }
      },
      {
        name: 'no-orphans',
        severity: 'info',
        comment: 'Orphan modules',
        from: { orphan: true },
        to: {}
      }
    ],
    options: {
      doNotFollow: {
        path: ignoreConfig.patterns.join('|')
      },
      tsPreCompilationDeps: true,
      preserveSymlinks: false,
      reporterOptions: {
        json: {
          collapsePattern: 'node_modules/[^/]+',
        }
      }
    } as any
  };
  
  if (tsConfigPath) {
    config.options.tsConfig = { fileName: tsConfigPath };
  }
  
  return config;
}

function runDepCruiseCommand(config: Config, configPath: string, outputPath: string) {
  const filesToCruise = config.include.length > 0
    ? config.include.join(' ')
    : '.';
  
  try {
    const command = `npx depcruise --config ${configPath} --output-type json ${filesToCruise} > ${outputPath} 2>/dev/null`;
    execSync(command, {
      cwd: config.cwd,
      stdio: 'pipe',
      encoding: 'utf-8'
    });
  } catch (error: any) {
    if (!fs.existsSync(outputPath)) {
      throw error;
    }
  }
}

function transformCruiseResult(cruiseResult: any): DepCruiseReport {
  const cycles = (cruiseResult.summary?.violations || [])
    .filter((v: any) => v.rule?.name === 'no-circular' && v.cycle)
    .map((v: any) => v.cycle);
  
  return {
    modules: (cruiseResult.modules || []).map((module: any) => ({
      source: module.source,
      dependencies: (module.dependencies || []).map((dep: any) => ({
        resolved: dep.resolved,
        module: dep.module,
        dependencyTypes: dep.dependencyTypes || [],
        circular: dep.circular,
        cycle: dep.cycle
      }))
    })),
    summary: {
      violations: (cruiseResult.summary?.violations || []).map((v: any) => ({
        from: v.from,
        to: v.to,
        rule: {
          severity: v.rule?.severity || 'info',
          name: v.rule?.name || 'unknown'
        },
        cycle: v.cycle
      })),
      totalCruised: cruiseResult.summary?.totalCruised || 0,
      totalDependenciesCruised: cruiseResult.summary?.totalDependenciesCruised || 0,
      error: cruiseResult.summary?.error || 0,
      warn: cruiseResult.summary?.warn || 0,
      info: cruiseResult.summary?.info || 0
    },
    version: '16.0.0',
    timestamp: new Date().toISOString()
  };
}

export interface DepCruiseReport {
  modules: Array<{
    source: string;
    dependencies: Array<{
      resolved: string;
      module: string;
      dependencyTypes: string[];
      circular?: boolean;
      cycle?: string[];
    }>;
  }>;
  summary: {
    violations: Array<{
      from: string;
      to: string;
      rule: {
        severity: string;
        name: string;
      };
      cycle?: string[];
    }>;
    totalCruised: number;
    totalDependenciesCruised: number;
    error: number;
    warn: number;
    info: number;
  };
  version: string;
  timestamp: string;
}

export async function runDepCruise(
  config: Config,
  ignoreConfig: IgnoreConfig,
  reportsDir: string
): Promise<void> {
  logger.log('Running dependency-cruiser analysis...');
  
  try {
    const tsConfigPath = await detectTsConfig(config.cwd);
    const cruiseConfig = createDepCruiseConfig(ignoreConfig, tsConfigPath);
    
    const configPath = path.join(reportsDir, 'depcruise.config.json');
    fs.writeFileSync(configPath, JSON.stringify(cruiseConfig, null, 2));
    
    const outputPath = getReportPath(reportsDir, 'depcruise-raw');
    runDepCruiseCommand(config, configPath, outputPath);
    
    const rawOutput = fs.readFileSync(outputPath, 'utf-8');
    const cruiseResult = JSON.parse(rawOutput);
    const report = transformCruiseResult(cruiseResult);
    
    writeReport(reportsDir, 'depcruise', report);
    
    if (fs.existsSync(configPath)) {
      fs.unlinkSync(configPath);
    }
    if (fs.existsSync(outputPath)) {
      fs.unlinkSync(outputPath);
    }
    
    // Log summary
    logger.log(`Dependency analysis complete: ${cycles.length} circular dependencies found`);
    
  } catch (error) {
    logger.error('Dependency-cruiser runner failed:', error);
    // Write empty report on failure
    writeReport(reportsDir, 'depcruise', {
      modules: [],
      summary: {
        violations: [],
        totalCruised: 0,
        totalDependenciesCruised: 0,
        error: 0,
        warn: 0,
        info: 0
      },
      version: '16.0.0',
      timestamp: new Date().toISOString(),
      error: String(error)
    });
  }
}