#!/usr/bin/env python3
"""
ThreadPet AI - Native Linux GNOME Desktop Transparent Overlay
Runs a frameless, 100% transparent, always-on-top window directly on your Ubuntu desktop.
Features dynamic input-shape masking so clicks pass through to other applications!

Usage:
  python3 desktop_overlay.py            # auto-serve built dist/ (low CPU)
  python3 desktop_overlay.py --dev      # use Vite dev server on :5173
  python3 desktop_overlay.py <url>      # custom URL
"""

import sys
import os
import signal
import json
import base64
import threading
import functools
import shutil
import email.utils
import datetime
import mimetypes
import socketserver
import http.server
import gi

# Prefer X11 backend for guaranteed stick(), keep_above(), and ShapeInput pass-through on GNOME
if "DISPLAY" in os.environ and "GDK_BACKEND" not in os.environ:
    os.environ["GDK_BACKEND"] = "x11"

gi.require_version('Gtk', '3.0')
gi.require_version('Gdk', '3.0')
gi.require_version('WebKit2', '4.1')

from gi.repository import Gtk, Gdk, WebKit2, GLib
import cairo


# ---------------------------------------------------------------------------
# Embedded lightweight static file server
# Replaces the heavy Vite dev server at runtime → much lower CPU usage.
# Supports HTTP 206 Partial Content (Range requests) for audio streaming and
# silently handles client disconnects (BrokenPipeError) when requests abort.
# ---------------------------------------------------------------------------

def is_client_disconnect(exc: BaseException | None) -> bool:
    """Return True if exception represents a standard client disconnection / abort."""
    if exc is None:
        return False
    if isinstance(exc, (BrokenPipeError, ConnectionResetError, ConnectionAbortedError)):
        return True
    if isinstance(exc, OSError) and exc.errno in (32, 104, 103):  # EPIPE, ECONNRESET, ECONNABORTED
        return True
    return False

class ThreadedStaticServer(socketserver.ThreadingTCPServer):
    """Multi-threaded TCP server that suppresses harmless client disconnect traces."""
    allow_reuse_address = True
    daemon_threads = True

    def handle_error(self, request, client_address):
        exc_type, exc_val, _ = sys.exc_info()
        if is_client_disconnect(exc_val) or (exc_type and issubclass(exc_type, (BrokenPipeError, ConnectionResetError, ConnectionAbortedError))):
            return  # Benign client-side cancellation / disconnection
        super().handle_error(request, client_address)

