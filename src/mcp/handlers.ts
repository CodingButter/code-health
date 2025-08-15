import { Config } from '../core/config.js';
import { runAnalysis } from '../core/aggregate.js';
import { startDashboardServer } from '../server/dashboard.js';
import { formatAnalysisResults } from './formatters.js';

// Global dashboard server reference
let dashboardServer: any = null;

// Get default port from environment or command-line args
export function getDefaultPort(): number {
  // Check environment variable first
  if (process.env.CODE_HEALTH_PORT) {
    return parseInt(process.env.CODE_HEALTH_PORT, 10);
  }
  
  // Check if --port was passed in process.argv
  const portArgIndex = process.argv.findIndex(arg => arg.startsWith('--port'));
  if (portArgIndex !== -1) {
    const portArg = process.argv[portArgIndex];
    if (portArg.includes('=')) {
      return parseInt(portArg.split('=')[1], 10);
    } else if (process.argv[portArgIndex + 1]) {
      return parseInt(process.argv[portArgIndex + 1], 10);
    }
  }
  
  return 43110; // Default port
}

/**
 * Create config from tool arguments
 */
export function createConfigFromArgs(args: any): Config {
  return {
    cwd: args.cwd || process.cwd(),
    include: args.include ? args.include.split(',').map((p: string) => p.trim()) : [],
    exclude: args.exclude ? args.exclude.split(',').map((p: string) => p.trim()) : [],
    ignoreGitignore: false,
    maxLines: args.maxLines || 400,
    maxLinesPerFunction: args.maxLinesPerFunction || 80,
    complexityThreshold: args.complexityThreshold || 15,
    port: args.port || getDefaultPort(),
    format: args.format || 'text',
    open: false,
  };
}

/**
 * Handle analyze tool request
 */
export async function handleAnalyze(args: any) {
  const config = createConfigFromArgs(args || {});
  console.error(`🔍 Running analysis on ${config.cwd}...`);
  
  const results = await runAnalysis(config);
  const output = formatAnalysisResults(results, 'text');
  
  return {
    content: [
      {
        type: 'text',
        text: output,
      },
    ],
  };
}

/**
 * Handle summary tool request
 */
export async function handleSummary(args: any) {
  const config = createConfigFromArgs(args || {});
  console.error(`📊 Getting summary for ${config.cwd}...`);
  
  const results = await runAnalysis(config);
  const format = (args?.format as 'text' | 'json') || 'text';
  const output = formatAnalysisResults(results, format);
  
  return {
    content: [
      {
        type: 'text',
        text: output,
      },
    ],
  };
}

/**
 * Handle dashboard tool request
 */
export async function handleDashboard(args: any) {
  const config = createConfigFromArgs(args || {});
  const dashboardPort = config.port;
  
  console.error(`🚀 Starting dashboard server on port ${dashboardPort}...`);
  
  try {
    // Stop existing server if running
    if (dashboardServer) {
      await dashboardServer.close();
    }
    
    // Start new dashboard server
    dashboardServer = await startDashboardServer(config);
    
    return {
      content: [
        {
          type: 'text',
          text: `✅ Dashboard server started successfully!\n\n📊 Access your code health dashboard at:\n   http://localhost:${dashboardPort}\n\n🔄 The dashboard will automatically refresh as you make changes to your code.`,
        },
      ],
    };
  } catch (error) {
    const errorMessage = error instanceof Error ? error.message : 'Unknown error';
    return {
      content: [
        {
          type: 'text',
          text: `❌ Failed to start dashboard server: ${errorMessage}`,
        },
      ],
    };
  }
}

/**
 * Handle stop dashboard tool request
 */
export async function handleStopDashboard() {
  if (dashboardServer) {
    try {
      await dashboardServer.close();
      dashboardServer = null;
      
      return {
        content: [
          {
            type: 'text',
            text: '✅ Dashboard server stopped successfully.',
          },
        ],
      };
    } catch (error) {
      const errorMessage = error instanceof Error ? error.message : 'Unknown error';
      return {
        content: [
          {
            type: 'text',
            text: `❌ Failed to stop dashboard server: ${errorMessage}`,
          },
        ],
      };
    }
  } else {
    return {
      content: [
        {
          type: 'text',
          text: '⚠️ No dashboard server is currently running.',
        },
      ],
    };
  }
}

/**
 * Get dashboard server instance
 */
export function getDashboardServer() {
  return dashboardServer;
}

/**
 * Cleanup dashboard server
 */
export async function cleanupDashboard() {
  if (dashboardServer) {
    console.error('\n🛑 Shutting down dashboard server...');
    await dashboardServer.close();
    dashboardServer = null;
  }
}