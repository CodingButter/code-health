import Fastify from 'fastify';
import fastifyStatic from '@fastify/static';
import fastifyWebsocket from '@fastify/websocket';
import fastifyCors from '@fastify/cors';
import * as path from 'path';
import * as fs from 'fs';
import { readReport } from '../core/paths.js';
import { AggregatedStats, FileMetrics } from '../core/aggregate.js';
import { ESLintReport } from '../core/runners/eslint.js';
import { DepCruiseReport } from '../core/runners/depcruise.js';
import { WatchManager } from '../core/watch.js';

export interface ServerOptions {
  port: number;
  reportsDir: string;
  watchManager?: WatchManager;
}

async function setupFastifyServer() {
  const fastify = Fastify({
    logger: false // Set to true for debugging
  });
  
  // Register plugins
  await fastify.register(fastifyCors, {
    origin: true
  });
  
  await fastify.register(fastifyWebsocket);
  
  return fastify;
}

function setupStatsRoute(fastify: any, options: ServerOptions) {
  fastify.get('/api/stats', async (request: any, reply: any) => {
    try {
      const aggregatedStats = readReport(options.reportsDir, 'aggregated') as AggregatedStats;
      
      if (!aggregatedStats) {
        return reply.code(404).send({
          error: 'No analysis data available. Run analysis first.'
        });
      }
      
      return aggregatedStats;
    } catch (error) {
      console.error('Error reading stats:', error);
      return reply.code(500).send({
        error: 'Failed to read analysis data'
      });
    }
  });
}

interface FileDetailQuery {
  file: string;
}

export async function createServer(options: ServerOptions) {
  const fastify = await setupFastifyServer();
  
  console.log('Setting up API routes...');
  
  setupStatsRoute(fastify, options);
  setupFileDetailRoute(fastify, options);
  setupHealthRoutes(fastify);
  setupWebSocketRoute(fastify, options);
  setupStaticFiles(fastify);
  
  return fastify;
}

function setupFileDetailRoute(fastify: any, options: ServerOptions) {
  fastify.get('/api/file-detail', async (request: any, reply: any) => {
    try {
      console.log('File detail API called with query:', request.query);
      const file = (request.query as any)?.file;
      
      if (!file) {
        console.log('No file parameter provided');
        return reply.code(400).send({
          error: 'File parameter is required'
        });
      }
      
      const fileDetail = await getFileDetailData(file, options.reportsDir);
      return fileDetail;
    } catch (error) {
      console.error('Error reading file details:', error);
      return reply.code(500).send({
        error: 'Failed to read file analysis data'
      });
    }
  });
}

async function getFileDetailData(file: string, reportsDir: string) {
  console.log('Looking for file:', file);
  
  // Read all reports for detailed analysis
  const aggregatedStats = readReport(reportsDir, 'aggregated') as AggregatedStats;
  const eslintReport = readReport(reportsDir, 'eslint') as ESLintReport;
  const depCruiseReport = readReport(reportsDir, 'depcruise') as DepCruiseReport;
  
  console.log('Reports loaded:', {
    aggregated: !!aggregatedStats,
    eslint: !!eslintReport,
    depcruise: !!depCruiseReport
  });
  
  if (!aggregatedStats?.largestFiles) {
    console.log('No aggregated stats or largest files found');
    throw new Error('No analysis data available');
  }
  
  console.log('Available files:', aggregatedStats.largestFiles.slice(0, 3).map(f => f.file));
  
  // Find file metrics (handle both relative and absolute paths)
  const fileMetrics = aggregatedStats.largestFiles.find(f => 
    f.file === file || f.file.endsWith(file) || file.endsWith(f.file)
  );
  
  if (!fileMetrics) {
    console.log('File not found in analysis');
    throw new Error('File not found in analysis');
  }
  
  // Get detailed analysis data
  const eslintIssues = getEslintIssuesForFile(eslintReport, file);
  const { dependencies, dependents } = getDependencyInfoForFile(depCruiseReport, file);
  const issues = getIssuesForFile(aggregatedStats, file);
  
  return {
    metrics: fileMetrics,
    eslintIssues,
    dependencies,
    dependents,
    ...issues,
    summary: {
      totalIssues: eslintIssues.length + issues.complexityIssues.length + issues.lineViolations.length + issues.deadCodeIssues.length,
      hasCircularDeps: dependencies.some(d => d.circular),
      isDeadCode: issues.deadCodeIssues.length > 0
    }
  };
}

