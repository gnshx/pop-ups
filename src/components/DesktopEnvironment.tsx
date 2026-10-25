import React from 'react';
import { Terminal, Folder, Globe, Music, Code2, Sparkles } from 'lucide-react';

interface DesktopEnvironmentProps {
  isSimulated: boolean;
  wallpaperIndex: number;
}

const WALLPAPERS = [
  {
    id: 'ubuntu',
    name: 'Ubuntu GNOME Modern',
    background: 'radial-gradient(circle at 80% 20%, #77216F 0%, #5E2750 40%, #2C001E 100%)',
    showDock: true,
  },
  {
    id: 'cyberpunk',
    name: 'Cyberpunk Neon Matrix',
    background: 'linear-gradient(135deg, #090d16 0%, #0c1a2d 50%, #17092b 100%)',
    showDock: false,
  },
  {
    id: 'lofi_room',
    name: 'Lofi Cozy Room Sunset',
    background: 'radial-gradient(circle at 30% 30%, #4a2545 0%, #291b2c 50%, #110e19 100%)',
    showDock: false,
  },
  {
    id: 'deep_obsidian',
    name: 'Deep Obsidian Minimalist',
    background: '#09090b',
    showDock: false,
  },
];

export const DesktopEnvironment: React.FC<DesktopEnvironmentProps> = ({
  isSimulated,
  wallpaperIndex,
}) => {
  if (!isSimulated) {
    // Pure Transparent Overlay Mode
    return (
      <div
        className="pure-transparent-desktop"
        style={{
          position: 'fixed',
          inset: 0,
          background: 'transparent',
          pointerEvents: 'none',
          zIndex: 1,
        }}
      />
    );
  }

  const currentWp = WALLPAPERS[wallpaperIndex % WALLPAPERS.length];

  return (
    <div
      className="simulated-desktop-container"
      style={{
        position: 'fixed',
        inset: 0,
        background: currentWp.background,
        overflow: 'hidden',
        zIndex: 0,
        userSelect: 'none',
      }}
    >
      {/* Background Ambient Glow */}
      <div className="ambient-glow" />

      {/* Simulated GNOME Ubuntu Left Dock */}
      {currentWp.showDock && (
        <div className="simulated-gnome-dock">
          <div className="dock-app-icon" title="Files">
            <Folder className="icon-sm text-amber-400" />
          </div>
          <div className="dock-app-icon" title="Web Browser">
            <Globe className="icon-sm text-sky-400" />
          </div>
          <div className="dock-app-icon" title="Terminal">
            <Terminal className="icon-sm text-emerald-400" />
          </div>
          <div className="dock-app-icon" title="Music">
            <Music className="icon-sm text-pink-400" />
          </div>
          <div className="dock-app-icon active-app" title="Code Editor">
            <Code2 className="icon-sm text-indigo-400" />
          </div>
        </div>
      )}

      {/* Simulated Background Window for Realism */}
      <div className="simulated-workspace-window">
        <div className="window-header">
          <div className="window-dots">
            <span className="dot dot-red" />
            <span className="dot dot-yellow" />
            <span className="dot dot-green" />
          </div>
          <span className="window-title">code ~/projects/desktop-companion — Visual Studio Code</span>
        </div>
        <div className="window-body">
          <div className="code-line">
            <span className="token-keyword">import</span> {'{'} ThreadPet {'}'}{' '}
            <span className="token-keyword">from</span>{' '}
            <span className="token-string">'@ai/companion'</span>;
          </div>
          <div className="code-line">
            <span className="token-comment">// 🧵 Anime character hanging from top of screen</span>
          </div>
          <div className="code-line">
            <span className="token-keyword">const</span> pet ={' '}
            <span className="token-fn">createPet</span>({'{'}
          </div>
          <div className="code-line indent">
            hair: <span className="token-string">'silver-twintails'</span>,
          </div>
          <div className="code-line indent">
            physics: <span className="token-string">'damped-pendulum'</span>,
          </div>
          <div className="code-line indent">
            music: <span className="token-string">'lofi-chillhop'</span>,
          </div>
          <div className="code-line">{'}'});</div>
          <div className="code-line">
            pet.<span className="token-fn">hangFromTop</span>();
          </div>
        </div>
      </div>

      {/* Subtle Hint Badge */}
      <div className="desktop-simulator-watermark">
        <Sparkles className="icon-xs" />
        <span>Simulated Desktop Mode Active • Switch to Transparent in Top Bar</span>
      </div>
    </div>
  );
};
