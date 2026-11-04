import React, { useState, useMemo, useRef } from 'react';
import { motion, AnimatePresence } from 'motion/react';
import {
  X,
  HardDrive,
  HeartHandshake,
  Sliders,
  SlidersHorizontal,
  Trash2,
  ExternalLink,
  Check,
  Send,
  ArrowUpDown,
  Wifi,
  WifiOff,
  AlertCircle,
  RotateCcw,
} from 'lucide-react';
import { Track } from '../types';
import { translations, Language } from '../i18n/translations';
import { FoxLogo } from './FoxLogo';
import { isOfflineModeEnabled, setOfflineModeEnabled } from '../utils/network';

interface SettingsModalProps {
  isOpen: boolean;
  onClose: () => void;
  language: Language;
  onLanguageChange: (lang: Language) => void;
  downloadedTracks: Track[];
  onDeleteTrack: (trackId: string, trackTitle?: string) => void;
  onClearAllDownloads: () => void;
  onOpenEqualizer: () => void;
  onClearHistory: () => void;
  accentColor?: string;
  isOfflineMode?: boolean;
  onToggleOfflineMode?: (enabled: boolean) => void;
}

type SortType = 'size_desc' | 'size_asc' | 'title_asc' | 'date_desc';

const DONATE_PRESETS = [100, 300, 500, 1000, 2500];
const YOOMONEY_WALLET = '4100119666781214';

const parseSizeToBytes = (sizeStr?: string): number => {
  if (!sizeStr) return 0;
  const match = sizeStr.match(/([\d.]+)\s*([КкMmКкGgГг][БбBb]?)/i);
  if (!match) {
    const num = parseFloat(sizeStr);
    return isNaN(num) ? 0 : num * 1024 * 1024;
  }
  const val = parseFloat(match[1]);
  const unit = match[2].toUpperCase();
  if (unit.startsWith('Г') || unit.startsWith('G')) return val * 1024 * 1024 * 1024;
  if (unit.startsWith('М') || unit.startsWith('M')) return val * 1024 * 1024;
  if (unit.startsWith('К') || unit.startsWith('K')) return val * 1024;
  return val;
};

const openExternalUrl = async (url: string) => {
  try {
    const { open } = await import('@tauri-apps/plugin-shell');
    await open(url);
  } catch {
    window.open(url, '_blank');
  }
};

