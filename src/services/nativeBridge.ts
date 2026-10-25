export interface HitboxRect {
  x: number;
  y: number;
  width: number;
  height: number;
}

class NativeBridge {
  private petRect: HitboxRect | null = null;
  private popupRect: HitboxRect | null = null;
  private extraRects: HitboxRect[] = [];
  private lastJson = '';
  private updateTimer: number | null = null;

  public updateHitboxes(rects: HitboxRect[], immediate = false) {
    this.extraRects = rects;
    this.petRect = null;
    this.popupRect = null;
    this.flush(immediate);
  }

  public setPetHitbox(rect: HitboxRect | null) {
    this.petRect = rect;
    this.flush();
  }

  public setPopupHitbox(rect: HitboxRect | null) {
    this.popupRect = rect;
    this.flush(true); // Immediate update when popup opens or closes
  }

  public setExtraHitboxes(rects: HitboxRect[]) {
    this.extraRects = rects;
    this.flush(true);
  }

  private flush(immediate = false) {
    const list: HitboxRect[] = [];
    if (this.petRect) list.push(this.petRect);
    if (this.popupRect) list.push(this.popupRect);
    for (const r of this.extraRects) list.push(r);

    const jsonStr = JSON.stringify(list);
    if (jsonStr === this.lastJson) return;

    if (immediate) {
      if (this.updateTimer) {
        window.clearTimeout(this.updateTimer);
        this.updateTimer = null;
      }
      this.send(jsonStr);
      return;
    }

    if (this.updateTimer) return;
    this.updateTimer = window.setTimeout(() => {
      this.flush(true);
      this.updateTimer = null;
    }, 30);
  }

  private send(jsonStr: string) {
    this.lastJson = jsonStr;
    try {
      const handler = (
        window as unknown as {
          webkit?: {
            messageHandlers?: {
              hitbox?: {
                postMessage: (msg: string) => void;
              };
            };
          };
        }
      )?.webkit?.messageHandlers?.hitbox;

      if (handler && typeof handler.postMessage === 'function') {
        handler.postMessage(jsonStr);
      }
    } catch {
      // In regular browser mode, silently ignore
    }
  }

  public saveAudioToNative(fileName: string, base64Data: string) {
    try {
      const handler = (
        window as unknown as {
          webkit?: {
            messageHandlers?: {
              save_audio?: {
                postMessage: (msg: string) => void;
              };
            };
          };
        }
      )?.webkit?.messageHandlers?.save_audio;

      if (handler && typeof handler.postMessage === 'function') {
        handler.postMessage(JSON.stringify({ fileName, base64Data }));
      }
    } catch {
      // In regular browser mode
    }
  }

  public clearAudioFromNative() {
    try {
      const handler = (
        window as unknown as {
          webkit?: {
            messageHandlers?: {
              clear_audio?: {
                postMessage: (msg: string) => void;
              };
            };
          };
        }
      )?.webkit?.messageHandlers?.clear_audio;

      if (handler && typeof handler.postMessage === 'function') {
        handler.postMessage('clear');
      }
    } catch {
      // In regular browser mode
    }
  }
}

export const nativeBridge = new NativeBridge();