function getEslintIssuesForFile(eslintReport: ESLintReport | null, file: string) {
  return eslintReport?.results
    ?.find(r => r.filePath.endsWith(file) || file.endsWith(r.filePath.split('/').slice(-3).join('/')))
    ?.messages || [];
}

function getDependencyInfoForFile(depCruiseReport: DepCruiseReport | null, file: string) {
  const moduleInfo = depCruiseReport?.modules?.find(m => 
    m.source.endsWith(file) || file.endsWith(m.source.split('/').slice(-3).join('/'))
  );
  
  const dependencies = moduleInfo?.dependencies?.map(d => ({
    module: d.resolved,
    circular: d.circular || false,
    valid: true // Dependencies are valid by default
  })) || [];
  
  // Find modules that depend on this file
  const dependents = depCruiseReport?.modules
    ?.filter(m => m.dependencies?.some(d => d.resolved.endsWith(file)))
    ?.map(m => m.source) || [];
    
  return { dependencies, dependents };
}

function getIssuesForFile(aggregatedStats: AggregatedStats, file: string) {
  const complexityIssues = aggregatedStats.complexFunctions.filter(f => 
    f.file === file || f.file.endsWith(file) || file.endsWith(f.file)
  );
  const lineViolations = aggregatedStats.maxLineOffenders.filter(f => 
    f.file === file || f.file.endsWith(file) || file.endsWith(f.file) 
  );
  const deadCodeIssues = aggregatedStats.deadCode.filter(f => 
    f.file === file || f.file.endsWith(file) || file.endsWith(f.file)
  );
  
  return { complexityIssues, lineViolations, deadCodeIssues };
}

function setupHealthRoutes(fastify: any) {
  // Health check endpoint
  fastify.get('/healthz', async (request: any, reply: any) => {
    return { status: 'ok', timestamp: new Date().toISOString() };
  });
  
  // Test endpoint
  fastify.get('/api/test', async (request: any, reply: any) => {
    console.log('Test endpoint hit!');
    return { message: 'API is working', query: request.query };
  });
}

function handleWebSocketConnection(connection: any, options: ServerOptions) {
  console.log('WebSocket client connected');
  
  // If we have a watch manager, listen for updates
  if (options.watchManager) {
    const handleUpdate = (stats: AggregatedStats) => {
      connection.socket.send(JSON.stringify({
        type: 'update',
        data: stats
      }));
    };
    
    options.watchManager.on('analysis:complete', handleUpdate);
    
    connection.socket.on('close', () => {
      console.log('WebSocket client disconnected');
      if (options.watchManager) {
        options.watchManager.removeListener('analysis:complete', handleUpdate);
      }
    });
  }
  
  connection.socket.on('message', (message: any) => {
    // Handle ping/pong for keepalive
    if (message.toString() === 'ping') {
      connection.socket.send('pong');
    }
  });
}

function setupWebSocketRoute(fastify: any, options: ServerOptions) {
  // WebSocket for live updates
  fastify.register(async function (fastify: any) {
    fastify.get('/ws', { websocket: true }, (connection: any, req: any) => {
      handleWebSocketConnection(connection, options);
    });
  });
}

function setupStaticFiles(fastify: any) {
  // Serve static UI files AFTER API routes to avoid conflicts
  // For CJS compatibility, we'll use process.cwd() instead of __dirname
  const uiPath = path.join(process.cwd(), 'dist/ui');
  const fallbackUiPath = path.join(path.dirname(require.main?.filename || ''), '../dist/ui');
  
  const finalUiPath = fs.existsSync(uiPath) ? uiPath : fallbackUiPath;
  
  console.log('Static files setup:', { finalUiPath, exists: fs.existsSync(finalUiPath) });
  
  // Temporarily disable static files to test API
  /*
  if (fs.existsSync(finalUiPath)) {
    await fastify.register(fastifyStatic, {
      root: finalUiPath,
      prefix: '/',
      prefixAvoidTrailingSlash: true
    });
  }
  */
}

export async function startServer(options: ServerOptions): Promise<void> {
  const server = await createServer(options);
  
  try {
    await server.listen({ port: options.port, host: '0.0.0.0' });
    console.log(`Dashboard server running at http://localhost:${options.port}`);
  } catch (error) {
    console.error('Failed to start server:', error);
    process.exit(1);
  }
}