export const SettingsModal: React.FC<SettingsModalProps> = ({
  isOpen,
  onClose,
  language,
  onLanguageChange,
  downloadedTracks,
  onDeleteTrack,
  onClearAllDownloads,
  onOpenEqualizer,
  onClearHistory,
  accentColor = '#FF3366',
  isOfflineMode,
  onToggleOfflineMode,
}) => {
  const t = translations[language];

  // Sorting state for storage management (default: heaviest on top)
  const [sortType, setSortType] = useState<SortType>('size_desc');

  // Support/donation amount state
  const [selectedPreset, setSelectedPreset] = useState<number>(300);
  const [customAmount, setCustomAmount] = useState<string>('');

  // Preference states
  const [allowCellular, setAllowCellular] = useState<boolean>(() => {
    return localStorage.getItem('liemusic_allow_cellular_downloads') === 'true';
  });
  const [dontAskDelete, setDontAskDelete] = useState<boolean>(() => {
    return localStorage.getItem('liemusic_dont_ask_delete') === 'true';
  });
  const [offlineModeState, setOfflineModeState] = useState<boolean>(() => {
    return isOfflineMode ?? isOfflineModeEnabled();
  });

  const [historyClearedNotice, setHistoryClearedNotice] = useState<boolean>(false);
  const [isAtTop, setIsAtTop] = useState<boolean>(true);

  // Touch gesture tracker for header swipe dismiss
  const touchStartY = useRef<number | null>(null);

  const handleTouchStart = (e: React.TouchEvent) => {
    touchStartY.current = e.touches[0].clientY;
  };

  const handleTouchEnd = (e: React.TouchEvent) => {
    if (touchStartY.current === null) return;
    const dy = e.changedTouches[0].clientY - touchStartY.current;
    touchStartY.current = null;
    if (dy > 45) {
      onClose();
    }
  };

  // Sorted tracks in storage
  const sortedDownloadedTracks = useMemo(() => {
    const list = [...downloadedTracks];
    switch (sortType) {
      case 'size_desc':
        return list.sort((a, b) => parseSizeToBytes(b.fileSize) - parseSizeToBytes(a.fileSize));
      case 'size_asc':
        return list.sort((a, b) => parseSizeToBytes(a.fileSize) - parseSizeToBytes(b.fileSize));
      case 'title_asc':
        return list.sort((a, b) => a.title.localeCompare(b.title));
      case 'date_desc':
      default:
        return list;
    }
  }, [downloadedTracks, sortType]);

  // Total storage calculation
  const totalStorageFormatted = useMemo(() => {
    const totalBytes = downloadedTracks.reduce((acc, tr) => acc + parseSizeToBytes(tr.fileSize), 0);
    const mb = totalBytes / (1024 * 1024);
    if (mb >= 1000) {
      return `${(mb / 1024).toFixed(1)} GB`;
    }
    return `${mb.toFixed(1)} ${t.mb}`;
  }, [downloadedTracks, t.mb]);

  const handleCellularToggle = () => {
    const next = !allowCellular;
    setAllowCellular(next);
    if (next) {
      localStorage.setItem('liemusic_allow_cellular_downloads', 'true');
    } else {
      localStorage.removeItem('liemusic_allow_cellular_downloads');
    }
  };

  const handleConfirmDeleteToggle = () => {
    const next = !dontAskDelete;
    setDontAskDelete(next);
    if (next) {
      localStorage.setItem('liemusic_dont_ask_delete', 'true');
    } else {
      localStorage.removeItem('liemusic_dont_ask_delete');
    }
  };

  const handleOfflineModeToggle = () => {
    const next = !offlineModeState;
    setOfflineModeState(next);
    setOfflineModeEnabled(next);
    onToggleOfflineMode?.(next);
  };

  const handleDonate = () => {
    const amountVal = customAmount ? parseInt(customAmount, 10) : selectedPreset;
    const finalAmount = !isNaN(amountVal) && amountVal > 0 ? amountVal : 300;
    const yooMoneyUrl = `https://yoomoney.ru/to/${YOOMONEY_WALLET}/${finalAmount}`;
    openExternalUrl(yooMoneyUrl);
  };

  const handleClearHistoryClick = () => {
    onClearHistory();
    setHistoryClearedNotice(true);
    setTimeout(() => setHistoryClearedNotice(false), 2500);
  };

  return (
    <AnimatePresence>
      {isOpen && (
        <motion.div
          key="settings-backdrop"
          initial={{ opacity: 0 }}
          animate={{ opacity: 1 }}
          exit={{ opacity: 0 }}
          className="fixed inset-0 z-50 flex items-end sm:items-center justify-center bg-black/80 backdrop-blur-md"
        >
          <motion.div
            key="settings-content"
            initial={{ y: '100%' }}
            animate={{ y: 0 }}
            exit={{ y: '100%' }}
            transition={{ type: 'spring', damping: 28, stiffness: 300 }}
            className="w-full max-w-lg bg-[#141212] rounded-t-[32px] sm:rounded-[32px] border border-white/10 shadow-2xl flex flex-col max-h-[90vh] overflow-hidden"
          >
            {/* Header & Swipe Handle */}
            <div
              onTouchStart={handleTouchStart}
              onTouchEnd={handleTouchEnd}
              className={`p-4 pb-3 border-b border-white/5 flex items-center justify-between shrink-0 select-none transition-colors ${
                isAtTop ? 'bg-transparent' : 'bg-[#181616]/95 backdrop-blur-md'
              }`}
            >
              <div className="absolute top-2 left-1/2 -translate-x-1/2 w-10 h-1 rounded-full bg-white/20 sm:hidden" />
              <div className="flex items-center space-x-2.5 pt-1">
                <div
                  className="w-8 h-8 rounded-full flex items-center justify-center text-white"
                  style={{ backgroundColor: `${accentColor}25` }}
                >
                  <SlidersHorizontal size={18} style={{ color: accentColor }} />
                </div>
                <div>
                  <h2 className="text-base font-bold text-white tracking-tight">{t.settings}</h2>
                  <p className="text-[11px] text-neutral-400">LieMusic v1.0.4</p>
                </div>
              </div>
              <button
                type="button"
                onClick={onClose}
                className="w-8 h-8 rounded-full bg-white/5 hover:bg-white/10 text-neutral-400 hover:text-white flex items-center justify-center transition-colors cursor-pointer"
              >
                <X size={16} />
              </button>
            </div>

            {/* Scrollable Settings Body */}
            <div
              onScroll={(e) => {
                setIsAtTop(e.currentTarget.scrollTop === 0);
              }}
              className="flex-1 overflow-y-auto px-4 py-4 space-y-5"
            >
              {/* 1. APP BRANDING / ABOUT CARD */}
              <div className="p-4 rounded-3xl bg-gradient-to-br from-[#1F1C1C] via-[#191717] to-[#141212] border border-white/10 shadow-lg space-y-3">
                <div className="flex items-center space-x-3">
                  <FoxLogo className="w-10 h-10 text-orange-500 drop-shadow-[0_0_12px_rgba(249,115,22,0.4)]" />
                  <div>
                    <h3 className="text-base font-extrabold text-white tracking-tight">LieMusic</h3>
                    <p className="text-xs text-neutral-400">{t.appSubtitle}</p>
                  </div>
                </div>
                <p className="text-xs text-neutral-300 leading-relaxed">
                  {t.aboutDescription}
                </p>
                <div className="pt-2 flex items-center justify-between border-t border-white/5">
                  <span className="text-[11px] text-neutral-400">
                    {t.developer}: <span className="text-white font-medium">@lie2srvv</span>
                  </span>
                  <button
                    type="button"
                    onClick={() => openExternalUrl('https://t.me/lie2srvv')}
                    className="text-xs font-semibold text-rose-400 hover:text-rose-300 flex items-center space-x-1.5 transition-colors cursor-pointer"
                  >
                    <Send size={12} />
                    <span>Telegram</span>
                  </button>
                </div>
              </div>

              {/* 2. STORAGE MANAGEMENT */}
              <div className="space-y-3 p-4 rounded-3xl bg-[#1C1A1A] border border-white/5">
                <div className="flex items-center justify-between">
                  <h3 className="text-xs font-bold text-neutral-400 uppercase tracking-wider flex items-center space-x-1.5">
                    <HardDrive size={14} />
                    <span>{t.storageManagement}</span>
                  </h3>
                  {downloadedTracks.length > 0 && (
                    <button
                      type="button"
                      onClick={onClearAllDownloads}
                      className="text-xs text-rose-400 hover:text-rose-300 font-semibold transition-colors cursor-pointer"
                    >
                      {t.clearAllDownloads}
                    </button>
                  )}
                </div>

                {/* Storage usage stats bar */}
                <div className="p-3 rounded-2xl bg-white/5 border border-white/5 space-y-2">
                  <div className="flex items-center justify-between text-xs">
                    <span className="text-neutral-400">{t.storageUsedByApp}</span>
                    <span className="font-bold text-white">{totalStorageFormatted}</span>
                  </div>
                  <div className="w-full h-2 rounded-full bg-white/10 overflow-hidden">
                    <div
                      className="h-full rounded-full transition-all duration-500"
                      style={{
                        width: `${Math.min(100, Math.max(8, downloadedTracks.length * 4))}%`,
                        backgroundColor: accentColor,
                      }}
                    />
                  </div>
                  <div className="flex items-center justify-between text-[11px] text-neutral-500">
                    <span>{t.tracksOnDevice}: {downloadedTracks.length}</span>
                    <span>FLAC / MP3 High Quality</span>
                  </div>
                </div>

                {/* Sort controls for downloaded tracks */}
                {downloadedTracks.length > 1 && (
                  <div className="flex items-center justify-between pt-1 text-xs">
                    <span className="text-neutral-400 flex items-center space-x-1">
                      <ArrowUpDown size={12} />
                      <span>{language === 'ru' ? 'Сортировка файлов' : 'Sort storage'}:</span>
                    </span>
                    <div className="flex items-center space-x-1">
                      <button
                        type="button"
                        onClick={() => setSortType('size_desc')}
                        className={`px-2 py-0.5 rounded-lg font-medium transition-colors ${
                          sortType === 'size_desc'
                            ? 'bg-white/15 text-white'
                            : 'text-neutral-500 hover:text-white'
                        }`}
                      >
                        {t.sortBySize} ↓
                      </button>
                      <button
                        type="button"
                        onClick={() => setSortType('title_asc')}
                        className={`px-2 py-0.5 rounded-lg font-medium transition-colors ${
                          sortType === 'title_asc'
                            ? 'bg-white/15 text-white'
                            : 'text-neutral-500 hover:text-white'
                        }`}
                      >
                        {t.sortByTitle}
                      </button>
                    </div>
                  </div>
                )}

                {/* List of downloaded tracks with individual delete action */}
                <div className="max-h-48 overflow-y-auto space-y-1.5 pr-1 divide-y divide-white/5">
                  {sortedDownloadedTracks.length > 0 ? (
                    sortedDownloadedTracks.map((tr) => (
                      <div
                        key={tr.id}
                        className="flex items-center justify-between py-2 text-xs group"
                      >
                        <div className="min-w-0 pr-2">
                          <p className="font-medium text-white truncate max-w-[240px]">
                            {tr.title}
                          </p>
                          <p className="text-[11px] text-neutral-400 truncate max-w-[200px]">
                            {tr.artist}
                          </p>
                        </div>
                        <div className="flex items-center space-x-2 shrink-0">
                          <span className="text-[11px] text-neutral-400 font-mono">
                            {tr.fileSize || `~3 ${t.mb}`}
                          </span>
                          <button
                            type="button"
                            onClick={() => onDeleteTrack(tr.id, tr.title)}
                            className="w-7 h-7 rounded-lg bg-white/5 hover:bg-rose-500/20 hover:text-rose-400 text-neutral-400 flex items-center justify-center transition-colors cursor-pointer"
                            title={t.deleteFromDevice}
                          >
                            <Trash2 size={14} />
                          </button>
                        </div>
                      </div>
                    ))
                  ) : (
                    <div className="py-6 text-center text-neutral-500 text-xs">
                      {t.noDownloadedTracks}
                    </div>
                  )}
                </div>
              </div>

              {/* 3. PREFERENCES */}
              <div className="space-y-3 p-4 rounded-3xl bg-[#1C1A1A] border border-white/5">
                <h3 className="text-xs font-bold text-neutral-400 uppercase tracking-wider flex items-center space-x-1.5">
                  <Sliders size={14} />
                  <span>{t.preferences}</span>
                </h3>

                {/* Offline Mode Toggle (Zero network traffic) */}
                <div
                  onClick={handleOfflineModeToggle}
                  className="flex items-center justify-between p-3 rounded-2xl bg-white/5 border border-white/5 cursor-pointer hover:bg-white/10 transition-colors"
                >
                  <div className="pr-3">
                    <p className="text-xs font-semibold text-white flex items-center space-x-1.5">
                      <WifiOff size={13} className="text-cyan-400" />
                      <span>{t.offlineModeTitle || 'Офлайн режим'}</span>
                    </p>
                    <p className="text-[10px] text-neutral-400 mt-0.5">
                      {t.offlineModeSubtitle || 'Полностью отключает интернет-запросы и экономит трафик'}
                    </p>
                  </div>
                  <div
                    className={`w-9 h-5 rounded-full transition-colors relative flex items-center p-0.5 shrink-0 ${
                      offlineModeState ? 'bg-cyan-500' : 'bg-white/20'
                    }`}
                  >
                    <div
                      className={`w-4 h-4 rounded-full bg-white shadow-md transition-transform ${
                        offlineModeState ? 'translate-x-4' : 'translate-x-0'
                      }`}
                    />
                  </div>
                </div>

                {/* Language Toggle Card */}
                <div className="flex items-center justify-between p-3 rounded-2xl bg-white/5 border border-white/5">
                  <div>
                    <p className="text-xs font-semibold text-white">{t.language}</p>
                    <p className="text-[10px] text-neutral-400">
                      {language === 'ru' ? 'Русский (RU)' : 'English (EN)'}
                    </p>
                  </div>
                  <div className="flex items-center space-x-1 bg-white/5 p-1 rounded-xl border border-white/10">
                    <button
                      type="button"
                      onClick={() => onLanguageChange('ru')}
                      className={`px-2.5 py-1 rounded-lg text-xs font-bold transition-all cursor-pointer ${
                        language === 'ru'
                          ? 'bg-orange-500 text-black shadow-sm'
                          : 'text-neutral-400 hover:text-white'
                      }`}
                    >
                      RU
                    </button>
                    <button
                      type="button"
                      onClick={() => onLanguageChange('en')}
                      className={`px-2.5 py-1 rounded-lg text-xs font-bold transition-all cursor-pointer ${
                        language === 'en'
                          ? 'bg-orange-500 text-black shadow-sm'
                          : 'text-neutral-400 hover:text-white'
                      }`}
                    >
                      EN
                    </button>
                  </div>
                </div>

                {/* Cellular Download Toggle */}
                <div
                  onClick={handleCellularToggle}
                  className="flex items-center justify-between p-3 rounded-2xl bg-white/5 border border-white/5 cursor-pointer hover:bg-white/10 transition-colors"
                >
                  <div className="pr-3">
                    <p className="text-xs font-semibold text-white flex items-center space-x-1.5">
                      <Wifi size={13} className="text-amber-400" />
                      <span>{t.cellularDownloadTitle}</span>
                    </p>
                    <p className="text-[10px] text-neutral-400 mt-0.5">
                      {t.cellularDownloadSubtitle}
                    </p>
                  </div>
                  <div
                    className={`w-9 h-5 rounded-full transition-colors relative flex items-center p-0.5 shrink-0 ${
                      allowCellular ? 'bg-amber-500' : 'bg-white/20'
                    }`}
                  >
                    <div
                      className={`w-4 h-4 rounded-full bg-white shadow-md transition-transform ${
                        allowCellular ? 'translate-x-4' : 'translate-x-0'
                      }`}
                    />
                  </div>
                </div>

                {/* Confirm Delete Toggle */}
                <div
                  onClick={handleConfirmDeleteToggle}
                  className="flex items-center justify-between p-3 rounded-2xl bg-white/5 border border-white/5 cursor-pointer hover:bg-white/10 transition-colors"
                >
                  <div className="pr-3">
                    <p className="text-xs font-semibold text-white flex items-center space-x-1.5">
                      <AlertCircle size={13} className="text-rose-400" />
                      <span>{t.confirmDeleteTitle}</span>
                    </p>
                    <p className="text-[10px] text-neutral-400 mt-0.5">
                      {t.confirmDeleteSubtitle}
                    </p>
                  </div>
                  <div
                    className={`w-9 h-5 rounded-full transition-colors relative flex items-center p-0.5 shrink-0 ${
                      !dontAskDelete ? 'bg-rose-500' : 'bg-white/20'
                    }`}
                  >
                    <div
                      className={`w-4 h-4 rounded-full bg-white shadow-md transition-transform ${
                        !dontAskDelete ? 'translate-x-4' : 'translate-x-0'
                      }`}
                    />
                  </div>
                </div>

                {/* Quick Equalizer Button */}
                <button
                  type="button"
                  onClick={() => {
                    onClose();
                    onOpenEqualizer();
                  }}
                  className="w-full flex items-center justify-between p-3 rounded-2xl bg-white/5 border border-white/5 hover:bg-white/10 text-xs font-semibold text-white transition-colors cursor-pointer"
                >
                  <span className="flex items-center space-x-2">
                    <SlidersHorizontal size={14} style={{ color: accentColor }} />
                    <span>{t.openEqualizer}</span>
                  </span>
                  <span className="text-neutral-400 text-xs font-normal">→</span>
                </button>

                {/* Clear playback history */}
                <div className="flex items-center justify-between p-3 rounded-2xl bg-white/5 border border-white/5">
                  <div className="pr-3">
                    <p className="text-xs font-semibold text-white flex items-center space-x-1.5">
                      <RotateCcw size={13} className="text-neutral-400" />
                      <span>{t.clearHistory}</span>
                    </p>
                  </div>
                  <button
                    type="button"
                    onClick={handleClearHistoryClick}
                    className="px-3 py-1.5 rounded-xl bg-white/5 hover:bg-white/10 text-neutral-300 hover:text-white text-xs font-medium transition-colors cursor-pointer"
                  >
                    {historyClearedNotice ? (
                      <span className="text-emerald-400 flex items-center space-x-1">
                        <Check size={12} />
                        <span>{t.historyCleared}</span>
                      </span>
                    ) : (
                      t.clearAllDownloads
                    )}
                  </button>
                </div>
              </div>

              {/* 4. SUPPORT THE DEVELOPER / DONATE */}
              <div className="space-y-3 p-4 rounded-3xl bg-gradient-to-br from-[#231A1D] via-[#1B1416] to-[#141212] border border-rose-500/20 shadow-xl">
                <div className="flex items-center space-x-2">
                  <HeartHandshake size={18} className="text-rose-400" />
                  <h3 className="text-sm font-bold text-white tracking-tight">
                    {t.supportProject}
                  </h3>
                </div>
                <p className="text-xs text-neutral-400 leading-relaxed">
                  {t.supportSubtitle}
                </p>

                {/* Donation Presets */}
                <div className="grid grid-cols-5 gap-1.5 pt-1">
                  {DONATE_PRESETS.map((amt) => {
                    const isSelected = selectedPreset === amt && !customAmount;
                    return (
                      <button
                        key={amt}
                        type="button"
                        onClick={() => {
                          setSelectedPreset(amt);
                          setCustomAmount('');
                        }}
                        className={`py-2 rounded-xl text-xs font-bold transition-all cursor-pointer ${
                          isSelected
                            ? 'bg-rose-500 text-white shadow-lg shadow-rose-500/30'
                            : 'bg-white/5 text-neutral-300 hover:bg-white/10 hover:text-white'
                        }`}
                      >
                        {amt} ₽
                      </button>
                    );
                  })}
                </div>

                {/* Custom Amount Input & Submit */}
                <div className="flex items-center space-x-2 pt-1">
                  <div className="relative flex-1">
                    <input
                      type="number"
                      placeholder={t.enterAmountRub}
                      value={customAmount}
                      onChange={(e) => setCustomAmount(e.target.value)}
                      className="w-full px-3 py-2 rounded-xl bg-white/5 border border-white/10 text-xs text-white placeholder-neutral-500 focus:outline-none focus:border-rose-500"
                    />
                    <span className="absolute right-3 top-2 text-xs text-neutral-500">₽</span>
                  </div>
                  <button
                    type="button"
                    onClick={handleDonate}
                    className="px-4 py-2 rounded-xl bg-gradient-to-r from-rose-500 to-pink-500 hover:from-rose-600 hover:to-pink-600 text-white text-xs font-bold flex items-center space-x-1.5 transition-all shadow-lg shadow-rose-500/30 cursor-pointer shrink-0"
                  >
                    <span>{t.donateViaYooMoney}</span>
                    <ExternalLink size={12} />
                  </button>
                </div>

                <p className="text-[10px] text-neutral-500 text-center pt-0.5">
                  {t.minAmountNotice}
                </p>
              </div>
            </div>
          </motion.div>
        </motion.div>
      )}
    </AnimatePresence>
  );
};
