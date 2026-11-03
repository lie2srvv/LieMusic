import React from 'react';
import { Home, Search, Library, DownloadCloud } from 'lucide-react';
import { motion } from 'motion/react';
import { Language, translations } from '../i18n/translations';

export type TabType = 'home' | 'search' | 'library' | 'offline';

interface BottomNavProps {
  activeTab: TabType;
  language: Language;
  onChangeTab: (tab: TabType) => void;
  accentColor: string;
}

export const BottomNav: React.FC<BottomNavProps> = ({
  activeTab,
  language,
  onChangeTab,
  accentColor,
}) => {
  const t = translations[language];

  const tabs = [
    { id: 'home' as TabType, label: t.tabHome, icon: Home },
    { id: 'search' as TabType, label: t.tabSearch, icon: Search },
    { id: 'library' as TabType, label: t.tabLibrary, icon: Library },
    { id: 'offline' as TabType, label: t.tabOffline, icon: DownloadCloud },
  ];

  return (
    <nav className="w-full bg-[#1D1B1B]/95 backdrop-blur-xl border-t border-white/5 px-2 py-2 safe-area-pb">
      <div className="max-w-md mx-auto flex items-center justify-around relative">
        {tabs.map((tab) => {
          const Icon = tab.icon;
          const isActive = activeTab === tab.id;

          return (
            <motion.button
              key={tab.id}
              onClick={() => onChangeTab(tab.id)}
              whileTap={{ scale: 0.88 }}
              className="relative flex flex-col items-center justify-center py-1.5 px-4 rounded-2xl cursor-pointer select-none transition-colors"
            >
              {isActive && (
                <motion.div
                  layoutId="active-bottom-nav-pill"
                  className="absolute inset-0 bg-white/10 rounded-2xl border border-white/10 shadow-sm"
                  transition={{ type: 'spring', stiffness: 420, damping: 32 }}
                />
              )}

              <div
                className="relative z-10 p-1 rounded-full transition-colors duration-200"
                style={{ color: isActive ? accentColor : '#9CA3AF' }}
              >
                <Icon size={20} strokeWidth={isActive ? 2.5 : 2} />
              </div>
              <span
                className={`relative z-10 text-[10px] font-medium mt-0.5 tracking-tight transition-colors duration-200 ${
                  isActive ? 'text-white font-semibold' : 'text-neutral-400'
                }`}
              >
                {tab.label}
              </span>
            </motion.button>
          );
        })}
      </div>
    </nav>
  );
};
