import * as fs from 'fs';
import * as path from 'path';
import ignore from 'ignore';
import { glob } from 'glob';

export interface Config {
  cwd: string;
  include: string[];
  exclude: string[];
  ignoreGitignore: boolean;
  maxLines: number;
  maxLinesPerFunction: number;
  complexityThreshold: number;
  port: number;
  format: 'json' | 'text';
  open: boolean;
}

export interface IgnoreConfig {
  patterns: string[];
  ignorer: ReturnType<typeof ignore>;
}

const BUILT_IN_IGNORES = [
  // Dependencies and generated files
  '**/node_modules/**',
  '**/package-lock.json',
  '**/yarn.lock',
  '**/pnpm-lock.yaml',
  '**/bun.lockb',
  '**/composer.lock',
  '**/Gemfile.lock',
  '**/Pipfile.lock',
  '**/poetry.lock',
  
  // Build outputs and caches
  '**/dist/**',
  '**/build/**',
  '**/out/**',
  '**/.next/**',
  '**/.nuxt/**',
  '**/.output/**',
  '**/.turbo/**',
  '**/.vite/**',
  '**/.parcel-cache/**',
  '**/.cache/**',
  '**/coverage/**',
  '**/tmp/**',
  '**/temp/**',
  
  // Version control and system files
  '**/.git/**',
  '**/.svn/**',
  '**/.hg/**',
  '**/.DS_Store',
  '**/Thumbs.db',
  '**/*.tmp',
  '**/*.temp',
  
  // Logs and environment files
  '**/*.log',
  '**/.env*',
  '**/.local',
  
  // Config files (usually not meaningful for code health)
  '**/*.config.*',
  '**/vite.config.*',
  '**/webpack.config.*',
  '**/rollup.config.*',
  '**/jest.config*',
  '**/tsup.config*',
  '**/tailwind.config*',
  '**/postcss.config*',
  '**/babel.config*',
  '**/.babelrc*',
  '**/.eslintrc*',
  '**/.prettierrc*',
  '**/renovate.json',
  '**/.renovaterc*',
  
  // IDE and editor files
  '**/.vscode/**',
  '**/.idea/**',
  '**/*.swp',
  '**/*.swo',
  '**/*~',
  
  // Documentation (unless we want to analyze it)
  '**/LICENSE*',
  '**/CHANGELOG*',
  '**/CONTRIBUTING*',
  '**/CODE_OF_CONDUCT*',
  
  // Generated code patterns
  '**/*generated*',
  '**/*Generated*',
  '**/*.generated.*',
  '**/__generated__/**',
  '**/generated/**'
];

export function createIgnoreConfig(config: Config): IgnoreConfig {
  const patterns: string[] = [...BUILT_IN_IGNORES];
  
  // Add gitignore patterns if not disabled
  if (!config.ignoreGitignore) {
    const gitignorePath = path.join(config.cwd, '.gitignore');
    if (fs.existsSync(gitignorePath)) {
      const gitignoreContent = fs.readFileSync(gitignorePath, 'utf-8');
      const gitignorePatterns = gitignoreContent
        .split('\n')
        .filter(line => line.trim() && !line.startsWith('#'))
        .map(line => line.trim());
      patterns.push(...gitignorePatterns);
    }
  }
  
  // Add CLI excludes
  patterns.push(...config.exclude);
  
  const ignorer = ignore().add(patterns);
  
  return { patterns, ignorer };
}

export async function detectTsConfig(cwd: string): Promise<string | null> {
  let currentDir = cwd;
  
  while (currentDir !== path.dirname(currentDir)) {
    const tsConfigPath = path.join(currentDir, 'tsconfig.json');
    if (fs.existsSync(tsConfigPath)) {
      return tsConfigPath;
    }
    currentDir = path.dirname(currentDir);
  }
  
  return null;
}

export async function detectMonorepo(cwd: string): Promise<{
  type: 'npm' | 'yarn' | 'pnpm' | 'none';
  workspaces: string[];
}> {
  const packageJsonPath = path.join(cwd, 'package.json');
  
  // Check package.json workspaces
  if (fs.existsSync(packageJsonPath)) {
    const packageJson = JSON.parse(fs.readFileSync(packageJsonPath, 'utf-8'));
    if (packageJson.workspaces) {
      const workspaces = Array.isArray(packageJson.workspaces)
        ? packageJson.workspaces
        : packageJson.workspaces.packages || [];
      return { type: 'npm', workspaces };
    }
  }
  
  // Check pnpm-workspace.yaml
  const pnpmWorkspacePath = path.join(cwd, 'pnpm-workspace.yaml');
  if (fs.existsSync(pnpmWorkspacePath)) {
    // Simple YAML parsing for packages field
    const content = fs.readFileSync(pnpmWorkspacePath, 'utf-8');
    const match = content.match(/packages:\s*\n((?:\s+-\s+.+\n?)+)/);
    if (match) {
      const workspaces = match[1]
        .split('\n')
        .map(line => line.replace(/^\s*-\s*/, '').trim())
        .filter(Boolean);
      return { type: 'pnpm', workspaces };
    }
  }
  
  // Default fallback patterns
  const defaultPatterns = ['apps/*', 'packages/*'];
  const hasMonorepoStructure = defaultPatterns.some(pattern => {
    const matches = glob.sync(pattern, { cwd });
    return matches.length > 0;
  });
  
  if (hasMonorepoStructure) {
    return { type: 'none', workspaces: defaultPatterns };
  }
  
  return { type: 'none', workspaces: [] };
}

export async function loadEslintConfig(cwd: string): Promise<any | null> {
  // Try to find ESLint flat config
  const flatConfigPaths = [
    'eslint.config.js',
    'eslint.config.mjs',
    'eslint.config.cjs'
  ];
  
  for (const configFile of flatConfigPaths) {
    const configPath = path.join(cwd, configFile);
    if (fs.existsSync(configPath)) {
      try {
        // Note: In production, we'd dynamically import this
        // For now, return path for the runner to handle
        return configPath;
      } catch (error) {
        console.warn(`Failed to load ESLint config from ${configPath}:`, error);
      }
    }
  }
  
  // Try legacy config
  const legacyConfigPath = path.join(cwd, '.eslintrc.json');
  if (fs.existsSync(legacyConfigPath)) {
    return JSON.parse(fs.readFileSync(legacyConfigPath, 'utf-8'));
  }
  
  return null;
}