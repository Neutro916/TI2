#!/usr/bin/env node

const http = require('http');

const args = process.argv.slice(2);
const command = args[0];
const payload = args.slice(1).join(' ');

if (!command) {
  console.log('Usage: ti [open|navigate|theme|alert] [payload]');
  console.log('Commands:');
  console.log('  open [filename]    - Open a file in the editor');
  console.log('  navigate [page]    - Switch to a page (editor, shell, host, aider, config)');
  console.log('  theme [color]      - Set the primary accent color');
  console.log('  alert [message]    - Show a system notification in the app');
  process.exit(1);
}

const data = JSON.stringify({ type: command, payload });

const options = {
  hostname: 'localhost',
  port: 3000,
  path: '/api/app/command',
  method: 'POST',
  headers: {
    'Content-Type': 'application/json',
    'Content-Length': data.length,
  },
};

const req = http.request(options, (res) => {
  if (res.statusCode === 200) {
    console.log(`[T2I] Command '${command}' sent to App.`);
  } else {
    console.error(`[T2I] Failed to send command: ${res.statusCode}`);
  }
});

req.on('error', (error) => {
  console.error(`[T2I] Error: ${error.message}`);
});

req.write(data);
req.end();
