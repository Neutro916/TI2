#!/data/data/com.termux/files/usr/bin/bash

# code-server (VS Code in Browser) Setup for T2I-Bot-Skill
# This script installs and configures code-server for mobile development

set -e

# Configuration
CODESERVER_PORT="${CODESERVER_PORT:-8080}"
CODESERVER_PASSWORD="${CODESERVER_PASSWORD:-t2i-rig}"
INSTALL_DIR="$HOME/t2i-bot-skill"

# Colors
GREEN='\033[0;32m'
BLUE='\033[0;34m'
YELLOW='\033[1;33m'
NC='\033[0m'

log_info() { echo -e "${BLUE}[INFO]${NC} $1" }
log_success() { echo -e "${GREEN}[SUCCESS]${NC} $1" }
log_warn() { echo -e "${YELLOW}[WARN]${NC} $1" }

echo "╔══════════════════════════════════════════════════════════╗"
echo "║     T2I-Bot-Skill: code-server Installation Script       ║"
echo "║          VS Code in Browser for Termux X11              ║"
echo "╚══════════════════════════════════════════════════════════╝"

# Check if running in Termux
if [[ "$PREFIX" != "/data/data/com.termux/files/usr" ]]; then
    log_warn "Not running in Termux - installation may differ"
fi

# Install code-server
log_info "Installing code-server..."
curl -fsSL https://code-server.dev/install.sh | sh

# Create configuration directory
log_info "Creating code-server configuration..."
mkdir -p ~/.config/code-server

# Create config file
cat > ~/.config/code-server/config.yaml <<EOF
# code-server configuration for T2I-Bot-Skill
bind-addr: 0.0.0.0:$CODESERVER_PORT
auth: password
password: $CODESERVER_PASSWORD
cert: false
editor:
  fontSize: 14
  fontLigatures: true
  minimap:
    enabled: true
  wordWrap: "on"
  tabSize: 2
  formatOnSave: true
  formatOnPaste: true
  autoIndent: "full"
  suggestOnTriggerCharacters: true
  quickSuggestions:
    other: true
    comments: false
    strings: true
  bracketPairColorization:
    enabled: true
EOF

log_success "Configuration created at ~/.config/code-server/config.yaml"

# Install extensions for T2I-Bot-Skill development
log_info "Installing VS Code extensions..."

EXTENSIONS=(
    "ms-python.python"
    "dbaeumer.vscode-eslint"
    "esbenp.prettier-vscode"
    "bradlc.vscode-tailwindcss"
    "dsznajder.es7-react-js-snippets"
    "ms-vscode.vscode-typescript-next"
    "formulahendry.auto-rename-tag"
    "formulahendry.auto-close-tag"
    "streetsidesoftware.code-spell-checker"
    "github.copilot"
    "github.copilot-chat"
    "ms-azuretools.vscode-docker"
    "ms-vscode-remote.remote-ssh"
    "ms-vscode-remote.remote-wsl"
    "termux.termux-shell"
)

for ext in "${EXTENSIONS[@]}"; do
    log_info "Installing extension: $ext"
    code-server --install-extension "$ext" || log_warn "Failed to install $ext"
done

log_success "All extensions installed"

# Create startup script
cat > ~/start-codeserver.sh <<'EOFSCRIPT'
#!/data/data/com.termux/files/usr/bin/bash
# Start code-server for T2I-Bot-Skill

CODESERVER_PORT="${CODESERVER_PORT:-8080}"

echo "Starting code-server on port $CODESERVER_PORT..."
echo "Access via: http://localhost:$CODESERVER_PORT"
echo "Password: $CODESERVER_PASSWORD"
echo ""
echo "Press Ctrl+C to stop"

code-server --config ~/.config/code-server/config.yaml
EOFSCRIPT

chmod +x ~/start-codeserver.sh

log_success "Startup script created at ~/start-codeserver.sh"

# Create systemd-style service file (for Android init.d if rooted)
if [ -d /system/etc/init.d ]; then
    cat > /system/etc/init.d/95codeserver <<'EOF'
#!/system/bin/sh
# Start code-server on boot (requires rooted device)
export HOME=/data/data/com.termux/files/home
export PATH=/data/data/com.termux/files/usr/bin:$PATH
cd /data/data/com.termux/files/home/t2i-bot-skill
nohup /data/data/com.termux/files/usr/bin/code-server --config /data/data/com.termux/files/home/.config/code-server/config.yaml > /tmp/codeserver.log 2>&1 &
EOF
    chmod +x /system/etc/init.d/95codeserver
    log_info "code-server will start on boot (rooted device)"
fi

echo ""
echo "╔══════════════════════════════════════════════════════════╗"
echo "║              Installation Complete!                      ║"
echo "╚══════════════════════════════════════════════════════════╝"
echo ""
echo "To start code-server:"
echo "  ~/start-codeserver.sh"
echo ""
echo "Access in browser:"
echo "  http://localhost:$CODESERVER_PORT"
echo ""
echo "Password:"
echo "  $CODESERVER_PASSWORD"
echo ""
echo "For remote access, use ngrok/cloudflared:"
echo "  ngrok http $CODESERVER_PORT"
echo ""
