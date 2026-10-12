import React from 'react';
import { X, Trophy, Skull, Sparkles, Shield, Flame, Swords, Check } from 'lucide-react';
import { AgeId } from '../types/game';

export type RPGFrameTheme = 'stone' | 'medieval' | 'desert' | 'ice' | 'hell' | 'future';
export type RPGModalVariant = 'standard' | 'timeline' | 'victory' | 'defeat' | 'challenge' | 'reward';

export interface RPGModalContainerProps {
  isOpen?: boolean;
  onClose?: () => void;
  title: React.ReactNode;
  subtitle?: React.ReactNode;
  icon?: React.ReactNode;
  theme?: RPGFrameTheme | AgeId;
  variant?: RPGModalVariant;
  timelineBadge?: React.ReactNode;
  maxWidth?: 'max-w-xs' | 'max-w-sm' | 'max-w-md' | 'max-w-lg' | 'max-w-xl';
  headerBadge?: React.ReactNode;
  headerBanner?: React.ReactNode;
  hideCloseButton?: boolean;
  children: React.ReactNode;
  footer?: React.ReactNode;
  className?: string;
  bodyClassName?: string;
}

/**
 * Unified container component for all modal content in Stormglass RPG.
 * Replaces generic rectangular dark panels with rich, illustrated RPG battle timeline frames,
 * multi-tier beveled metallic borders, corner rivet brackets, carved header plaques, and tactile controls.
 */
