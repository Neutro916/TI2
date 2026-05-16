#!/data/data/com.termux/files/usr/bin/bash

# T2I-Bot-Skill Tunnel Automation Script
# Supports: ngrok, cloudflared, and localport

set -e

# Configuration
T2I_PORT="${T2I_PORT:-3000}"
LMSTUDIO_PORT="${LMSTUDIO_PORT:-1234}"
OPENWEBUI_PORT="${OPENWEBUI_PORT:-3001}"
CODESERVER_PORT="${CODESERVER_PORT:-8080}"
TUNNEL_PROVIDER="${TUNNEL_PROVIDER:-ngrok}"  # ngrok, cloudflared, localport

# Colors for output
RED='\033[0;31m'
GREEN='\033[0;32m'
YELLOW='\033[1;33m'
BLUE='\033[0;34m'
PURPLE='\033[0;35m'
CYAN='\033[0;36m'
NC='\033[0m' # No Color

# Logging functions
log_info() { echo -e "${BLUE}[INFO]${NC} $1" }
log_success() { echo -e "${GREEN}[SUCCESS]${NC} $1" }
log_warn() { echo -e "${YELLOW}[WARN]${NC} $1" }
log_error() { echo -e "${RED}[ERROR]${NC} $1" }
log_tunnel() { echo -e "${PURPLE}[TUNNEL]${NC} $1" }

# Check if running in Termux
check_termux() {
    if [[ "$PREFIX" == "/data/data/com.termux/files/usr" ]]; then
        log_success "Running in Termux environment"
        return 0
    else
        log_warn "Not running in Termux - some features may not work"
        return 1
    fi
}

# Install dependencies
install_dependencies() {
    log_info "Installing required packages..."
    pkg update -y
    pkg install -y nodejs-lts python pip wget curl jq toilet figlet

    # Install ngrok
    if ! command -v ngrok &> /dev/null; then
        log_info "Installing ngrok..."
        wget -q https://bin.equinox.io/c/bNyj1mQVY4c/ngrok-v3-stable-linux-arm64.tgz
        tar -xzf ngrok-v3-stable-linux-arm64.tgz
        mv ngrok $PREFIX/bin/
        rm ngrok-v3-stable-linux-arm64.tgz
        log_success "ngrok installed"
    fi

    # Install cloudflared
    if ! command -v cloudflared &> /dev/null; then
        log_info "Installing cloudflared..."
        wget -q https://github.com/cloudflare/cloudflared/releases/latest/download/cloudflared-linux-arm64
        chmod +x cloudflared-linux-arm64
        mv cloudflared-linux-arm64 $PREFIX/bin/cloudflared
        log_success "cloudflared installed"
    fi

    log_success "All dependencies installed"
}

# Start T2I main server
start_t2i_server() {
    log_info "Starting T2I-Bot-Skill server on port $T2I_PORT..."
    cd ~/t2i-bot-skill

    # Install Node dependencies if needed
    if [ ! -d "node_modules" ]; then
        log_info "Installing Node dependencies..."
        npm install
    fi

    # Start server in background
    npm run dev &
    T2I_PID=$!
    echo $T2I_PID > /tmp/t2i_server.pid
    log_success "T2I server started (PID: $T2I_PID)"
}

# Start LM Studio tunnel
start_lmstudio_tunnel() {
    log_tunnel "Setting up LM Studio tunnel on port $LMSTUDIO_PORT..."
    
    if [ "$TUNNEL_PROVIDER" == "ngrok" ]; then
        ngrok http $LMSTUDIO_PORT --log=stdout &
    elif [ "$TUNNEL_PROVIDER" == "cloudflared" ]; then
        cloudflared tunnel --url http://localhost:$LMSTUDIO_PORT &
    fi
    
    log_success "LM Studio tunnel active"
}

