#!/data/data/com.termux/files/usr/bin/bash

# T2I-Bot-Skill AI Rig - Complete Termux Installation Script
# Automates setup of Monaco Editor, tunneling, AI providers, and X11 integration

set -e

# Configuration
T2I_DIR="$HOME/t2i-bot-skill"
NODE_VERSION="20"
PYTHON_VERSION="3.11"
TUNNEL_PROVIDER="${TUNNEL_PROVIDER:-ngrok}"
INSTALL_AI="${INSTALL_AI:-true}"
INSTALL_X11="${INSTALL_X11:-false}"
INSTALL_CODESERVER="${INSTALL_CODESERVER:-true}"

# Colors
RED='\033[0;31m'
GREEN='\033[0;32m'
YELLOW='\033[1;33m'
BLUE='\033[0;34m'
PURPLE='\033[0;35m'
CYAN='\033[0;36m'
NC='\033[0m'
BOLD='\033[1m'

# Logging functions
log_info() { echo -e "${BLUE}[INFO]${NC} $1" }
log_success() { echo -e "${GREEN}[SUCCESS]${NC} $1" }
log_warn() { echo -e "${YELLOW}[WARN]${NC} $1" }
log_error() { echo -e "${RED}[ERROR]${NC} $1" }
log_step() { echo -e "${PURPLE}[STEP]${NC} ${BOLD}$1${NC}" }
log_tunnel() { echo -e "${CYAN}[TUNNEL]${NC} $1" }

# Banner
show_banner() {
    cat << 'EOF'
╔════════════════════════════════════════════════════════════════════╗
║                                                                    ║
║     ████████╗███████╗██████╗ ██╗   ██╗███████╗██████╗             ║
║     ╚══██╔══╝██╔════╝██╔══██╗╚██╗ ██╔╝██╔════╝██╔══██╗            ║
║        ██║   █████╗  ██████╔╝ ╚████╔╝ █████╗  ██████╔╝            ║
║        ██║   ██╔══╝  ██╔══██╗  ╚██╔╝  ██╔══╝  ██╔══██╗            ║
║        ██║   ███████╗██║  ██║   ██║   ███████╗██║  ██║            ║
║        ╚═╝   ╚══════╝╚═╝  ╚═╝   ╚═╝   ╚══════╝╚═╝  ╚═╝            ║
║                                                                    ║
║          AI Rig - Termux Installation Script                       ║
║          Monaco Editor | X11 | Tunneling | AI Providers            ║
║                                                                    ║
╚════════════════════════════════════════════════════════════════════╝
EOF
    echo ""
}

# Check if running in Termux
check_termux() {
    if [[ "$PREFIX" == "/data/data/com.termux/files/usr" ]]; then
        log_success "Running in Termux environment"
        return 0
    else
        log_warn "Not running in Termux - installation may differ"
        read -p "Continue anyway? (y/n): " -n 1 -r
        echo
        if [[ ! $REPLY =~ ^[Yy]$ ]]; then
            exit 1
        fi
    fi
    return 1
}

# Check storage permission
check_storage() {
    if [ ! -d "$HOME/storage" ]; then
        log_info "Setting up storage access..."
        termux-setup-storage
        log_success "Storage access configured"
    fi
}

# Update packages
update_packages() {
    log_step "Updating package repositories..."
    pkg update -y
    pkg upgrade -y
    log_success "Packages updated"
}

# Install core dependencies
install_core_deps() {
    log_step "Installing core dependencies..."
    pkg install -y \
        nodejs-lts \
        python \
        pip \
        git \
        wget \
        curl \
        jq \
        toilet \
        figlet \
        neofetch \
        htop \
        vim \
        nano \
        bat \
        fd \
        ripgrep \
        fzf \
        tmux \
        openssh \
        rsync
    
    log_success "Core dependencies installed"
}

