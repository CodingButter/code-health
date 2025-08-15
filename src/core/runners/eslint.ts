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
  // Simplified ESLint config that doesn't require external plugins
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
        // Core max lines rules - these work without plugins
        'max-lines': ['error', {
          max: config.maxLines,
          skipBlankLines: true,
          skipComments: true
        }],
        'max-lines-per-function': ['error', {
          max: config.maxLinesPerFunction,
          skipBlankLines: true,
          skipComments: true
        }],
        // Basic rules that don't require plugins
        'no-unused-vars': 'warn',
        'no-console': 'off'
      }
    }
  ];
}

async function createHybridConfig(config: Config, ignoreConfig: IgnoreConfig, originalOptions: any): Promise<any> {
  let projectRules = {};
  
  // Try to read project's ESLint config to extract rules
  try {
    const projectConfigPath = await findProjectEslintConfig(config.cwd);
    if (projectConfigPath) {
      logger.log(`Attempting to extract rules from: ${projectConfigPath}`);
      
      if (projectConfigPath.includes('.eslintrc')) {
        // For .eslintrc files, try to read and parse them
        const configContent = fs.readFileSync(projectConfigPath, 'utf-8');
        
        if (projectConfigPath.endsWith('.js') || projectConfigPath.endsWith('.cjs')) {
          // For JS files, try to extract rules via simple parsing
          const rulesMatch = configContent.match(/rules\s*:\s*{([^}]+)}/s);
          if (rulesMatch) {
            // Extract max-lines and max-lines-per-function rules specifically
            const maxLinesMatch = configContent.match(/['"]max-lines['"]:\s*\[[^,]+,\s*{\s*max:\s*(\d+)/);
            const maxLinesFuncMatch = configContent.match(/['"]max-lines-per-function['"]:\s*\[[^,]+,\s*{\s*max:\s*(\d+)/);
            
            logger.log(`Config content excerpt: ${configContent.substring(0, 500)}...`);
            logger.log(`Max lines match: ${maxLinesMatch ? maxLinesMatch[0] : 'none'}`);
            logger.log(`Max lines func match: ${maxLinesFuncMatch ? maxLinesFuncMatch[0] : 'none'}`);
            
            if (maxLinesMatch) {
              const maxLines = parseInt(maxLinesMatch[1]);
              logger.log(`Found project max-lines rule: ${maxLines}`);
              config.maxLines = maxLines; // Update our config to match project's
            }
            
            if (maxLinesFuncMatch) {
              const maxLinesFunc = parseInt(maxLinesFuncMatch[1]);
              logger.log(`Found project max-lines-per-function rule: ${maxLinesFunc}`);
              config.maxLinesPerFunction = maxLinesFunc; // Update our config to match project's
            }
          }
        } else if (projectConfigPath.endsWith('.json')) {
          // For JSON files, parse directly
          const configObj = JSON.parse(configContent);
          if (configObj.rules) {
            if (configObj.rules['max-lines'] && Array.isArray(configObj.rules['max-lines']) && configObj.rules['max-lines'][1]?.max) {
              config.maxLines = configObj.rules['max-lines'][1].max;
              logger.log(`Found project max-lines rule: ${config.maxLines}`);
            }
            if (configObj.rules['max-lines-per-function'] && Array.isArray(configObj.rules['max-lines-per-function']) && configObj.rules['max-lines-per-function'][1]?.max) {
              config.maxLinesPerFunction = configObj.rules['max-lines-per-function'][1].max;
              logger.log(`Found project max-lines-per-function rule: ${config.maxLinesPerFunction}`);
            }
          }
        }
      }
    }
  } catch (error) {
    logger.log(`Could not extract rules from project config: ${error}`);
  }
  
  // Return fallback config with potentially updated limits from project config
  return createFallbackConfig(config, ignoreConfig);
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
  
  if (projectConfigPath) {
    // Always try to use the project's config first
    logger.log(`Using project ESLint config: ${projectConfigPath}`);
    
    if (projectConfigPath.includes('.eslintrc')) {
      // For legacy .eslintrc files, let ESLint handle them naturally
      // Don't set overrideConfigFile, let ESLint auto-discover
    } else {
      // For flat config files, explicitly set the config
      eslintOptions.overrideConfigFile = projectConfigPath;
    }
  } else {
    // Use our fallback config only when no project config exists
    logger.log('No project ESLint config found, using fallback configuration');
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
  try {
    const eslint = new ESLint(eslintOptions);
    return await eslint.lintFiles(patterns);
  } catch (configError: any) {
    // If project config fails, create a hybrid config that merges project rules with our health rules
    logger.log(`ESLint config error: ${configError.message}`);
    if (configError.message?.includes('eslintrc format') || 
        configError.message?.includes('flat config') ||
        configError.message?.includes('Config file missing') ||
        configError.message?.includes('Could not find config file')) {
      
      logger.log('Project config incompatible with ESLint 9+, using enhanced fallback configuration');
      
      // Try to extract rules from legacy config if possible
      const hybridConfig = await createHybridConfig(config, ignoreConfig, eslintOptions);
      logger.log(`Created hybrid config with max-lines: ${JSON.stringify(hybridConfig[0].rules['max-lines'])}`);
      logger.log(`Full hybrid config: ${JSON.stringify(hybridConfig, null, 2)}`);
      
      const fallbackOptions = {
        cwd: config.cwd,
        cache: false,
        baseConfig: hybridConfig
      };
      
      try {
        // Use the array format for flat config
        const simpleFallbackOptions = {
          cwd: config.cwd,
          cache: false,
          baseConfig: hybridConfig
        };
        
        const fallbackEslint = new ESLint(simpleFallbackOptions);
        const results = await fallbackEslint.lintFiles(patterns);
        logger.log(`Fallback ESLint found ${results.length} files with ${results.reduce((sum, r) => sum + r.messages.length, 0)} total messages`);
        return results;
      } catch (fallbackError: any) {
        logger.error(`Fallback ESLint also failed: ${fallbackError.message}`);
        // Return empty results as last resort
        return [];
      }
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