# Start OpenWebUI tunnel
start_openwebui_tunnel() {
    log_tunnel "Setting up OpenWebUI tunnel on port $OPENWEBUI_PORT..."
    
    if [ "$TUNNEL_PROVIDER" == "ngrok" ]; then
        ngrok http $OPENWEBUI_PORT --log=stdout &
    elif [ "$TUNNEL_PROVIDER" == "cloudflared" ]; then
        cloudflared tunnel --url http://localhost:$OPENWEBUI_PORT &
    fi
    
    log_success "OpenWebUI tunnel active"
}

# Start code-server (VS Code in browser)
start_codeserver() {
    log_info "Starting code-server on port $CODESERVER_PORT..."
    
    if ! command -v code-server &> /dev/null; then
        log_warn "code-server not installed. Installing..."
        curl -fsSL https://code-server.dev/install.sh | sh
    fi
    
    # Create code-server config
    mkdir -p ~/.config/code-server
    cat > ~/.config/code-server/config.yaml <<EOF
bind-addr: 0.0.0.0:$CODESERVER_PORT
auth: password
password: ${CODESERVER_PASSWORD:-t2i-rig}
cert: false
EOF

    # Start code-server
    code-server --install-extension ms-python.python
    code-server --install-extension dbaeumer.vscode-eslint
    code-server --install-extension esbenp.prettier-vscode
    
    code-server &
    CS_PID=$!
    echo $CS_PID > /tmp/codeserver.pid
    log_success "code-server started (PID: $CS_PID)"
}

# Start all tunnels
start_all_tunnels() {
    log_info "Starting all tunnels with provider: $TUNNEL_PROVIDER"
    
    # Create tunnels directory for logs
    mkdir -p ~/t2i-bot-skill/tunnels
    
    if [ "$TUNNEL_PROVIDER" == "ngrok" ]; then
        # Check ngrok auth
        if [ ! -f ~/.ngrok2/ngrok.yml ] && [ ! -f ~/.config/ngrok/ngrok.yml ]; then
            log_error "ngrok not authenticated. Run: ngrok config add-authtoken <your-token>"
            exit 1
        fi
        
        # Start main T2I tunnel
        ngrok http $T2I_PORT --log=stdout > ~/t2i-bot-skill/tunnels/t2i.log 2>&1 &
        echo $! > ~/t2i-bot-skill/tunnels/t2i.pid
        log_tunnel "T2I tunnel started (PID: $(cat ~/t2i-bot-skill/tunnels/t2i.pid))"
        
        # Start LM Studio tunnel
        ngrok http $LMSTUDIO_PORT --log=stdout > ~/t2i-bot-skill/tunnels/lmstudio.log 2>&1 &
        echo $! > ~/t2i-bot-skill/tunnels/lmstudio.pid
        log_tunnel "LM Studio tunnel started"
        
        # Start OpenWebUI tunnel
        ngrok http $OPENWEBUI_PORT --log=stdout > ~/t2i-bot-skill/tunnels/openwebui.log 2>&1 &
        echo $! > ~/t2i-bot-skill/tunnels/openwebui.pid
        log_tunnel "OpenWebUI tunnel started"
        
        # Start code-server tunnel
        ngrok http $CODESERVER_PORT --log=stdout > ~/t2i-bot-skill/tunnels/codeserver.log 2>&1 &
        echo $! > ~/t2i-bot-skill/tunnels/codeserver.pid
        log_tunnel "code-server tunnel started"
        
    elif [ "$TUNNEL_PROVIDER" == "cloudflared" ]; then
        # Cloudflared tunnels
        cloudflared tunnel --url http://localhost:$T2I_PORT > ~/t2i-bot-skill/tunnels/t2i.log 2>&1 &
        echo $! > ~/t2i-bot-skill/tunnels/t2i.pid
        log_tunnel "T2I cloudflared tunnel started"
        
        cloudflared tunnel --url http://localhost:$LMSTUDIO_PORT > ~/t2i-bot-skill/tunnels/lmstudio.log 2>&1 &
        echo $! > ~/t2i-bot-skill/tunnels/lmstudio.pid
        log_tunnel "LM Studio cloudflared tunnel started"
        
    elif [ "$TUNNEL_PROVIDER" == "localport" ]; then
        log_info "LocalPort tunneling - using localport.host service"
        # LocalPort uses mDNS/local network discovery
        log_tunnel "Access via: https://t2i-rig.localport.host:$T2I_PORT"
    fi
    
    log_success "All tunnels started!"
}