# Install Node.js dependencies
install_node_deps() {
    log_step "Setting up Node.js environment..."
    
    # Check Node version
    NODE_VER=$(node --version | cut -d'v' -f2 | cut -d'.' -f1)
    if [ "$NODE_VER" -lt 18 ]; then
        log_warn "Node.js version is old. Recommending upgrade..."
        pkg install nodejs-lts
    fi
    
    log_success "Node.js environment ready"
}

# Install Python dependencies
install_python_deps() {
    log_step "Installing Python dependencies..."
    
    pip install --upgrade pip setuptools wheel
    
    # AI/ML dependencies
    if [ "$INSTALL_AI" = true ]; then
        pip install \
            pytesseract \
            pillow \
            opencv-python-headless \
            numpy \
            chromadb \
            sentence-transformers \
            requests \
            websocket-client \
            socketio
        log_success "AI/ML Python packages installed"
    else
        pip install \
            requests \
            websocket-client
        log_success "Basic Python packages installed"
    fi
}

# Install Tesseract OCR
install_tesseract() {
    log_step "Installing Tesseract OCR..."
    pkg install -y tesseract
    
    # Install language data
    pkg install -y tesseract-eng
    
    # Optional: Add more languages
    # pkg install tesseract-vie  # Vietnamese
    # pkg install tesseract-chi-sim  # Chinese Simplified
    # pkg install tesseract-jpn  # Japanese
    
    log_success "Tesseract OCR installed"
}

# Clone T2I-Bot-Skill repository
clone_repository() {
    log_step "Cloning T2I-Bot-Skill repository..."
    
    if [ -d "$T2I_DIR" ]; then
        log_warn "Directory already exists. Pulling latest changes..."
        cd "$T2I_DIR"
        git pull
    else
        git clone https://github.com/your-username/t2i-bot-skill.git "$T2I_DIR"
        cd "$T2I_DIR"
    fi
    
    log_success "Repository cloned/updated"
}

# Install Node dependencies for T2I
install_t2i_deps() {
    log_step "Installing T2I Node dependencies..."
    cd "$T2I_DIR"
    npm install
    log_success "T2I dependencies installed"
}

# Setup tunneling
setup_tunneling() {
    log_step "Setting up $TUNNEL_PROVIDER tunneling..."
    
    if [ "$TUNNEL_PROVIDER" = "ngrok" ]; then
        # Install ngrok
        if ! command -v ngrok &> /dev/null; then
            log_info "Downloading ngrok..."
            wget -q https://bin.equinox.io/c/bNyj1mQVY4c/ngrok-v3-stable-linux-arm64.tgz
            tar -xzf ngrok-v3-stable-linux-arm64.tgz
            mv ngrok $PREFIX/bin/
            rm ngrok-v3-stable-linux-arm64.tgz
        fi
        
        # Prompt for auth token
        echo ""
        log_info "Ngrok installed. Configure your auth token:"
        echo "  1. Get token from: https://dashboard.ngrok.com/get-started/your-authtoken"
        echo "  2. Run: ngrok config add-authtoken <your-token>"
        echo ""
        read -p "Add ngrok auth token now? (y/n): " -n 1 -r
        echo
        if [[ $REPLY =~ ^[Yy]$ ]]; then
            read -p "Enter ngrok auth token: " NGROK_TOKEN
            ngrok config add-authtoken "$NGROK_TOKEN"
        fi
        
    elif [ "$TUNNEL_PROVIDER" = "cloudflared" ]; then
        # Install cloudflared
        if ! command -v cloudflared &> /dev/null; then
            log_info "Downloading cloudflared..."
            wget -q https://github.com/cloudflare/cloudflared/releases/latest/download/cloudflared-linux-arm64
            chmod +x cloudflared-linux-arm64
            mv cloudflared-linux-arm64 $PREFIX/bin/cloudflared
        fi
        
        log_success "cloudflared installed"
    fi
    
    log_success "Tunneling setup complete"
}

