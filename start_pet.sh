#!/usr/bin/env bash
# One-click launcher for ThreadPet (Reze & Denji Desktop Companion)

SCRIPT_DIR="$(cd "$(dirname "${BASH_SOURCE[0]}")" && pwd)"
cd "$SCRIPT_DIR"

# Ensure Vite dev server is running
if ! curl -s http://127.0.0.1:5173/ > /dev/null; then
    echo "Starting background companion server..."
    nohup npm run dev -- --host 127.0.0.1 --port 5173 > /dev/null 2>&1 &
    sleep 1.5
fi

echo "Launching Reze & Denji onto desktop screen..."
GDK_BACKEND=x11 DISPLAY="${DISPLAY:-:0}" python3 "$SCRIPT_DIR/desktop_overlay.py" http://127.0.0.1:5173
