import React, { useState } from 'react';
import { X, Sparkles, Check, KeyRound, ExternalLink } from 'lucide-react';
import { verifyLicense, LIEPAY_MUSIC_URL, LIE_MUSIC_LIFETIME_PRICE } from '../services/liepay';

interface LiePayModalProps {
  isOpen: boolean;
  onClose: () => void;
  onActivated: () => void;
  accentColor: string;
}

export const LiePayModal: React.FC<LiePayModalProps> = ({
  isOpen,
  onClose,
  onActivated,
  accentColor,
}) => {
  const [licenseKey, setLicenseKey] = useState('');
  const [loading, setLoading] = useState(false);
  const [errorMsg, setErrorMsg] = useState('');
  const [successMsg, setSuccessMsg] = useState('');

  if (!isOpen) return null;

  const handleVerify = async () => {
    if (!licenseKey.trim()) {
      setErrorMsg('Пожалуйста, введите ключ или номер заказа');
      return;
    }

    setLoading(true);
    setErrorMsg('');
    setSuccessMsg('');

    try {
      const result = await verifyLicense(licenseKey.trim());
      if (result.valid) {
        setSuccessMsg(result.message);
        setTimeout(() => {
          onActivated();
          onClose();
        }, 1200);
      } else {
        setErrorMsg(result.message);
      }
    } catch {
      setErrorMsg('Ошибка связи с сервером активации');
    } finally {
      setLoading(false);
    }
  };

  const openPaymentSite = () => {
    window.open(LIEPAY_MUSIC_URL, '_blank');
  };

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/85 backdrop-blur-xl p-4 animate-in fade-in duration-200">
      <div className="w-full max-w-md bg-[#181616] border border-white/10 rounded-3xl p-6 shadow-2xl relative overflow-hidden">
        {/* Ambient Top Glow */}
        <div
          className="absolute -top-24 left-1/2 -translate-x-1/2 w-64 h-40 rounded-full blur-3xl opacity-40 pointer-events-none"
          style={{ backgroundColor: accentColor }}
        />

        {/* Close Button */}
        <button
          onClick={onClose}
          className="absolute top-4 right-4 w-8 h-8 rounded-full bg-white/5 hover:bg-white/10 flex items-center justify-center text-neutral-400 hover:text-white transition-colors cursor-pointer"
        >
          <X size={18} />
        </button>

        {/* Badge & Title */}
        <div className="flex flex-col items-center text-center mt-2">
          <div
            className="w-12 h-12 rounded-2xl flex items-center justify-center mb-3 shadow-lg"
            style={{ backgroundColor: `${accentColor}25`, color: accentColor }}
          >
            <Sparkles size={24} />
          </div>
          <h2 className="text-xl font-extrabold text-white tracking-tight">LieMusic Pro</h2>
          <div className="mt-1 flex items-baseline space-x-1">
            <span className="text-2xl font-black text-white">{LIE_MUSIC_LIFETIME_PRICE} ₽</span>
            <span className="text-xs text-neutral-400 font-medium">/ навсегда</span>
          </div>
          <p className="text-xs text-neutral-400 mt-1 max-w-xs">
            Альтернатива бесконечным подпискам. Один платеж — полный доступ без ограничений.
          </p>
        </div>

        {/* Benefits list */}
        <div className="my-5 space-y-2.5 bg-[#211F1F] p-4 rounded-2xl border border-white/5">
          {[
            'Офлайн-скачивание треков прямо на устройство',
            '10-полосный эквалайзер и Bass Boost',
            'Караоке-тексты (LRCLIB) строчка за строчкой',
            'Discord & LieCord Rich Presence статус',
            '0 личных данных и 0 рекламы навсегда',
          ].map((item, i) => (
            <div key={i} className="flex items-center space-x-2.5 text-xs text-neutral-200">
              <div className="w-4 h-4 rounded-full bg-emerald-500/20 text-emerald-400 flex items-center justify-center shrink-0">
                <Check size={11} strokeWidth={3} />
              </div>
              <span>{item}</span>
            </div>
          ))}
        </div>

        {/* Pay Action Button */}
        <button
          onClick={openPaymentSite}
          className="w-full py-3 px-4 rounded-2xl font-bold text-sm flex items-center justify-center space-x-2 shadow-xl hover:opacity-95 active:scale-98 transition-all cursor-pointer"
          style={{ backgroundColor: accentColor, color: '#151313' }}
        >
          <span>Перейти к оплате на LiePay</span>
          <ExternalLink size={16} />
        </button>
        <p className="text-[11px] text-center text-neutral-500 mt-1.5">
          Безопасная оплата через СБП, карты и Telegram
        </p>

        {/* Key Activation Form */}
        <div className="mt-5 pt-4 border-t border-white/5">
          <label className="text-xs font-semibold text-neutral-300 block mb-2 flex items-center space-x-1.5">
            <KeyRound size={14} className="text-neutral-400" />
            <span>Уже оплатили? Введите ключ или номер заказа:</span>
          </label>
          <div className="flex space-x-2">
            <input
              type="text"
              placeholder="LM-PRO-..."
              value={licenseKey}
              onChange={(e) => setLicenseKey(e.target.value)}
              className="flex-1 bg-[#211F1F] border border-white/10 rounded-xl px-3 py-2 text-xs font-mono text-white placeholder-neutral-500 focus:outline-none focus:border-white/30 uppercase tracking-wider"
            />
            <button
              onClick={handleVerify}
              disabled={loading}
              className="px-4 py-2 rounded-xl bg-white/10 hover:bg-white/15 text-white text-xs font-bold transition-all active:scale-95 disabled:opacity-50 cursor-pointer"
            >
              {loading ? 'Проверка...' : 'Активировать'}
            </button>
          </div>

          {/* Test key helper for user review */}
          <div className="mt-2 text-center">
            <button
              onClick={() => setLicenseKey('LM-PRO-249-LIFETIME')}
              className="text-[10px] text-neutral-500 hover:text-neutral-300 underline cursor-pointer"
            >
              Вставить тестовый ключ (LM-PRO-249-LIFETIME)
            </button>
          </div>

          {errorMsg && (
            <p className="text-xs text-rose-400 mt-2 text-center font-medium bg-rose-500/10 py-1.5 rounded-lg border border-rose-500/20">
              {errorMsg}
            </p>
          )}

          {successMsg && (
            <p className="text-xs text-emerald-400 mt-2 text-center font-semibold bg-emerald-500/10 py-1.5 rounded-lg border border-emerald-500/20">
              {successMsg}
            </p>
          )}
        </div>
      </div>
    </div>
  );
};