# Get tunnel URLs
get_tunnel_urls() {
    log_info "Fetching tunnel URLs..."
    sleep 5  # Wait for tunnels to initialize
    
    # For ngrok, fetch from API
    if [ "$TUNNEL_PROVIDER" == "ngrok" ]; then
        T2I_URL=$(curl -s http://localhost:4040/api/tunnels | jq -r '.tunnels[0].public_url')
        log_tunnel "T2I Access URL: $T2I_URL"
        
        LMSTUDIO_URL=$(curl -s http://localhost:4040/api/tunnels | jq -r '.tunnels[1].public_url')
        log_tunnel "LM Studio Access URL: $LMSTUDIO_URL"
    fi
    
    # Display all PIDs
    echo ""
    log_info "Active tunnel processes:"
    ps aux | grep -E "(ngrok|cloudflared)" | grep -v grep
}

# Stop all tunnels
stop_all_tunnels() {
    log_info "Stopping all tunnels..."
    
    # Kill ngrok/cloudflared processes
    pkill -f ngrok || true
    pkill -f cloudflared || true
    
    # Kill T2I server
    if [ -f /tmp/t2i_server.pid ]; then
        kill $(cat /tmp/t2i_server.pid) || true
        rm /tmp/t2i_server.pid
    fi
    
    # Kill code-server
    if [ -f /tmp/codeserver.pid ]; then
        kill $(cat /tmp/codeserver.pid) || true
        rm /tmp/codeserver.pid
    fi
    
    log_success "All tunnels stopped"
}

# Display help
show_help() {
    cat << EOF
${PURPLE}╔══════════════════════════════════════════════════════════╗
║     T2I-Bot-Skill AI Rig - Tunnel Automation Script     ║
║              Termux X11 Port Forwarding                 ║
╚══════════════════════════════════════════════════════════╝${NC}

${CYAN}Usage:${NC} $0 [command]

${CYAN}Commands:${NC}
  ${GREEN}install${NC}      - Install all dependencies
  ${GREEN}start${NC}        - Start T2I server and all tunnels
  ${GREEN}stop${NC}         - Stop all tunnels and servers
  ${GREEN}restart${NC}      - Restart everything
  ${GREEN}status${NC}       - Show active tunnels and URLs
  ${GREEN}codeserver${NC}   - Start code-server (VS Code in browser)
  ${GREEN}help${NC}         - Show this help message

${CYAN}Environment Variables:${NC}
  TUNNEL_PROVIDER   - ngrok|cloudflared|localport (default: ngrok)
  T2I_PORT          - Main T2I server port (default: 3000)
  LMSTUDIO_PORT     - LM Studio port (default: 1234)
  OPENWEBUI_PORT    - OpenWebUI port (default: 3001)
  CODESERVER_PORT   - code-server port (default: 8080)
  CODESERVER_PASSWORD - code-server password (default: t2i-rig)

${CYAN}Examples:${NC}
  $0 install                    # First-time setup
  $0 start                      # Start everything
  TUNNEL_PROVIDER=cloudflared $0 start  # Use cloudflared instead
  $0 codeserver                 # Start only code-server

${YELLOW}Note:${NC} For ngrok, first run: ngrok config add-authtoken <your-token>
EOF
}

# Main command handler
case "${1:-help}" in
    install)
        check_termux
        install_dependencies
        ;;
    start)
        check_termux
        start_t2i_server
        start_all_tunnels
        get_tunnel_urls
        ;;
    stop)
        stop_all_tunnels
        ;;
    restart)
        stop_all_tunnels
        sleep 2
        $0 start
        ;;
    status)
        get_tunnel_urls
        ;;
    codeserver)
        start_codeserver
        ;;
    help|--help|-h)
        show_help
        ;;
    *)
        log_error "Unknown command: $1"
        show_help
        exit 1
        ;;
esac
