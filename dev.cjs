// dev.cjs
const { spawn } = require('child_process');
const path = require('path');

console.log('🚀 Starting Rio Restro POS fullstack services...');

// Spawn Express backend (runs on port 3101) using direct Node invocation
const backend = spawn('node', [
  path.join(__dirname, 'backend', 'node_modules', 'tsx', 'dist', 'cli.mjs'),
  'server.ts'
], {
  cwd: path.join(__dirname, 'backend'),
  stdio: 'inherit',
  shell: false
});

// Spawn Vite frontend (runs on port 3000) using direct Node invocation
const frontend = spawn('node', [
  path.join(__dirname, 'frontend', 'node_modules', 'vite', 'bin', 'vite.js'),
  '--port', '3000',
  '--host', '0.0.0.0'
], {
  cwd: path.join(__dirname, 'frontend'),
  stdio: 'inherit',
  shell: false
});

// Clean cleanup on exit
const cleanup = () => {
  console.log('\n🛑 Stopping fullstack services...');
  try {
    backend.kill();
  } catch (e) {}
  try {
    frontend.kill();
  } catch (e) {}
  process.exit();
};

process.on('SIGINT', cleanup);
process.on('SIGTERM', cleanup);
process.on('exit', cleanup);
