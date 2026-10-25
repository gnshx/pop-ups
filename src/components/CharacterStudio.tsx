import React, { useState } from 'react';
import {
  X,
  Wand2,
  Sparkles,
  Download,
  RotateCcw,
  Check,
  Sliders,
  Scissors,
  Palette,
  Eye,
  Shirt,
} from 'lucide-react';
import type {
  CharacterConfig,
  HairStyle,
  AccessoryType,
  ThreadType,
  ExpressionType,
} from '../types/pet';
import { DEFAULT_CHARACTERS } from '../constants/presets';
import { audioEngine } from '../services/audioEngine';

interface CharacterStudioProps {
  isOpen: boolean;
  onClose: () => void;
  currentCharacter: CharacterConfig;
  onUpdateCharacter: (char: CharacterConfig) => void;
  onSelectPreset: (char: CharacterConfig) => void;
}

export const CharacterStudio: React.FC<CharacterStudioProps> = ({
  isOpen,
  onClose,
  currentCharacter,
  onUpdateCharacter,
  onSelectPreset,
}) => {
  const [activeTab, setActiveTab] = useState<'ai' | 'customize' | 'presets'>('ai');
  const [promptText, setPromptText] = useState('');
  const [isGenerating, setIsGenerating] = useState(false);
  const [saveSuccess, setSaveSuccess] = useState(false);

  if (!isOpen) return null;

  // AI Prompt Parser & Generator
  const handleAIGenerate = () => {
    if (!promptText.trim()) return;
    setIsGenerating(true);
    audioEngine.playChime('touch');

    setTimeout(() => {
      const text = promptText.toLowerCase();

      // Detect Hair Style
      let hairStyle: HairStyle = 'twintails';
      if (text.includes('short') || text.includes('boy')) hairStyle = 'short';
      else if (text.includes('bob')) hairStyle = 'bob';
      else if (text.includes('flowing') || text.includes('long')) hairStyle = 'flowing';
      else if (text.includes('curly') || text.includes('wavy')) hairStyle = 'curly';

      // Detect Hair Color
      let hairColor = '#e0e7ff';
      let hairHighlight = '#c7d2fe';
      if (text.includes('silver') || text.includes('white') || text.includes('grey')) {
        hairColor = '#e2e8f0';
        hairHighlight = '#ffffff';
      } else if (text.includes('pink') || text.includes('sakura')) {
        hairColor = '#f472b6';
        hairHighlight = '#fbcfe8';
      } else if (text.includes('blue') || text.includes('cyan')) {
        hairColor = '#38bdf8';
        hairHighlight = '#bae6fd';
      } else if (text.includes('purple') || text.includes('violet') || text.includes('lavender')) {
        hairColor = '#a855f7';
        hairHighlight = '#e9d5ff';
      } else if (text.includes('gold') || text.includes('blonde') || text.includes('yellow')) {
        hairColor = '#facc15';
        hairHighlight = '#fef08a';
      } else if (text.includes('black') || text.includes('dark')) {
        hairColor = '#1e1b4b';
        hairHighlight = '#3b82f6';
      }

      // Detect Eye Color
      let eyeColor = '#38bdf8';
      if (text.includes('blue eye') || text.includes('cyan eye')) eyeColor = '#38bdf8';
      else if (text.includes('red eye') || text.includes('ruby')) eyeColor = '#f43f5e';
      else if (text.includes('gold eye') || text.includes('amber')) eyeColor = '#f59e0b';
      else if (text.includes('green eye') || text.includes('emerald')) eyeColor = '#10b981';
      else if (text.includes('purple eye') || text.includes('violet')) eyeColor = '#a855f7';

      // Detect Accessories
      const accessories: AccessoryType[] = [];
      let accessoryColor = '#fb7185';
      if (text.includes('cat ear') || text.includes('neko') || text.includes('kitten')) {
        accessories.push('cat_ears');
      }
      if (text.includes('bunny') || text.includes('rabbit')) {
        accessories.push('bunny_ears');
      }
      if (text.includes('headset') || text.includes('headphone') || text.includes('gamer')) {
        accessories.push('headset');
        accessoryColor = '#06b6d4';
      }
      if (text.includes('halo') || text.includes('angel')) {
        accessories.push('halo');
      }
      if (text.includes('ribbon') || text.includes('bow')) {
        accessories.push('ribbon');
      }
      if (accessories.length === 0) {
        accessories.push('cat_ears');
      }

      // Detect Hoodie Color
      let hoodieColor = '#18181b';
      let hoodieAccent = '#38bdf8';
      if (text.includes('white hoodie') || text.includes('cream hoodie') || text.includes('pastel')) {
        hoodieColor = '#f8fafc';
        hoodieAccent = '#f43f5e';
      } else if (text.includes('purple hoodie') || text.includes('lavender hoodie')) {
        hoodieColor = '#2e1065';
        hoodieAccent = '#c084fc';
      } else if (text.includes('pink hoodie')) {
        hoodieColor = '#fdf2f8';
        hoodieAccent = '#ec4899';
      }

      // Detect Thread Type
      let threadType: ThreadType = 'crimson_silk';
      let threadColor = '#f43f5e';
      if (text.includes('gold thread') || text.includes('golden wire')) {
        threadType = 'golden_wire';
        threadColor = '#fbbf24';
      } else if (text.includes('neon') || text.includes('cyan thread')) {
        threadType = 'neon_cyan';
        threadColor = '#06b6d4';
      } else if (text.includes('purple thread')) {
        threadType = 'twilight_purple';
        threadColor = '#c084fc';
      }

      // Detect Expression
      let expression: ExpressionType = 'idle';
      if (text.includes('sleepy') || text.includes('tired')) expression = 'sleepy';
      else if (text.includes('happy') || text.includes('cheerful') || text.includes('smile')) expression = 'happy';
      else if (text.includes('surprised') || text.includes('curious')) expression = 'surprised';

      const generatedChar: CharacterConfig = {
        ...currentCharacter,
        id: `ai-${Date.now()}`,
        name: `AI Companion (${hairColor === '#e2e8f0' ? 'Silver' : 'Custom'})`,
        personality: promptText,
        hairStyle,
        hairColor,
        hairHighlight,
        eyeColor,
        hoodieColor,
        hoodieAccent,
        accessories,
        accessoryColor,
        threadType,
        threadColor,
        currentExpression: expression,
      };

      onUpdateCharacter(generatedChar);
      setIsGenerating(false);
      audioEngine.playChime('wake');
      setSaveSuccess(true);
      setTimeout(() => setSaveSuccess(false), 2000);
    }, 700);
  };

  const samplePrompts = [
    'Cute anime girl with silver twintails, black oversized hoodie, glowing neon cyan cat ears, and sleepy expression',
    'Pastel pink flowing hair, bunny ears, white cozy hoodie with lavender ribbons, happy smiling expression',
    'Midnight cyber boy with dark indigo hair, neon teal eyes, gamer headset and golden wire thread',
    'Angelic star-gazer with sky blue bob cut, golden halo, amber eyes and deep navy sweater',
  ];

  const toggleAccessory = (acc: AccessoryType) => {
    let list = [...currentCharacter.accessories];
    if (list.includes(acc)) {
      list = list.filter((a) => a !== acc);
    } else {
      list.push(acc);
    }
    onUpdateCharacter({ ...currentCharacter, accessories: list });
  };

  const handleExportJSON = () => {
    const dataStr = 'data:text/json;charset=utf-8,' + encodeURIComponent(JSON.stringify(currentCharacter, null, 2));
    const downloadAnchor = document.createElement('a');
    downloadAnchor.setAttribute('href', dataStr);
    downloadAnchor.setAttribute('download', `${currentCharacter.name.replace(/\s+/g, '_')}_pet.json`);
    document.body.appendChild(downloadAnchor);
    downloadAnchor.click();
    downloadAnchor.remove();
  };

  return (
    <div className="studio-modal-backdrop">
      <div className="studio-modal-card">
        {/* Header */}
        <div className="studio-header">
          <div className="studio-title-group">
            <div className="studio-icon-badge">
              <Sparkles className="icon-sm text-primary" />
            </div>
            <div>
              <h2 className="studio-title">AI Character Studio</h2>
              <p className="studio-subtitle">Design, customize, and animate your desktop hanging companion</p>
            </div>
          </div>
          <button className="btn-close" onClick={onClose} aria-label="Close Studio">
            <X className="icon-sm" />
          </button>
        </div>

        {/* Studio Navigation Tabs */}
        <div className="studio-tabs">
          <button
            className={`studio-tab-btn ${activeTab === 'ai' ? 'tab-active' : ''}`}
            onClick={() => setActiveTab('ai')}
          >
            <Wand2 className="icon-xs" />
            <span>AI Prompt Designer</span>
          </button>
          <button
            className={`studio-tab-btn ${activeTab === 'customize' ? 'tab-active' : ''}`}
            onClick={() => setActiveTab('customize')}
          >
            <Palette className="icon-xs" />
            <span>Visual Customizer</span>
          </button>
          <button
            className={`studio-tab-btn ${activeTab === 'presets' ? 'tab-active' : ''}`}
            onClick={() => setActiveTab('presets')}
          >
            <Sliders className="icon-xs" />
            <span>Preset Gallery</span>
          </button>
        </div>

        {/* Tab 1: AI Prompt Designer */}
        {activeTab === 'ai' && (
          <div className="studio-tab-content">
            <div className="ai-input-card">
              <label className="ai-input-label">
                <Wand2 className="icon-xs" /> Describe your ideal desktop companion
              </label>
              <textarea
                className="ai-textarea"
                rows={3}
                placeholder="E.g., A cute anime girl with long silver hair, neon blue eyes, oversized black hoodie, cat ears, and a sleepy expression..."
                value={promptText}
                onChange={(e) => setPromptText(e.target.value)}
              />

              <div className="ai-actions-row">
                <button
                  className="btn-generate-ai"
                  onClick={handleAIGenerate}
                  disabled={isGenerating || !promptText.trim()}
                >
                  <Sparkles className={`icon-xs ${isGenerating ? 'spin' : ''}`} />
                  <span>{isGenerating ? 'Synthesizing Character...' : 'Generate with AI'}</span>
                </button>
              </div>
            </div>

            {/* Quick Inspiration Prompts */}
            <div className="inspiration-section">
              <span className="inspiration-title">Try an example prompt:</span>
              <div className="prompt-pills-list">
                {samplePrompts.map((p, idx) => (
                  <button
                    key={idx}
                    className="prompt-pill"
                    onClick={() => {
                      setPromptText(p);
                    }}
                  >
                    "{p.slice(0, 50)}..."
                  </button>
                ))}
              </div>
            </div>
          </div>
        )}

        {/* Tab 2: Visual Customizer */}
        {activeTab === 'customize' && (
          <div className="studio-tab-content scrollable-content">
            {/* 1. Hair Settings */}
            <div className="custom-section">
              <h3 className="section-title">
                <Scissors className="icon-xs" /> Hair & Hairstyle
              </h3>
              <div className="option-row">
                <label className="option-label">Style:</label>
                <div className="pill-btn-group">
                  {(['twintails', 'bob', 'flowing', 'short', 'curly'] as HairStyle[]).map((style) => (
                    <button
                      key={style}
                      className={`pill-choice ${currentCharacter.hairStyle === style ? 'pill-active' : ''}`}
                      onClick={() => onUpdateCharacter({ ...currentCharacter, hairStyle: style })}
                    >
                      {style}
                    </button>
                  ))}
                </div>
              </div>

              <div className="option-row">
                <label className="option-label">Hair Color:</label>
                <div className="color-picker-row">
                  {['#e0e7ff', '#f472b6', '#38bdf8', '#a855f7', '#facc15', '#1e1b4b', '#18181b'].map((color) => (
                    <button
                      key={color}
                      className={`color-swatch ${currentCharacter.hairColor === color ? 'swatch-active' : ''}`}
                      style={{ backgroundColor: color }}
                      onClick={() => onUpdateCharacter({ ...currentCharacter, hairColor: color })}
                      aria-label={`Select hair color ${color}`}
                    />
                  ))}
                  <input
                    type="color"
                    value={currentCharacter.hairColor}
                    onChange={(e) => onUpdateCharacter({ ...currentCharacter, hairColor: e.target.value })}
                    className="native-color-picker"
                  />
                </div>
              </div>
            </div>

            {/* 2. Eyes & Expression */}
            <div className="custom-section">
              <h3 className="section-title">
                <Eye className="icon-xs" /> Eyes & Expression
              </h3>
              <div className="option-row">
                <label className="option-label">Eye Color:</label>
                <div className="color-picker-row">
                  {['#38bdf8', '#a855f7', '#f43f5e', '#2dd4bf', '#f59e0b', '#10b981', '#6366f1'].map((color) => (
                    <button
                      key={color}
                      className={`color-swatch ${currentCharacter.eyeColor === color ? 'swatch-active' : ''}`}
                      style={{ backgroundColor: color }}
                      onClick={() => onUpdateCharacter({ ...currentCharacter, eyeColor: color })}
                      aria-label={`Select eye color ${color}`}
                    />
                  ))}
                  <input
                    type="color"
                    value={currentCharacter.eyeColor}
                    onChange={(e) => onUpdateCharacter({ ...currentCharacter, eyeColor: e.target.value })}
                    className="native-color-picker"
                  />
                </div>
              </div>

              <div className="option-row">
                <label className="option-label">Test Expression:</label>
                <div className="pill-btn-group">
                  {(['idle', 'happy', 'sleepy', 'surprised', 'dancing', 'dizzy'] as ExpressionType[]).map((expr) => (
                    <button
                      key={expr}
                      className={`pill-choice ${currentCharacter.currentExpression === expr ? 'pill-active' : ''}`}
                      onClick={() => {
                        onUpdateCharacter({ ...currentCharacter, currentExpression: expr });
                        audioEngine.playChime(expr === 'sleepy' ? 'sleep' : expr === 'happy' ? 'giggle' : 'touch');
                      }}
                    >
                      {expr}
                    </button>
                  ))}
                </div>
              </div>
            </div>

            {/* 3. Hoodie & Outfit */}
            <div className="custom-section">
              <h3 className="section-title">
                <Shirt className="icon-xs" /> Hoodie & Outfit
              </h3>
              <div className="option-row">
                <label className="option-label">Hoodie Color:</label>
                <div className="color-picker-row">
                  {['#18181b', '#09090b', '#fdf2f8', '#f8fafc', '#1e1b4b', '#14532d', '#4c1d95'].map((color) => (
                    <button
                      key={color}
                      className={`color-swatch ${currentCharacter.hoodieColor === color ? 'swatch-active' : ''}`}
                      style={{ backgroundColor: color }}
                      onClick={() => onUpdateCharacter({ ...currentCharacter, hoodieColor: color })}
                      aria-label={`Select hoodie color ${color}`}
                    />
                  ))}
                  <input
                    type="color"
                    value={currentCharacter.hoodieColor}
                    onChange={(e) => onUpdateCharacter({ ...currentCharacter, hoodieColor: e.target.value })}
                    className="native-color-picker"
                  />
                </div>
              </div>

              <div className="option-row">
                <label className="option-label">Accent Trim:</label>
                <div className="color-picker-row">
                  {['#818cf8', '#f43f5e', '#06b6d4', '#fbbf24', '#ec4899', '#22c55e'].map((color) => (
                    <button
                      key={color}
                      className={`color-swatch ${currentCharacter.hoodieAccent === color ? 'swatch-active' : ''}`}
                      style={{ backgroundColor: color }}
                      onClick={() => onUpdateCharacter({ ...currentCharacter, hoodieAccent: color })}
                      aria-label={`Select hoodie accent ${color}`}
                    />
                  ))}
                  <input
                    type="color"
                    value={currentCharacter.hoodieAccent}
                    onChange={(e) => onUpdateCharacter({ ...currentCharacter, hoodieAccent: e.target.value })}
                    className="native-color-picker"
                  />
                </div>
              </div>
            </div>

            {/* 4. Accessories */}
            <div className="custom-section">
              <h3 className="section-title">
                <Sparkles className="icon-xs" /> Accessories
              </h3>
              <div className="accessories-grid">
                {[
                  { key: 'cat_ears', label: 'Cat Ears' },
                  { key: 'bunny_ears', label: 'Bunny Ears' },
                  { key: 'halo', label: 'Angel Halo' },
                  { key: 'headset', label: 'Gamer Headset' },
                  { key: 'ribbon', label: 'Silk Ribbon' },
                ].map(({ key, label }) => {
                  const isChecked = currentCharacter.accessories.includes(key as AccessoryType);
                  return (
                    <button
                      key={key}
                      className={`accessory-btn ${isChecked ? 'accessory-active' : ''}`}
                      onClick={() => toggleAccessory(key as AccessoryType)}
                    >
                      <span>{label}</span>
                      {isChecked && <Check className="icon-xs text-primary" />}
                    </button>
                  );
                })}
              </div>
            </div>

            {/* 5. Hanging Thread & Physics Length */}
            <div className="custom-section">
              <h3 className="section-title">
                <Sliders className="icon-xs" /> Thread & Physics Geometry
              </h3>
              <div className="option-row">
                <label className="option-label">Thread Type:</label>
                <div className="pill-btn-group">
                  {(['crimson_silk', 'golden_wire', 'neon_cyan', 'twilight_purple', 'invisible'] as ThreadType[]).map(
                    (type) => (
                      <button
                        key={type}
                        className={`pill-choice ${currentCharacter.threadType === type ? 'pill-active' : ''}`}
                        onClick={() => onUpdateCharacter({ ...currentCharacter, threadType: type })}
                      >
                        {type.replace('_', ' ')}
                      </button>
                    )
                  )}
                </div>
              </div>

              <div className="slider-control-row">
                <div className="slider-label-row">
                  <span className="slider-title">Thread Length:</span>
                  <span className="slider-value">{currentCharacter.threadLength}px</span>
                </div>
                <input
                  type="range"
                  min="100"
                  max="320"
                  value={currentCharacter.threadLength}
                  onChange={(e) => onUpdateCharacter({ ...currentCharacter, threadLength: parseInt(e.target.value) })}
                  className="gnome-range-input"
                />
              </div>

              <div className="slider-control-row">
                <div className="slider-label-row">
                  <span className="slider-title">Character Scale:</span>
                  <span className="slider-value">{Math.round(currentCharacter.scale * 100)}%</span>
                </div>
                <input
                  type="range"
                  min="0.7"
                  max="1.4"
                  step="0.05"
                  value={currentCharacter.scale}
                  onChange={(e) => onUpdateCharacter({ ...currentCharacter, scale: parseFloat(e.target.value) })}
                  className="gnome-range-input"
                />
              </div>
            </div>
          </div>
        )}

        {/* Tab 3: Preset Gallery */}
        {activeTab === 'presets' && (
          <div className="studio-tab-content">
            <div className="presets-grid">
              {DEFAULT_CHARACTERS.map((preset) => (
                <div
                  key={preset.id}
                  className={`preset-card ${currentCharacter.id === preset.id ? 'preset-active' : ''}`}
                  onClick={() => {
                    onSelectPreset(preset);
                    audioEngine.playChime('touch');
                  }}
                  role="button"
                  tabIndex={0}
                >
                  <div className="preset-card-header">
                    <span className="preset-name">{preset.name}</span>
                    {currentCharacter.id === preset.id && (
                      <span className="active-badge">Active</span>
                    )}
                  </div>
                  <p className="preset-desc">{preset.personality}</p>
                  <div className="preset-tags">
                    <span className="tag-pill">{preset.hairStyle}</span>
                    <span className="tag-pill">{preset.accessories.join(', ') || 'No accessories'}</span>
                    <span className="tag-pill">{preset.threadType.replace('_', ' ')}</span>
                  </div>
                </div>
              ))}
            </div>
          </div>
        )}

        {/* Footer Actions */}
        <div className="studio-footer">
          <div className="footer-left">
            <button className="btn-secondary" onClick={handleExportJSON}>
              <Download className="icon-xs" />
              <span>Export JSON</span>
            </button>
            <button
              className="btn-secondary"
              onClick={() => {
                onSelectPreset(DEFAULT_CHARACTERS[0]);
                audioEngine.playChime('touch');
              }}
            >
              <RotateCcw className="icon-xs" />
              <span>Reset Luna</span>
            </button>
          </div>

          <div className="footer-right">
            {saveSuccess && <span className="save-toast text-emerald-400">Applied to Desktop!</span>}
            <button className="btn-primary" onClick={onClose}>
              Done
            </button>
          </div>
        </div>
      </div>
    </div>
  );
};