class _SilentHandler(http.server.SimpleHTTPRequestHandler):
    """SimpleHTTPRequestHandler with HTTP Range support and suppressed broken pipe logs."""

    extensions_map = {
        **http.server.SimpleHTTPRequestHandler.extensions_map,
        ".audio": "audio/mpeg",
        ".mp3": "audio/mpeg",
        ".wav": "audio/wav",
        ".ogg": "audio/ogg",
        ".m4a": "audio/mp4",
        ".flac": "audio/flac",
    }

    def log_message(self, _fmt, *_args):
        pass  # silence request logs

    def send_head(self):
        path = self.translate_path(self.path)
        if os.path.isdir(path):
            return super().send_head()

        ctype = self.guess_type(path)
        try:
            f = open(path, "rb")
        except OSError:
            self.send_error(http.HTTPStatus.NOT_FOUND, "File not found")
            return None

        try:
            fs = os.fstat(f.fileno())
            file_size = fs[6]

            # Cache check (If-Modified-Since)
            if "If-Modified-Since" in self.headers and "If-None-Match" not in self.headers:
                try:
                    ims = email.utils.parsedate_to_datetime(self.headers["If-Modified-Since"])
                    if ims.tzinfo is None:
                        ims = ims.replace(tzinfo=datetime.timezone.utc)
                    if ims.tzinfo is datetime.timezone.utc:
                        last_modif = datetime.datetime.fromtimestamp(fs.st_mtime, datetime.timezone.utc).replace(microsecond=0)
                        if last_modif <= ims:
                            self.send_response(http.HTTPStatus.NOT_MODIFIED)
                            self.end_headers()
                            f.close()
                            return None
                except Exception:
                    pass

            # HTTP 206 Partial Content support for audio/media streaming
            range_header = self.headers.get("Range")
            if range_header and range_header.startswith("bytes="):
                val = range_header[6:].strip()
                if "," not in val:
                    parts = val.split("-")
                    if len(parts) == 2:
                        raw_start, raw_end = parts[0].strip(), parts[1].strip()
                        start, end = None, None
                        if raw_start == "" and raw_end != "":
                            length = int(raw_end)
                            if length > 0:
                                start = max(0, file_size - length)
                                end = file_size - 1
                        elif raw_start != "" and raw_end == "":
                            start = int(raw_start)
                            end = file_size - 1
                        elif raw_start != "" and raw_end != "":
                            start = int(raw_start)
                            end = int(raw_end)

                        if start is not None and end is not None:
                            if start > end or start >= file_size:
                                self.send_error(http.HTTPStatus.REQUESTED_RANGE_NOT_SATISFIABLE)
                                self.send_header("Content-Range", f"bytes */{file_size}")
                                self.end_headers()
                                f.close()
                                return None

                            end = min(end, file_size - 1)
                            self._range_length = end - start + 1
                            f.seek(start)
                            self.send_response(http.HTTPStatus.PARTIAL_CONTENT)
                            self.send_header("Content-Type", ctype)
                            self.send_header("Content-Range", f"bytes {start}-{end}/{file_size}")
                            self.send_header("Content-Length", str(self._range_length))
                            self.send_header("Accept-Ranges", "bytes")
                            self.send_header("Last-Modified", self.date_time_string(fs.st_mtime))
                            self.end_headers()
                            return f

            # Standard 200 OK
            self._range_length = None
            self.send_response(http.HTTPStatus.OK)
            self.send_header("Content-Type", ctype)
            self.send_header("Content-Length", str(file_size))
            self.send_header("Accept-Ranges", "bytes")
            self.send_header("Last-Modified", self.date_time_string(fs.st_mtime))
            self.end_headers()
            return f
        except Exception:
            f.close()
            raise

    def copyfile(self, source, outputfile):
        try:
            length = getattr(self, "_range_length", None)
            if length is None:
                shutil.copyfileobj(source, outputfile, 64 * 1024)
            else:
                remaining = length
                bufsize = 64 * 1024
                while remaining > 0:
                    chunk = source.read(min(remaining, bufsize))
                    if not chunk:
                        break
                    outputfile.write(chunk)
                    remaining -= len(chunk)
        except Exception as e:
            if not is_client_disconnect(e):
                raise

    def handle(self):
        try:
            super().handle()
        except Exception as e:
            if not is_client_disconnect(e):
                raise

    def finish(self):
        try:
            super().finish()
        except Exception as e:
            if not is_client_disconnect(e):
                raise

class StaticFileServer:
    """Serves a local directory over HTTP in a background daemon thread."""

    def __init__(self, directory: str, port: int = 5174):
        self.directory = directory
        self.port = port
        self._httpd: ThreadedStaticServer | None = None
        self._thread: threading.Thread | None = None

    def start(self) -> str:
        handler = functools.partial(_SilentHandler, directory=self.directory)
        ThreadedStaticServer.allow_reuse_address = True

        # Try preferred port; if occupied, search adjacent ports
        httpd = None
        chosen_port = self.port
        for p in [self.port, self.port + 1, self.port + 2, 0]:
            try:
                httpd = ThreadedStaticServer(("127.0.0.1", p), handler)
                chosen_port = httpd.server_address[1]
                break
            except OSError:
                continue

        if not httpd:
            raise RuntimeError(f"Could not bind static file server to any port starting from {self.port}")

        self._httpd = httpd
        self._thread = threading.Thread(
            target=self._httpd.serve_forever,
            daemon=True,
            name="ThreadPet-StaticServer",
        )
        self._thread.start()
        url = f"http://127.0.0.1:{chosen_port}"
        print(f"[StaticServer] Serving '{self.directory}' → {url}")
        return url

    def stop(self):
        if self._httpd:
            try:
                self._httpd.shutdown()
                self._httpd.server_close()
            except Exception:
                pass