# Setup code-server
setup_codeserver() {
    if [ "$INSTALL_CODESERVER" = true ]; then
        log_step "Setting up code-server..."
        
        # Install code-server
        if ! command -v code-server &> /dev/null; then
            curl -fsSL https://code-server.dev/install.sh | sh
        fi
        
        # Create config
        mkdir -p ~/.config/code-server
        cat > ~/.config/code-server/config.yaml <<EOF
bind-addr: 0.0.0.0:8080
auth: password
password: t2i-rig
cert: false
editor:
  fontSize: 14
  minimap:
    enabled: true
EOF
        
        # Install extensions
        code-server --install-extension ms-python.python
        code-server --install-extension dbaeumer.vscode-eslint
        code-server --install-extension esbenp.prettier-vscode
        
        log_success "code-server setup complete"
        log_info "Access code-server at: http://localhost:8080"
        log_info "Password: t2i-rig"
    fi
}

# Setup Termux X11
setup_x11() {
    if [ "$INSTALL_X11" = true ]; then
        log_step "Setting up Termux X11..."
        
        # Add X11 repo
        if [ ! -f "/data/data/com.termux/files/usr/etc/apt/sources.list.d/x11.list" ]; then
            echo "deb https://termux-x11-nightly.github.io/termux-x11/apt/apt-nightly termux-x11 main" > \
                /data/data/com.termux/files/usr/etc/apt/sources.list.d/x11.list
            pkg update -y
        fi
        
        # Install X11 packages
        pkg install -y \
            termux-x11-nightly \
            xfce4-terminal \
            xorg-xrandr \
            xorg-xsetroot \
            xorg-xhost
        
        # Copy configuration
        mkdir -p ~/.termux
        cp "$T2I_DIR/.termux/termux.properties" ~/.termux/ 2>/dev/null || true
        cp "$T2I_DIR/.termux/x11.conf" ~/.termux/ 2>/dev/null || true
        
        log_success "Termux X11 setup complete"
        log_info "Start X11 with: termux-x11 :0 -xstartup \$PREFIX/bin/xfce4-terminal &"
    fi
}

# Configure environment
configure_environment() {
    log_step "Configuring environment..."
    
    # Add aliases to .bashrc
    cat >> ~/.bashrc <<'EOF'

# T2I-Bot-Skill Aliases
alias t2i='cd ~/t2i-bot-skill'
alias t2i-dev='cd ~/t2i-bot-skill && npm run dev'
alias t2i-tunnel='bash ~/t2i-bot-skill/scripts/tunnel_automation.sh'
alias t2i-ocr='python ~/t2i-bot-skill/scripts/ocr_processor.py'
alias t2i-rag='python ~/t2i-bot-skill/scripts/rag_processor.py'
alias codeserver='code-server --config ~/.config/code-server/config.yaml'

# T2I Environment
export T2I_DIR=~/t2i-bot-skill
export TUNNEL_PROVIDER=ngrok
EOF
    
    # Reload bashrc
    source ~/.bashrc
    
    log_success "Environment configured"
}

# Create startup script
create_startup_script() {
    log_step "Creating startup script..."
    
    cat > ~/start-t2i-rig.sh <<'EOF'
#!/data/data/com.termux/files/usr/bin/bash
# T2I-Bot-Skill AI Rig Startup Script

echo "Starting T2I-Bot-Skill AI Rig..."
echo ""

# Start T2I server
cd ~/t2i-bot-skill
npm run dev &
T2I_PID=$!
echo "T2I Server started (PID: $T2I_PID)"

# Start code-server
code-server --config ~/.config/code-server/config.yaml &
CS_PID=$!
echo "code-server started (PID: $CS_PID)"

# Start tunnels
bash ~/t2i-bot-skill/scripts/tunnel_automation.sh start

echo ""
echo "═══════════════════════════════════════════"
echo "  T2I-Bot-Skill AI Rig is running!"
echo "═══════════════════════════════════════════"
echo ""
echo "  T2I App:    http://localhost:3000"
echo "  code-server: http://localhost:8080"
echo ""
echo "  Press Ctrl+C to stop all services"
echo ""

# Wait for interrupt
wait
EOF
    
    chmod +x ~/start-t2i-rig.sh
    
    log_success "Startup script created: ~/start-t2i-rig.sh"
}

