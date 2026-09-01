import React, { useState, useRef, useEffect } from 'react';
import { Palette, Sun, Moon, Check, Sparkles, Sliders, RotateCcw, Wand2, Paintbrush } from 'lucide-react';
import { soundEffects } from './SoundUtility';

export type ColorTheme = 
  | 'indigo' 
  | 'emerald' 
  | 'amber' 
  | 'violet' 
  | 'obsidian' 
  | 'cyberpunk' 
  | 'gold' 
  | 'crimson' 
  | 'rose' 
  | 'nordic' 
  | 'custom';

export interface CustomThemeConfig {
  primaryColor: string;
  secondaryColor: string;
}

export interface ThemeSelectorProps {
  mode: 'light' | 'dark';
  colorTheme: ColorTheme;
  customConfig?: CustomThemeConfig;
  onModeChange: (mode: 'light' | 'dark') => void;
  onColorThemeChange: (theme: ColorTheme, customConfig?: CustomThemeConfig) => void;
}

export const THEME_PRESETS: { id: ColorTheme; label: string; primaryColor: string; secondaryColor: string; bgBadge: string; tag?: string }[] = [
  {
    id: 'indigo',
    label: 'Indigo Ocean',
    primaryColor: '#6366f1',
    secondaryColor: '#8b5cf6',
    bgBadge: 'from-indigo-500 to-violet-500',
  },
  {
    id: 'emerald',
    label: 'Emerald Mint',
    primaryColor: '#10b981',
    secondaryColor: '#06b6d4',
    bgBadge: 'from-emerald-500 to-teal-500',
  },
  {
    id: 'amber',
    label: 'Sunset Amber',
    primaryColor: '#f59e0b',
    secondaryColor: '#f43f5e',
    bgBadge: 'from-amber-500 to-rose-500',
  },
  {
    id: 'violet',
    label: 'Royal Violet',
    primaryColor: '#a855f7',
    secondaryColor: '#ec4899',
    bgBadge: 'from-purple-500 to-pink-500',
  },
  {
    id: 'obsidian',
    label: 'Obsidian Slate',
    primaryColor: '#64748b',
    secondaryColor: '#3b82f6',
    bgBadge: 'from-slate-600 to-blue-500',
  },
  {
    id: 'cyberpunk',
    label: 'Cyber Neon',
    primaryColor: '#00f0ff',
    secondaryColor: '#ff007f',
    bgBadge: 'from-cyan-400 to-pink-500',
    tag: 'NEW',
  },
  {
    id: 'gold',
    label: 'Golden Luxury',
    primaryColor: '#f59e0b',
    secondaryColor: '#d97706',
    bgBadge: 'from-amber-400 to-amber-600',
    tag: 'NEW',
  },
  {
    id: 'crimson',
    label: 'Crimson Ember',
    primaryColor: '#ef4444',
    secondaryColor: '#f97316',
    bgBadge: 'from-red-500 to-orange-500',
    tag: 'NEW',
  },
  {
    id: 'rose',
    label: 'Midnight Rose',
    primaryColor: '#f43f5e',
    secondaryColor: '#9333ea',
    bgBadge: 'from-rose-500 to-purple-600',
    tag: 'NEW',
  },
  {
    id: 'nordic',
    label: 'Nordic Ice',
    primaryColor: '#06b6d4',
    secondaryColor: '#3b82f6',
    bgBadge: 'from-cyan-500 to-blue-500',
    tag: 'NEW',
  },
];

