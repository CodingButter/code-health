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

export async function createServer(options: ServerOptions) {
  const fastify = Fastify({
    logger: false // Set to true for debugging
  });
  
  // Register plugins
  await fastify.register(fastifyCors, {
    origin: true
  });
  
  await fastify.register(fastifyWebsocket);
  
  console.log('Setting up API routes...');
  
  // API endpoint for stats
  fastify.get('/api/stats', async (request, reply) => {
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
  
  // API endpoint for detailed file analysis
  interface FileDetailQuery {
    file: string;
  }
  
  fastify.get('/api/file-detail', async (request, reply) => {
    try {
      console.log('File detail API called with query:', request.query);
      const file = (request.query as any)?.file;
      
      if (!file) {
        console.log('No file parameter provided');
        return reply.code(400).send({
          error: 'File parameter is required'
        });
      }
      
      console.log('Looking for file:', file);
      
      // Read all reports for detailed analysis
      const aggregatedStats = readReport(options.reportsDir, 'aggregated') as AggregatedStats;
      const eslintReport = readReport(options.reportsDir, 'eslint') as ESLintReport;
      const depCruiseReport = readReport(options.reportsDir, 'depcruise') as DepCruiseReport;
      
      console.log('Reports loaded:', {
        aggregated: !!aggregatedStats,
        eslint: !!eslintReport,
        depcruise: !!depCruiseReport
      });
      
      if (!aggregatedStats?.largestFiles) {
        console.log('No aggregated stats or largest files found');
        return reply.code(500).send({
          error: 'No analysis data available'
        });
      }
      
      console.log('Available files:', aggregatedStats.largestFiles.slice(0, 3).map(f => f.file));
      
      // Find file metrics (handle both relative and absolute paths)
      const fileMetrics = aggregatedStats.largestFiles.find(f => 
        f.file === file || f.file.endsWith(file) || file.endsWith(f.file)
      );
      
      if (!fileMetrics) {
        console.log('File not found in analysis');
        return reply.code(404).send({
          error: 'File not found in analysis',
          searchedFor: file,
          availableFiles: aggregatedStats.largestFiles.slice(0, 5).map(f => f.file)
        });
      }
      
      // Get detailed ESLint issues for this file
      const eslintIssues = eslintReport?.results
        ?.find(r => r.filePath.endsWith(file) || file.endsWith(r.filePath.split('/').slice(-3).join('/')))
        ?.messages || [];
      
      // Get dependency information
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
      
      // Get complexity and dead code info  
      const complexityIssues = aggregatedStats.complexFunctions.filter(f => 
        f.file === file || f.file.endsWith(file) || file.endsWith(f.file)
      );
      const lineViolations = aggregatedStats.maxLineOffenders.filter(f => 
        f.file === file || f.file.endsWith(file) || file.endsWith(f.file) 
      );
      const deadCodeIssues = aggregatedStats.deadCode.filter(f => 
        f.file === file || f.file.endsWith(file) || file.endsWith(f.file)
      );
      
      return {
        metrics: fileMetrics,
        eslintIssues,
        dependencies,
        dependents,
        complexityIssues,
        lineViolations,
        deadCodeIssues,
        summary: {
          totalIssues: eslintIssues.length + complexityIssues.length + lineViolations.length + deadCodeIssues.length,
          hasCircularDeps: dependencies.some(d => d.circular),
          isDeadCode: deadCodeIssues.length > 0
        }
      };
    } catch (error) {
      console.error('Error reading file details:', error);
      return reply.code(500).send({
        error: 'Failed to read file analysis data'
      });
    }
  });
  
  // Health check endpoint
  fastify.get('/healthz', async (request, reply) => {
    return { status: 'ok', timestamp: new Date().toISOString() };
  });
  
  // Test endpoint
  fastify.get('/api/test', async (request, reply) => {
    console.log('Test endpoint hit!');
    return { message: 'API is working', query: request.query };
  });
  
  // WebSocket for live updates
  fastify.register(async function (fastify) {
    fastify.get('/ws', { websocket: true }, (connection, req) => {
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
    });
  });
  
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
  
  return fastify;
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