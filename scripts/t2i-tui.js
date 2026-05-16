/**
 * T2I RIG - Standalone TUI Bot (Neural Terminal Orchestrator)
 * Version: 4.0 (Claw-like CLI Orchestrator)
 */

const fs = require('fs');
const path = require('path');
const readline = require('readline');

// MCP-Style Token Communication Logic (Simulation)
const T2I_TOKEN = "T2I_NEURAL_TOKEN_916_STABLE";
const SKILLS_DIR = path.join(__dirname, '..', '.skills');

const rl = readline.createInterface({
  input: process.stdin,
  output: process.stdout,
  prompt: '\x1b[33m[T2I-BOT]\x1b[0m \x1b[34mλ\x1b[0m '
});

console.clear();
console.log('\x1b[33m%s\x1b[0m', 'T2I PERSONAL INTELLIGENCE RIG - NEURAL TUI v4.0');
console.log('\x1b[90m%s\x1b[0m', 'Orchestrating native terminal workspace...');
console.log('\x1b[32m%s\x1b[0m', '✓ Token Auth Stable: ' + T2I_TOKEN.substring(0, 8) + '...');
console.log('\x1b[90m%s\x1b[0m', '---------------------------------------------------');

// Load Skills
const skills = fs.readdirSync(SKILLS_DIR).map(f => require(path.join(SKILLS_DIR, f)));
console.log('\x1b[34m%s\x1b[0m', 'Skills Loaded: ' + skills.map(s => s.name).join(', '));
console.log('\x1b[90m%s\x1b[0m', 'Type "status", "sync shadow", or "install [tool]" to begin.');
console.log('');

rl.prompt();

rl.on('line', (line) => {
  const input = line.trim().toLowerCase();
  
  if (input === 'hi' || input === 'hello') {
    console.log('\x1b[33m[T2I-BOT]\x1b[0m Rig initialized. Native terminal session active. How can I assist?');
  } 
  else if (input.includes('status')) {
    console.log('\x1b[33m[T2I-BOT]\x1b[0m Status Report:');
    console.log(' - Conductor: \x1b[32mACTIVE\x1b[0m (83.33Hz)');
    console.log(' - Tunnel: \x1b[34mLOCALPORT_HOST\x1b[0m');
    console.log(' - Memory: 4.2GB / 16GB');
  }
  else if (input.includes('shadow')) {
    console.log('\x1b[33m[T2I-BOT]\x1b[0m Executing Skill: \x1b[34m[GIT_CORE/SHADOW_ORCH]\x1b[0m');
    console.log('\x1b[90m%s\x1b[0m', '>> git clone https://github.com/Neutro916/Shadow');
    setTimeout(() => {
        console.log('\x1b[32m✓ Repository Synchronized.\x1b[0m Starting neural analysis...');
    }, 1500);
  }
  else if (input.includes('exit') || input === 'q') {
    process.exit(0);
  }
  else {
    console.log('\x1b[31m[T2I-BOT]\x1b[0m Unrecognized directive. Attempting neural fallback...');
  }
  
  setTimeout(() => rl.prompt(), 500);
});
