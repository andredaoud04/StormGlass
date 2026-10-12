import React, { useState } from 'react';
import { DungeonType, PlayerProfile } from '../types/game';
import { LEGENDS_CHAPTERS } from '../data/gameData';
import { Key, Timer, BookOpen, Skull, ShieldAlert, Play, X, Check } from 'lucide-react';
import { RPGModalContainer, RPGInnerPanel, RPGButton } from './RPGModalFrame';

interface DungeonsViewProps {
  profile: PlayerProfile;
  onStartDungeon?: (type: DungeonType, extraData?: { chapterId?: number }) => void;
  onDeductKeyAndStart?: (type: DungeonType, extraData?: { chapterId?: number }) => void;
}

interface DungeonConfirmState {
  type: DungeonType;
  title: string;
  description: string;
  extraData?: { chapterId?: number };
}

export const DungeonsView: React.FC<DungeonsViewProps> = ({
  profile,
  onStartDungeon,
  onDeductKeyAndStart,
}) => {
  const launchDungeon = onDeductKeyAndStart || onStartDungeon;
  const [confirmDialog, setConfirmDialog] = useState<DungeonConfirmState | null>(null);

  // Mode unlock thresholds
  const isRushUnlocked = profile.timeline >= 2;
  const isLegendsUnlocked = profile.timeline >= 3;
  const isBossesUnlocked = profile.timeline >= 4;
  const isSurvivalUnlocked = true;

  const currentLegendsChapter = LEGENDS_CHAPTERS.find((ch) => ch.id === profile.legendsChapter) || LEGENDS_CHAPTERS[0];

  const handleOpenConfirm = (type: DungeonType, title: string, description: string, extraData?: { chapterId?: number }) => {
    setConfirmDialog({ type, title, description, extraData });
  };

  const handleConfirmStart = () => {
    if (!confirmDialog || profile.keys < 1) return;
    const { type, extraData } = confirmDialog;
    setConfirmDialog(null);
    launchDungeon?.(type, extraData);
  };

  return (
    <div className="w-full flex-1 flex flex-col justify-between bg-stone-950 p-2.5 sm:p-3 select-none overflow-hidden">
      {/* ======================================================== */}
      {/* START CONFIRMATION DIALOG (Mandatory Section 14) */}
      {/* ======================================================== */}
      {confirmDialog && (
        <RPGModalContainer
          isOpen={true}
          onClose={() => setConfirmDialog(null)}
          title={confirmDialog.title}
          subtitle="Dungeon Entry Confirmation"
          icon={<Key className="w-5 h-5 text-amber-400" />}
          maxWidth="max-w-xs"
        >
          <div className="space-y-3 p-1">
            <p className="text-xs text-stone-300 font-pixel leading-relaxed">
              {confirmDialog.description}
            </p>

            <RPGInnerPanel variant="amber" className="space-y-1 py-2 px-3">
              <div className="flex items-center justify-between text-xs font-pixel">
                <span className="text-amber-400 font-bold">Entry Cost:</span>
                <span className="text-amber-300 font-black">1 Dungeon Key</span>
              </div>
              <div className="flex items-center justify-between text-[11px] font-pixel border-t border-amber-800/60 pt-1">
                <span className="text-stone-400">Keys Available:</span>
                <span className="text-stone-100 font-bold tabular-nums">{profile.keys}</span>
              </div>
            </RPGInnerPanel>

            <div className="flex gap-2 pt-1">
              <RPGButton
                variant="dark"
                size="md"
                className="flex-1"
                onClick={() => setConfirmDialog(null)}
              >
                CANCEL
              </RPGButton>

              <RPGButton
                variant={profile.keys >= 1 ? 'gold' : 'dark'}
                size="md"
                className="flex-1"
                disabled={profile.keys < 1}
                onClick={handleConfirmStart}
              >
                {profile.keys >= 1 ? 'USE KEY & START' : 'NO KEYS'}
              </RPGButton>
            </div>
          </div>
        </RPGModalContainer>
      )}

      {/* Screen Header */}
      <div className="flex items-center justify-between mb-1.5 px-0.5">
        <div>
          <span className="font-pixel text-[11px] text-amber-300 font-bold uppercase tracking-wider">
            ANCIENT DUNGEONS
          </span>
          <div className="text-[9px] text-stone-400 font-pixel">
            Timeline {profile.timeline} Trials
          </div>
        </div>

        <span className="text-[9px] text-amber-400 font-pixel">Choose a trial</span>
      </div>

      {/* Compact 2x2 Grid fitting portrait viewport with NO scrolling */}
      <div className={`grid gap-2 flex-1 my-1 ${profile.timeline === 1 ? 'grid-cols-1' : 'grid-cols-2'}`}>
        {/* 1. SURVIVAL DUNGEON (Always available) */}
        <div className="rounded-xl border-2 border-emerald-600/70 bg-gradient-to-b from-emerald-950/40 via-stone-900/90 to-stone-950 p-2 sm:p-2.5 flex flex-col justify-between shadow-md">
          <div>
            <div className="flex items-center justify-between mb-1">
              <div className="w-6 h-6 rounded bg-emerald-600/20 text-emerald-400 flex items-center justify-center">
                <ShieldAlert className="w-4 h-4" />
              </div>
              <span className="font-pixel text-[8px] px-1 rounded bg-emerald-500/10 text-emerald-300 border border-emerald-500/30">
                ACTIVE
              </span>
            </div>
            <div className="font-pixel text-[11px] text-emerald-300 font-bold mb-0.5">
              SURVIVAL
            </div>
            <p className="text-[9px] text-stone-400 leading-tight">
              Survive increasing waves. Risk HP or cash out gems!
            </p>
          </div>

          <div className="mt-2">
            <div className="text-[8px] text-stone-500 font-pixel mb-1">
              Best Streak: {profile.survivalBestStreak}w
            </div>
            <button
              onClick={() =>
                handleOpenConfirm(
                  'survival',
                  'SURVIVAL DUNGEON',
                  'Survive increasingly difficult waves of enemies with carried base health.'
                )
              }
              className="w-full py-1.5 rounded-lg bg-emerald-600 hover:bg-emerald-500 text-white font-pixel text-[10px] font-bold shadow active:scale-95 cursor-pointer flex items-center justify-center gap-1"
            >
              <Play className="w-3 h-3 fill-white" />
              <span>START</span>
            </button>
          </div>
        </div>

        {/* 2. RUSH DUNGEON */}
        <div
          style={{ display: isRushUnlocked ? undefined : 'none' }}
          className={`rounded-xl border-2 p-2 sm:p-2.5 flex flex-col justify-between shadow-md ${
            isRushUnlocked
              ? 'border-red-600/70 bg-gradient-to-b from-red-950/40 via-stone-900/90 to-stone-950'
              : 'border-stone-800 bg-stone-900/40 opacity-50'
          }`}
        >
          <div>
            <div className="flex items-center justify-between mb-1">
              <div className="w-6 h-6 rounded bg-red-600/20 text-red-400 flex items-center justify-center">
                <Timer className="w-4 h-4" />
              </div>
              <span className="font-pixel text-[8px] px-1 rounded bg-red-500/10 text-red-300 border border-red-500/30">
                45s RUSH
              </span>
            </div>
            <div className="font-pixel text-[11px] text-red-300 font-bold mb-0.5">
              RUSH
            </div>
            <p className="text-[9px] text-stone-400 leading-tight">
              Hold the barricade for 45 seconds against waves.
            </p>
          </div>

          <div className="mt-2">
            <div className="text-[8px] text-stone-500 font-pixel mb-1">
              Wins: {profile.rushHighWins}
            </div>
            {isRushUnlocked ? (
              <button
                onClick={() =>
                  handleOpenConfirm(
                    'rush',
                    'RUSH DUNGEON',
                    'Survive 45 seconds of continuous onslaught against endless enemy waves. Earn rare Gems!'
                  )
                }
                className="w-full py-1.5 rounded-lg bg-red-600 hover:bg-red-500 text-white font-pixel text-[10px] font-bold shadow active:scale-95 cursor-pointer flex items-center justify-center gap-1"
              >
                <Play className="w-3 h-3 fill-white" />
                <span>START</span>
              </button>
            ) : (
              <div className="w-full py-1 rounded bg-stone-900 text-stone-500 font-pixel text-[8px] text-center">
                UNLOCKS TIMELINE 2
              </div>
            )}
          </div>
        </div>

        {/* 3. LEGENDS ANTHOLOGY */}
        <div
          style={{ display: isLegendsUnlocked ? undefined : 'none' }}
          className={`rounded-xl border-2 p-2 sm:p-2.5 flex flex-col justify-between shadow-md ${
            isLegendsUnlocked
              ? 'border-blue-600/70 bg-gradient-to-b from-blue-950/40 via-stone-900/90 to-stone-950'
              : 'border-stone-800 bg-stone-900/40 opacity-50'
          }`}
        >
          <div>
            <div className="flex items-center justify-between mb-1">
              <div className="w-6 h-6 rounded bg-blue-600/20 text-blue-400 flex items-center justify-center">
                <BookOpen className="w-4 h-4" />
              </div>
              <span className="font-pixel text-[8px] px-1 rounded bg-blue-500/10 text-blue-300 border border-blue-500/30">
                CH {currentLegendsChapter.id}
              </span>
            </div>
            <div className="font-pixel text-[11px] text-blue-300 font-bold mb-0.5">
              LEGENDS
            </div>
            <p className="text-[9px] text-stone-400 leading-tight truncate">
              {currentLegendsChapter.title}
            </p>
          </div>

          <div className="mt-2">
            <div className="text-[8px] text-stone-500 font-pixel mb-1">
              Reward: +1 Rune
            </div>
            {isLegendsUnlocked ? (
              <button
                onClick={() =>
                  handleOpenConfirm(
                    'legends',
                    `LEGENDS: CHAPTER ${currentLegendsChapter.id}`,
                    `Crusader Road Chapter ${currentLegendsChapter.id}: ${currentLegendsChapter.title} (${currentLegendsChapter.year}). Conquer to earn 1 Rune Point!`,
                    { chapterId: currentLegendsChapter.id }
                  )
                }
                className="w-full py-1.5 rounded-lg bg-blue-600 hover:bg-blue-500 text-white font-pixel text-[10px] font-bold shadow active:scale-95 cursor-pointer flex items-center justify-center gap-1"
              >
                <Play className="w-3 h-3 fill-white" />
                <span>START</span>
              </button>
            ) : (
              <div className="w-full py-1 rounded bg-stone-900 text-stone-500 font-pixel text-[8px] text-center">
                UNLOCKS TIMELINE 3
              </div>
            )}
          </div>
        </div>

        {/* 4. BOSSES (GATE COLOSSUS) */}
        <div
          style={{ display: isBossesUnlocked ? undefined : 'none' }}
          className={`rounded-xl border-2 p-2 sm:p-2.5 flex flex-col justify-between shadow-md ${
            isBossesUnlocked
              ? 'border-purple-600/70 bg-gradient-to-b from-purple-950/40 via-stone-900/90 to-stone-950'
              : 'border-stone-800 bg-stone-900/40 opacity-50'
          }`}
        >
          <div>
            <div className="flex items-center justify-between mb-1">
              <div className="w-6 h-6 rounded bg-purple-600/20 text-purple-400 flex items-center justify-center">
                <Skull className="w-4 h-4" />
              </div>
              <span className="font-pixel text-[8px] px-1 rounded bg-purple-500/10 text-purple-300 border border-purple-500/30">
                BOSS
              </span>
            </div>
            <div className="font-pixel text-[11px] text-purple-300 font-bold mb-0.5">
              BOSS HUNT
            </div>
            <p className="text-[9px] text-stone-400 leading-tight">
              Slay Gate Colossus for random skill copies.
            </p>
          </div>

          <div className="mt-2">
            <div className="text-[8px] text-stone-500 font-pixel mb-1">
              Stage {profile.bossStage}
            </div>
            {isBossesUnlocked ? (
              <button
                onClick={() =>
                  handleOpenConfirm(
                    'bosses',
                    'BOSS TRIAL: GATE COLOSSUS',
                    'Face the towering Gate Colossus in single-lane boss combat. Vanquishing the colossus awards Skill upgrade copies!'
                  )
                }
                className="w-full py-1.5 rounded-lg bg-purple-600 hover:bg-purple-500 text-white font-pixel text-[10px] font-bold shadow active:scale-95 cursor-pointer flex items-center justify-center gap-1"
              >
                <Play className="w-3 h-3 fill-white" />
                <span>START</span>
              </button>
            ) : (
              <div className="w-full py-1 rounded bg-stone-900 text-stone-500 font-pixel text-[8px] text-center">
                UNLOCKS TIMELINE 4
              </div>
            )}
          </div>
        </div>
      </div>
    </div>
  );
};
