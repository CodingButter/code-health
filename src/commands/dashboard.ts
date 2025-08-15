const ora = require('ora');
const open = require('open');
import { Config } from '../core/config.js';
import { startDashboardServer } from '../server/dashboard.js';

export async function dashboardCommand(config: Config, watch: boolean): Promise<void> {
  const spinner = ora('Initializing dashboard...').start();
  
  try {
    spinner.text = 'Starting dashboard server...';
    
    // Start the dashboard server (it handles analysis internally)
    const server = await startDashboardServer(config);
    
    spinner.succeed('Dashboard server started!');
    
    // Show the actual port being used (might be different if original was in use)
    const actualPort = (server as any).actualPort || config.port;
    console.log(`\n🚀 Dashboard running at http://localhost:${actualPort}`);
    console.log('📊 Analysis will run automatically and update in real-time');
    
    if (actualPort !== config.port) {
      console.log(`ℹ️  Note: Using port ${actualPort} instead of ${config.port} (port was in use)`);
    }
    
    // Open browser if requested - use actual port
    if (config.open) {
      await open(`http://localhost:${actualPort}`);
    }
    
    // Keep process alive and handle graceful shutdown
    process.on('SIGINT', async () => {
      console.log('\n\n🛑 Shutting down dashboard server...');
      if (server.cleanup) {
        await server.cleanup();
      } else {
        await server.close();
      }
      console.log('✅ Dashboard stopped');
      process.exit(0);
    });
    
    process.on('SIGTERM', async () => {
      console.log('\n\n🛑 Shutting down dashboard server...');
      if (server.cleanup) {
        await server.cleanup();
      } else {
        await server.close();
      }
      console.log('✅ Dashboard stopped');
      process.exit(0);
    });
    
  } catch (error) {
    spinner.fail('Dashboard initialization failed');
    console.error(error);
    process.exit(1);
  }
}