
import React, { useState, useMemo, useEffect } from 'react';
import Layout from './components/Layout';
import ContactCard from './components/ContactCard';
import Modal from './components/Modal';
import { Contact, QuickLink, Track, AppTab, ReleasePlan, Metric, ContactCategory } from './types';
import { INITIAL_CONTACTS, INITIAL_LINKS, INITIAL_LABEL_ARTISTS, INITIAL_TRACKS, INITIAL_PLATFORM_CONTACTS, INITIAL_RELEASE_PLANS, INITIAL_METRICS } from './constants';
import { generatePitch, processSmartImport } from './services/geminiService';

// Helper for local storage
const getStorage = <T,>(key: string, fallback: T): T => {
  const saved = localStorage.getItem(key);
  try {
    return saved ? JSON.parse(saved) : fallback;
  } catch {
    return fallback;
  }
};

const App: React.FC = () => {
  const [activeTab, setActiveTab] = useState<AppTab>('contacts');
  
  // Persistent States
  const [contacts, setContacts] = useState<Contact[]>(() => getStorage('pr_contacts', INITIAL_CONTACTS));
  const [platformContacts, setPlatformContacts] = useState<Contact[]>(() => getStorage('pr_platform_contacts', INITIAL_PLATFORM_CONTACTS));
  const [labelArtists, setLabelArtists] = useState<Contact[]>(() => getStorage('pr_label_artists', INITIAL_LABEL_ARTISTS));
  const [tracks, setTracks] = useState<Track[]>(() => getStorage('pr_tracks', INITIAL_TRACKS));
  const [releasePlans, setReleasePlans] = useState<ReleasePlan[]>(() => getStorage('pr_release_plans', INITIAL_RELEASE_PLANS));
  const [links, setLinks] = useState<QuickLink[]>(() => getStorage('pr_links', INITIAL_LINKS));
  // Fix: Added missing metrics state to resolve "Cannot find name 'metrics'" error
  const [metrics, setMetrics] = useState<Metric[]>(() => getStorage('pr_metrics', INITIAL_METRICS));
  
  const [searchTerm, setSearchTerm] = useState('');
  const [filterCategory, setFilterCategory] = useState<ContactCategory | 'All'>('All');
  
  // Auto-save Effect
  useEffect(() => {
    localStorage.setItem('pr_contacts', JSON.stringify(contacts));
    localStorage.setItem('pr_platform_contacts', JSON.stringify(platformContacts));
    localStorage.setItem('pr_label_artists', JSON.stringify(labelArtists));
    localStorage.setItem('pr_tracks', JSON.stringify(tracks));
    localStorage.setItem('pr_release_plans', JSON.stringify(releasePlans));
    localStorage.setItem('pr_links', JSON.stringify(links));
    // Fix: Persistence for metrics
    localStorage.setItem('pr_metrics', JSON.stringify(metrics));
  }, [contacts, platformContacts, labelArtists, tracks, releasePlans, links, metrics]);

  // AI State
  const [isGenerating, setIsGenerating] = useState(false);
  const [aiResult, setAiResult] = useState('');
  const [pitchContext, setPitchContext] = useState('');
  const [selectedContact, setSelectedContact] = useState<Contact | null>(null);
  const [importText, setImportText] = useState('');
  const [isImporting, setIsImporting] = useState(false);
  const [aiMode, setAiMode] = useState<'pitch' | 'import'>('pitch');

  // Modal State
  const [isModalOpen, setIsModalOpen] = useState(false);
  const [modalType, setModalType] = useState<'contact' | 'track' | 'plan' | 'link' | null>(null);
  const [newFormData, setNewFormData] = useState<any>({});

  const filteredContacts = useMemo(() => {
    return contacts.filter(c => {
      const matchSearch = c.name.toLowerCase().includes(searchTerm.toLowerCase());
      const matchFilter = filterCategory === 'All' || c.category === filterCategory;
      return matchSearch && matchFilter;
    });
  }, [contacts, searchTerm, filterCategory]);

  const filteredPlatformContacts = useMemo(() => platformContacts.filter(c => c.name.toLowerCase().includes(searchTerm.toLowerCase())), [platformContacts, searchTerm]);
  const filteredLabelArtists = useMemo(() => labelArtists.filter(c => c.name.toLowerCase().includes(searchTerm.toLowerCase())), [labelArtists, searchTerm]);
  const filteredTracks = useMemo(() => tracks.filter(t => t.title.toLowerCase().includes(searchTerm.toLowerCase()) || t.artistName.toLowerCase().includes(searchTerm.toLowerCase())), [tracks, searchTerm]);
  const filteredPlans = useMemo(() => releasePlans.filter(p => p.title.toLowerCase().includes(searchTerm.toLowerCase())), [releasePlans, searchTerm]);

  const openCreateModal = (type: 'contact' | 'track' | 'plan' | 'link') => {
    setModalType(type);
    const today = new Date().toISOString().split('T')[0];
    setNewFormData(
      type === 'contact' ? { category: 'Blogger', platform: 'Instagram', name: '', handle: '', url: '', reach: '', notes: '', tags: '' } : 
      type === 'track' ? { genre: 'Pop', status: 'In Progress', title: '', artist: '', date: today, isrc: '', mood: '' } : 
      type === 'plan' ? { status: 'Planning', title: '', artist: '', date: today } :
      { title: '', url: '', icon: 'fa-link', color: 'bg-indigo-500' }
    );
    setIsModalOpen(true);
  };

  const handleFormSubmit = () => {
    if (modalType === 'contact') {
      const newContact: Contact = {
        id: `c-${Date.now()}-${Math.random().toString(36).substr(2, 5)}`,
        name: newFormData.name || 'Новый контакт',
        category: newFormData.category || 'Blogger',
        platform: newFormData.platform || 'Instagram',
        handle: newFormData.handle || '@',
        reach: newFormData.reach || 'н/д',
        contactUrl: newFormData.url || '',
        notes: newFormData.notes || '',
        tags: newFormData.tags ? newFormData.tags.split(',').map((t: string) => t.trim()).filter(Boolean) : [],
      };
      
      if (newContact.category === 'Label Artist') setLabelArtists(prev => [newContact, ...prev]);
      else if (newContact.category === 'Platform Curator') setPlatformContacts(prev => [newContact, ...prev]);
      else setContacts(prev => [newContact, ...prev]);
      
      setActiveTab(newContact.category === 'Label Artist' ? 'label_artists' : newContact.category === 'Platform Curator' ? 'platform_pitching' : 'contacts');
    } else if (modalType === 'track') {
      const newTrack: Track = {
        id: `t-${Date.now()}`,
        title: newFormData.title || 'Без названия',
        artistName: newFormData.artist || 'Неизвестен',
        status: newFormData.status || 'In Progress',
        releaseDate: newFormData.date || new Date().toISOString().split('T')[0],
        genre: newFormData.genre || 'Pop',
        isrc: newFormData.isrc || "В ожидании",
        mood: newFormData.mood || "N/A"
      };
      setTracks(prev => [newTrack, ...prev]);
      setActiveTab('tracks');
    } else if (modalType === 'plan') {
      const newPlan: ReleasePlan = {
        id: `rp-${Date.now()}`,
        title: newFormData.title || 'Новый проект',
        artist: newFormData.artist || 'Неизвестен',
        date: newFormData.date || new Date().toISOString().split('T')[0],
        status: newFormData.status || 'Planning',
        tasks: [
          { id: '1', label: 'Мастеринг', completed: false },
          { id: '2', label: 'Питчинг', completed: false },
          { id: '3', label: 'Промо', completed: false }
        ]
      };
      setReleasePlans(prev => [newPlan, ...prev]);
      setActiveTab('release_plans');
    } else if (modalType === 'link') {
      const newLink: QuickLink = {
        id: `l-${Date.now()}`,
        title: newFormData.title || 'Ссылка',
        url: newFormData.url || 'https://',
        icon: newFormData.icon || 'fa-link',
        color: newFormData.color || 'bg-indigo-500'
      };
      setLinks(prev => [newLink, ...prev]);
      setActiveTab('links');
    }
    
    setNewFormData({});
    setIsModalOpen(false);
  };

  const handleSmartImport = async () => {
    if (!importText.trim()) return;
    setIsImporting(true);
    try {
      const data = await processSmartImport(importText);
      let count = 0;
      if (data.contacts?.length) {
        data.contacts.forEach(c => {
          const newC: Contact = { id: `ai-c-${Date.now()}-${Math.random()}`, name: c.name || 'Без имени', category: c.category || 'Blogger', platform: c.platform || 'Соцсеть', handle: c.handle || '@', reach: 'н/д', contactUrl: c.contactUrl || '', notes: c.notes || 'Импорт ИИ', tags: c.tags || [] };
          if (newC.category === 'Label Artist') setLabelArtists(p => [newC, ...p]);
          else if (newC.category === 'Platform Curator') setPlatformContacts(p => [newC, ...p]);
          else setContacts(p => [newC, ...p]);
          count++;
        });
      }
      if (data.tracks?.length) {
        setTracks(prev => [...data.tracks.map(t => ({ id: `ai-t-${Date.now()}-${Math.random()}`, title: t.title || 'Без названия', artistName: t.artistName || 'Неизвестен', status: 'In Progress' as const, releaseDate: t.releaseDate || '2025-01-01', genre: t.genre || 'Pop' })), ...prev]);
        count += data.tracks.length;
      }
      if (data.quickLinks?.length) {
        setLinks(prev => [...data.quickLinks.map(l => ({ id: `ai-l-${Date.now()}-${Math.random()}`, title: l.title || 'Ссылка', url: l.url || 'https://', icon: l.icon || 'fa-link', color: 'bg-indigo-500' })), ...prev]);
        count += data.quickLinks.length;
      }
      alert(`Успешно импортировано ${count} объектов!`);
      setImportText('');
    } finally { setIsImporting(false); }
  };

  const handleDelete = (id: string, type: 'contact' | 'track' | 'plan' | 'link') => {
    if (!confirm("Вы уверены?")) return;
    if (type === 'contact') {
      setContacts(p => p.filter(c => c.id !== id));
      setLabelArtists(p => p.filter(c => c.id !== id));
      setPlatformContacts(p => p.filter(c => c.id !== id));
    } else if (type === 'track') setTracks(p => p.filter(t => t.id !== id));
    else if (type === 'link') setLinks(p => p.filter(l => l.id !== id));
    else setReleasePlans(p => p.filter(pl => pl.id !== id));
  };

  return (
    <Layout activeTab={activeTab} setActiveTab={setActiveTab}>
      {/* Header Controls */}
      <div className="flex justify-end mb-4 px-4">
        <div className="flex items-center gap-2 text-[10px] font-black uppercase text-slate-300 tracking-widest">
           <i className="fa-solid fa-cloud-arrow-up"></i> Автосохранение активно
        </div>
      </div>
      
      {activeTab !== 'ai' && activeTab !== 'links' && activeTab !== 'statistics' && (
        <div className="flex flex-col md:flex-row gap-4 mb-8">
          <div className="relative flex-1 group">
            <i className="fa-solid fa-magnifying-glass absolute left-4 top-1/2 -translate-y-1/2 text-slate-400 group-focus-within:text-indigo-600 transition-colors"></i>
            <input
              type="text"
              placeholder={`Поиск в ${activeTab}...`}
              className="w-full pl-12 pr-4 py-3.5 rounded-2xl border border-slate-200 focus:ring-4 focus:ring-indigo-500/10 transition-all outline-none bg-white shadow-sm font-medium"
              value={searchTerm}
              onChange={(e) => setSearchTerm(e.target.value)}
            />
          </div>
          
          {activeTab === 'contacts' && (
            <select 
              value={filterCategory} 
              onChange={(e) => setFilterCategory(e.target.value as any)}
              className="px-6 py-3.5 bg-white border border-slate-200 rounded-2xl font-bold text-slate-600 outline-none focus:ring-4 focus:ring-indigo-500/10 cursor-pointer shadow-sm"
            >
              <option value="All">Все фильтры</option>
              <option value="Blogger">Блогеры</option>
              <option value="Artist">Артисты</option>
              <option value="Agency">Агентства</option>
              <option value="Media">СМИ</option>
            </select>
          )}

          <div className="relative group">
            <button className="px-6 py-3.5 bg-indigo-600 text-white rounded-2xl font-black flex items-center justify-center gap-3 hover:bg-indigo-700 shadow-xl shadow-indigo-100 transition-all active:scale-95 whitespace-nowrap uppercase tracking-widest text-xs">
              <i className="fa-solid fa-plus-circle text-lg"></i> Создать
              <i className="fa-solid fa-chevron-down text-[10px] ml-1 opacity-50"></i>
            </button>
            <div className="absolute right-0 mt-3 w-64 bg-white rounded-[28px] shadow-[0_20px_50px_rgba(0,0,0,0.15)] border border-slate-100 overflow-hidden opacity-0 invisible group-hover:opacity-100 group-hover:visible transition-all z-50 translate-y-2 group-hover:translate-y-0 backdrop-blur-xl">
               <div className="p-3 grid grid-cols-1 gap-1">
                 <button onClick={() => openCreateModal('contact')} className="w-full text-left px-4 py-3 rounded-xl hover:bg-slate-50 flex items-center gap-4 transition-colors group/item">
                    <div className="w-10 h-10 rounded-lg bg-indigo-50 text-indigo-500 flex items-center justify-center group-hover/item:bg-indigo-500 group-hover/item:text-white transition-colors">
                      <i className="fa-solid fa-user-plus"></i>
                    </div>
                    <div>
                      <p className="text-sm font-black text-slate-800">Контакт</p>
                      <p className="text-[10px] text-slate-400 font-bold uppercase">PR База</p>
                    </div>
                 </button>
                 <button onClick={() => openCreateModal('track')} className="w-full text-left px-4 py-3 rounded-xl hover:bg-slate-50 flex items-center gap-4 transition-colors group/item">
                    <div className="w-10 h-10 rounded-lg bg-purple-50 text-purple-500 flex items-center justify-center group-hover/item:bg-purple-500 group-hover/item:text-white transition-colors">
                      <i className="fa-solid fa-music"></i>
                    </div>
                    <div>
                      <p className="text-sm font-black text-slate-800">Трек</p>
                      <p className="text-[10px] text-slate-400 font-bold uppercase">Реестр</p>
                    </div>
                 </button>
                 <button onClick={() => openCreateModal('plan')} className="w-full text-left px-4 py-3 rounded-xl hover:bg-slate-50 flex items-center gap-4 transition-colors group/item">
                    <div className="w-10 h-10 rounded-lg bg-emerald-50 text-emerald-500 flex items-center justify-center group-hover/item:bg-emerald-500 group-hover/item:text-white transition-colors">
                      <i className="fa-solid fa-calendar-check"></i>
                    </div>
                    <div>
                      <p className="text-sm font-black text-slate-800">Релиз</p>
                      <p className="text-[10px] text-slate-400 font-bold uppercase">Кампания</p>
                    </div>
                 </button>
                 <button onClick={() => openCreateModal('link')} className="w-full text-left px-4 py-3 rounded-xl hover:bg-slate-50 flex items-center gap-4 transition-colors group/item">
                    <div className="w-10 h-10 rounded-lg bg-blue-50 text-blue-500 flex items-center justify-center group-hover/item:bg-blue-500 group-hover/item:text-white transition-colors">
                      <i className="fa-solid fa-link"></i>
                    </div>
                    <div>
                      <p className="text-sm font-black text-slate-800">Ссылка</p>
                      <p className="text-[10px] text-slate-400 font-bold uppercase">Ресурсы</p>
                    </div>
                 </button>
               </div>
            </div>
          </div>
        </div>
      )}

      {/* Manual Creation Modal */}
      <Modal isOpen={isModalOpen} onClose={() => setIsModalOpen(false)} title={`Новый объект: ${modalType === 'contact' ? 'Контакт' : modalType === 'track' ? 'Трек' : modalType === 'plan' ? 'План' : 'Ссылка'}`}>
        <div className="space-y-6">
           {modalType === 'contact' && (
             <>
               <div className="space-y-2">
                 <label className="text-[10px] font-black text-slate-400 uppercase tracking-widest ml-1">Основная информация</label>
                 <input type="text" placeholder="Имя / Псевдоним" className="w-full p-4 bg-slate-50 border border-slate-200 rounded-xl outline-none focus:ring-2 focus:ring-indigo-500 font-bold" value={newFormData.name || ''} onChange={e => setNewFormData({...newFormData, name: e.target.value})} />
                 <div className="grid grid-cols-2 gap-4">
                    <select className="p-4 bg-slate-50 border border-slate-200 rounded-xl outline-none font-bold text-slate-600" value={newFormData.category || 'Blogger'} onChange={e => setNewFormData({...newFormData, category: e.target.value})}>
                      <option value="Blogger">Блогер</option>
                      <option value="Artist">Артист</option>
                      <option value="Agency">Агентство</option>
                      <option value="Media">СМИ</option>
                      <option value="Label Artist">Артист лейбла</option>
                      <option value="Platform Curator">Куратор платформ</option>
                    </select>
                    <input type="text" placeholder="IG / TG / TikTok" className="p-4 bg-slate-50 border border-slate-200 rounded-xl font-bold" value={newFormData.platform || ''} onChange={e => setNewFormData({...newFormData, platform: e.target.value})} />
                 </div>
               </div>
               <div className="space-y-2">
                 <label className="text-[10px] font-black text-slate-400 uppercase tracking-widest ml-1">Контакты и Охват</label>
                 <input type="text" placeholder="@handle или ссылка" className="w-full p-4 bg-slate-50 border border-slate-200 rounded-xl font-mono text-sm" value={newFormData.url || ''} onChange={e => setNewFormData({...newFormData, url: e.target.value})} />
                 <input type="text" placeholder="Примерный охват (напр. 500k)" className="w-full p-4 bg-slate-50 border border-slate-200 rounded-xl" value={newFormData.reach || ''} onChange={e => setNewFormData({...newFormData, reach: e.target.value})} />
               </div>
               <div className="space-y-2">
                 <label className="text-[10px] font-black text-slate-400 uppercase tracking-widest ml-1">Дополнительно</label>
                 <textarea placeholder="Заметки о контакте..." className="w-full p-4 bg-slate-50 border border-slate-200 rounded-xl text-sm" value={newFormData.notes || ''} onChange={e => setNewFormData({...newFormData, notes: e.target.value})} />
                 <input type="text" placeholder="Теги через запятую (напр. поп, инди)" className="w-full p-4 bg-slate-50 border border-slate-200 rounded-xl text-sm" value={newFormData.tags || ''} onChange={e => setNewFormData({...newFormData, tags: e.target.value})} />
               </div>
             </>
           )}
           {modalType === 'track' && (
             <>
               <input type="text" placeholder="Название сингла/альбома" className="w-full p-4 bg-slate-50 border border-slate-200 rounded-xl font-black" value={newFormData.title || ''} onChange={e => setNewFormData({...newFormData, title: e.target.value})} />
               <input type="text" placeholder="Исполнитель" className="w-full p-4 bg-slate-50 border border-slate-200 rounded-xl font-bold" value={newFormData.artist || ''} onChange={e => setNewFormData({...newFormData, artist: e.target.value})} />
               <div className="grid grid-cols-2 gap-4">
                  <select className="p-4 bg-slate-50 border border-slate-200 rounded-xl font-bold" value={newFormData.genre || 'Pop'} onChange={e => setNewFormData({...newFormData, genre: e.target.value})}>
                    <option value="Pop">Pop</option>
                    <option value="Techno">Techno</option>
                    <option value="Hip-Hop">Hip-Hop</option>
                    <option value="Indie">Indie</option>
                    <option value="Rock">Rock</option>
                  </select>
                  <select className="p-4 bg-slate-50 border border-slate-200 rounded-xl font-bold" value={newFormData.status || 'In Progress'} onChange={e => setNewFormData({...newFormData, status: e.target.value})}>
                    <option value="In Progress">В процессе</option>
                    <option value="Signed">Подписан</option>
                    <option value="Released">Выпущен</option>
                  </select>
               </div>
               <div className="grid grid-cols-2 gap-4">
                  <input type="text" placeholder="ISRC код" className="p-4 bg-slate-50 border border-slate-200 rounded-xl font-mono text-xs" value={newFormData.isrc || ''} onChange={e => setNewFormData({...newFormData, isrc: e.target.value})} />
                  <input type="date" className="p-4 bg-slate-50 border border-slate-200 rounded-xl text-slate-500" value={newFormData.date || ''} onChange={e => setNewFormData({...newFormData, date: e.target.value})} />
               </div>
             </>
           )}
           {modalType === 'plan' && (
             <>
               <input type="text" placeholder="Название кампании" className="w-full p-4 bg-slate-50 border border-slate-200 rounded-xl font-black" value={newFormData.title || ''} onChange={e => setNewFormData({...newFormData, title: e.target.value})} />
               <input type="text" placeholder="Артист" className="w-full p-4 bg-slate-50 border border-slate-200 rounded-xl font-bold" value={newFormData.artist || ''} onChange={e => setNewFormData({...newFormData, artist: e.target.value})} />
               <div className="grid grid-cols-2 gap-4">
                  <select className="p-4 bg-slate-50 border border-slate-200 rounded-xl font-bold" value={newFormData.status || 'Planning'} onChange={e => setNewFormData({...newFormData, status: e.target.value})}>
                    <option value="Planning">Планирование</option>
                    <option value="Pitching">Питчинг</option>
                    <option value="Finalizing">Завершение</option>
                    <option value="Released">Релиз</option>
                  </select>
                  <input type="date" className="p-4 bg-slate-50 border border-slate-200 rounded-xl text-slate-500" value={newFormData.date || ''} onChange={e => setNewFormData({...newFormData, date: e.target.value})} />
               </div>
             </>
           )}
           {modalType === 'link' && (
             <>
               <input type="text" placeholder="Название ссылки" className="w-full p-4 bg-slate-50 border border-slate-200 rounded-xl font-bold" value={newFormData.title || ''} onChange={e => setNewFormData({...newFormData, title: e.target.value})} />
               <input type="text" placeholder="https://..." className="w-full p-4 bg-slate-50 border border-slate-200 rounded-xl font-mono text-sm" value={newFormData.url || ''} onChange={e => setNewFormData({...newFormData, url: e.target.value})} />
               <div className="grid grid-cols-2 gap-4">
                  <select className="p-4 bg-slate-50 border border-slate-200 rounded-xl font-bold" value={newFormData.icon || 'fa-link'} onChange={e => setNewFormData({...newFormData, icon: e.target.value})}>
                    <option value="fa-link">🔗 Link</option>
                    <option value="fa-file-pdf">📄 PDF</option>
                    <option value="fa-folder-open">📂 Drive</option>
                    <option value="fa-brands fa-spotify">🎧 Spotify</option>
                    <option value="fa-brands fa-tiktok">📱 TikTok</option>
                  </select>
                  <div className="flex gap-2 p-2">
                    {['bg-indigo-500', 'bg-emerald-500', 'bg-rose-500', 'bg-blue-500'].map(c => (
                      <button key={c} onClick={() => setNewFormData({...newFormData, color: c})} className={`w-10 h-10 rounded-full ${c} ${newFormData.color === c ? 'ring-4 ring-slate-200 scale-110' : ''} transition-all`}></button>
                    ))}
                  </div>
               </div>
             </>
           )}
           <button onClick={handleFormSubmit} className="w-full py-5 bg-indigo-600 text-white rounded-2xl font-black uppercase tracking-[0.3em] text-xs shadow-2xl shadow-indigo-100 hover:bg-indigo-700 transition-all active:scale-95">Сохранить запись</button>
        </div>
      </Modal>

      {/* Main Views */}
      {activeTab === 'contacts' && (
        <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-6">
          {filteredContacts.map(c => <ContactCard key={c.id} contact={c} onDelete={(id) => handleDelete(id, 'contact')} onEdit={() => {}} onDraft={(c) => { setSelectedContact(c); setActiveTab('ai'); setAiMode('pitch'); }} />)}
          {filteredContacts.length === 0 && <div className="col-span-full py-20 text-center text-slate-400 italic font-medium">Ничего не найдено.</div>}
        </div>
      )}

      {activeTab === 'label_artists' && (
        <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-6">
          {filteredLabelArtists.map(c => <ContactCard key={c.id} contact={c} onDelete={(id) => handleDelete(id, 'contact')} onEdit={() => {}} onDraft={(c) => { setSelectedContact(c); setActiveTab('ai'); setAiMode('pitch'); }} />)}
          {filteredLabelArtists.length === 0 && <div className="col-span-full py-20 text-center text-slate-400 italic font-medium">Артисты лейбла не найдены.</div>}
        </div>
      )}

      {activeTab === 'platform_pitching' && (
        <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-6">
          {filteredPlatformContacts.map(c => (
            <div key={c.id} className="flex flex-col gap-2">
              <ContactCard contact={c} onDelete={(id) => handleDelete(id, 'contact')} onEdit={() => {}} onDraft={(c) => { setSelectedContact(c); setActiveTab('ai'); setAiMode('pitch'); }} />
              {c.pitchingUrl && (
                <a href={c.pitchingUrl} target="_blank" className="bg-slate-800 text-white py-2.5 rounded-xl text-center text-[10px] font-black uppercase tracking-widest hover:bg-black transition-colors">Открыть форму питчинга</a>
              )}
            </div>
          ))}
        </div>
      )}

      {activeTab === 'tracks' && (
        <div className="bg-white rounded-[32px] border border-slate-100 shadow-sm overflow-x-auto">
          <table className="w-full text-left min-w-[800px]">
            <thead className="bg-slate-50 text-slate-500 text-[10px] uppercase font-black border-b border-slate-200">
              <tr>
                <th className="px-8 py-5">Информация о треке</th>
                <th className="px-8 py-5">ISRC</th>
                <th className="px-8 py-5">Жанр</th>
                <th className="px-8 py-5">Релиз</th>
                <th className="px-8 py-5 text-right">Управление</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-slate-100">
              {filteredTracks.map(track => (
                <tr key={track.id} className="hover:bg-slate-50 transition-colors group">
                  <td className="px-8 py-5">
                    <p className="font-black text-slate-800">{track.title}</p>
                    <p className="text-xs text-slate-400 font-bold">{track.artistName}</p>
                  </td>
                  <td className="px-8 py-5 font-mono text-[10px] text-slate-400 uppercase tracking-widest">{track.isrc || 'н/д'}</td>
                  <td className="px-8 py-5"><span className="text-[10px] bg-indigo-50 text-indigo-700 px-3 py-1.5 rounded-lg font-black uppercase tracking-wider">{track.genre || 'Pop'}</span></td>
                  <td className="px-8 py-5">
                    <p className="text-xs font-bold text-slate-700">{track.releaseDate}</p>
                    <span className={`text-[9px] font-black uppercase ${track.status === 'Released' ? 'text-emerald-500' : 'text-amber-500'}`}>{track.status === 'Released' ? 'ВЫПУЩЕН' : 'В ПРОЦЕССЕ'}</span>
                  </td>
                  <td className="px-8 py-5 text-right">
                    <button onClick={() => handleDelete(track.id, 'track')} className="text-slate-200 hover:text-red-500 p-2 transition-colors"><i className="fa-solid fa-trash-can"></i></button>
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      )}

      {activeTab === 'release_plans' && (
        <div className="grid grid-cols-1 lg:grid-cols-2 gap-8">
          {filteredPlans.map(plan => (
            <div key={plan.id} className="bg-white rounded-[40px] p-10 border border-slate-100 shadow-sm flex flex-col group hover:shadow-xl transition-shadow">
              <div className="flex justify-between items-start mb-8">
                <div>
                  <h3 className="text-2xl font-black text-slate-800 leading-tight tracking-tight">{plan.title}</h3>
                  <p className="text-indigo-600 font-black text-sm tracking-widest uppercase mt-1">{plan.artist}</p>
                </div>
                <span className="px-4 py-1.5 bg-slate-800 text-white rounded-full text-[10px] font-black uppercase tracking-[0.2em]">{plan.status}</span>
              </div>
              <div className="space-y-4 flex-1">
                {plan.tasks.map(task => (
                  <div key={task.id} className="flex items-center gap-4 group/task">
                    <div className={`w-6 h-6 rounded-lg border-2 flex items-center justify-center transition-all ${task.completed ? 'bg-indigo-600 border-indigo-600' : 'border-slate-200'}`}>
                      {task.completed && <i className="fa-solid fa-check text-white text-xs"></i>}
                    </div>
                    <span className={`text-sm font-bold ${task.completed ? 'text-slate-300 line-through' : 'text-slate-700'}`}>{task.label}</span>
                  </div>
                ))}
              </div>
              <div className="mt-10 pt-8 border-t border-slate-50 flex gap-4">
                 <button onClick={() => handleDelete(plan.id, 'plan')} className="w-14 h-14 border border-slate-200 text-slate-300 rounded-2xl hover:text-red-500 transition-all flex items-center justify-center"><i className="fa-solid fa-trash-can"></i></button>
              </div>
            </div>
          ))}
        </div>
      )}

      {activeTab === 'statistics' && (
        <div className="space-y-10 animate-in fade-in duration-700">
          <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-8">
            {metrics.map(metric => (
              <div key={metric.id} className="bg-white p-8 rounded-[40px] border border-slate-100 shadow-sm">
                <div className="flex justify-between items-start mb-8">
                  <div className={`w-14 h-14 rounded-2xl bg-slate-50 flex items-center justify-center ${metric.color}`}>
                    <i className={`fa-brands ${metric.icon} text-3xl`}></i>
                  </div>
                  <div className={`px-3 py-1 rounded-full text-[10px] font-black ${metric.trend === 'up' ? 'bg-emerald-50 text-emerald-600' : 'bg-rose-50 text-rose-600'}`}>
                    {metric.trend === 'up' ? '+' : ''}{metric.trendValue}
                  </div>
                </div>
                <p className="text-5xl font-black text-slate-800 tracking-tighter leading-none">{metric.value}</p>
                <p className="text-[10px] font-black text-slate-400 uppercase tracking-[0.2em] mt-3">{metric.label}</p>
              </div>
            ))}
          </div>
        </div>
      )}

      {activeTab === 'ai' && (
        <div className="max-w-4xl mx-auto space-y-10 animate-in slide-in-from-bottom-6 duration-700 pb-20">
           <div className="flex bg-white p-2 rounded-[32px] border border-slate-200 w-fit shadow-xl mx-auto">
              <button onClick={() => setAiMode('pitch')} className={`px-12 py-4 rounded-3xl text-[10px] font-black transition-all uppercase tracking-[0.2em] ${aiMode === 'pitch' ? 'bg-indigo-600 text-white shadow-xl shadow-indigo-100' : 'text-slate-400 hover:text-slate-600'}`}>Копирайтер</button>
              <button onClick={() => setAiMode('import')} className={`px-12 py-4 rounded-3xl text-[10px] font-black transition-all uppercase tracking-[0.2em] ${aiMode === 'import' ? 'bg-indigo-600 text-white shadow-xl shadow-indigo-100' : 'text-slate-400 hover:text-slate-600'}`}>Процессор</button>
           </div>
           {aiMode === 'pitch' ? (
             <div className="bg-white rounded-[50px] p-16 shadow-sm border border-slate-100 relative">
                <h3 className="text-4xl font-black text-slate-800 mb-10 tracking-tight leading-none">Генератор питчей</h3>
                <div className="space-y-10">
                   <div>
                      <label className="text-[10px] font-black text-slate-400 uppercase tracking-[0.3em] block mb-5">Контакт</label>
                      <div className="p-8 bg-slate-50 rounded-[32px] border border-slate-100 flex items-center justify-between">
                        {selectedContact ? (
                          <div className="flex items-center gap-6">
                             <div className="w-16 h-16 bg-white shadow-xl rounded-2xl flex items-center justify-center text-indigo-600 font-black text-2xl">{selectedContact.name[0]}</div>
                             <div>
                                <p className="font-black text-xl text-slate-800 leading-none mb-1">{selectedContact.name}</p>
                                <p className="text-xs text-slate-400 font-bold uppercase tracking-widest">{selectedContact.platform} · {selectedContact.category}</p>
                             </div>
                          </div>
                        ) : <p className="text-slate-400 font-bold italic tracking-wide">Выберите контакт из реестра.</p>}
                        <button onClick={() => setActiveTab('contacts')} className="text-[10px] font-black text-indigo-600 uppercase tracking-widest hover:underline">Изменить</button>
                      </div>
                   </div>
                   <textarea className="w-full p-8 rounded-[32px] border-2 border-slate-100 min-h-[220px] focus:border-indigo-600 outline-none text-slate-700 font-bold leading-relaxed" placeholder="Опишите инфоповод..." value={pitchContext} onChange={(e) => setPitchContext(e.target.value)} />
                   <button onClick={async () => { if(!selectedContact) return; setIsGenerating(true); setAiResult(await generatePitch(selectedContact, pitchContext)); setIsGenerating(false); }} disabled={isGenerating || !selectedContact} className="w-full py-6 bg-slate-900 text-white rounded-[32px] font-black text-lg shadow-2xl disabled:opacity-50 transition-all active:scale-[0.98] uppercase tracking-[0.2em]">
                      {isGenerating ? "Формирую..." : "Сгенерировать"}
                   </button>
                   {aiResult && (
                     <div className="mt-12 p-10 bg-indigo-900 rounded-[40px] text-indigo-50 font-bold relative group shadow-2xl">
                        <button onClick={() => { navigator.clipboard.writeText(aiResult); alert("Скопировано!"); }} className="absolute top-8 right-8 text-indigo-400 hover:text-white transition-colors p-3 bg-white/10 rounded-xl"><i className="fa-solid fa-copy text-2xl"></i></button>
                        <p className="text-[10px] font-black text-indigo-400 uppercase tracking-[0.3em] mb-6">Результат</p>
                        <div className="whitespace-pre-wrap leading-[1.8] text-lg">{aiResult}</div>
                     </div>
                   )}
                </div>
             </div>
           ) : (
             <div className="bg-white rounded-[50px] p-16 shadow-sm border border-slate-100">
                <h3 className="text-4xl font-black text-slate-800 mb-6 tracking-tight">Глобальный импорт</h3>
                <textarea className="w-full p-8 rounded-[40px] border-2 border-slate-100 min-h-[400px] mb-8 font-mono text-sm focus:border-indigo-600 outline-none leading-relaxed" placeholder="Вставьте текст с именами, ссылками, датами релизов и планами..." value={importText} onChange={(e) => setImportText(e.target.value)} />
                <button onClick={handleSmartImport} disabled={isImporting || !importText.trim()} className="w-full py-6 bg-indigo-600 text-white rounded-[32px] font-black text-lg shadow-xl shadow-indigo-100 disabled:opacity-50 transition-all active:scale-[0.98] uppercase tracking-[0.2em]">
                   {isImporting ? "Анализирую..." : "Запустить обработку"}
                </button>
             </div>
           )}
        </div>
      )}

      {activeTab === 'links' && (
        <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-8">
           {links.map(link => (
             <div key={link.id} className="group bg-white p-10 rounded-[50px] border border-slate-100 hover:shadow-2xl transition-all hover:-translate-y-3 relative">
                <button onClick={() => handleDelete(link.id, 'link')} className="absolute top-6 right-6 text-slate-200 hover:text-red-500 opacity-0 group-hover:opacity-100 transition-opacity">
                  <i className="fa-solid fa-circle-xmark"></i>
                </button>
                <a href={link.url} target="_blank" className="block">
                  <div className={`w-20 h-20 ${link.color} rounded-3xl flex items-center justify-center text-white text-4xl mb-8 shadow-2xl group-hover:rotate-12 transition-transform`}>
                    <i className={`fa-solid ${link.icon}`}></i>
                  </div>
                  <h3 className="text-2xl font-black text-slate-800 tracking-tight leading-none mb-3 group-hover:text-indigo-600 transition-colors">{link.title}</h3>
                  <p className="text-slate-400 font-black text-[10px] uppercase truncate tracking-[0.2em]">{link.url.replace('https://', '').replace('http://', '')}</p>
                </a>
             </div>
           ))}
           <button onClick={() => openCreateModal('link')} className="border-4 border-dashed border-slate-100 rounded-[50px] p-12 flex flex-col items-center justify-center gap-6 text-slate-200 hover:text-indigo-400 hover:border-indigo-100 transition-all group">
              <i className="fa-solid fa-circle-plus text-5xl group-hover:scale-110 transition-transform"></i>
              <span className="font-black uppercase tracking-[0.2em] text-[10px]">Добавить ссылку</span>
           </button>
        </div>
      )}
    </Layout>
  );
};

export default App;