export const RPGModalContainer: React.FC<RPGModalContainerProps> = ({
  isOpen = true,
  onClose,
  title,
  subtitle,
  icon,
  theme = 'medieval',
  variant = 'standard',
  timelineBadge,
  maxWidth = 'max-w-sm',
  headerBadge,
  headerBanner,
  hideCloseButton = false,
  children,
  footer,
  className = '',
  bodyClassName = '',
}) => {
  if (!isOpen) return null;

  const resolvedTheme = resolveTheme(theme, variant);
  const cfg = getThemeConfig(resolvedTheme, variant);

  return (
    <div className="fixed inset-0 z-50 bg-black/60 backdrop-blur-[1px] flex items-center justify-center p-3 sm:p-4 select-none animate-in fade-in duration-150">
      {/* Outer Click-to-close Backdrop */}
      {onClose && <div className="absolute inset-0 cursor-pointer" onClick={onClose} aria-label="Close modal overlay" />}

      {/* --- UNIFIED RPG BATTLE TIMELINE FRAME CONTAINER --- */}
      <div
        className={`relative w-full ${maxWidth} z-10 flex flex-col rounded-2xl ${cfg.outerBorder} ${cfg.outerBg} shadow-[0_16px_40px_rgba(0,0,0,0.95),0_0_28px_${cfg.glowColor}] p-2.5 sm:p-3 max-h-[92vh] transition-transform animate-in zoom-in-95 duration-200 ${className}`}
      >
        {/* 4 Illustrated Corner Rivet Brackets */}
        <CornerBrackets theme={resolvedTheme} variant={variant} />

        {/* Decorative Studs / Rivets along the top frame rim */}
        <div className="absolute top-1.5 left-8 right-8 flex justify-between pointer-events-none opacity-40">
          <div className="w-1.5 h-1.5 rounded-full bg-amber-200/60 shadow-sm" />
          <div className="w-1.5 h-1.5 rounded-full bg-amber-200/60 shadow-sm" />
          <div className="w-1.5 h-1.5 rounded-full bg-amber-200/60 shadow-sm" />
          <div className="w-1.5 h-1.5 rounded-full bg-amber-200/60 shadow-sm" />
        </div>

        {/* Optional Big Header Banner (e.g. Victory Trophy, Defeat Skull, Challenge Crest) */}
        {headerBanner && (
          <div className="relative flex justify-center -mt-6 sm:-mt-7 mb-2 z-20">
            {headerBanner}
          </div>
        )}

        {/* --- ORNATE CARVED BATTLE TIMELINE HEADER PLAQUE --- */}
        <div
          className={`relative w-full ${cfg.headerBg} border-2 ${cfg.headerBorder} rounded-xl px-3 py-2 mb-2 flex items-center justify-between shadow-[0_4px_12px_rgba(0,0,0,0.7),inset_0_1px_2px_rgba(255,255,255,0.15)]`}
        >
          {/* Header Title with Icon & optional Timeline Subtitle */}
          <div className="flex items-center gap-2.5 min-w-0 pr-2">
            {icon && (
              <div
                className={`w-8 h-8 rounded-lg ${cfg.iconBox} border-2 flex items-center justify-center shrink-0 shadow-inner`}
              >
                {icon}
              </div>
            )}
            <div className="min-w-0 flex-1">
              <div className="flex items-center gap-2 flex-wrap">
                <span
                  className={`font-pixel text-xs sm:text-sm font-black tracking-wide ${cfg.titleColor} truncate drop-shadow-[0_2px_4px_rgba(0,0,0,0.9)]`}
                >
                  {title}
                </span>
                {timelineBadge && (
                  <span className="px-1.5 py-0.5 rounded bg-black/60 border border-amber-500/50 text-[9px] font-pixel text-amber-300 font-bold tracking-wider">
                    {timelineBadge}
                  </span>
                )}
                {headerBadge}
              </div>
              {subtitle && (
                <div className="text-[10px] text-stone-400 font-pixel tracking-normal truncate mt-0.5 drop-shadow-sm">
                  {subtitle}
                </div>
              )}
            </div>
          </div>

          {/* Illustrated 3D Close Button */}
          {!hideCloseButton && onClose && (
            <button
              onClick={onClose}
              className={`w-7 h-7 sm:w-8 sm:h-8 rounded-lg ${cfg.closeBtnBg} border-2 ${cfg.closeBtnBorder} flex items-center justify-center ${cfg.closeBtnText} hover:brightness-125 active:scale-95 transition-all shadow-[0_2px_4px_rgba(0,0,0,0.8),inset_0_1px_1px_rgba(255,255,255,0.2)] shrink-0 cursor-pointer`}
              title="Close"
              aria-label="Close dialog"
            >
              <X className="w-4 h-4 stroke-[2.5]" />
            </button>
          )}
        </div>

        {/* --- RECESSED INNER CHAMBER CONTENT --- */}
        <div
          className={`relative flex-1 ${cfg.innerBg} border-2 ${cfg.innerBorder} rounded-xl p-2.5 sm:p-3 overflow-y-auto max-h-[72vh] shadow-[inset_0_4px_12px_rgba(0,0,0,0.85)] ${bodyClassName}`}
        >
          {children}
        </div>

        {/* Optional Footer Container */}
        {footer && (
          <div className="relative mt-2 pt-1 border-t border-stone-800/80 flex flex-col gap-2">
            {footer}
          </div>
        )}

        {/* Decorative Studs / Rivets along the bottom frame rim */}
        <div className="absolute bottom-1.5 left-8 right-8 flex justify-between pointer-events-none opacity-40">
          <div className="w-1.5 h-1.5 rounded-full bg-amber-200/60 shadow-sm" />
          <div className="w-1.5 h-1.5 rounded-full bg-amber-200/60 shadow-sm" />
          <div className="w-1.5 h-1.5 rounded-full bg-amber-200/60 shadow-sm" />
          <div className="w-1.5 h-1.5 rounded-full bg-amber-200/60 shadow-sm" />
        </div>
      </div>
    </div>
  );
};

/** Backwards-compatible alias so existing imports work seamlessly */
export const RPGModalFrame = RPGModalContainer;

/**
 * Reusable Illustrated Inner Panel for inside modals.
 * Replaces generic rectangular flat dark panels with beveled stone/metal panels.
 */
export interface RPGInnerPanelProps {
  children: React.ReactNode;
  className?: string;
  highlight?: boolean;
  variant?: 'stone' | 'metal' | 'amber' | 'red' | 'blue' | 'green';
}