# ---------------------------------------------------------------------------
# GTK / WebKit overlay window
# ---------------------------------------------------------------------------

class DesktopPetOverlay:
    def __init__(self, target_url: str = "http://127.0.0.1:5173", profile: str = "high"):
        self.profile = profile.lower()
        self._static_server: StaticFileServer | None = None

        if self.profile == "low":
            try:
                os.nice(10)  # Lower Linux CPU scheduling priority on low-end devices
            except Exception:
                pass

        # --- Determine URL ---------------------------------------------------
        # If no explicit URL/--dev is requested and dist/ exists, self-host it.
        script_dir = os.path.dirname(os.path.abspath(__file__))
        dist_index = os.path.join(script_dir, "dist", "index.html")

        if target_url == "__auto__":
            if os.path.exists(dist_index):
                dist_dir = os.path.join(script_dir, "dist")
                self._static_server = StaticFileServer(dist_dir, port=5174)
                target_url = self._static_server.start()
                print("[DesktopPetOverlay] ✓ Using built static files")
            else:
                target_url = "http://127.0.0.1:5173"
                print("[DesktopPetOverlay] dist/ not found — falling back to Vite dev server")
                print("  Run 'npm run build' first for the lightest possible CPU footprint.")

        # Append ?profile=low or ?profile=high so React loads with the correct version
        sep = "&" if "?" in target_url else "?"
        target_url = f"{target_url}{sep}profile={self.profile}"
        mode_desc = "Low-End / Eco (8-30 FPS, 1x DPI, Shadows Disabled)" if self.profile == "low" else "High-End / GPU (60 FPS, Retina, Glows & Full Particles)"
        print(f"[DesktopPetOverlay] Mode: {self.profile.upper()} → {mode_desc}")

        # --- GTK Window ------------------------------------------------------
        self.window = Gtk.Window(type=Gtk.WindowType.TOPLEVEL)
        self.window.set_title("ThreadPet AI — Reze & Denji")
        self.window.set_decorated(False)
        self.window.set_keep_above(True)
        self.window.stick()
        self.window.set_skip_taskbar_hint(True)
        self.window.set_skip_pager_hint(True)
        self.window.set_type_hint(Gdk.WindowTypeHint.UTILITY)
        self.window.set_app_paintable(True)

        # Enable true RGBA transparency on Linux GNOME
        screen = self.window.get_screen()
        visual = screen.get_rgba_visual()
        if visual:
            self.window.set_visual(visual)

        # Get screen geometry for fullscreen overlay
        display = Gdk.Display.get_default()
        monitor = display.get_primary_monitor() or display.get_monitor(0)
        if monitor:
            geometry = monitor.get_geometry()
            self.screen_width = geometry.width
            self.screen_height = geometry.height
        else:
            self.screen_width = 1920
            self.screen_height = 1080

        self.window.set_default_size(self.screen_width, self.screen_height)
        self.window.move(0, 0)

        # --- WebKit IPC ------------------------------------------------------
        self.ucm = WebKit2.UserContentManager()
        self.ucm.register_script_message_handler("hitbox")
        self.ucm.connect("script-message-received::hitbox", self.on_hitbox_message)

        self.ucm.register_script_message_handler("save_audio")
        self.ucm.connect("script-message-received::save_audio", self.on_save_audio)

        self.ucm.register_script_message_handler("clear_audio")
        self.ucm.connect("script-message-received::clear_audio", self.on_clear_audio)

        # --- WebKit WebView --------------------------------------------------
        self.webview = WebKit2.WebView.new_with_user_content_manager(self.ucm)
        self.webview.connect("run-file-chooser", self.on_run_file_chooser)
        transparent_color = Gdk.RGBA(0, 0, 0, 0)
        self.webview.set_background_color(transparent_color)

        # Configure WebKit settings
        settings = self.webview.get_settings()
        settings.set_enable_write_console_messages_to_stdout(True)
        settings.set_enable_webaudio(True)
        settings.set_enable_media(True)
        settings.set_enable_mediasource(True)
        settings.set_media_playback_requires_user_gesture(False)
        settings.set_media_playback_allows_inline(True)
        # Hardware acceleration — let GPU handle compositing so CPU is free
        settings.set_hardware_acceleration_policy(
            WebKit2.HardwareAccelerationPolicy.ALWAYS
        )

        self.webview.load_uri(target_url)

        self.window.add(self.webview)
        self.window.connect("destroy", self._on_destroy)
        self.window.connect("realize", self.on_window_realize)

        # Handle SIGINT cleanly
        GLib.unix_signal_add(GLib.PRIORITY_DEFAULT, signal.SIGINT, Gtk.main_quit)

    # -------------------------------------------------------------------------

    def _on_destroy(self, _widget):
        if self._static_server:
            self._static_server.stop()
        Gtk.main_quit()

    def on_run_file_chooser(self, webview, request):
        """Native GTK file dialog so clicking 'Upload Music' works 100% reliably."""
        try:
            dialog = Gtk.FileChooserDialog(
                title="Select Music File for ThreadPet AI",
                parent=self.window,
                action=Gtk.FileChooserAction.OPEN
            )
            dialog.add_buttons(
                Gtk.STOCK_CANCEL, Gtk.ResponseType.CANCEL,
                Gtk.STOCK_OPEN, Gtk.ResponseType.OK
            )
            downloads_dir = os.path.expanduser("~/Downloads")
            if os.path.exists(downloads_dir):
                dialog.set_current_folder(downloads_dir)

            filter_audio = Gtk.FileFilter()
            filter_audio.set_name("Audio Files (*.mp3, *.wav, *.ogg, *.m4a, *.flac)")
            filter_audio.add_mime_type("audio/*")
            for ext in ("*.mp3", "*.wav", "*.ogg", "*.m4a", "*.flac"):
                filter_audio.add_pattern(ext)
            dialog.add_filter(filter_audio)

            filter_all = Gtk.FileFilter()
            filter_all.set_name("All Files")
            filter_all.add_pattern("*")
            dialog.add_filter(filter_all)

            res = dialog.run()
            if res == Gtk.ResponseType.OK:
                selected_file = dialog.get_filename()
                dialog.destroy()
                if selected_file:
                    print(f"[DesktopPetOverlay] User selected audio file: {selected_file}")
                    request.select_files([selected_file])
            else:
                dialog.destroy()
                request.cancel()
        except Exception as err:
            print("[DesktopPetOverlay] File chooser error:", err, file=sys.stderr)
            request.cancel()
        return True

    def on_window_realize(self, widget):
        """Set initial pass-through shape immediately on startup."""
        gdk_win = widget.get_window()
        if gdk_win:
            initial_rect = cairo.RectangleInt(0, 0, self.screen_width, 600)
            gdk_win.input_shape_combine_region(cairo.Region(initial_rect), 0, 0)

    def on_hitbox_message(self, ucm, js_result):
        """Receive dynamic hitboxes from React and configure pass-through shape."""
        try:
            val = js_result.get_js_value()
            if not val:
                return
            msg_str = val.to_string()
            data = json.loads(msg_str)
            region = cairo.Region()
            is_fullscreen_interactive = False

            for r in data:
                rx = max(0, int(r.get('x', 0)))
                ry = max(0, int(r.get('y', 0)))
                rw = max(1, int(r.get('width', 1)))
                rh = max(1, int(r.get('height', 1)))

                if rw >= 1800 or rh >= 1000:
                    is_fullscreen_interactive = True
                    break
                region.union(cairo.RectangleInt(rx, ry, rw, rh))

            gdk_win = self.window.get_window()
            if gdk_win:
                if is_fullscreen_interactive:
                    full_rect = cairo.RectangleInt(0, 0, 10000, 10000)
                    gdk_win.input_shape_combine_region(cairo.Region(full_rect), 0, 0)
                else:
                    gdk_win.input_shape_combine_region(region, 0, 0)
        except Exception as e:
            print("Hitbox processing error:", e, file=sys.stderr)

    def on_save_audio(self, ucm, js_result):
        """Save user uploaded audio to public/ and dist/ folders so it permanently survives restarts!"""
        try:
            val = js_result.get_js_value()
            if not val:
                return
            msg_str = val.to_string()
            data = json.loads(msg_str)
            file_name = data.get('fileName', 'custom_track.mp3')
            base64_data = data.get('base64Data', '')
            if ',' in base64_data:
                base64_data = base64_data.split(',', 1)[1]

            raw_bytes = base64.b64decode(base64_data)
            script_dir = os.path.dirname(os.path.abspath(__file__))
            public_dir = os.path.join(script_dir, "public")
            dist_dir = os.path.join(script_dir, "dist")

            target_dirs = [public_dir]
            if os.path.exists(dist_dir):
                target_dirs.append(dist_dir)

            title = os.path.splitext(file_name)[0]
            for target_dir in target_dirs:
                os.makedirs(target_dir, exist_ok=True)
                target_path = os.path.join(target_dir, "custom_track.audio")
                with open(target_path, "wb") as f:
                    f.write(raw_bytes)

                meta_path = os.path.join(target_dir, "custom_track_meta.json")
                with open(meta_path, "w", encoding="utf-8") as f:
                    json.dump({
                        "title": title,
                        "fileName": file_name,
                        "hasCustom": True,
                        "timestamp": int(os.path.getmtime(target_path) * 1000)
                    }, f)
            print(f"[DesktopPetOverlay] Permanently saved audio: {file_name} ({len(raw_bytes)} bytes)")
        except Exception as e:
            print("[DesktopPetOverlay] Error saving audio:", e, file=sys.stderr)

    def on_clear_audio(self, ucm, js_result):
        """Clear custom audio files from public/ and dist/ directories on user reset."""
        try:
            script_dir = os.path.dirname(os.path.abspath(__file__))
            public_dir = os.path.join(script_dir, "public")
            dist_dir = os.path.join(script_dir, "dist")

            target_dirs = [public_dir]
            if os.path.exists(dist_dir):
                target_dirs.append(dist_dir)

            for target_dir in target_dirs:
                for fname in ("custom_track.audio", "custom_track_meta.json"):
                    path = os.path.join(target_dir, fname)
                    if os.path.exists(path):
                        os.remove(path)
            print("[DesktopPetOverlay] Cleared custom audio files.")
        except Exception as e:
            print("[DesktopPetOverlay] Error clearing audio:", e, file=sys.stderr)

    def run(self):
        try:
            self.window.show_all()
            Gtk.main()
        finally:
            if self._static_server:
                self._static_server.stop()


# ---------------------------------------------------------------------------
# Entry point
# ---------------------------------------------------------------------------

if __name__ == "__main__":
    # Parse args:
    #   --high / --ultra → High CPU & GPU version (60 FPS, Retina, Glows, Particles)
    #   --low  / --eco   → Low-End version (8-30 FPS, 1x DPI, No Shadows, Battery Saver)
    #   --dev            → force Vite dev server at :5173
    #   <url>            → explicit URL
    #   (nothing)        → auto-detect (prefer dist/ with high profile)
    args = sys.argv[1:]

    profile = "high"
    if any(flag in args for flag in ("--low", "--eco", "-low", "low", "eco")):
        profile = "low"
    elif any(flag in args for flag in ("--high", "--ultra", "-high", "high", "ultra")):
        profile = "high"

    if "--dev" in args:
        url = "http://127.0.0.1:5173"
        print("[DesktopPetOverlay] --dev flag: using Vite dev server")
    elif args and not args[0].startswith("-"):
        url = args[0]
    else:
        url = "__auto__"  # sentinel → auto-serve dist/ if available

    app = DesktopPetOverlay(target_url=url, profile=profile)
    app.run()
