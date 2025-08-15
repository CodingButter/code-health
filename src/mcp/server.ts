#!/usr/bin/env node
import { Server } from '@modelcontextprotocol/sdk/server/index.js';
import { StdioServerTransport } from '@modelcontextprotocol/sdk/server/stdio.js';
import {
  CallToolRequestSchema,
  ListToolsRequestSchema,
} from '@modelcontextprotocol/sdk/types.js';
import { tools } from './tools.js';
import {
  handleAnalyze,
  handleSummary,
  handleDashboard,
  handleStopDashboard,
  cleanupDashboard,
  getDefaultPort
} from './handlers.js';

// Create the server instance
const server = new Server(
  {
    name: '@butter/code-health',
    version: '1.0.0',
  },
  {
    capabilities: {
      tools: {},
    },
  }
);

// Set up tool list handler
server.setRequestHandler(ListToolsRequestSchema, async () => {
  return { tools };
});

// Set up tool call handler
server.setRequestHandler(CallToolRequestSchema, async (request) => {
  const { name, arguments: args } = request.params;

  try {
    switch (name) {
      case 'code_health_analyze':
        return await handleAnalyze(args);

      case 'code_health_summary':
        return await handleSummary(args);

      case 'code_health_dashboard':
        return await handleDashboard(args);

      case 'code_health_stop_dashboard':
        return await handleStopDashboard();

      default:
        throw new Error(`Unknown tool: ${name}`);
    }
  } catch (error) {
    const errorMessage = error instanceof Error ? error.message : 'Unknown error';
    console.error(`Error in tool ${name}:`, error);
    
    return {
      content: [
        {
          type: 'text',
          text: `❌ Error running ${name}: ${errorMessage}`,
        },
      ],
      isError: true,
    };
  }
});

// Handle cleanup on process exit
process.on('SIGINT', async () => {
  await cleanupDashboard();
  process.exit(0);
});

process.on('SIGTERM', async () => {
  await cleanupDashboard();
  process.exit(0);
});

async function main() {
  const transport = new StdioServerTransport();
  await server.connect(transport);
  console.error('🔌 MCP Code Health server started');
  
  // Auto-start dashboard if requested via environment variable or command line
  if (process.env.CODE_HEALTH_AUTO_START === 'true' || process.argv.includes('--auto-start')) {
    console.error('🚀 Auto-starting dashboard server...');
    try {
      await handleDashboard({});
      console.error(`📊 Dashboard auto-started at http://localhost:${getDefaultPort()}`);
    } catch (error) {
      console.error('❌ Failed to auto-start dashboard:', error);
    }
  }
}

// Run the server if this is the main module
if (import.meta.url === `file://${process.argv[1]}`) {
  main().catch((error) => {
    console.error('❌ Server error:', error);
    process.exit(1);
  });
}

export { server, main };