export const RPGInnerPanel: React.FC<RPGInnerPanelProps> = ({
  children,
  className = '',
  highlight = false,
  variant = 'stone',
}) => {
  const getVariantStyles = () => {
    switch (variant) {
      case 'amber':
        return 'bg-gradient-to-b from-amber-950/70 via-stone-900/90 to-stone-950 border-amber-600/70 shadow-[0_2px_8px_rgba(245,158,11,0.15)]';
      case 'red':
        return 'bg-gradient-to-b from-red-950/70 via-stone-900/90 to-stone-950 border-red-700/70 shadow-[0_2px_8px_rgba(239,68,68,0.2)]';
      case 'blue':
        return 'bg-gradient-to-b from-blue-950/70 via-stone-900/90 to-stone-950 border-blue-600/70 shadow-[0_2px_8px_rgba(59,130,246,0.2)]';
      case 'green':
        return 'bg-gradient-to-b from-emerald-950/70 via-stone-900/90 to-stone-950 border-emerald-600/70 shadow-[0_2px_8px_rgba(16,185,129,0.2)]';
      case 'metal':
        return 'bg-gradient-to-b from-slate-900/90 via-stone-900/95 to-stone-950 border-stone-600/80 shadow-[inset_0_1px_2px_rgba(255,255,255,0.08)]';
      case 'stone':
      default:
        return 'bg-gradient-to-b from-stone-900/95 via-stone-950 to-black/90 border-stone-800 shadow-[inset_0_1px_2px_rgba(255,255,255,0.05)]';
    }
  };

  return (
    <div
      className={`relative rounded-xl border-2 p-2.5 sm:p-3 transition-all ${getVariantStyles()} ${
        highlight ? 'ring-1 ring-amber-400/40' : ''
      } ${className}`}
    >
      {children}
    </div>
  );
};

/**
 * Reusable Illustrated Stat Row for Victory/Defeat or Mission modals.
 */
export interface RPGStatRowProps {
  label: React.ReactNode;
  value: React.ReactNode;
  icon?: React.ReactNode;
  highlight?: boolean;
  valueColor?: string;
  className?: string;
}

export const RPGStatRow: React.FC<RPGStatRowProps> = ({
  label,
  value,
  icon,
  highlight = false,
  valueColor = 'text-stone-100',
  className = '',
}) => {
  return (
    <div
      className={`flex items-center justify-between text-xs font-pixel py-1.5 px-2.5 rounded-lg border border-stone-800/80 bg-stone-950/80 shadow-sm ${
        highlight ? 'border-amber-600/40 bg-amber-950/20' : ''
      } ${className}`}
    >
      <div className="flex items-center gap-2 text-stone-400">
        {icon}
        <span className="font-semibold">{label}</span>
      </div>
      <div className={`font-bold tabular-nums ${valueColor}`}>{value}</div>
    </div>
  );
};

/**
 * Tactile RPG Button matching the illustrated mobile game controls.
 */
export interface RPGButtonProps extends React.ButtonHTMLAttributes<HTMLButtonElement> {
  variant?: 'gold' | 'blue' | 'red' | 'green' | 'stone' | 'dark';
  size?: 'sm' | 'md' | 'lg';
  icon?: React.ReactNode;
}

