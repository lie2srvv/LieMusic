import React, { useState } from 'react';
import { X, Shield, Download, Upload, Sparkles, Copy, Check } from 'lucide-react';
import { UserProfile } from '../types';
import { AVATAR_PRESETS, exportProfileToFile, importProfileFromFile } from '../services/profile';

interface ProfileModalProps {
  isOpen: boolean;
  onClose: () => void;
  profile: UserProfile;
  onUpdateProfile: (updated: UserProfile) => void;
  onOpenLiePay: () => void;
  accentColor: string;
}

export const ProfileModal: React.FC<ProfileModalProps> = ({
  isOpen,
  onClose,
  profile,
  onUpdateProfile,
  onOpenLiePay,
  accentColor,
}) => {
  const [nickname, setNickname] = useState(profile.nickname);
  const [selectedAvatar, setSelectedAvatar] = useState(profile.avatar);
  const [privacy, setPrivacy] = useState(profile.privacy);
  const [copiedId, setCopiedId] = useState(false);

  if (!isOpen) return null;

  const handleSave = () => {
    onUpdateProfile({
      ...profile,
      nickname: nickname.trim() || 'Lie Слушатель',
      avatar: selectedAvatar,
      privacy,
    });
    onClose();
  };

  const handleCopyId = () => {
    navigator.clipboard.writeText(profile.id);
    setCopiedId(true);
    setTimeout(() => setCopiedId(false), 2000);
  };

  const handleFileImport = async (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (file) {
      try {
        const imported = await importProfileFromFile(file);
        onUpdateProfile(imported);
        setNickname(imported.nickname);
        setSelectedAvatar(imported.avatar);
        setPrivacy(imported.privacy);
      } catch (err) {
        alert('Ошибка при импорте профиля');
      }
    }
  };

  return (
    <div className="fixed inset-0 z-50 flex items-end sm:items-center justify-center bg-black/85 backdrop-blur-xl p-0 sm:p-4 animate-in fade-in duration-200">
      <div className="w-full max-w-md bg-[#181616] border border-white/10 rounded-t-3xl sm:rounded-3xl p-5 shadow-2xl max-h-[90vh] overflow-y-auto">
        {/* Header */}
        <div className="flex items-center justify-between pb-4 border-b border-white/5">
          <div className="flex items-center space-x-2.5">
            <div
              className="w-10 h-10 rounded-2xl flex items-center justify-center text-xl"
              style={{ backgroundColor: `${accentColor}25` }}
            >
              {selectedAvatar}
            </div>
            <div>
              <h3 className="text-base font-bold text-white">Локальный профиль</h3>
              <p className="text-xs text-neutral-400">0 личных данных в облаке</p>
            </div>
          </div>

          <button
            onClick={onClose}
            className="w-8 h-8 rounded-full bg-white/5 hover:bg-white/10 flex items-center justify-center text-neutral-400 hover:text-white transition-colors cursor-pointer"
          >
            <X size={18} />
          </button>
        </div>

        {/* Plan status banner */}
        <div className="mt-4 p-3.5 rounded-2xl bg-[#211F1F] border border-white/5 flex items-center justify-between">
          <div>
            <div className="flex items-center space-x-2">
              <span className="text-xs text-neutral-400 font-medium">Статус:</span>
              {profile.plan === 'lifetime' ? (
                <span className="text-xs font-bold text-emerald-400 flex items-center space-x-1">
                  <Sparkles size={13} />
                  <span>Pro навсегда (249 ₽)</span>
                </span>
              ) : (
                <span className="text-xs font-bold text-neutral-300">Базовый (Бесплатный)</span>
              )}
            </div>
            <div className="flex items-center space-x-2 mt-1">
              <span className="text-[11px] text-neutral-500 font-mono truncate max-w-[170px]">
                ID: {profile.id}
              </span>
              <button
                onClick={handleCopyId}
                className="text-neutral-400 hover:text-white transition-colors cursor-pointer"
                title="Скопировать Device ID"
              >
                {copiedId ? <Check size={12} className="text-emerald-400" /> : <Copy size={12} />}
              </button>
            </div>
          </div>

          {profile.plan !== 'lifetime' && (
            <button
              onClick={() => {
                onClose();
                onOpenLiePay();
              }}
              className="text-xs font-bold px-3 py-1.5 rounded-xl bg-amber-400 text-black hover:bg-amber-300 active:scale-95 transition-all shadow-md cursor-pointer shrink-0"
            >
              Pro за 249 ₽
            </button>
          )}
        </div>

        {/* Nickname input */}
        <div className="mt-4">
          <label className="text-xs font-semibold text-neutral-300 block mb-1.5">Никнейм</label>
          <input
            type="text"
            value={nickname}
            onChange={(e) => setNickname(e.target.value)}
            className="w-full bg-[#211F1F] border border-white/10 rounded-xl px-3.5 py-2.5 text-sm text-white focus:outline-none focus:border-white/30"
          />
        </div>

        {/* Avatar choices */}
        <div className="mt-4">
          <label className="text-xs font-semibold text-neutral-300 block mb-2">Аватар</label>
          <div className="flex flex-wrap gap-2">
            {AVATAR_PRESETS.map((emoji) => (
              <button
                key={emoji}
                onClick={() => setSelectedAvatar(emoji)}
                className={`w-10 h-10 rounded-2xl flex items-center justify-center text-lg transition-transform active:scale-95 cursor-pointer ${
                  selectedAvatar === emoji
                    ? 'border-2 scale-105 bg-white/15'
                    : 'bg-white/5 border border-white/5 hover:bg-white/10'
                }`}
                style={{
                  borderColor: selectedAvatar === emoji ? accentColor : undefined,
                }}
              >
                {emoji}
              </button>
            ))}
          </div>
        </div>

        {/* Privacy switches */}
        <div className="mt-5 space-y-3 p-3.5 rounded-2xl bg-[#211F1F] border border-white/5">
          <div className="flex items-center space-x-2 text-xs font-bold text-white mb-1">
            <Shield size={14} className="text-amber-400" />
            <span>Настройки приватности (0 утечек)</span>
          </div>

          <label className="flex items-center justify-between text-xs text-neutral-300 cursor-pointer">
            <span>Сохранять историю прослушиваний локально</span>
            <input
              type="checkbox"
              checked={privacy.showListeningHistory}
              onChange={(e) => setPrivacy({ ...privacy, showListeningHistory: e.target.checked })}
              className="rounded accent-emerald-400 w-4 h-4 cursor-pointer"
            />
          </label>

          <label className="flex items-center justify-between text-xs text-neutral-300 cursor-pointer">
            <span>Отображать любимые треки в медиатеке</span>
            <input
              type="checkbox"
              checked={privacy.showFavorites}
              onChange={(e) => setPrivacy({ ...privacy, showFavorites: e.target.checked })}
              className="rounded accent-emerald-400 w-4 h-4 cursor-pointer"
            />
          </label>

          <label className="flex items-center justify-between text-xs text-neutral-300 cursor-pointer">
            <span className="text-amber-300">Режим инкогнито (Stealth Mode)</span>
            <input
              type="checkbox"
              checked={privacy.stealthMode}
              onChange={(e) => setPrivacy({ ...privacy, stealthMode: e.target.checked })}
              className="rounded accent-amber-400 w-4 h-4 cursor-pointer"
            />
          </label>
        </div>

        {/* Export / Import buttons */}
        <div className="mt-5 grid grid-cols-2 gap-2">
          <button
            onClick={() => exportProfileToFile(profile)}
            className="flex items-center justify-center space-x-2 py-2 px-3 rounded-xl bg-white/5 hover:bg-white/10 text-neutral-200 text-xs font-semibold border border-white/10 active:scale-95 transition-all cursor-pointer"
          >
            <Download size={14} />
            <span>Экспорт JSON</span>
          </button>

          <label className="flex items-center justify-center space-x-2 py-2 px-3 rounded-xl bg-white/5 hover:bg-white/10 text-neutral-200 text-xs font-semibold border border-white/10 active:scale-95 transition-all cursor-pointer">
            <Upload size={14} />
            <span>Импорт JSON</span>
            <input type="file" accept=".json" onChange={handleFileImport} className="hidden" />
          </label>
        </div>

        {/* Save button */}
        <div className="mt-5">
          <button
            onClick={handleSave}
            className="w-full py-2.5 rounded-xl font-bold text-sm transition-all active:scale-98 cursor-pointer shadow-lg"
            style={{ backgroundColor: accentColor, color: '#151313' }}
          >
            Сохранить настройки
          </button>
        </div>
      </div>
    </div>
  );
};
