import { ESLint } from 'eslint';
import * as path from 'path';
import * as fs from 'fs';
import { Config, IgnoreConfig } from '../config.js';
import { writeReport } from '../paths.js';
import { logger } from '../logger.js';

export interface ESLintReport {
  results: Array<{
    filePath: string;
    messages: Array<{
      ruleId: string;
      severity: number;
      message: string;
      line: number;
      column: number;
      nodeType?: string;
      messageId?: string;
      endLine?: number;
      endColumn?: number;
    }>;
    errorCount: number;
    warningCount: number;
    fixableErrorCount: number;
    fixableWarningCount: number;
  }>;
  version: string;
  timestamp: string;
}

function createFallbackConfig(config: Config, ignoreConfig: IgnoreConfig): any {
  // ESLint 9+ flat config format
  return [
    {
      files: ['**/*.{js,jsx,ts,tsx,mjs,cjs}'],
      ignores: ignoreConfig.patterns,
      languageOptions: {
        ecmaVersion: 2022,
        sourceType: 'module',
        parserOptions: {
          ecmaFeatures: {
            jsx: true
          }
        }
      },
      rules: {
        // Max lines rules as specified in Project.md
        'max-lines': ['warn', {
          max: config.maxLines,
          skipBlankLines: true,
          skipComments: true
        }],
        'max-lines-per-function': ['warn', {
          max: config.maxLinesPerFunction,
          skipBlankLines: true,
          skipComments: true
        }]
      }
    }
  ];
}

async function createEslintOptions(
  config: Config,
  ignoreConfig: IgnoreConfig,
  projectConfigPath: string | null
): Promise<any> {
  let eslintOptions: any = {
    cwd: config.cwd,
    cache: false
  };
  
  let useProjectConfig = false;
  if (projectConfigPath) {
    try {
      // Test if this is a legacy .eslintrc format
      if (projectConfigPath.includes('.eslintrc')) {
        logger.log(`Found legacy ESLint config: ${projectConfigPath}, using fallback instead`);
      } else {
        // Use project's config for flat config files only
        logger.log(`Using project ESLint config: ${projectConfigPath}`);
        eslintOptions.overrideConfigFile = projectConfigPath;
        useProjectConfig = true;
      }
    } catch (error) {
      logger.log(`Project ESLint config incompatible, using fallback: ${error}`);
    }
  }
  
  if (!useProjectConfig) {
    // Use our fallback config
    logger.log('Using fallback ESLint configuration');
    eslintOptions.baseConfig = createFallbackConfig(config, ignoreConfig);
  }
  
  return eslintOptions;
}

async function runEslintWithFallback(
  eslintOptions: any,
  patterns: string[],
  config: Config,
  ignoreConfig: IgnoreConfig
): Promise<any[]> {
  const eslint = new ESLint(eslintOptions);
  
  try {
    return await eslint.lintFiles(patterns);
  } catch (configError: any) {
    // If project config fails due to legacy format, fall back to our config
    if (configError.message?.includes('eslintrc format') || configError.message?.includes('flat config')) {
      logger.log('Project config incompatible with ESLint 9+, using fallback configuration');
      const fallbackOptions = {
        cwd: config.cwd,
        cache: false,
        baseConfig: createFallbackConfig(config, ignoreConfig)
      };
      const fallbackEslint = new ESLint(fallbackOptions);
      return await fallbackEslint.lintFiles(patterns);
    } else {
      throw configError;
    }
  }
}

function processEslintResults(results: any[], config: Config, ignoreConfig: IgnoreConfig): ESLintReport {
  // Filter out ignored files
  const filteredResults = results.filter(result => {
    const relativePath = path.relative(config.cwd, result.filePath);
    return !ignoreConfig.ignorer.ignores(relativePath);
  });
  
  // Create report with normalized messages
  const normalizedResults = filteredResults.map(result => ({
    ...result,
    messages: result.messages.filter((m: any) => m.ruleId !== null).map((m: any) => ({
      ...m,
      ruleId: m.ruleId as string // Safe to cast after filtering null
    }))
  }));
  
  return {
    results: normalizedResults,
    version: ESLint.version,
    timestamp: new Date().toISOString()
  };
}

export async function runEslint(
  config: Config,
  ignoreConfig: IgnoreConfig,
  reportsDir: string
): Promise<void> {
  logger.log('Running ESLint analysis...');
  
  try {
    const projectConfigPath = await findProjectEslintConfig(config.cwd);
    const eslintOptions = await createEslintOptions(config, ignoreConfig, projectConfigPath);
    
    // Determine files to lint
    const patterns = config.include.length > 0 
      ? config.include 
      : ['**/*.{js,jsx,ts,tsx,mjs,cjs}'];
    
    const results = await runEslintWithFallback(eslintOptions, patterns, config, ignoreConfig);
    const report = processEslintResults(results, config, ignoreConfig);
    
    // Write report
    writeReport(reportsDir, 'eslint', report);
    
    // Log summary
    const totalErrors = report.results.reduce((sum, r) => sum + r.errorCount, 0);
    const totalWarnings = report.results.reduce((sum, r) => sum + r.warningCount, 0);
    logger.log(`ESLint complete: ${totalErrors} errors, ${totalWarnings} warnings`);
    
  } catch (error) {
    logger.error('ESLint runner failed:', error);
    // Write empty report on failure
    writeReport(reportsDir, 'eslint', {
      results: [],
      version: ESLint.version,
      timestamp: new Date().toISOString(),
      error: String(error)
    });
  }
}

async function findProjectEslintConfig(cwd: string): Promise<string | null> {
  const configFiles = [
    'eslint.config.js',
    'eslint.config.mjs',
    'eslint.config.cjs',
    '.eslintrc.js',
    '.eslintrc.cjs',
    '.eslintrc.json'
  ];
  
  for (const configFile of configFiles) {
    const configPath = path.join(cwd, configFile);
    if (fs.existsSync(configPath)) {
      return configPath;
    }
  }
  
  return null;
}