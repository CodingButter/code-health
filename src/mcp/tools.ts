import { Tool } from '@modelcontextprotocol/sdk/types.js';

export const tools: Tool[] = [
  {
    name: 'code_health_analyze',
    description: 'Run comprehensive code health analysis on a project',
    inputSchema: {
      type: 'object',
      properties: {
        cwd: {
          type: 'string',
          description: 'Working directory to analyze (defaults to current directory)',
        },
        include: {
          type: 'string',
          description: 'Comma-separated glob patterns to include',
        },
        exclude: {
          type: 'string',
          description: 'Comma-separated glob patterns to exclude',
        },
        maxLines: {
          type: 'number',
          description: 'Maximum lines threshold for files (default: 400)',
        },
        maxLinesPerFunction: {
          type: 'number',
          description: 'Maximum lines per function threshold (default: 80)',
        },
        complexityThreshold: {
          type: 'number',
          description: 'Cognitive complexity threshold (default: 15)',
        },
      },
    },
  },
  {
    name: 'code_health_dashboard',
    description: 'Start the code health dashboard server with browser UI',
    inputSchema: {
      type: 'object',
      properties: {
        cwd: {
          type: 'string',
          description: 'Working directory to analyze (defaults to current directory)',
        },
        port: {
          type: 'number',
          description: 'Port for dashboard server (default: 43110)',
        },
        include: {
          type: 'string',
          description: 'Comma-separated glob patterns to include',
        },
        exclude: {
          type: 'string',
          description: 'Comma-separated glob patterns to exclude',
        },
      },
    },
  },
  {
    name: 'code_health_stop_dashboard',
    description: 'Stop the running dashboard server',
    inputSchema: {
      type: 'object',
      properties: {},
    },
  },
  {
    name: 'code_health_summary',
    description: 'Get a quick summary of code health metrics',
    inputSchema: {
      type: 'object',
      properties: {
        cwd: {
          type: 'string',
          description: 'Working directory to analyze (defaults to current directory)',
        },
        format: {
          type: 'string',
          enum: ['text', 'json'],
          description: 'Output format (default: text)',
        },
      },
    },
  },
];