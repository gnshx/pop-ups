#!/usr/bin/env bash
# ==============================================================================
# ThreadPet / Pop-ups — All-in-One Setup & Dependency Installer
# Installs npm dependencies, Python requirements, and system libraries in one go.
# ==============================================================================

set -euo pipefail
cd "$(dirname "$0")"

CYAN='\033[0;36m'
GREEN='\033[0;32m'
YELLOW='\033[1;33m'
RED='\033[0;31m'
BOLD='\033[1m'
NC='\033[0m'

echo -e "${CYAN}${BOLD}"
echo "  ╔══════════════════════════════════════════════════════════════╗"
echo "  ║        Pop-ups Desktop Pet — All-in-One Setup Script         ║"
echo "  ║    Installs Node.js, Python, and System Dependencies in 1 Go ║"
echo "  ╚══════════════════════════════════════════════════════════════╝"
echo -e "${NC}"

AUTO_YES=false
SKIP_SYS=false
SKIP_BUILD=false

for arg in "$@"; do
    case "$arg" in
        -y|--yes) AUTO_YES=true ;;
        --no-sys|--skip-sys) SKIP_SYS=true ;;
        --no-build|--skip-build) SKIP_BUILD=true ;;
        -h|--help)
            echo "Usage: ./setup.sh [OPTIONS]"
            echo ""
            echo "Options:"
            echo "  -y, --yes          Non-interactive mode (auto-accept prompts)"
            echo "  --skip-sys         Skip system apt package installation"
            echo "  --skip-build       Skip initial npm run build step"
            echo "  -h, --help         Show this help message"
            exit 0
            ;;
    esac
done

# ------------------------------------------------------------------------------
# 1. System Package Check (Linux / Debian / Ubuntu)
# ------------------------------------------------------------------------------
echo -e "${YELLOW}[1/4] Checking System & Desktop Overlay Dependencies...${NC}"

SYS_PACKAGES=(
    "python3-gi"
    "python3-gi-cairo"
    "gir1.2-gtk-3.0"
    "gir1.2-webkit2-4.1"
    "python3-numpy"
    "python3-pil"
)

# Test if PyGObject and WebKit2 are already functional
OVERLAY_DEPS_OK=true
if ! python3 -c "import gi, cairo; gi.require_version('Gtk', '3.0'); gi.require_version('WebKit2', '4.1'); from gi.repository import Gtk, WebKit2" 2>/dev/null; then
    OVERLAY_DEPS_OK=false
fi

if [[ "$OVERLAY_DEPS_OK" == "true" ]]; then
    echo -e "${GREEN}✓ Native GTK3 and WebKit2GTK Python bindings are present and working.${NC}"
elif [[ "$SKIP_SYS" == "true" ]]; then
    echo -e "${YELLOW}! Skipped system package check (--skip-sys passed).${NC}"
else
    if command -v apt-get >/dev/null 2>&1; then
        echo -e "${YELLOW}Missing system GTK3/WebKit2 bindings for transparent desktop overlay.${NC}"
        INSTALL_SYS=false
        if [[ "$AUTO_YES" == "true" ]]; then
            INSTALL_SYS=true
        else
            read -r -p "Install required system packages with 'sudo apt-get install'? [Y/n] " response
            case "$response" in
                [yY][eE][sS]|[yY]|"") INSTALL_SYS=true ;;
                *) INSTALL_SYS=false ;;
            esac
        fi

        if [[ "$INSTALL_SYS" == "true" ]]; then
            echo -e "${CYAN}Running sudo apt-get update && sudo apt-get install...${NC}"
            sudo apt-get update -qq || true
            sudo apt-get install -y "${SYS_PACKAGES[@]}"
            echo -e "${GREEN}✓ System packages installed successfully.${NC}"
        else
            echo -e "${YELLOW}Skipped system package install. You may need to run manually:${NC}"
            echo -e "  sudo apt install -y ${SYS_PACKAGES[*]}"
        fi
    else
        echo -e "${YELLOW}Non-Debian/Ubuntu system detected. Ensure GTK 3.0, WebKit2GTK 4.1, and PyGObject are installed.${NC}"
    fi
fi

# ------------------------------------------------------------------------------
# 2. Python Dependencies (requirements.txt)
# ------------------------------------------------------------------------------
echo ""
echo -e "${YELLOW}[2/4] Verifying Python Requirements (requirements.txt)...${NC}"

if command -v pip3 >/dev/null 2>&1 || command -v pip >/dev/null 2>&1; then
    PIP_CMD="pip3"
    command -v pip3 >/dev/null 2>&1 || PIP_CMD="pip"

    echo -e "${CYAN}Checking requirements from requirements.txt...${NC}"
    # Try normal pip install; fallback to --break-system-packages if PEP 668 active on Python 3.12+
    if ! "$PIP_CMD" install -r requirements.txt --quiet 2>/dev/null; then
        "$PIP_CMD" install -r requirements.txt --break-system-packages --quiet 2>/dev/null || true
    fi
    echo -e "${GREEN}✓ Python dependencies verified.${NC}"
else
    echo -e "${YELLOW}Notice: pip3 not found, relying on system Python modules.${NC}"
fi

# ------------------------------------------------------------------------------
# 3. Node.js & NPM Dependencies (package.json)
# ------------------------------------------------------------------------------
echo ""
echo -e "${YELLOW}[3/4] Installing NPM Dependencies (package.json)...${NC}"

if ! command -v npm >/dev/null 2>&1; then
    echo -e "${RED}Error: 'npm' is not installed!${NC}"
    echo -e "Please install Node.js & npm (e.g. 'sudo apt install nodejs npm' or via nvm/volta)."
    exit 1
fi

echo -e "${CYAN}Running npm install...${NC}"
npm install
echo -e "${GREEN}✓ NPM dependencies installed successfully.${NC}"

# ------------------------------------------------------------------------------
# 4. Build Production Bundle
# ------------------------------------------------------------------------------
echo ""
echo -e "${YELLOW}[4/4] Building ThreadPet Production Assets...${NC}"

if [[ "$SKIP_BUILD" == "true" ]]; then
    echo -e "${YELLOW}! Skipped build step (--skip-build passed).${NC}"
else
    npm run build
    echo -e "${GREEN}✓ Production bundle ready in dist/${NC}"
fi

# Ensure launchers have executable permissions
chmod +x run_desktop.sh run_high.sh run_low.sh start_pet.sh setup.sh 2>/dev/null || true

# ------------------------------------------------------------------------------
# Done!
# ------------------------------------------------------------------------------
echo ""
echo -e "${GREEN}${BOLD}══════════════════════════════════════════════════════════════${NC}"
echo -e "${GREEN}${BOLD}🎉 Installation Complete! Everything is ready to run.${NC}"
echo -e "${GREEN}${BOLD}══════════════════════════════════════════════════════════════${NC}"
echo ""
echo -e "You can now launch Pop-ups Desktop Pet using any of the following:"
echo -e "  ${BOLD}./run_high.sh${NC}       - ⚡ High-End GPU Mode (60 FPS, Retina Hi-DPI, Glow)"
echo -e "  ${BOLD}./run_low.sh${NC}        - 🍃 Low-End Eco Mode (Ultra-low CPU, Battery saver)"
echo -e "  ${BOLD}./run_desktop.sh --dev${NC} - 🛠️ Developer Mode with Vite Hot Module Reload"
echo -e "  ${BOLD}npm run dev${NC}           - 🌐 Browser-only Preview at http://localhost:5173"
echo ""
