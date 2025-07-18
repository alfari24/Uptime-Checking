/**
 * Script to start both the Next.js frontend and the monitoring server
 */
const { spawn } = require('child_process');
const path = require('path');
const fs = require('fs');

// Load environment variables from .env file
try {
  require('dotenv').config();
} catch (error) {
  console.warn('Could not load dotenv, using default environment variables');
}

// Define the ports
const PORT = process.env.PORT || 17069;
const API_PORT = process.env.API_PORT || 3001;
process.env.PORT = PORT;
process.env.API_PORT = API_PORT;

// Set the API URL for Next.js to use in server-side rendering
process.env.NEXT_PUBLIC_API_URL = `http://localhost:${API_PORT}`;

console.log(`Using frontend port: ${PORT}, API port: ${API_PORT}`);
console.log(`API URL: ${process.env.NEXT_PUBLIC_API_URL}`);

// Update server config to use API_PORT
const configPath = path.join(__dirname, 'server', 'status-config.yaml');
try {
  let config = fs.readFileSync(configPath, 'utf8');
  // Replace port in config with API_PORT
  config = config.replace(/port: \d+/, `port: ${API_PORT}`);
  fs.writeFileSync(configPath, config);
  console.log(`Updated server config to use port ${API_PORT}`);
} catch (error) {
  console.error('Failed to update server config:', error);
}

// Check if the server build exists, if not build it
const serverDistPath = path.join(__dirname, 'server', 'dist');
if (!fs.existsSync(path.join(serverDistPath, 'main.js'))) {
  console.log('Server build not found, building server...');
  require('child_process').execSync('cd server && npm install && npm run build', {
    stdio: 'inherit'
  });
}

// Start the backend server
console.log('Starting monitoring server...');
const server = spawn('node', [path.join(__dirname, 'server', 'dist', 'main.js')], {
  stdio: 'inherit',
  env: { ...process.env },
  shell: true
});

// Handle server errors
server.on('error', (error) => {
  console.error('Server error:', error);
});

// Log server exit
server.on('exit', (code) => {
  console.log(`Server exited with code ${code}`);
});

// Give the server a moment to start before starting the frontend
setTimeout(() => {
  // Start the frontend
  console.log(`Starting Next.js frontend on port ${PORT}...`);
  
  // Use the full path to npm on Windows systems
  const isWindows = process.platform === 'win32';
  const npmCmd = isWindows ? 'npm.cmd' : 'npm';
  // Start the frontend directly using next start with explicit port
  const frontend = spawn('npx', ['next', 'start', '-p', PORT.toString()], {
    stdio: 'inherit',
    env: { ...process.env },
    shell: true
  });
  
  // Handle frontend errors
  frontend.on('error', (error) => {
    console.error('Frontend error:', error);
  });
  
  // Log frontend exit
  frontend.on('exit', (code) => {
    console.log(`Frontend exited with code ${code}`);
    // If the frontend exits, we should also stop the server
    server.kill();
    process.exit(code || 0);
  });
  
  // Handle process termination
  process.on('SIGINT', () => {
    console.log('Shutting down...');
    server.kill();
    frontend.kill();
    process.exit(0);
  });
  
}, 3000); // Wait 3 seconds to ensure the server has started