export const ThemeSelector: React.FC<ThemeSelectorProps> = ({
  mode,
  colorTheme,
  customConfig = { primaryColor: '#3b82f6', secondaryColor: '#8b5cf6' },
  onModeChange,
  onColorThemeChange,
}) => {
  const [isOpen, setIsOpen] = useState(false);
  const [activeTab, setActiveTab] = useState<'presets' | 'custom'>('presets');
  const [customPrimary, setCustomPrimary] = useState(customConfig.primaryColor);
  const [customSecondary, setCustomSecondary] = useState(customConfig.secondaryColor);
  const menuRef = useRef<HTMLDivElement>(null);

  // Sync custom state when props change
  useEffect(() => {
    setCustomPrimary(customConfig.primaryColor);
    setCustomSecondary(customConfig.secondaryColor);
  }, [customConfig]);

  // Close dropdown on outside click
  useEffect(() => {
    const handleClickOutside = (e: MouseEvent) => {
      if (menuRef.current && !menuRef.current.contains(e.target as Node)) {
        setIsOpen(false);
      }
    };
    document.addEventListener('mousedown', handleClickOutside);
    return () => document.removeEventListener('mousedown', handleClickOutside);
  }, []);

  const activePreset = colorTheme === 'custom'
    ? { id: 'custom' as ColorTheme, label: 'Custom Palette', primaryColor: customPrimary, secondaryColor: customSecondary, bgBadge: 'from-blue-500 to-purple-500' }
    : THEME_PRESETS.find(p => p.id === colorTheme) || THEME_PRESETS[0];

  const handleCustomApply = (primary: string, secondary: string) => {
    soundEffects.playTick();
    setCustomPrimary(primary);
    setCustomSecondary(secondary);
    onColorThemeChange('custom', { primaryColor: primary, secondaryColor: secondary });
  };

  return (
    <div className="relative inline-block text-left" ref={menuRef}>
      {/* Theme Trigger Button */}
      <button
        id="theme-selector-trigger"
        type="button"
        onClick={() => {
          soundEffects.playTick();
          setIsOpen(prev => !prev);
        }}
        className="flex items-center space-x-2 px-3 py-1.5 rounded-xl bg-white/80 dark:bg-slate-800/80 border border-slate-200/80 dark:border-slate-700/60 shadow-xs hover:border-indigo-400 dark:hover:border-indigo-500 transition-all duration-200 cursor-pointer backdrop-blur-md group"
        title="Customize Theme & Studio Palette"
      >
        <div className="relative flex items-center justify-center">
          <Palette className="w-4 h-4 text-slate-600 dark:text-slate-300 group-hover:rotate-12 transition-transform duration-300" />
          <span 
            className="absolute -top-0.5 -right-0.5 w-2.5 h-2.5 rounded-full ring-2 ring-white dark:ring-slate-900 shadow-xs" 
            style={{ backgroundColor: activePreset.primaryColor }}
          />
        </div>

        <span className="text-xs font-bold text-slate-700 dark:text-slate-200 hidden sm:inline-block">
          {activePreset.label}
        </span>

        <div className="flex items-center space-x-1 pl-1 border-l border-slate-200 dark:border-slate-700">
          {mode === 'light' ? (
            <Sun className="w-3.5 h-3.5 text-amber-500" />
          ) : (
            <Moon className="w-3.5 h-3.5 text-indigo-400" />
          )}
        </div>
      </button>

      {/* Theme Popover Panel */}
      {isOpen && (
        <div 
          id="theme-selector-menu"
          className="fixed sm:absolute top-16 sm:top-auto right-3 sm:right-0 mt-2 w-[calc(100vw-1.5rem)] sm:w-72 max-w-xs sm:max-w-sm rounded-2xl bg-white/95 dark:bg-slate-900/95 border border-slate-200/80 dark:border-slate-800/80 shadow-2xl p-4 z-50 backdrop-blur-2xl animate-fadeInUp space-y-3.5 max-h-[80vh] overflow-y-auto"
        >
          {/* Header */}
          <div className="flex items-center justify-between border-b border-slate-200/60 dark:border-slate-800/60 pb-2.5">
            <div className="flex items-center space-x-1.5 text-xs font-black uppercase text-slate-800 dark:text-slate-100 tracking-wider">
              <Sparkles className="w-4 h-4 text-amber-400 animate-pulse" />
              <span>Theme Studio Pro</span>
            </div>
            <span className="text-[9px] font-mono font-bold px-1.5 py-0.5 rounded bg-indigo-50 dark:bg-indigo-950/60 text-indigo-600 dark:text-indigo-400 border border-indigo-200/50 dark:border-indigo-800/50">
              10 Themes + Custom
            </span>
          </div>

          {/* Mode Switcher (Light / Dark) */}
          <div className="space-y-1">
            <label className="text-[10px] font-bold text-slate-400 dark:text-slate-500 uppercase tracking-wider block">
              Appearance Mode
            </label>
            <div className="grid grid-cols-2 gap-1.5 p-1 bg-slate-100 dark:bg-slate-800/60 rounded-xl border border-slate-200/60 dark:border-slate-700/40">
              <button
                type="button"
                onClick={() => {
                  soundEffects.playTick();
                  onModeChange('light');
                }}
                className={`flex items-center justify-center space-x-1.5 py-1.5 rounded-lg text-xs font-bold transition-all duration-200 cursor-pointer ${
                  mode === 'light'
                    ? 'bg-white text-slate-900 shadow-sm border border-slate-200/80'
                    : 'text-slate-500 hover:text-slate-800 dark:text-slate-400 dark:hover:text-slate-200'
                }`}
              >
                <Sun className="w-3.5 h-3.5 text-amber-500" />
                <span>Light</span>
              </button>

              <button
                type="button"
                onClick={() => {
                  soundEffects.playTick();
                  onModeChange('dark');
                }}
                className={`flex items-center justify-center space-x-1.5 py-1.5 rounded-lg text-xs font-bold transition-all duration-200 cursor-pointer ${
                  mode === 'dark'
                    ? 'bg-slate-950 text-white shadow-sm border border-slate-700'
                    : 'text-slate-500 hover:text-slate-800 dark:text-slate-400 dark:hover:text-slate-200'
                }`}
              >
                <Moon className="w-3.5 h-3.5 text-indigo-400" />
                <span>Dark</span>
              </button>
            </div>
          </div>

          {/* Navigation Tabs (Presets vs Custom Builder) */}
          <div className="flex border-b border-slate-200/60 dark:border-slate-800/60 text-xs font-bold">
            <button
              type="button"
              onClick={() => setActiveTab('presets')}
              className={`flex-1 py-1.5 flex items-center justify-center space-x-1.5 border-b-2 cursor-pointer transition-colors ${
                activeTab === 'presets'
                  ? 'border-indigo-500 text-indigo-600 dark:text-indigo-400'
                  : 'border-transparent text-slate-400 hover:text-slate-600 dark:hover:text-slate-300'
              }`}
            >
              <Paintbrush className="w-3.5 h-3.5" />
              <span>Presets</span>
            </button>
            <button
              type="button"
              onClick={() => setActiveTab('custom')}
              className={`flex-1 py-1.5 flex items-center justify-center space-x-1.5 border-b-2 cursor-pointer transition-colors ${
                activeTab === 'custom'
                  ? 'border-indigo-500 text-indigo-600 dark:text-indigo-400'
                  : 'border-transparent text-slate-400 hover:text-slate-600 dark:hover:text-slate-300'
              }`}
            >
              <Sliders className="w-3.5 h-3.5" />
              <span>Customizer</span>
            </button>
          </div>

          {/* TAB 1: PRESETS */}
          {activeTab === 'presets' && (
            <div className="space-y-1 max-h-64 overflow-y-auto pr-0.5">
              {THEME_PRESETS.map((preset) => {
                const isSelected = colorTheme === preset.id;
                return (
                  <button
                    key={preset.id}
                    type="button"
                    onClick={() => {
                      soundEffects.playTick();
                      onColorThemeChange(preset.id);
                    }}
                    className={`w-full flex items-center justify-between p-2 rounded-xl transition-all duration-200 text-xs font-semibold cursor-pointer border ${
                      isSelected
                        ? 'bg-slate-100 dark:bg-slate-800/80 text-slate-900 dark:text-white border-slate-300 dark:border-slate-700 shadow-xs'
                        : 'text-slate-600 dark:text-slate-400 hover:bg-slate-50 dark:hover:bg-slate-800/40 border-transparent'
                    }`}
                  >
                    <div className="flex items-center space-x-2.5">
                      <div 
                        className="w-5 h-5 rounded-lg shadow-xs flex items-center justify-center transition-transform group-hover:scale-110 shrink-0"
                        style={{
                          background: `linear-gradient(135deg, ${preset.primaryColor} 0%, ${preset.secondaryColor} 100%)`
                        }}
                      />
                      <span className="truncate">{preset.label}</span>
                      {preset.tag && (
                        <span className="text-[8px] font-extrabold px-1.5 py-0.2 rounded bg-indigo-500 text-white tracking-wider">
                          {preset.tag}
                        </span>
                      )}
                    </div>

                    {isSelected && (
                      <Check className="w-3.5 h-3.5 text-indigo-600 dark:text-indigo-400 stroke-[3] shrink-0" />
                    )}
                  </button>
                );
              })}
            </div>
          )}

          {/* TAB 2: CUSTOM THEME BUILDER */}
          {activeTab === 'custom' && (
            <div className="space-y-3.5 pt-1">
              <div className="p-3 bg-slate-50 dark:bg-slate-800/40 rounded-xl border border-slate-200/60 dark:border-slate-700/40 space-y-3">
                {/* Live Swatch Preview */}
                <div className="flex items-center justify-between">
                  <span className="text-[10px] font-bold text-slate-500 uppercase tracking-wider">Live Gradient Swatch</span>
                  <div 
                    className="w-16 h-6 rounded-lg shadow-md border border-white/20 transition-all duration-300"
                    style={{
                      background: `linear-gradient(135deg, ${customPrimary} 0%, ${customSecondary} 100%)`
                    }}
                  />
                </div>

                {/* Primary Color Picker */}
                <div className="space-y-1">
                  <div className="flex items-center justify-between text-xs">
                    <span className="font-semibold text-slate-700 dark:text-slate-300">Primary Accent</span>
                    <span className="font-mono text-[10px] text-slate-400 uppercase">{customPrimary}</span>
                  </div>
                  <div className="flex items-center space-x-2">
                    <input
                      type="color"
                      value={customPrimary}
                      onChange={(e) => handleCustomApply(e.target.value, customSecondary)}
                      className="w-8 h-8 rounded-lg border-0 cursor-pointer bg-transparent"
                    />
                    <div className="flex space-x-1 flex-1">
                      {['#3b82f6', '#10b981', '#f59e0b', '#ec4899', '#8b5cf6'].map(color => (
                        <button
                          key={color}
                          type="button"
                          onClick={() => handleCustomApply(color, customSecondary)}
                          className="w-5 h-5 rounded-full border border-white/30 cursor-pointer shadow-xs transition-transform hover:scale-110"
                          style={{ backgroundColor: color }}
                        />
                      ))}
                    </div>
                  </div>
                </div>

                {/* Secondary Color Picker */}
                <div className="space-y-1">
                  <div className="flex items-center justify-between text-xs">
                    <span className="font-semibold text-slate-700 dark:text-slate-300">Secondary Accent</span>
                    <span className="font-mono text-[10px] text-slate-400 uppercase">{customSecondary}</span>
                  </div>
                  <div className="flex items-center space-x-2">
                    <input
                      type="color"
                      value={customSecondary}
                      onChange={(e) => handleCustomApply(customPrimary, e.target.value)}
                      className="w-8 h-8 rounded-lg border-0 cursor-pointer bg-transparent"
                    />
                    <div className="flex space-x-1 flex-1">
                      {['#6366f1', '#06b6d4', '#f43f5e', '#a855f7', '#00f0ff'].map(color => (
                        <button
                          key={color}
                          type="button"
                          onClick={() => handleCustomApply(customPrimary, color)}
                          className="w-5 h-5 rounded-full border border-white/30 cursor-pointer shadow-xs transition-transform hover:scale-110"
                          style={{ backgroundColor: color }}
                        />
                      ))}
                    </div>
                  </div>
                </div>
              </div>

              {/* Action Buttons */}
              <div className="flex items-center space-x-2">
                <button
                  type="button"
                  onClick={() => {
                    handleCustomApply('#6366f1', '#8b5cf6');
                  }}
                  className="flex-1 py-1.5 px-2 rounded-xl border border-slate-200 dark:border-slate-700 text-xs font-bold text-slate-600 dark:text-slate-400 hover:bg-slate-100 dark:hover:bg-slate-800 transition-colors flex items-center justify-center space-x-1 cursor-pointer"
                >
                  <RotateCcw className="w-3 h-3" />
                  <span>Reset</span>
                </button>
                <button
                  type="button"
                  onClick={() => {
                    soundEffects.playSuccessChime();
                    onColorThemeChange('custom', { primaryColor: customPrimary, secondaryColor: customSecondary });
                    setIsOpen(false);
                  }}
                  className="flex-1 py-1.5 px-2 rounded-xl text-xs font-bold text-white shadow-md transition-transform hover:scale-102 cursor-pointer flex items-center justify-center space-x-1"
                  style={{
                    background: `linear-gradient(135deg, ${customPrimary} 0%, ${customSecondary} 100%)`
                  }}
                >
                  <Wand2 className="w-3 h-3" />
                  <span>Activate</span>
                </button>
              </div>
            </div>
          )}
        </div>
      )}
    </div>
  );
};
