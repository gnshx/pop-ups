#!/usr/bin/env bash
# ThreadPet AI — High-End / Full GPU Version Launcher
# Runs at full 60 FPS, High-DPI Retina, Glowing Shadows, and Rich Particles.
SCRIPT_DIR="$(cd "$(dirname "${BASH_SOURCE[0]}")" && pwd)"
exec "$SCRIPT_DIR/run_desktop.sh" --high "$@"
