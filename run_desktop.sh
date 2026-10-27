#!/usr/bin/env bash
# ThreadPet AI — Desktop Launcher (High vs Low-End Modes)
# Builds the React app (if needed) and launches the desktop overlay.
#
# Usage:
#   ./run_desktop.sh --high    # High CPU & GPU (60 FPS, Retina Hi-DPI, Glowing Shadows, Rich Particles)
#   ./run_desktop.sh --low     # Low-End (8-30 FPS adaptive, 1x DPI, No Shadows, Battery Saver)
#   ./run_desktop.sh --dev     # Dev mode with Vite HMR
#   ./run_desktop.sh --build   # Force rebuild dist/, then launch

set -euo pipefail
cd "$(dirname "$0")"

CYAN='\033[0;36m'
GREEN='\033[0;32m'
YELLOW='\033[1;33m'
MAGENTA='\033[0;35m'
NC='\033[0m'

echo -e "${CYAN}"
echo "  ╔════════════════════════════════════════════════════════════╗"
echo "  ║         ThreadPet AI — Desktop Companion Launcher          ║"
echo "  ║       ⚡ High-End (Full GPU)  vs  🍃 Low-End (Eco Mode)    ║"
echo "  ╚════════════════════════════════════════════════════════════╝"
echo -e "${NC}"

PROFILE="high"
ARGS=()

for arg in "$@"; do
    case "$arg" in
        --low|--eco|-low|low|eco)
            PROFILE="low"
            ARGS+=("--low")
            ;;
        --high|--ultra|-high|high|ultra)
            PROFILE="high"
            ARGS+=("--high")
            ;;
        --dev)
            ARGS+=("--dev")
            ;;
        --build)
            echo -e "${GREEN}Force-rebuilding ThreadPet bundle...${NC}"
            npm run build
            echo -e "${GREEN}✓ Build complete${NC}"
            ;;
        *)
            ARGS+=("$arg")
            ;;
    esac
done

# --- Auto-install npm dependencies if missing ---
if [[ ! -d "node_modules" ]]; then
    echo -e "${YELLOW}node_modules not found. Installing dependencies in one go...${NC}"
    npm install
    echo -e "${GREEN}✓ npm install complete!${NC}"
fi

# --- Verify Python transparent desktop bindings ---
if ! python3 -c "import gi, cairo" 2>/dev/null; then
    echo -e "${YELLOW}Notice: Missing Python GTK/Cairo dependencies.${NC}"
    if [[ -f "requirements.txt" ]]; then
        echo -e "${CYAN}Attempting to install from requirements.txt...${NC}"
        pip3 install -r requirements.txt --quiet 2>/dev/null || \
        pip3 install -r requirements.txt --break-system-packages --quiet 2>/dev/null || \
        echo -e "${YELLOW}For system packages, run: ./setup.sh${NC}"
    fi
fi

# --- Dev mode: skip build, use Vite HMR ---
if [[ " ${ARGS[*]:-} " =~ " --dev " ]]; then
    echo -e "${YELLOW}[dev mode] Starting Vite dev server + overlay...${NC}"
    npm run dev -- --host 127.0.0.1 --port 5173 &
    DEV_PID=$!
    sleep 3
    echo -e "${GREEN}Overlay launching in dev mode...${NC}"
    python3 desktop_overlay.py --dev --"$PROFILE"
    kill "$DEV_PID" 2>/dev/null || true
    exit 0
fi

# --- Auto build if dist/ is missing ---
if [[ ! -f "dist/index.html" ]]; then
    echo -e "${GREEN}Building ThreadPet for first run...${NC}"
    npm run build
    echo -e "${GREEN}✓ Build complete!${NC}"
else
    echo -e "${GREEN}✓ Using production build in dist/${NC}"
fi

if [[ "$PROFILE" == "low" ]]; then
    echo -e "${MAGENTA}🍃 Launching in LOW-END / ECO MODE:${NC}"
    echo -e "   • FPS capped: 8 FPS idle, 18-30 FPS active (low CPU load)"
    echo -e "   • Canvas buffer locked to 1.0x DPI (low GPU memory)"
    echo -e "   • Expensive shadowBlur disabled"
    echo -e "   • Strict particle capping & accelerated sleep"
else
    echo -e "${YELLOW}⚡ Launching in HIGH-END / GPU MODE:${NC}"
    echo -e "   • Full 60 FPS silky smooth animations & physics"
    echo -e "   • High-DPI Retina supersampling"
    echo -e "   • Glowing thread shadowBlur & blush aura"
    echo -e "   • Full 25-particle physics & audio beat reactive dance"
fi

echo ""
echo -e "  Press ${YELLOW}Ctrl+C${NC} in this terminal to close the companion"
echo ""

# Launch overlay with profile flag
python3 desktop_overlay.py --"$PROFILE"
