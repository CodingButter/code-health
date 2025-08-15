/**
 * Logger utility that outputs to the correct stream based on context
 * For MCP servers, all output must go to stderr to avoid interfering with JSON-RPC
 */

const isMcpServer = process.argv.some(arg => arg.includes('code-health-mcp'));

export const logger = {
  log: (message: string) => {
    if (isMcpServer) {
      console.error(message);
    } else {
      console.log(message);
    }
  },
  
  error: (message: string, error?: any) => {
    console.error(message, error || '');
  },
  
  warn: (message: string) => {
    console.error(message);
  }
};