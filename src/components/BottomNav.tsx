import React from 'react';
import { Home, Search, Library, DownloadCloud, User } from 'lucide-react';

export type TabType = 'home' | 'search' | 'library' | 'offline' | 'profile';

interface BottomNavProps {
  activeTab: TabType;
  onChangeTab: (tab: TabType) => void;
  accentColor: string;
}

export const BottomNav: React.FC<BottomNavProps> = ({
  activeTab,
  onChangeTab,
  accentColor,
}) => {
  const tabs = [
    { id: 'home' as TabType, label: 'Главная', icon: Home },
    { id: 'search' as TabType, label: 'Поиск', icon: Search },
    { id: 'library' as TabType, label: 'Медиатека', icon: Library },
    { id: 'offline' as TabType, label: 'Офлайн', icon: DownloadCloud },
    { id: 'profile' as TabType, label: 'Профиль', icon: User },
  ];

  return (
    <nav className="fixed bottom-0 left-0 right-0 z-30 bg-[#1D1B1B]/95 backdrop-blur-xl border-t border-white/5 px-2 py-2 safe-area-pb">
      <div className="max-w-md mx-auto flex items-center justify-around">
        {tabs.map((tab) => {
          const Icon = tab.icon;
          const isActive = activeTab === tab.id;

          return (
            <button
              key={tab.id}
              onClick={() => onChangeTab(tab.id)}
              className="flex flex-col items-center justify-center py-1 px-3 rounded-2xl transition-all duration-200 active:scale-95 cursor-pointer"
            >
              <div
                className={`p-1.5 rounded-full transition-all duration-300 ${
                  isActive ? 'bg-white/10 scale-110' : 'text-neutral-400'
                }`}
                style={{ color: isActive ? accentColor : undefined }}
              >
                <Icon size={20} strokeWidth={isActive ? 2.5 : 2} />
              </div>
              <span
                className={`text-[10px] font-medium mt-0.5 tracking-tight transition-colors ${
                  isActive ? 'text-white font-semibold' : 'text-neutral-400'
                }`}
              >
                {tab.label}
              </span>
            </button>
          );
        })}
      </div>
    </nav>
  );
};
