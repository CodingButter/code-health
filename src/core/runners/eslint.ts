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

function createFallbackConfig(config: Config, ignoreConfig: IgnoreConfig) {
  // ESLint 9+ flat config format
  return [
    {
      files: ['**/*.{js,jsx,ts,tsx,mjs,cjs}'],
      ignores: ignoreConfig.patterns,
      languageOptions: {
        ecmaVersion: 2022,
        sourceType: 'module',
        parser: '@typescript-eslint/parser',
        parserOptions: {
          ecmaFeatures: {
            jsx: true
          }
        }
      },
      plugins: {
        '@typescript-eslint': require('@typescript-eslint/eslint-plugin'),
        'sonarjs': require('eslint-plugin-sonarjs'),
        'unicorn': require('eslint-plugin-unicorn'),
        'regexp': require('eslint-plugin-regexp')
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
        }],
        
        // Cognitive complexity from SonarJS
        'sonarjs/cognitive-complexity': ['warn', config.complexityThreshold],
        
        // Regexp safety
        'regexp/no-super-linear-backtracking': 'error',
        'regexp/no-catastrophic-backtracking': 'error',
        
        // Some useful sonarjs rules
        'sonarjs/no-duplicate-string': 'warn',
        'sonarjs/no-identical-functions': 'warn',
        'sonarjs/no-collapsible-if': 'warn',
        
        // Some useful unicorn rules
        'unicorn/no-array-for-each': 'warn',
        'unicorn/prefer-array-some': 'warn',
        'unicorn/prefer-includes': 'warn',
        'unicorn/prefer-string-starts-ends-with': 'warn',
        'unicorn/prefer-array-find': 'warn',
        
        // TypeScript specific
        '@typescript-eslint/no-unused-vars': ['warn', { 
          argsIgnorePattern: '^_',
          varsIgnorePattern: '^_'
        }],
        '@typescript-eslint/no-explicit-any': 'warn'
      }
    }
  ];
}

export async function runEslint(
  config: Config,
  ignoreConfig: IgnoreConfig,
  reportsDir: string
): Promise<void> {
  logger.log('Running ESLint analysis...');
  
  try {
    // Check if project has its own ESLint config
    const projectConfigPath = await findProjectEslintConfig(config.cwd);
    
    let eslintOptions: any = {
      cwd: config.cwd,
      cache: false
    };
    
    if (projectConfigPath) {
      // Use project's config
      logger.log(`Using project ESLint config: ${projectConfigPath}`);
      eslintOptions.overrideConfigFile = projectConfigPath;
    } else {
      // Use our fallback config
      logger.log('Using fallback ESLint configuration');
      eslintOptions.baseConfig = createFallbackConfig(config, ignoreConfig);
    }
    
    const eslint = new ESLint(eslintOptions);
    
    // Determine files to lint
    const patterns = config.include.length > 0 
      ? config.include 
      : ['**/*.{js,jsx,ts,tsx,mjs,cjs}'];
    
    const results = await eslint.lintFiles(patterns);
    
    // Filter out ignored files
    const filteredResults = results.filter(result => {
      const relativePath = path.relative(config.cwd, result.filePath);
      return !ignoreConfig.ignorer.ignores(relativePath);
    });
    
    // Create report
    const report: ESLintReport = {
      results: filteredResults,
      version: ESLint.version,
      timestamp: new Date().toISOString()
    };
    
    // Write report
    writeReport(reportsDir, 'eslint', report);
    
    // Log summary
    const totalErrors = filteredResults.reduce((sum, r) => sum + r.errorCount, 0);
    const totalWarnings = filteredResults.reduce((sum, r) => sum + r.warningCount, 0);
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