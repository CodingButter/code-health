#!/usr/bin/env node

// Import and run the MCP server - we need to wait for the main function
import('../dist/server.js').then((module) => {
  // The server should auto-start when imported due to the 
  // if (import.meta.url === `file://${process.argv[1]}`) check
  // But in case it doesn't, we'll start it manually
  if (module.main && typeof module.main === 'function') {
    module.main().catch((error) => {
      console.error('Failed to start MCP server:', error);
      process.exit(1);
    });
  }
}).catch((error) => {
  console.error('Failed to load MCP server module:', error);
  process.exit(1);
});