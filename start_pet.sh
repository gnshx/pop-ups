#!/usr/bin/env bash
# One-click launcher for ThreadPet (Reze & Denji Desktop Companion)

SCRIPT_DIR="$(cd "$(dirname "${BASH_SOURCE[0]}")" && pwd)"
cd "$SCRIPT_DIR"

exec "$SCRIPT_DIR/run_desktop.sh" "$@"