# Show installation summary
show_summary() {
    echo ""
    cat << EOF
╔════════════════════════════════════════════════════════════════════╗
║                    Installation Complete!                          ║
╚════════════════════════════════════════════════════════════════════╝

${GREEN}✓${NC} T2I-Bot-Skill installed at: $T2I_DIR
${GREEN}✓${NC} Monaco Editor integrated
${GREEN}✓${NC} $TUNNEL_PROVIDER tunneling configured

EOF

    if [ "$INSTALL_AI" = true ]; then
        echo "${GREEN}✓${NC} AI/ML packages installed (OCR, RAG)"
    fi
    
    if [ "$INSTALL_CODESERVER" = true ]; then
        echo "${GREEN}✓${NC} code-server (VS Code) installed"
        echo "   Access: http://localhost:8080"
        echo "   Password: t2i-rig"
    fi
    
    if [ "$INSTALL_X11" = true ]; then
        echo "${GREEN}✓${NC} Termux X11 configured"
    fi
    
    cat << EOF

${CYAN}Quick Start:${NC}
  cd ~/t2i-bot-skill
  npm run dev

${CYAN}Start All Services:${NC}
  ~/start-t2i-rig.sh

${CYAN}Tunnel Management:${NC}
  bash ~/t2i-bot-skill/scripts/tunnel_automation.sh start

${CYAN}OCR Processing:${NC}
  python ~/t2i-bot-skill/scripts/ocr_processor.py <image.png>

${CYAN}RAG Queries:${NC}
  python ~/t2i-bot-skill/scripts/rag_processor.py query "your query"

${YELLOW}Next Steps:${NC}
  1. Configure ngrok: ngrok config add-authtoken <your-token>
  2. Start development: npm run dev
  3. Access in browser: http://localhost:3000
  4. For mobile: Use tunnel URL after running tunnel script

${PURPLE}Documentation:${NC}
  - README.md in project root
  - config/ directory for tunnel configurations
  - scripts/ for automation tools

════════════════════════════════════════════════════════════════════
EOF
}

# Main installation function
main() {
    show_banner
    
    log_info "Starting T2I-Bot-Skill AI Rig installation..."
    echo ""
    
    # Run installation steps
    check_termux
    check_storage
    update_packages
    install_core_deps
    install_node_deps
    install_python_deps
    install_tesseract
    clone_repository
    install_t2i_deps
    setup_tunneling
    setup_codeserver
    setup_x11
    configure_environment
    create_startup_script
    
    show_summary
    
    log_success "Installation complete! Happy coding! 🚀"
}

# Parse command line arguments
while [[ $# -gt 0 ]]; do
    case $1 in
        --no-ai)
            INSTALL_AI=false
            shift
            ;;
        --no-codeserver)
            INSTALL_CODESERVER=false
            shift
            ;;
        --x11)
            INSTALL_X11=true
            shift
            ;;
        --tunnel-provider)
            TUNNEL_PROVIDER="$2"
            shift 2
            ;;
        --help)
            echo "Usage: $0 [options]"
            echo ""
            echo "Options:"
            echo "  --no-ai              Skip AI/ML package installation"
            echo "  --no-codeserver      Skip code-server installation"
            echo "  --x11                Install Termux X11"
            echo "  --tunnel-provider    Choose tunnel provider (ngrok|cloudflared)"
            echo "  --help               Show this help"
            exit 0
            ;;
        *)
            log_error "Unknown option: $1"
            exit 1
            ;;
    esac
done

# Run main installation
main
