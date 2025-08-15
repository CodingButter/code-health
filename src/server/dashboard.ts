import Fastify from 'fastify';
import fastifyStatic from '@fastify/static';
import fastifyCors from '@fastify/cors';
import fastifyWebsocket from '@fastify/websocket';
import path from 'path';
import { fileURLToPath } from 'url';
import { Config } from '../core/config.js';
import { runAnalysis } from '../core/aggregate.js';
import { watchForChanges } from '../core/watch.js';

// Handle both ESM and CJS environments
let __dirname: string = process.cwd();
try {
  if (typeof import.meta !== 'undefined' && import.meta.url) {
    const __filename = fileURLToPath(import.meta.url);
    __dirname = path.dirname(__filename);
  } else {
    // Fallback - when bundled with CJS, __dirname is not available
    // The compiled file is in dist/index.cjs, so we need to resolve from there
    // Use require.main.filename as a reference point if available
    const mainPath = typeof require !== 'undefined' && require.main?.filename;
    if (mainPath) {
      __dirname = path.dirname(mainPath);
    } else {
      // Last resort - assume we're running from the project root
      __dirname = path.join(process.cwd(), 'dist');
    }
  }
} catch {
  // Final fallback - look for dist relative to node_modules/@butter/code-health
  // This handles the globally installed case
  const pkgPath = path.resolve(process.cwd(), '..');
  __dirname = path.join(pkgPath, 'dist');
}

async function findUIPath(): Promise<string> {
  const fs = await import('fs');
  const possiblePaths = [
    path.join(path.dirname(require.main?.filename || ''), '../dist/ui'),
    path.resolve(process.cwd(), 'dist/ui'),
    path.resolve(__dirname, '../ui'),
    path.resolve(__dirname, '../../dist/ui'),
    path.resolve(__dirname, 'ui'),
  ];
  
  for (const testPath of possiblePaths) {
    if (fs.existsSync(testPath)) {
      return testPath;
    }
  }
  
  console.error(`❌ Could not find UI build. Tried paths:`);
  possiblePaths.forEach(p => console.error(`  - ${p}`));
  throw new Error(`UI build not found. Run 'npm run build:ui' first.`);
}

async function setupStaticFiles(fastify: any, uiPath: string) {
  console.error(`📁 Serving UI from: ${uiPath}`);
  
  await fastify.register(fastifyStatic, {
    root: uiPath,
    prefix: '/',
    index: 'index.html',
    list: false
  });

  fastify.setNotFoundHandler(async (request: any, reply: any) => {
    if (request.raw.url?.startsWith('/api/') || request.raw.url?.startsWith('/ws')) {
      reply.code(404).send({ error: 'Not found' });
      return;
    }
    reply.sendFile('index.html');
  });
}

async function startServerWithRetry(fastify: any, config: Config): Promise<number> {
  let actualPort = config.port;
  let retries = 0;
  const maxRetries = 10;
  
  while (retries < maxRetries) {
    try {
      await fastify.listen({ port: actualPort, host: '0.0.0.0' });
      console.error(`🚀 Dashboard server running at http://localhost:${actualPort}`);
      
      if (actualPort !== config.port) {
        console.error(`ℹ️  Port ${config.port} was in use, using port ${actualPort} instead`);
      }
      return actualPort;
    } catch (error: any) {
      if (error.code === 'EADDRINUSE') {
        retries++;
        actualPort++;
        console.error(`⚠️  Port ${actualPort - 1} is in use, trying port ${actualPort}...`);
      } else {
        throw error;
      }
    }
  }
  
  throw new Error(`Could not find an available port after trying ${maxRetries} ports starting from ${config.port}`);
}

function createUpdateAnalysis(fastify: any, config: Config, latestResults: { current: any }) {
  return async () => {
    try {
      console.error('🔄 Running analysis...');
      const results = await runAnalysis(config);
      latestResults.current = results;
      console.error('✅ Analysis complete');
      
      for (const socket of fastify.websocketServer.clients) {
        if (socket.readyState === 1) {
          socket.send(JSON.stringify({ type: 'analysis_update', data: results }));
        }
      }
      
      return results;
    } catch (error) {
      console.error('❌ Analysis failed:', error);
      throw error;
    }
  };
}

