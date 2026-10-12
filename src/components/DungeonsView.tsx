import React, { useState } from 'react';
import { DungeonType, PlayerProfile } from '../types/game';
import { LEGENDS_CHAPTERS } from '../data/gameData';
import { Key, Timer, BookOpen, Skull, ShieldAlert, Play, Lock } from 'lucide-react';
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
    <div className="w-full flex-1 flex flex-col bg-stone-950 p-2.5 sm:p-3 select-none overflow-hidden">
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

      {/* All modes stay visible, including locked ones. Cards never stretch to viewport height. */}
      <div className="flex items-center justify-between px-1 mb-2">
        <div>
          <h2 className="font-pixel text-amber-300 text-[12px]">ANCIENT DUNGEONS</h2>
          <p className="text-stone-400 text-[10px]">Timeline {profile.timeline} trials</p>
        </div>
        <div className="flex items-center gap-1.5 rounded-lg border border-amber-700/60 bg-stone-900 px-2 py-1 font-pixel text-amber-300 text-[11px]">
          <Key size={14} /> {profile.keys} keys
        </div>
      </div>
      <p className="text-[10px] text-stone-400 px-1 mb-3">Dungeon keys replenish daily. Choose your challenge.</p>
      <div className="flex flex-col grid grid-rows-4 gap-1.5 flex-1 min-h-0 overflow-hidden pb-1">
        {([
          { type: 'rush' as DungeonType, name: 'RUSH', subtitle: 'Hold the barricade for 45 seconds', stat: `Wins: ${profile.rushHighWins}`, unlocked: isRushUnlocked, unlockAt: 2, accent: 'red', icon: <Timer size={27}/>, illustration: '⚔️', description: 'Survive 45 seconds of continuous onslaught against enemy waves.' },
          { type: 'legends' as DungeonType, name: 'LEGENDS', subtitle: currentLegendsChapter.title, stat: `Chapter ${currentLegendsChapter.id} · +1 Rune`, unlocked: isLegendsUnlocked, unlockAt: 3, accent: 'blue', icon: <BookOpen size={27}/>, illustration: '📖', description: `Crusader Road Chapter ${currentLegendsChapter.id}: ${currentLegendsChapter.title}`, extraData: {chapterId: currentLegendsChapter.id} },
          { type: 'bosses' as DungeonType, name: 'BOSS HUNT', subtitle: 'Defeat the Gate Colossus', stat: `Stage ${profile.bossStage} · Skill copies`, unlocked: isBossesUnlocked, unlockAt: 4, accent: 'purple', icon: <Skull size={27}/>, illustration: '🐉', description: 'Face the Gate Colossus for skill upgrade copies.' },
          { type: 'survival' as DungeonType, name: 'SURVIVAL', subtitle: 'Survive waves and cash out gems', stat: `Best: ${profile.survivalBestStreak} waves`, unlocked: true, unlockAt: 1, accent: 'emerald', icon: <ShieldAlert size={27}/>, illustration: '🛡️', description: 'Survive increasingly difficult waves with carried base health.' }
        ]).map(mode => (
          <div key={mode.type} className="relative overflow-hidden rounded-xl border-2 border-amber-900/70 bg-gradient-to-br from-stone-800 via-stone-900 to-stone-950 min-h-0 p-1.5 sm:p-2 shadow-lg">
            <div className="flex items-center gap-2 h-full">
              <div className="shrink-0 w-11 h-11 sm:w-14 sm:h-14 rounded-lg bg-stone-950/60 border border-amber-900/40 flex flex-col items-center justify-center gap-0 text-amber-300" aria-hidden="true">
                {mode.icon}
                <span className="text-base">{mode.illustration}</span>
              </div>
              <div className="flex-1 min-w-0">
                <h3 className="font-pixel text-amber-200 text-[12px]">{mode.name}</h3>
                <p className="text-stone-300 text-[10px] mt-0.5 leading-tight">{mode.subtitle}</p>
                <p className="text-amber-400/80 text-[9px] mt-0.5">{mode.stat}</p>
              </div>
              <div className="shrink-0 flex flex-col items-center gap-1">
                <span className="font-pixel text-[10px] text-amber-300 flex items-center gap-1"><Key size={12}/> 1</span>
                <button
                  disabled={!mode.unlocked || profile.keys < 1}
                  onClick={() => handleOpenConfirm(mode.type, mode.name, mode.description, mode.extraData)}
                  className="min-w-[75px] rounded-md border-b-4 border-blue-900 bg-sky-600 px-1 py-1.5 font-pixel text-[10px] text-white disabled:bg-stone-700 disabled:border-stone-800 disabled:text-stone-400 active:translate-y-0.5"
                >
                  {mode.unlocked ? (profile.keys > 0 ? 'ENTER' : 'NO KEYS') : <span className="flex items-center gap-1"><Lock size={11}/> LOCKED</span>}
                </button>
              </div>
            </div>
            {!mode.unlocked && <p className="text-[10px] text-stone-400 text-right mt-0.5">Unlocks at Timeline {mode.unlockAt}</p>}
          </div>
        ))}
      </div>
    </div>
  );
};