export const RPGButton: React.FC<RPGButtonProps> = ({
  variant = 'gold',
  size = 'md',
  icon,
  children,
  className = '',
  disabled,
  ...props
}) => {
  const getStyles = () => {
    if (disabled) {
      return 'bg-stone-800 text-stone-500 border-stone-700 cursor-not-allowed opacity-60';
    }

    switch (variant) {
      case 'gold':
        return 'bg-gradient-to-b from-amber-400 via-amber-500 to-amber-600 border-stone-950 text-stone-950 shadow-[0_4px_0_#78350f,0_8px_16px_rgba(245,158,11,0.35)] hover:brightness-110 active:translate-y-1 active:shadow-[0_1px_0_#78350f]';
      case 'blue':
        return 'bg-gradient-to-b from-blue-400 via-blue-600 to-blue-700 border-stone-950 text-white shadow-[0_4px_0_#1e3a8a,0_8px_16px_rgba(59,130,246,0.35)] hover:brightness-110 active:translate-y-1 active:shadow-[0_1px_0_#1e3a8a]';
      case 'red':
        return 'bg-gradient-to-b from-red-500 via-red-600 to-red-700 border-stone-950 text-white shadow-[0_4px_0_#7f1d1d,0_8px_16px_rgba(220,38,38,0.35)] hover:brightness-110 active:translate-y-1 active:shadow-[0_1px_0_#7f1d1d]';
      case 'green':
        return 'bg-gradient-to-b from-emerald-400 via-emerald-600 to-emerald-700 border-stone-950 text-white shadow-[0_4px_0_#064e3b,0_8px_16px_rgba(16,185,129,0.35)] hover:brightness-110 active:translate-y-1 active:shadow-[0_1px_0_#064e3b]';
      case 'dark':
        return 'bg-gradient-to-b from-stone-800 to-stone-900 border-stone-700 text-stone-300 shadow-[0_3px_0_#1c1917] hover:text-white active:translate-y-1 active:shadow-[0_1px_0_#1c1917]';
      case 'stone':
      default:
        return 'bg-gradient-to-b from-stone-700 via-stone-800 to-stone-900 border-stone-950 text-stone-200 shadow-[0_3px_0_#292524] hover:brightness-110 active:translate-y-1 active:shadow-[0_1px_0_#292524]';
    }
  };

  const getSizeStyles = () => {
    switch (size) {
      case 'sm':
        return 'py-1.5 px-3 text-[10px] rounded-lg';
      case 'lg':
        return 'py-3.5 px-5 text-sm sm:text-base rounded-2xl';
      case 'md':
      default:
        return 'py-2.5 px-4 text-xs rounded-xl';
    }
  };

  return (
    <button
      disabled={disabled}
      className={`font-pixel font-bold tracking-wide border-2 flex items-center justify-center gap-2 transition-all cursor-pointer ${getSizeStyles()} ${getStyles()} ${className}`}
      {...props}
    >
      {icon}
      <span>{children}</span>
    </button>
  );
};

// 4 Corner Brackets SVG / Accents matching the illustrated RPG battle timeline
function CornerBrackets({ theme, variant }: { theme: RPGFrameTheme; variant: RPGModalVariant }) {
  const getBracketColor = () => {
    if (variant === 'victory') return '#fbbf24';
    if (variant === 'defeat') return '#ef4444';
    if (variant === 'reward') return '#f59e0b';

    switch (theme) {
      case 'stone':
        return '#d97706';
      case 'desert':
        return '#f59e0b';
      case 'ice':
        return '#38bdf8';
      case 'hell':
        return '#ef4444';
      case 'future':
        return '#818cf8';
      case 'medieval':
      default:
        return '#eab308';
    }
  };

  const color = getBracketColor();

  return (
    <>
      {/* Top-Left Bracket */}
      <div className="absolute -top-1.5 -left-1.5 w-4.5 h-4.5 pointer-events-none z-20">
        <svg viewBox="0 0 16 16" className="w-full h-full drop-shadow-md">
          <polygon points="0,0 16,0 16,4 4,4 4,16 0,16" fill={color} />
          <circle cx="6" cy="6" r="1.5" fill="#0f172a" stroke="#ffffff" strokeWidth="0.5" />
        </svg>
      </div>

      {/* Top-Right Bracket */}
      <div className="absolute -top-1.5 -right-1.5 w-4.5 h-4.5 pointer-events-none z-20">
        <svg viewBox="0 0 16 16" className="w-full h-full drop-shadow-md">
          <polygon points="16,0 0,0 0,4 12,4 12,16 16,16" fill={color} />
          <circle cx="10" cy="6" r="1.5" fill="#0f172a" stroke="#ffffff" strokeWidth="0.5" />
        </svg>
      </div>

      {/* Bottom-Left Bracket */}
      <div className="absolute -bottom-1.5 -left-1.5 w-4.5 h-4.5 pointer-events-none z-20">
        <svg viewBox="0 0 16 16" className="w-full h-full drop-shadow-md">
          <polygon points="0,16 16,16 16,12 4,12 4,0 0,0" fill={color} />
          <circle cx="6" cy="10" r="1.5" fill="#0f172a" stroke="#ffffff" strokeWidth="0.5" />
        </svg>
      </div>

      {/* Bottom-Right Bracket */}
      <div className="absolute -bottom-1.5 -right-1.5 w-4.5 h-4.5 pointer-events-none z-20">
        <svg viewBox="0 0 16 16" className="w-full h-full drop-shadow-md">
          <polygon points="16,16 0,16 0,12 12,12 12,0 16,0" fill={color} />
          <circle cx="10" cy="10" r="1.5" fill="#0f172a" stroke="#ffffff" strokeWidth="0.5" />
        </svg>
      </div>
    </>
  );
}