async function setupDashboardServer(config: Config) {
  const fastify = Fastify({ logger: false });

  await fastify.register(fastifyCors, { origin: true });
  await fastify.register(fastifyWebsocket);

  const latestResults = { current: null as any };
  let analysisPromise: Promise<any> | null = null;

  const updateAnalysis = createUpdateAnalysis(fastify, config, latestResults);
  analysisPromise = updateAnalysis();

  const watcher = watchForChanges(config, async () => {
    console.error('📁 Files changed, updating analysis...');
    analysisPromise = updateAnalysis();
  });

  return { fastify, latestResults, analysisPromise, watcher, updateAnalysis };
}

export async function startDashboardServer(config: Config) {
  const { fastify, latestResults, analysisPromise, watcher } = await setupDashboardServer(config);
  
  setupStatsApi(fastify, latestResults, analysisPromise);
  setupFileDetailApi(fastify, latestResults, analysisPromise);
  setupWebSocketApi(fastify, latestResults);
  
  return await finalizeDashboardServer(fastify, config, watcher);
}

function setupStatsApi(fastify: any, latestResults: any, analysisPromise: any) {
  fastify.get('/api/stats', async (request: any, reply: any) => {
    try {
      if (analysisPromise) {
        await analysisPromise;
        analysisPromise = null;
      }
      
      if (!latestResults.current) {
        reply.code(503).send({ error: 'Analysis not ready yet' });
        return;
      }

      reply.send(latestResults.current);
    } catch (error) {
      console.error('API error:', error);
      reply.code(500).send({ error: 'Analysis failed' });
    }
  });
}

function setupFileDetailApi(fastify: any, latestResults: any, analysisPromise: any) {
  // File detail API endpoint
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
      
      console.log('Looking for file:', file);
      
      if (analysisPromise) {
        await analysisPromise;
        analysisPromise = null;
      }
      
      if (!latestResults.current) {
        return reply.code(503).send({ error: 'Analysis not ready yet' });
      }

      const aggregatedStats = latestResults.current;
      console.log('Available files:', aggregatedStats?.largestFiles?.slice(0, 3).map((f: any) => f.file));
      
      // Find file metrics (handle both relative and absolute paths)
      const fileMetrics = aggregatedStats?.largestFiles?.find((f: any) => 
        f.file === file || f.file.endsWith(file) || file.endsWith(f.file)
      );
      
      if (!fileMetrics) {
        console.log('File not found in analysis');
        return reply.code(404).send({
          error: 'File not found in analysis',
          searchedFor: file,
          availableFiles: aggregatedStats?.largestFiles?.slice(0, 5).map((f: any) => f.file)
        });
      }

      // Return basic file metrics for now
      return reply.send({
        metrics: fileMetrics,
        eslintIssues: [],
        dependencies: [],
        dependents: [],
        complexityIssues: aggregatedStats.complexFunctions?.filter((f: any) => 
          f.file === file || f.file.endsWith(file) || file.endsWith(f.file)
        ) || [],
        lineViolations: aggregatedStats.maxLineOffenders?.filter((f: any) => 
          f.file === file || f.file.endsWith(file) || file.endsWith(f.file)
        ) || [],
        deadCodeIssues: aggregatedStats.deadCode?.filter((f: any) => 
          f.file === file || f.file.endsWith(file) || file.endsWith(f.file)
        ) || [],
        summary: {
          totalIssues: 0,
          hasCircularDeps: false,
          isDeadCode: false
        }
      });
    } catch (error) {
      console.error('Error reading file details:', error);
      return reply.code(500).send({
        error: 'Failed to read file analysis data'
      });
    }
  });
}

function setupWebSocketApi(fastify: any, latestResults: any) {
  fastify.register(async function (fastify: any) {
    fastify.get('/ws', { websocket: true }, (connection: any, req: any) => {
      console.error('🔌 WebSocket client connected');
      
      if (latestResults.current) {
        connection.socket.send(JSON.stringify({ 
          type: 'analysis_update', 
          data: latestResults.current 
        }));
      }

      connection.socket.on('close', () => {
        console.error('🔌 WebSocket client disconnected');
      });
    });
  });
}

async function finalizeDashboardServer(fastify: any, config: Config, watcher: any) {
  const uiPath = await findUIPath();
  await setupStaticFiles(fastify, uiPath);
  const actualPort = await startServerWithRetry(fastify, config)
  
  const enhancedFastify = fastify as typeof fastify & {
    cleanup?: () => Promise<void>;
    actualPort?: number;
  };
  
  enhancedFastify.actualPort = actualPort;
  enhancedFastify.cleanup = async () => {
    console.error('🛑 Cleaning up dashboard server...');
    if (watcher) {
      await watcher.close();
    }
    await fastify.close();
  };
  
  return enhancedFastify;
}