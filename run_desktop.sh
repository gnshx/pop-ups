#!/usr/bin/env bash
# ThreadPet AI — Build & Launch Script
# Builds the React app (if needed) and launches the desktop overlay.
# Usage:
#   ./run_desktop.sh          # build if needed, then launch (low CPU)
#   ./run_desktop.sh --dev    # skip build, use Vite dev server
#   ./run_desktop.sh --build  # force rebuild, then launch

set -euo pipefail
cd "$(dirname "$0")"

CYAN='\033[0;36m'
GREEN='\033[0;32m'
YELLOW='\033[1;33m'
NC='\033[0m'

echo -e "${CYAN}"
echo "  ╔══════════════════════════════════════╗"
echo "  ║   ThreadPet AI — Desktop Launcher    ║"
echo "  ╚══════════════════════════════════════╝"
echo -e "${NC}"

# --- Dev mode: skip build, use Vite HMR ---
if [[ "${1:-}" == "--dev" ]]; then
    echo -e "${YELLOW}[dev mode] Starting Vite dev server + overlay...${NC}"
    # Start dev server in background
    npm run dev -- --host 127.0.0.1 --port 5173 &
    DEV_PID=$!
    # Give Vite 3 seconds to boot
    sleep 3
    echo -e "${GREEN}Overlay launching (Vite dev server at :5173)${NC}"
    python3 desktop_overlay.py --dev
    kill "$DEV_PID" 2>/dev/null || true
    exit 0
fi

# --- Force rebuild ---
if [[ "${1:-}" == "--build" ]]; then
    echo -e "${GREEN}Force-rebuilding ThreadPet...${NC}"
    npm run build
    echo -e "${GREEN}✓ Build complete${NC}"
fi

# --- Auto build if dist/ is missing ---
if [[ ! -f "dist/index.html" ]]; then
    echo -e "${GREEN}Building ThreadPet (first run or dist/ missing)...${NC}"
    npm run build
    echo -e "${GREEN}✓ Build complete${NC}"
else
    echo -e "${GREEN}✓ Using existing build in dist/ — run with --build to refresh${NC}"
fi

echo ""
echo -e "${CYAN}Launching desktop overlay (low-CPU static mode)...${NC}"
echo -e "  Press ${YELLOW}Ctrl+C${NC} to quit"
echo ""

# Launch overlay — it will auto-serve dist/ on :5174
python3 desktop_overlay.py