function resolveTheme(theme: RPGFrameTheme | AgeId, variant: RPGModalVariant): RPGFrameTheme {
  if (variant === 'victory') return 'medieval';
  if (variant === 'defeat' || variant === 'challenge') return 'hell';
  if (variant === 'reward') return 'medieval';

  switch (theme) {
    case 'stone':
      return 'stone';
    case 'ancient':
      return 'desert';
    case 'crusader':
    case 'medieval':
      return 'medieval';
    case 'gunpowder':
    case 'industrial':
      return 'ice';
    case 'future':
      return 'future';
    case 'hell':
      return 'hell';
    default:
      return 'medieval';
  }
}

function getThemeConfig(theme: RPGFrameTheme, variant: RPGModalVariant) {
  if (variant === 'victory') {
    return {
      outerBg: 'bg-gradient-to-b from-stone-900 via-amber-950/40 to-stone-950',
      outerBorder: 'border-4 border-amber-500/90',
      glowColor: 'rgba(245,158,11,0.4)',
      headerBg: 'bg-gradient-to-b from-amber-800 via-amber-950 to-stone-950',
      headerBorder: 'border-amber-400',
      titleColor: 'text-amber-300',
      iconBox: 'bg-amber-950/90 border-amber-400 text-amber-300',
      closeBtnBg: 'bg-stone-950',
      closeBtnBorder: 'border-amber-500',
      closeBtnText: 'text-amber-300',
      innerBg: 'bg-stone-950/95',
      innerBorder: 'border-amber-900/60',
    };
  }

  if (variant === 'defeat') {
    return {
      outerBg: 'bg-gradient-to-b from-stone-900 via-red-950/40 to-stone-950',
      outerBorder: 'border-4 border-red-800/90',
      glowColor: 'rgba(220,38,38,0.35)',
      headerBg: 'bg-gradient-to-b from-red-900 via-red-950 to-stone-950',
      headerBorder: 'border-red-600',
      titleColor: 'text-red-300',
      iconBox: 'bg-red-950/90 border-red-500 text-red-300',
      closeBtnBg: 'bg-stone-950',
      closeBtnBorder: 'border-red-700',
      closeBtnText: 'text-red-400',
      innerBg: 'bg-stone-950/95',
      innerBorder: 'border-red-950',
    };
  }

  switch (theme) {
    case 'stone':
      return {
        outerBg: 'bg-stone-900',
        outerBorder: 'border-4 border-amber-900/90',
        glowColor: 'rgba(217,119,6,0.3)',
        headerBg: 'bg-gradient-to-b from-amber-950 via-stone-900 to-stone-950',
        headerBorder: 'border-amber-700/80',
        titleColor: 'text-amber-300',
        iconBox: 'bg-amber-950/80 border-amber-600/70 text-amber-300',
        closeBtnBg: 'bg-stone-950',
        closeBtnBorder: 'border-amber-700/80',
        closeBtnText: 'text-amber-400',
        innerBg: 'bg-stone-950/95',
        innerBorder: 'border-stone-800',
      };
    case 'desert':
      return {
        outerBg: 'bg-amber-950/90',
        outerBorder: 'border-4 border-amber-700/90',
        glowColor: 'rgba(245,158,11,0.3)',
        headerBg: 'bg-gradient-to-b from-amber-900 via-stone-900 to-stone-950',
        headerBorder: 'border-amber-500/80',
        titleColor: 'text-amber-200',
        iconBox: 'bg-amber-900/60 border-amber-500/70 text-amber-200',
        closeBtnBg: 'bg-stone-950',
        closeBtnBorder: 'border-amber-600/80',
        closeBtnText: 'text-amber-300',
        innerBg: 'bg-stone-950/95',
        innerBorder: 'border-amber-900/60',
      };
    case 'ice':
      return {
        outerBg: 'bg-slate-900',
        outerBorder: 'border-4 border-cyan-800/90',
        glowColor: 'rgba(56,189,248,0.3)',
        headerBg: 'bg-gradient-to-b from-cyan-950 via-slate-900 to-slate-950',
        headerBorder: 'border-cyan-500/80',
        titleColor: 'text-cyan-200',
        iconBox: 'bg-cyan-950/70 border-cyan-400/70 text-cyan-200',
        closeBtnBg: 'bg-slate-950',
        closeBtnBorder: 'border-cyan-600/80',
        closeBtnText: 'text-cyan-300',
        innerBg: 'bg-slate-950/95',
        innerBorder: 'border-cyan-900/50',
      };
    case 'future':
      return {
        outerBg: 'bg-stone-950',
        outerBorder: 'border-4 border-indigo-700/90',
        glowColor: 'rgba(129,140,248,0.35)',
        headerBg: 'bg-gradient-to-b from-indigo-950 via-stone-900 to-stone-950',
        headerBorder: 'border-indigo-500/80',
        titleColor: 'text-indigo-200',
        iconBox: 'bg-indigo-950/80 border-indigo-500 text-indigo-300',
        closeBtnBg: 'bg-stone-950',
        closeBtnBorder: 'border-indigo-600',
        closeBtnText: 'text-indigo-300',
        innerBg: 'bg-stone-950/95',
        innerBorder: 'border-indigo-950',
      };
    case 'hell':
      return {
        outerBg: 'bg-stone-950',
        outerBorder: 'border-4 border-red-900/90',
        glowColor: 'rgba(239,68,68,0.35)',
        headerBg: 'bg-gradient-to-b from-red-950 via-stone-900 to-stone-950',
        headerBorder: 'border-red-600/80',
        titleColor: 'text-red-300',
        iconBox: 'bg-red-950/80 border-red-500/80 text-red-300',
        closeBtnBg: 'bg-stone-950',
        closeBtnBorder: 'border-red-700/80',
        closeBtnText: 'text-red-400',
        innerBg: 'bg-stone-950/95',
        innerBorder: 'border-red-950',
      };
    case 'medieval':
    default:
      return {
        outerBg: 'bg-stone-900',
        outerBorder: 'border-4 border-stone-700',
        glowColor: 'rgba(234,179,8,0.25)',
        headerBg: 'bg-gradient-to-b from-stone-800 via-stone-900 to-stone-950',
        headerBorder: 'border-amber-500/80',
        titleColor: 'text-amber-300',
        iconBox: 'bg-stone-900 border-amber-500/60 text-amber-300',
        closeBtnBg: 'bg-stone-950',
        closeBtnBorder: 'border-stone-600',
        closeBtnText: 'text-stone-300',
        innerBg: 'bg-stone-950/95',
        innerBorder: 'border-stone-800',
      };
  }
}
