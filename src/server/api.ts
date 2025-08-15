import Fastify from 'fastify';
import fastifyStatic from '@fastify/static';
import fastifyWebsocket from '@fastify/websocket';
import fastifyCors from '@fastify/cors';
import * as path from 'path';
import * as fs from 'fs';
import { readReport } from '../core/paths.js';
import { AggregatedStats } from '../core/aggregate.js';
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
  
  // Serve static UI files
  // For CJS compatibility, we'll use process.cwd() instead of __dirname
  const uiPath = path.join(process.cwd(), 'dist/ui');
  const fallbackUiPath = path.join(path.dirname(require.main?.filename || ''), '../dist/ui');
  
  const finalUiPath = fs.existsSync(uiPath) ? uiPath : fallbackUiPath;
  
  if (fs.existsSync(finalUiPath)) {
    await fastify.register(fastifyStatic, {
      root: finalUiPath,
      prefix: '/'
    });
  }
  
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
  
  // Health check endpoint
  fastify.get('/healthz', async (request, reply) => {
    return { status: 'ok', timestamp: new Date().toISOString() };
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
      
      connection.socket.on('message', (message) => {
        // Handle ping/pong for keepalive
        if (message.toString() === 'ping') {
          connection.socket.send('pong');
        }
      });
    });
  });
  
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