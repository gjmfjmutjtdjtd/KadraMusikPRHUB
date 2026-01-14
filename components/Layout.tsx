
import React from 'react';
import { AppTab } from '../types';

interface LayoutProps {
  children: React.ReactNode;
  activeTab: AppTab;
  setActiveTab: (tab: AppTab) => void;
}

const Layout: React.FC<LayoutProps> = ({ children, activeTab, setActiveTab }) => {
  const getTabLabel = (tab: AppTab) => {
    switch(tab) {
      case 'label_artists': return 'Артисты лейбла';
      case 'tracks': return 'Реестр треков';
      case 'ai': return 'ИИ Ассистент';
      case 'links': return 'Быстрые ссылки';
      case 'platform_pitching': return 'Питчинг платформ';
      case 'release_plans': return 'Планы релизов';
      case 'statistics': return 'Статистика';
      default: return 'Контакты';
    }
  };

  const menuItems: { id: AppTab; icon: string; label: string }[] = [
    { id: 'contacts', icon: 'fa-address-book', label: 'Контакты' },
    { id: 'platform_pitching', icon: 'fa-broadcast-tower', label: 'Питчинг платформ' },
    { id: 'label_artists', icon: 'fa-users-viewfinder', label: 'Артисты лейбла' },
    { id: 'tracks', icon: 'fa-compact-disc', label: 'Реестр треков' },
    { id: 'release_plans', icon: 'fa-calendar-days', label: 'Планы релизов' },
    { id: 'statistics', icon: 'fa-chart-simple', label: 'Статистика' },
    { id: 'links', icon: 'fa-link', label: 'Быстрые ссылки' },
    { id: 'ai', icon: 'fa-wand-magic-sparkles', label: 'ИИ Ассистент' },
  ];

  return (
    <div className="min-h-screen flex flex-col md:flex-row bg-slate-50">
      {/* Sidebar */}
      <aside className="w-full md:w-64 bg-white border-r border-slate-200 flex-shrink-0 flex flex-col">
        <div className="p-6">
          <h1 className="text-2xl font-bold text-indigo-600 flex items-center gap-2">
            <i className="fa-solid fa-star-of-life"></i> PR HUB
          </h1>
        </div>
        <nav className="mt-4 px-4 space-y-1 flex-1 overflow-y-auto">
          {menuItems.map((item) => (
            <button
              key={item.id}
              onClick={() => setActiveTab(item.id)}
              className={`w-full flex items-center gap-3 px-4 py-3 rounded-xl transition-all ${
                activeTab === item.id ? 'bg-indigo-50 text-indigo-600 font-semibold' : 'text-slate-500 hover:bg-slate-50'
              }`}
            >
              <i className={`fa-solid ${item.icon} w-5`}></i> {item.label}
            </button>
          ))}
        </nav>
        <div className="p-6 border-t border-slate-100 text-[10px] text-slate-400 font-bold uppercase tracking-widest">
          PR Dashboard v1.4
        </div>
      </aside>

      {/* Main Content */}
      <main className="flex-1 overflow-y-auto p-4 md:p-8">
        <header className="mb-8 flex flex-col md:flex-row md:items-center justify-between gap-4">
          <div>
            <h2 className="text-3xl font-black text-slate-800 tracking-tight">{getTabLabel(activeTab)}</h2>
            <p className="text-slate-500 font-medium">Управление вашей музыкальной экосистемой.</p>
          </div>
          <div className="hidden md:block">
             <div className="flex -space-x-2">
                {[1,2,3,4,5].map(i => (
                  <img 
                    key={i}
                    src={`https://picsum.photos/seed/${i + 20}/40/40`} 
                    className="w-10 h-10 rounded-full border-2 border-white shadow-sm"
                    alt="avatar"
                  />
                ))}
             </div>
          </div>
        </header>
        {children}
      </main>
    </div>
  );
};

export default Layout;
