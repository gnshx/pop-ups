#!/usr/bin/env python3
"""
ThreadPet AI - Native Linux GNOME Desktop Transparent Overlay
Runs a frameless, 100% transparent, always-on-top window directly on your Ubuntu desktop.
Features dynamic input-shape masking so clicks pass through to other applications!
"""

import sys
import os
import signal
import json
import base64
import gi

# Prefer X11 backend for guaranteed stick(), keep_above(), and ShapeInput pass-through on GNOME
if "DISPLAY" in os.environ and "GDK_BACKEND" not in os.environ:
    os.environ["GDK_BACKEND"] = "x11"

gi.require_version('Gtk', '3.0')
gi.require_version('Gdk', '3.0')
gi.require_version('WebKit2', '4.1')

from gi.repository import Gtk, Gdk, WebKit2, GLib
import cairo

class DesktopPetOverlay:
    def __init__(self, target_url="http://127.0.0.1:5173"):
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

        # Set up IPC UserContentManager for dynamic click-through hitboxes & audio persistence
        self.ucm = WebKit2.UserContentManager()
        self.ucm.register_script_message_handler("hitbox")
        self.ucm.connect("script-message-received::hitbox", self.on_hitbox_message)

        self.ucm.register_script_message_handler("save_audio")
        self.ucm.connect("script-message-received::save_audio", self.on_save_audio)

        self.ucm.register_script_message_handler("clear_audio")
        self.ucm.connect("script-message-received::clear_audio", self.on_clear_audio)

        # WebKit Webview with content manager
        self.webview = WebKit2.WebView.new_with_user_content_manager(self.ucm)
        self.webview.connect("run-file-chooser", self.on_run_file_chooser)
        transparent_color = Gdk.RGBA(0, 0, 0, 0)
        self.webview.set_background_color(transparent_color)

        # Configure WebKit Settings for uninhibited Audio and Media playback
        settings = self.webview.get_settings()
        settings.set_enable_write_console_messages_to_stdout(True)
        settings.set_enable_webaudio(True)
        settings.set_enable_media(True)
        settings.set_enable_mediasource(True)
        settings.set_media_playback_requires_user_gesture(False)
        settings.set_media_playback_allows_inline(True)

        self.webview.load_uri(target_url)

        self.window.add(self.webview)
        self.window.connect("destroy", Gtk.main_quit)
        self.window.connect("realize", self.on_window_realize)

        # Handle SIGINT cleanly
        GLib.unix_signal_add(GLib.PRIORITY_DEFAULT, signal.SIGINT, Gtk.main_quit)

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
            filter_audio.add_pattern("*.mp3")
            filter_audio.add_pattern("*.wav")
            filter_audio.add_pattern("*.ogg")
            filter_audio.add_pattern("*.m4a")
            filter_audio.add_pattern("*.flac")
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
        """Save user uploaded audio to public/ folder so it permanently survives restarts!"""
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
            os.makedirs(public_dir, exist_ok=True)

            target_path = os.path.join(public_dir, "custom_track.audio")
            with open(target_path, "wb") as f:
                f.write(raw_bytes)

            meta_path = os.path.join(public_dir, "custom_track_meta.json")
            title = os.path.splitext(file_name)[0]
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
        """Clear custom audio files from public directory on user reset."""
        try:
            script_dir = os.path.dirname(os.path.abspath(__file__))
            public_dir = os.path.join(script_dir, "public")
            target_path = os.path.join(public_dir, "custom_track.audio")
            meta_path = os.path.join(public_dir, "custom_track_meta.json")
            if os.path.exists(target_path):
                os.remove(target_path)
            if os.path.exists(meta_path):
                os.remove(meta_path)
            print("[DesktopPetOverlay] Cleared custom audio files.")
        except Exception as e:
            print("[DesktopPetOverlay] Error clearing audio:", e, file=sys.stderr)

    def run(self):
        self.window.show_all()
        Gtk.main()

if __name__ == "__main__":
    url = sys.argv[1] if len(sys.argv) > 1 else "http://127.0.0.1:5173"
    app = DesktopPetOverlay(target_url=url)
    app.run()
