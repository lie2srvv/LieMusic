import React, { useState, useMemo } from 'react';
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
  Sparkles,
  Wifi,
  AlertCircle,
  RotateCcw,
} from 'lucide-react';
import { Track } from '../types';
import { translations, Language } from '../i18n/translations';
import { FoxLogo } from './FoxLogo';

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

  const [historyClearedNotice, setHistoryClearedNotice] = useState<boolean>(false);

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
    // If dontAskDelete is true, confirm dialog is skipped. Toggling means asking again.
    const next = !dontAskDelete;
    setDontAskDelete(next);
    if (next) {
      localStorage.setItem('liemusic_dont_ask_delete', 'true');
    } else {
      localStorage.removeItem('liemusic_dont_ask_delete');
    }
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
          key="settings-modal"
          initial={{ opacity: 0 }}
          animate={{ opacity: 1 }}
          exit={{ opacity: 0 }}
          transition={{ duration: 0.18 }}
          onClick={onClose}
          className="fixed inset-0 z-50 flex items-end sm:items-center justify-center p-0 sm:p-4 bg-black/80 backdrop-blur-md"
        >
          <motion.div
            initial={{ y: '100%', opacity: 0.8 }}
            animate={{ y: 0, opacity: 1 }}
            exit={{ y: '100%', opacity: 0 }}
            transition={{ type: 'spring', stiffness: 350, damping: 32 }}
            onClick={(e) => e.stopPropagation()}
            className="bg-[#161414] border-t sm:border border-white/10 rounded-t-3xl sm:rounded-3xl w-full max-w-lg max-h-[90vh] flex flex-col shadow-2xl overflow-hidden"
          >
        {/* Header */}
        <div className="flex items-center justify-between p-5 border-b border-white/5 bg-[#1A1818]/80 backdrop-blur-md">
          <div className="flex items-center space-x-3">
            <div
              className="w-10 h-10 rounded-2xl flex items-center justify-center"
              style={{ backgroundColor: `${accentColor}20`, color: accentColor }}
            >
              <SlidersHorizontal size={20} />
            </div>
            <div>
              <h2 className="text-base font-bold text-white tracking-tight">{t.settings}</h2>
              <p className="text-[11px] text-neutral-400">LieMusic v1.0.0</p>
            </div>
          </div>
          <button
            onClick={onClose}
            className="w-8 h-8 rounded-full bg-white/5 hover:bg-white/10 flex items-center justify-center text-neutral-400 hover:text-white transition-colors cursor-pointer"
          >
            <X size={18} />
          </button>
        </div>

        {/* Scrollable Content */}
        <div className="flex-1 overflow-y-auto p-5 space-y-6">
          {/* 1. SUPPORT THE PROJECT (YooMoney) */}
          <div className="p-4 rounded-3xl bg-gradient-to-br from-amber-500/15 via-[#1D1B1B] to-[#171515] border border-amber-500/25 space-y-3.5 shadow-lg relative overflow-hidden">
            <div className="absolute -top-12 -right-12 w-32 h-32 rounded-full bg-amber-500/10 blur-2xl pointer-events-none" />

            <div className="flex items-center space-x-3">
              <div className="w-10 h-10 rounded-2xl bg-amber-500/20 text-amber-400 flex items-center justify-center shrink-0 border border-amber-500/30">
                <HeartHandshake size={20} />
              </div>
              <div className="min-w-0 flex-1">
                <h3 className="text-sm font-bold text-white flex items-center space-x-1.5">
                  <span>{t.supportProject}</span>
                  <Sparkles size={14} className="text-amber-400" />
                </h3>
                <p className="text-[11px] text-neutral-400 leading-snug">
                  {t.supportDesc}
                </p>
              </div>
            </div>

            {/* Presets */}
            <div className="grid grid-cols-5 gap-1.5 pt-1">
              {DONATE_PRESETS.map((amount) => (
                <button
                  key={amount}
                  type="button"
                  onClick={() => {
                    setSelectedPreset(amount);
                    setCustomAmount('');
                  }}
                  className={`py-2 rounded-xl text-xs font-bold transition-all cursor-pointer border ${
                    selectedPreset === amount && !customAmount
                      ? 'bg-amber-500 text-black border-amber-500 shadow-md shadow-amber-950/40'
                      : 'bg-white/5 text-neutral-300 border-white/5 hover:bg-white/10 hover:text-white'
                  }`}
                >
                  {amount} ₽
                </button>
              ))}
            </div>

            {/* Custom Amount Field */}
            <div className="flex items-center space-x-2">
              <div className="relative flex-1">
                <input
                  type="number"
                  min="10"
                  step="10"
                  value={customAmount}
                  onChange={(e) => {
                    setCustomAmount(e.target.value);
                  }}
                  placeholder={t.enterAmountRub}
                  className="w-full bg-white/5 border border-white/10 rounded-2xl px-3.5 py-2.5 text-xs text-white placeholder-neutral-500 focus:outline-none focus:border-amber-500/50 transition-colors font-mono"
                />
                <span className="absolute right-3.5 top-1/2 -translate-y-1/2 text-xs font-bold text-neutral-400 pointer-events-none">
                  ₽
                </span>
              </div>
              <button
                type="button"
                onClick={handleDonate}
                className="py-2.5 px-4 rounded-2xl bg-gradient-to-r from-amber-500 to-amber-600 hover:from-amber-400 hover:to-amber-500 text-black font-bold text-xs flex items-center space-x-1.5 shadow-lg shadow-amber-900/30 transition-all active:scale-95 cursor-pointer shrink-0"
              >
                <span>{t.donateViaYooMoney}</span>
                <ExternalLink size={13} />
              </button>
            </div>
            <p className="text-[10px] text-neutral-500">
              {t.minAmountNotice}
            </p>
          </div>

          {/* 2. STORAGE MANAGEMENT (Downloaded tracks + Sorting) */}
          <div className="space-y-3 p-4 rounded-3xl bg-[#1C1A1A] border border-white/5">
            <div className="flex items-center justify-between">
              <div className="flex items-center space-x-2.5">
                <div className="w-8 h-8 rounded-xl bg-emerald-500/15 text-emerald-400 flex items-center justify-center">
                  <HardDrive size={16} />
                </div>
                <div>
                  <h3 className="text-sm font-bold text-white">{t.storageManagement}</h3>
                  <p className="text-[11px] text-neutral-400">
                    {t.totalStorageUsed(downloadedTracks.length, totalStorageFormatted)}
                  </p>
                </div>
              </div>

              {downloadedTracks.length > 0 && (
                <button
                  type="button"
                  onClick={onClearAllDownloads}
                  className="text-[11px] text-rose-400 hover:text-rose-300 font-medium px-2 py-1 rounded-lg hover:bg-rose-500/10 transition-colors cursor-pointer"
                >
                  {t.clear}
                </button>
              )}
            </div>

            {/* Sorting Selector */}
            {downloadedTracks.length > 0 && (
              <div className="space-y-1.5 pt-1 border-t border-white/5">
                <div className="flex items-center justify-between text-xs text-neutral-400">
                  <span className="flex items-center space-x-1 text-[11px] font-medium">
                    <ArrowUpDown size={12} />
                    <span>{t.sortBy}</span>
                  </span>
                </div>
                <div className="grid grid-cols-2 gap-1.5">
                  <button
                    type="button"
                    onClick={() => setSortType('size_desc')}
                    className={`text-left px-2.5 py-1.5 rounded-xl text-[11px] font-medium border transition-all cursor-pointer ${
                      sortType === 'size_desc'
                        ? 'bg-emerald-500/20 text-emerald-300 border-emerald-500/40 shadow-sm'
                        : 'bg-white/5 border-white/5 text-neutral-400 hover:text-white'
                    }`}
                  >
                    🔽 {t.sortBySizeDesc}
                  </button>
                  <button
                    type="button"
                    onClick={() => setSortType('size_asc')}
                    className={`text-left px-2.5 py-1.5 rounded-xl text-[11px] font-medium border transition-all cursor-pointer ${
                      sortType === 'size_asc'
                        ? 'bg-emerald-500/20 text-emerald-300 border-emerald-500/40 shadow-sm'
                        : 'bg-white/5 border-white/5 text-neutral-400 hover:text-white'
                    }`}
                  >
                    🔼 {t.sortBySizeAsc}
                  </button>
                  <button
                    type="button"
                    onClick={() => setSortType('title_asc')}
                    className={`text-left px-2.5 py-1.5 rounded-xl text-[11px] font-medium border transition-all cursor-pointer ${
                      sortType === 'title_asc'
                        ? 'bg-emerald-500/20 text-emerald-300 border-emerald-500/40 shadow-sm'
                        : 'bg-white/5 border-white/5 text-neutral-400 hover:text-white'
                    }`}
                  >
                    🔤 {t.sortByName}
                  </button>
                  <button
                    type="button"
                    onClick={() => setSortType('date_desc')}
                    className={`text-left px-2.5 py-1.5 rounded-xl text-[11px] font-medium border transition-all cursor-pointer ${
                      sortType === 'date_desc'
                        ? 'bg-emerald-500/20 text-emerald-300 border-emerald-500/40 shadow-sm'
                        : 'bg-white/5 border-white/5 text-neutral-400 hover:text-white'
                    }`}
                  >
                    🕒 {t.sortByDate}
                  </button>
                </div>
              </div>
            )}

            {/* List of files with sizes */}
            <div className="space-y-1.5 pt-2 max-h-56 overflow-y-auto pr-1">
              {sortedDownloadedTracks.length > 0 ? (
                sortedDownloadedTracks.map((tr) => (
                  <div
                    key={tr.id}
                    className="flex items-center justify-between p-2 rounded-2xl bg-white/5 hover:bg-white/10 transition-colors border border-white/5 group"
                  >
                    <div className="flex items-center space-x-2.5 min-w-0 flex-1 pr-2">
                      <div className="w-8 h-8 rounded-lg overflow-hidden bg-neutral-800 shrink-0">
                        {tr.thumbnail ? (
                          <img src={tr.thumbnail} alt={tr.title} className="w-full h-full object-cover" />
                        ) : (
                          <div className="w-full h-full flex items-center justify-center text-neutral-600 text-[10px]">
                            🎵
                          </div>
                        )}
                      </div>
                      <div className="min-w-0 flex-1">
                        <p className="text-xs font-semibold text-white truncate">{tr.title}</p>
                        <p className="text-[10px] text-neutral-400 truncate">{tr.artist}</p>
                      </div>
                    </div>

                    <div className="flex items-center space-x-2 shrink-0">
                      {tr.fileSize && (
                        <span className="text-[11px] font-mono font-bold text-emerald-400 bg-emerald-500/10 border border-emerald-500/20 px-2 py-0.5 rounded-lg">
                          {tr.fileSize}
                        </span>
                      )}
                      <button
                        type="button"
                        onClick={() => onDeleteTrack(tr.id, tr.title)}
                        className="p-1.5 rounded-lg text-neutral-500 hover:text-rose-400 hover:bg-rose-500/10 transition-colors cursor-pointer"
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
              className="w-full flex items-center justify-between p-3 rounded-2xl bg-white/5 hover:bg-white/10 border border-white/5 text-xs font-medium text-white transition-colors cursor-pointer"
            >
              <span className="flex items-center space-x-2">
                <Sliders size={14} style={{ color: accentColor }} />
                <span>{t.openEqualizer}</span>
              </span>
              <span className="text-neutral-500 text-[10px]">10-Band</span>
            </button>

            {/* Clear History Button */}
            <button
              type="button"
              onClick={handleClearHistoryClick}
              className="w-full flex items-center justify-between p-3 rounded-2xl bg-white/5 hover:bg-white/10 border border-white/5 text-xs font-medium text-neutral-300 hover:text-white transition-colors cursor-pointer"
            >
              <span className="flex items-center space-x-2">
                <RotateCcw size={14} className="text-neutral-400" />
                <span>{t.clearHistory}</span>
              </span>
              {historyClearedNotice && (
                <span className="text-[10px] text-emerald-400 font-semibold flex items-center space-x-1">
                  <Check size={12} />
                  <span>{t.historyCleared}</span>
                </span>
              )}
            </button>
          </div>

          {/* 4. ABOUT SECTION */}
          <div className="p-4 rounded-3xl bg-[#1C1A1A] border border-white/5 space-y-3 text-left">
            <div className="flex items-center space-x-3">
              <div className="w-10 h-10 rounded-2xl bg-orange-500/15 border border-orange-500/30 flex items-center justify-center shrink-0">
                <FoxLogo className="w-7 h-7 text-orange-500" />
              </div>
              <div>
                <h4 className="text-sm font-bold text-white tracking-tight">LieMusic</h4>
                <p className="text-[11px] text-neutral-400">v1.0.0 (Release) · Tauri 2.0</p>
              </div>
            </div>

            <p className="text-xs text-neutral-300 leading-relaxed">
              {t.aboutDescription}
            </p>

            <div className="pt-2 border-t border-white/5 flex items-center justify-between text-xs">
              <span className="text-neutral-400">
                {t.developer}: <span className="text-white font-medium">lie2srvv</span>
              </span>

              <button
                type="button"
                onClick={() => openExternalUrl('https://t.me/lie2srvv')}
                className="flex items-center space-x-1.5 px-3 py-1.5 rounded-xl bg-sky-500/15 hover:bg-sky-500/25 border border-sky-500/30 text-sky-400 text-xs font-medium transition-colors cursor-pointer"
              >
                <Send size={12} />
                <span>Telegram</span>
              </button>
            </div>
          </div>
        </div>
          </motion.div>
        </motion.div>
      )}
    </AnimatePresence>
  );
};
