#!/usr/bin/env bash
# ThreadPet AI — Low-End / Eco Mode Launcher
# Ultra-light on CPU & GPU: 8-30 FPS adaptive, 1x DPI buffer, no shadows, battery saver.
SCRIPT_DIR="$(cd "$(dirname "${BASH_SOURCE[0]}")" && pwd)"
exec "$SCRIPT_DIR/run_desktop.sh" --low "$@"
