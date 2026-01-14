
import React, { useState, useMemo, useEffect, useRef } from 'react';
import Layout from './components/Layout.tsx';
import ContactCard from './components/ContactCard.tsx';
import Modal from './components/Modal.tsx';
import { Contact, QuickLink, Track, AppTab, ReleasePlan, Metric, ContactCategory } from './types.ts';
import { INITIAL_CONTACTS, INITIAL_LINKS, INITIAL_LABEL_ARTISTS, INITIAL_TRACKS, INITIAL_PLATFORM_CONTACTS, INITIAL_RELEASE_PLANS, INITIAL_METRICS } from './constants.tsx';
import { generatePitch, processSmartImport } from './services/geminiService.ts';

// Atomic Data Structure for easier persistence
interface AppData {
  contacts: Contact[];
  platformContacts: Contact[];
  labelArtists: Contact[];
  tracks: Track[];
  releasePlans: ReleasePlan[];
  links: QuickLink[];
  metrics: Metric[];
}

const STORAGE_KEY = 'pr_pro_hub_v2_data';

const App: React.FC = () => {
  const [activeTab, setActiveTab] = useState<AppTab>('contacts');
  const fileInputRef = useRef<HTMLInputElement>(null);
  
  // Single Atomic State for all persistent data
  const [appData, setAppData] = useState<AppData>(() => {
    const saved = localStorage.getItem(STORAGE_KEY);
    if (saved) {
      try {
        const parsed = JSON.parse(saved);
        if (parsed.contacts && Array.isArray(parsed.contacts)) return parsed;
      } catch (e) {
        console.error("Storage corruption detected, resetting...");
      }
    }
    return {
      contacts: INITIAL_CONTACTS,
      platformContacts: INITIAL_PLATFORM_CONTACTS,
      labelArtists: INITIAL_LABEL_ARTISTS,
      tracks: INITIAL_TRACKS,
      releasePlans: INITIAL_RELEASE_PLANS,
      links: INITIAL_LINKS,
      metrics: INITIAL_METRICS
    };
  });

  const [saveStatus, setSaveStatus] = useState<'idle' | 'saving' | 'saved'>('idle');
  const [searchTerm, setSearchTerm] = useState('');
  const [filterCategory, setFilterCategory] = useState<ContactCategory | 'All'>('All');

  useEffect(() => {
    setSaveStatus('saving');
    try {
      localStorage.setItem(STORAGE_KEY, JSON.stringify(appData));
      const timer = setTimeout(() => setSaveStatus('saved'), 600);
      const idleTimer = setTimeout(() => setSaveStatus('idle'), 3000);
      return () => { clearTimeout(timer); clearTimeout(idleTimer); };
    } catch (e) {
      console.error("Save failed", e);
      setSaveStatus('idle');
    }
  }, [appData]);

  const [isGenerating, setIsGenerating] = useState(false);
  const [aiResult, setAiResult] = useState('');
  const [pitchContext, setPitchContext] = useState('');
  const [selectedContact, setSelectedContact] = useState<Contact | null>(null);
  const [importText, setImportText] = useState('');
  const [isImporting, setIsImporting] = useState(false);
  const [aiMode, setAiMode] = useState<'pitch' | 'import'>('pitch');

  const [isModalOpen, setIsModalOpen] = useState(false);
  const [modalType, setModalType] = useState<'contact' | 'track' | 'plan' | 'link' | null>(null);
  const [editingId, setEditingId] = useState<string | null>(null);
  const [newFormData, setNewFormData] = useState<any>({});

  const filteredContacts = useMemo(() => appData.contacts.filter(c => (filterCategory === 'All' || c.category === filterCategory) && c.name.toLowerCase().includes(searchTerm.toLowerCase())), [appData.contacts, searchTerm, filterCategory]);
  const filteredPlatformContacts = useMemo(() => appData.platformContacts.filter(c => c.name.toLowerCase().includes(searchTerm.toLowerCase())), [appData.platformContacts, searchTerm]);
  const filteredLabelArtists = useMemo(() => appData.labelArtists.filter(c => c.name.toLowerCase().includes(searchTerm.toLowerCase())), [appData.labelArtists, searchTerm]);
  const filteredTracks = useMemo(() => appData.tracks.filter(t => t.title.toLowerCase().includes(searchTerm.toLowerCase()) || t.artistName.toLowerCase().includes(searchTerm.toLowerCase())), [appData.tracks, searchTerm]);
  const filteredPlans = useMemo(() => appData.releasePlans.filter(p => p.title.toLowerCase().includes(searchTerm.toLowerCase()) || p.artist.toLowerCase().includes(searchTerm.toLowerCase())), [appData.releasePlans, searchTerm]);

  const openCreateModal = (type: 'contact' | 'track' | 'plan' | 'link', editItem?: any) => {
    setModalType(type);
    if (editItem) {
      setEditingId(editItem.id);
      setNewFormData({
        ...editItem,
        tags: editItem.tags?.join(', ') || '',
        url: editItem.contactUrl || editItem.url || ''
      });
    } else {
      setEditingId(null);
      const today = new Date().toISOString().split('T')[0];
      setNewFormData(
        type === 'contact' ? { category: 'Blogger', platform: 'Instagram', name: '', handle: '', url: '', reach: '', notes: '', tags: '' } : 
        type === 'track' ? { genre: 'Pop', status: 'In Progress', title: '', artist: '', date: today, isrc: '', mood: '' } : 
        type === 'plan' ? { status: 'Planning', title: '', artist: '', date: today } :
        { title: '', url: '', icon: 'fa-link', color: 'bg-indigo-500' }
      );
    }
    setIsModalOpen(true);
  };

  const handleFormSubmit = (e?: React.FormEvent) => {
    if (e) e.preventDefault();
    
    setAppData(prev => {
      const updated = { ...prev };
      
      if (modalType === 'contact') {
        const item: Contact = {
          id: editingId || `c-${Date.now()}-${Math.random().toString(36).substr(2, 5)}`,
          name: newFormData.name || 'Новый контакт',
          category: newFormData.category || 'Blogger',
          platform: newFormData.platform || 'Instagram',
          handle: newFormData.handle || '@',
          reach: newFormData.reach || 'н/д',
          contactUrl: newFormData.url || '',
          notes: newFormData.notes || '',
          tags: newFormData.tags ? newFormData.tags.split(',').map((t: string) => t.trim()).filter(Boolean) : [],
        };
        
        if (editingId) {
          updated.contacts = updated.contacts.filter(i => i.id !== editingId);
          updated.labelArtists = updated.labelArtists.filter(i => i.id !== editingId);
          updated.platformContacts = updated.platformContacts.filter(i => i.id !== editingId);
        }

        if (item.category === 'Label Artist') updated.labelArtists = [item, ...updated.labelArtists];
        else if (item.category === 'Platform Curator') updated.platformContacts = [item, ...updated.platformContacts];
        else updated.contacts = [item, ...updated.contacts];
        
        setActiveTab(item.category === 'Label Artist' ? 'label_artists' : item.category === 'Platform Curator' ? 'platform_pitching' : 'contacts');
      } 
      
      else if (modalType === 'track') {
        const item: Track = {
          id: editingId || `t-${Date.now()}`,
          title: newFormData.title || 'Без названия',
          artistName: newFormData.artist || 'Неизвестен',
          status: newFormData.status || 'In Progress',
          releaseDate: newFormData.date || new Date().toISOString().split('T')[0],
          genre: newFormData.genre || 'Pop',
          isrc: newFormData.isrc || "В ожидании",
          mood: newFormData.mood || "N/A"
        };
        updated.tracks = editingId ? updated.tracks.map(i => i.id === editingId ? item : i) : [item, ...updated.tracks];
        setActiveTab('tracks');
      }

      else if (modalType === 'plan') {
        const item: ReleasePlan = {
          id: editingId || `rp-${Date.now()}`,
          title: newFormData.title || 'Новый релиз',
          artist: newFormData.artist || 'Неизвестен',
          date: newFormData.date || new Date().toISOString().split('T')[0],
          status: newFormData.status || 'Planning',
          tasks: newFormData.tasks || [
            { id: '1', label: 'Создать пресс-кит', completed: false },
            { id: '2', label: 'Питчинг на платформы', completed: false }
          ]
        };
        updated.releasePlans = editingId ? updated.releasePlans.map(i => i.id === editingId ? item : i) : [item, ...updated.releasePlans];
        setActiveTab('release_plans');
      }

      else if (modalType === 'link') {
        const item: QuickLink = {
          id: editingId || `l-${Date.now()}`,
          title: newFormData.title || 'Ссылка',
          url: newFormData.url || 'https://',
          icon: newFormData.icon || 'fa-link',
          color: newFormData.color || 'bg-indigo-500'
        };
        updated.links = editingId ? updated.links.map(i => i.id === editingId ? item : i) : [item, ...updated.links];
        setActiveTab('links');
      }

      return updated;
    });

    setIsModalOpen(false);
    setNewFormData({});
  };

  const handleDelete = (id: string, type: keyof AppData) => {
    if (!confirm("Вы действительно хотите удалить эту запись?")) return;
    setAppData(prev => ({
      ...prev,
      [type]: (prev[type] as any[]).filter((item: any) => item.id !== id)
    }));
  };

  const handleExportData = () => {
    const dataStr = JSON.stringify(appData, null, 2);
    const dataUri = 'data:application/json;charset=utf-8,'+ encodeURIComponent(dataStr);
    const exportFileDefaultName = `pr_hub_backup_${new Date().toISOString().slice(0,10)}.json`;
    const linkElement = document.createElement('a');
    linkElement.setAttribute('href', dataUri);
    linkElement.setAttribute('download', exportFileDefaultName);
    linkElement.click();
  };

  const handleImportData = (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (!file) return;
    const reader = new FileReader();
    reader.onload = (event) => {
      try {
        const imported = JSON.parse(event.target?.result as string);
        if (imported.contacts && Array.isArray(imported.contacts)) {
          setAppData(imported);
          alert("База успешно импортирована!");
        } else {
          alert("Неверный формат файла.");
        }
      } catch (err) {
        alert("Ошибка чтения файла.");
      }
    };
    reader.readAsText(file);
  };

  const handleResetData = () => {
    if (confirm("ВНИМАНИЕ: Это удалит ВСЕ ваши текущие данные и вернет стандартные примеры. Вы уверены?")) {
      setAppData({
        contacts: INITIAL_CONTACTS,
        platformContacts: INITIAL_PLATFORM_CONTACTS,
        labelArtists: INITIAL_LABEL_ARTISTS,
        tracks: INITIAL_TRACKS,
        releasePlans: INITIAL_RELEASE_PLANS,
        links: INITIAL_LINKS,
        metrics: INITIAL_METRICS
      });
    }
  };

  return (
    <Layout activeTab={activeTab} setActiveTab={setActiveTab}>
      <div className="fixed top-6 right-8 z-[60] flex items-center gap-2 pointer-events-none">
        {saveStatus === 'saving' && <div className="bg-indigo-600 text-white px-4 py-2 rounded-full text-[10px] font-black uppercase tracking-widest shadow-xl animate-pulse flex items-center gap-2"><i className="fa-solid fa-spinner fa-spin"></i> Сохранение...</div>}
        {saveStatus === 'saved' && <div className="bg-emerald-500 text-white px-4 py-2 rounded-full text-[10px] font-black uppercase tracking-widest shadow-xl flex items-center gap-2 animate-in slide-in-from-top-4"><i className="fa-solid fa-check"></i> База обновлена</div>}
      </div>

      {activeTab !== 'ai' && activeTab !== 'statistics' && (
        <div className="flex flex-col md:flex-row gap-4 mb-8">
          <div className="relative flex-1 group">
            <i className="fa-solid fa-magnifying-glass absolute left-4 top-1/2 -translate-y-1/2 text-slate-400 group-focus-within:text-indigo-600 transition-colors"></i>
            <input
              type="text"
              placeholder={`Поиск по названию или имени...`}
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
              <option value="All">Все категории</option>
              <option value="Blogger">Блогеры</option>
              <option value="Artist">Артисты</option>
              <option value="Agency">Агентства</option>
              <option value="Media">СМИ</option>
            </select>
          )}

          <div className="relative group">
            <button className="px-6 py-3.5 bg-indigo-600 text-white rounded-2xl font-black flex items-center justify-center gap-3 hover:bg-indigo-700 shadow-xl shadow-indigo-100 transition-all active:scale-95 uppercase tracking-widest text-xs">
              <i className="fa-solid fa-plus-circle text-lg"></i> Добавить
            </button>
            <div className="absolute right-0 mt-3 w-56 bg-white rounded-2xl shadow-2xl border border-slate-100 overflow-hidden opacity-0 invisible group-hover:opacity-100 group-hover:visible transition-all z-50 translate-y-2 group-hover:translate-y-0 p-2">
               <button onClick={() => openCreateModal('contact')} className="w-full text-left px-4 py-3 rounded-xl hover:bg-slate-50 flex items-center gap-3 text-xs font-black text-slate-700 uppercase tracking-widest transition-colors"><i className="fa-solid fa-user-plus text-indigo-500"></i> Контакт</button>
               <button onClick={() => openCreateModal('track')} className="w-full text-left px-4 py-3 rounded-xl hover:bg-slate-50 flex items-center gap-3 text-xs font-black text-slate-700 uppercase tracking-widest transition-colors"><i className="fa-solid fa-music text-purple-500"></i> Трек в реестр</button>
               <button onClick={() => openCreateModal('plan')} className="w-full text-left px-4 py-3 rounded-xl hover:bg-slate-50 flex items-center gap-3 text-xs font-black text-slate-700 uppercase tracking-widest transition-colors"><i className="fa-solid fa-calendar-plus text-emerald-500"></i> План релиза</button>
               <button onClick={() => openCreateModal('link')} className="w-full text-left px-4 py-3 rounded-xl hover:bg-slate-50 flex items-center gap-3 text-xs font-black text-slate-700 uppercase tracking-widest transition-colors"><i className="fa-solid fa-link text-blue-500"></i> Ссылку</button>
            </div>
          </div>
        </div>
      )}

      <Modal isOpen={isModalOpen} onClose={() => setIsModalOpen(false)} title={editingId ? 'Редактировать данные' : 'Создать новую запись'}>
        <form onSubmit={handleFormSubmit} className="space-y-5">
           {modalType === 'contact' && (
             <>
               <input autoFocus type="text" placeholder="ФИО / Название проекта" className="w-full p-4 bg-slate-50 border border-slate-200 rounded-xl outline-none focus:ring-2 focus:ring-indigo-500 font-bold" value={newFormData.name || ''} onChange={e => setNewFormData({...newFormData, name: e.target.value})} required />
               <div className="grid grid-cols-2 gap-4">
                  <select className="p-4 bg-slate-50 border border-slate-200 rounded-xl outline-none font-bold text-slate-600" value={newFormData.category || 'Blogger'} onChange={e => setNewFormData({...newFormData, category: e.target.value})}>
                    <option value="Blogger">Блогер</option>
                    <option value="Artist">Артист</option>
                    <option value="Agency">Агентство</option>
                    <option value="Media">СМИ</option>
                    <option value="Label Artist">Артист лейбла</option>
                    <option value="Platform Curator">Куратор платформ</option>
                  </select>
                  <input type="text" placeholder="Соцсеть (IG, TG, VK)" className="p-4 bg-slate-50 border border-slate-200 rounded-xl font-bold" value={newFormData.platform || ''} onChange={e => setNewFormData({...newFormData, platform: e.target.value})} />
               </div>
               <input type="text" placeholder="Никнейм (@handle) или ссылка" className="w-full p-4 bg-slate-50 border border-slate-200 rounded-xl font-mono text-sm" value={newFormData.url || ''} onChange={e => setNewFormData({...newFormData, url: e.target.value})} />
               <input type="text" placeholder="Охват аудитории (напр. 150k)" className="w-full p-4 bg-slate-50 border border-slate-200 rounded-xl font-bold" value={newFormData.reach || ''} onChange={e => setNewFormData({...newFormData, reach: e.target.value})} />
               <textarea placeholder="Важные детали (заметки о сотрудничестве)..." className="w-full p-4 bg-slate-50 border border-slate-200 rounded-xl text-sm min-h-[100px]" value={newFormData.notes || ''} onChange={e => setNewFormData({...newFormData, notes: e.target.value})} />
               <input type="text" placeholder="Теги (через запятую: поп, инди, мода)" className="w-full p-4 bg-slate-50 border border-slate-200 rounded-xl text-sm" value={newFormData.tags || ''} onChange={e => setNewFormData({...newFormData, tags: e.target.value})} />
             </>
           )}
           {modalType === 'track' && (
             <>
               <input autoFocus type="text" placeholder="Название сингла/альбома" className="w-full p-4 bg-slate-50 border border-slate-200 rounded-xl font-black" value={newFormData.title || ''} onChange={e => setNewFormData({...newFormData, title: e.target.value})} required />
               <input type="text" placeholder="Исполнитель" className="w-full p-4 bg-slate-50 border border-slate-200 rounded-xl font-bold" value={newFormData.artist || ''} onChange={e => setNewFormData({...newFormData, artist: e.target.value})} />
               <div className="grid grid-cols-2 gap-4">
                  <select className="p-4 bg-slate-50 border border-slate-200 rounded-xl font-bold" value={newFormData.status || 'In Progress'} onChange={e => setNewFormData({...newFormData, status: e.target.value})}>
                    <option value="In Progress">В процессе</option>
                    <option value="Signed">Подписан</option>
                    <option value="Released">Выпущен</option>
                  </select>
                  <input type="date" className="p-4 bg-slate-50 border border-slate-200 rounded-xl text-slate-500" value={newFormData.date || ''} onChange={e => setNewFormData({...newFormData, date: e.target.value})} />
               </div>
               <input type="text" placeholder="Код ISRC" className="w-full p-4 bg-slate-50 border border-slate-200 rounded-xl font-mono text-xs" value={newFormData.isrc || ''} onChange={e => setNewFormData({...newFormData, isrc: e.target.value})} />
             </>
           )}
           {modalType === 'plan' && (
             <>
               <input autoFocus type="text" placeholder="Название PR-кампании" className="w-full p-4 bg-slate-50 border border-slate-200 rounded-xl font-black" value={newFormData.title || ''} onChange={e => setNewFormData({...newFormData, title: e.target.value})} required />
               <input type="text" placeholder="Артист" className="w-full p-4 bg-slate-50 border border-slate-200 rounded-xl font-bold" value={newFormData.artist || ''} onChange={e => setNewFormData({...newFormData, artist: e.target.value})} />
               <div className="grid grid-cols-2 gap-4">
                  <select className="p-4 bg-slate-50 border border-slate-200 rounded-xl font-bold" value={newFormData.status || 'Planning'} onChange={e => setNewFormData({...newFormData, status: e.target.value})}>
                    <option value="Planning">Планирование</option>
                    <option value="Pitching">Питчинг</option>
                    <option value="Finalizing">Подготовка</option>
                    <option value="Released">Выпущен</option>
                  </select>
                  <input type="date" className="p-4 bg-slate-50 border border-slate-200 rounded-xl text-slate-500" value={newFormData.date || ''} onChange={e => setNewFormData({...newFormData, date: e.target.value})} />
               </div>
             </>
           )}
           {modalType === 'link' && (
             <>
               <input autoFocus type="text" placeholder="Название ресурса" className="w-full p-4 bg-slate-50 border border-slate-200 rounded-xl font-bold" value={newFormData.title || ''} onChange={e => setNewFormData({...newFormData, title: e.target.value})} required />
               <input type="text" placeholder="https://..." className="w-full p-4 bg-slate-50 border border-slate-200 rounded-xl font-mono text-sm" value={newFormData.url || ''} onChange={e => setNewFormData({...newFormData, url: e.target.value})} required />
               <div className="flex gap-4 items-center">
                  <div className={`w-12 h-12 rounded-xl flex items-center justify-center text-white ${newFormData.color || 'bg-indigo-500'}`}><i className={`fa-solid ${newFormData.icon || 'fa-link'}`}></i></div>
                  <select className="flex-1 p-4 bg-slate-50 border border-slate-200 rounded-xl font-bold" value={newFormData.icon || 'fa-link'} onChange={e => setNewFormData({...newFormData, icon: e.target.value})}>
                    <option value="fa-link">🔗 Ссылка</option>
                    <option value="fa-brands fa-spotify">🎧 Spotify</option>
                    <option value="fa-brands fa-tiktok">📱 TikTok</option>
                    <option value="fa-file-pdf">📄 PDF EPK</option>
                    <option value="fa-folder-open">📂 Drive / Cloud</option>
                    <option value="fa-brands fa-notion">📔 Notion</option>
                  </select>
               </div>
             </>
           )}
           <button type="submit" className="w-full py-5 bg-indigo-600 text-white rounded-2xl font-black uppercase tracking-[0.3em] text-[10px] shadow-2xl shadow-indigo-100 hover:bg-indigo-700 transition-all active:scale-95">
             {editingId ? 'Обновить данные' : 'Сохранить запись'}
           </button>
        </form>
      </Modal>

      {activeTab === 'contacts' && (
        <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-6 animate-in fade-in slide-in-from-bottom-4">
          {filteredContacts.map(c => <ContactCard key={c.id} contact={c} onDelete={(id) => handleDelete(id, 'contacts')} onEdit={(id) => openCreateModal('contact', c)} onDraft={(c) => { setSelectedContact(c); setActiveTab('ai'); setAiMode('pitch'); }} />)}
          {filteredContacts.length === 0 && <div className="col-span-full py-20 text-center text-slate-300 italic font-medium">Ваша база контактов пуста.</div>}
        </div>
      )}

      {activeTab === 'label_artists' && (
        <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-6 animate-in fade-in slide-in-from-bottom-4">
          {filteredLabelArtists.map(c => <ContactCard key={c.id} contact={c} onDelete={(id) => handleDelete(id, 'labelArtists')} onEdit={(id) => openCreateModal('contact', c)} onDraft={(c) => { setSelectedContact(c); setActiveTab('ai'); setAiMode('pitch'); }} />)}
          {filteredLabelArtists.length === 0 && <div className="col-span-full py-20 text-center text-slate-300 italic font-medium">Артисты лейбла не найдены.</div>}
        </div>
      )}

      {activeTab === 'platform_pitching' && (
        <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-6 animate-in fade-in slide-in-from-bottom-4">
          {filteredPlatformContacts.map(c => (
            <div key={c.id} className="flex flex-col gap-2">
              <ContactCard contact={c} onDelete={(id) => handleDelete(id, 'platformContacts')} onEdit={(id) => openCreateModal('contact', c)} onDraft={(c) => { setSelectedContact(c); setActiveTab('ai'); setAiMode('pitch'); }} />
              {c.pitchingUrl && <a href={c.pitchingUrl} target="_blank" className="bg-slate-800 text-white py-3 rounded-2xl text-center text-[10px] font-black uppercase tracking-widest hover:bg-black transition-colors">Открыть портал питчинга</a>}
            </div>
          ))}
        </div>
      )}

      {activeTab === 'tracks' && (
        <div className="bg-white rounded-[32px] border border-slate-100 shadow-sm overflow-hidden animate-in fade-in slide-in-from-bottom-4">
          <div className="overflow-x-auto">
            <table className="w-full text-left">
              <thead className="bg-slate-50 text-slate-400 text-[10px] uppercase font-black border-b border-slate-200">
                <tr>
                  <th className="px-8 py-5">Трек / Артист</th>
                  <th className="px-8 py-5">ISRC</th>
                  <th className="px-8 py-5">Жанр</th>
                  <th className="px-8 py-5">Статус</th>
                  <th className="px-8 py-5 text-right">Управление</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-slate-100">
                {filteredTracks.map(track => (
                  <tr key={track.id} className="hover:bg-slate-50/50 transition-colors group">
                    <td className="px-8 py-5"><p className="font-black text-slate-800">{track.title}</p><p className="text-xs text-slate-400 font-bold">{track.artistName}</p></td>
                    <td className="px-8 py-5 font-mono text-[10px] text-slate-400">{track.isrc || '—'}</td>
                    <td className="px-8 py-5"><span className="text-[10px] bg-slate-100 text-slate-600 px-3 py-1 rounded-lg font-black uppercase tracking-wider">{track.genre || 'Pop'}</span></td>
                    <td className="px-8 py-5"><span className={`text-[9px] font-black uppercase ${track.status === 'Released' ? 'text-emerald-500' : 'text-amber-500'}`}>{track.status === 'Released' ? 'ВЫПУЩЕН' : 'В ПРОЦЕССЕ'}</span></td>
                    <td className="px-8 py-5 text-right space-x-2">
                      <button onClick={() => openCreateModal('track', track)} className="text-slate-300 hover:text-indigo-600 p-2 transition-colors"><i className="fa-solid fa-pen"></i></button>
                      <button onClick={() => handleDelete(track.id, 'tracks')} className="text-slate-200 hover:text-red-500 p-2 transition-colors"><i className="fa-solid fa-trash-can"></i></button>
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        </div>
      )}

      {activeTab === 'release_plans' && (
        <div className="grid grid-cols-1 lg:grid-cols-2 gap-8 animate-in fade-in slide-in-from-bottom-4">
          {filteredPlans.map(plan => (
            <div key={plan.id} className="bg-white rounded-[40px] p-10 border border-slate-100 shadow-sm flex flex-col group hover:shadow-xl transition-all">
              <div className="flex justify-between items-start mb-8">
                <div>
                  <h3 className="text-2xl font-black text-slate-800 leading-tight tracking-tight">{plan.title}</h3>
                  <p className="text-indigo-600 font-black text-sm tracking-widest uppercase mt-1">{plan.artist}</p>
                </div>
                <div className="flex gap-2">
                   <button onClick={() => openCreateModal('plan', plan)} className="w-10 h-10 rounded-full hover:bg-slate-50 text-slate-300 hover:text-indigo-600 flex items-center justify-center transition-all"><i className="fa-solid fa-pen"></i></button>
                   <button onClick={() => handleDelete(plan.id, 'releasePlans')} className="w-10 h-10 rounded-full hover:bg-slate-50 text-slate-300 hover:text-red-500 flex items-center justify-center transition-all"><i className="fa-solid fa-xmark"></i></button>
                </div>
              </div>
              <div className="space-y-4 flex-1">
                {plan.tasks.map((task, idx) => (
                  <div key={task.id} className="flex items-center gap-4 group/task">
                    <button 
                      onClick={() => {
                        const newPlans = [...appData.releasePlans];
                        const pIdx = newPlans.findIndex(p => p.id === plan.id);
                        newPlans[pIdx].tasks[idx].completed = !newPlans[pIdx].tasks[idx].completed;
                        setAppData({...appData, releasePlans: newPlans});
                      }}
                      className={`w-6 h-6 rounded-lg border-2 flex items-center justify-center transition-all ${task.completed ? 'bg-indigo-600 border-indigo-600 shadow-lg shadow-indigo-100' : 'border-slate-200'}`}
                    >
                      {task.completed && <i className="fa-solid fa-check text-white text-[10px]"></i>}
                    </button>
                    <span className={`text-sm font-bold ${task.completed ? 'text-slate-300 line-through' : 'text-slate-700'}`}>{task.label}</span>
                  </div>
                ))}
              </div>
              <div className="mt-8 pt-8 border-t border-slate-50 flex items-center justify-between">
                 <span className="text-[10px] font-black text-slate-400 uppercase tracking-widest">Статус: <span className="text-indigo-600">{plan.status}</span></span>
                 <span className="text-[10px] font-black text-slate-400 uppercase tracking-widest">Дата: {plan.date}</span>
              </div>
            </div>
          ))}
          <button onClick={() => openCreateModal('plan')} className="border-4 border-dashed border-slate-100 rounded-[40px] p-12 flex flex-col items-center justify-center gap-6 text-slate-200 hover:text-emerald-400 hover:border-emerald-100 transition-all group">
             <i className="fa-solid fa-calendar-plus text-5xl group-hover:scale-110 transition-transform"></i>
             <span className="font-black uppercase tracking-widest text-xs">Создать новый план релиза</span>
          </button>
        </div>
      )}

      {activeTab === 'links' && (
        <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-6 animate-in fade-in slide-in-from-bottom-4">
           {appData.links.map(link => (
             <div key={link.id} className="group bg-white p-8 rounded-[40px] border border-slate-100 hover:shadow-2xl transition-all hover:-translate-y-2 relative">
                <div className="absolute top-6 right-6 flex gap-2 opacity-0 group-hover:opacity-100 transition-opacity">
                  <button onClick={() => openCreateModal('link', link)} className="text-slate-300 hover:text-indigo-600"><i className="fa-solid fa-pen"></i></button>
                  <button onClick={() => handleDelete(link.id, 'links')} className="text-slate-300 hover:text-red-500"><i className="fa-solid fa-xmark"></i></button>
                </div>
                <a href={link.url} target="_blank" className="block text-center">
                  <div className={`w-20 h-20 ${link.color} rounded-3xl flex items-center justify-center text-white text-3xl mb-6 mx-auto shadow-2xl group-hover:rotate-6 transition-transform`}><i className={`fa-solid ${link.icon}`}></i></div>
                  <h3 className="text-xl font-black text-slate-800 tracking-tight leading-none mb-2">{link.title}</h3>
                </a>
             </div>
           ))}
        </div>
      )}

      {activeTab === 'statistics' && (
        <div className="space-y-12 animate-in fade-in slide-in-from-bottom-4">
          <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-8">
            {appData.metrics.map(metric => (
              <div key={metric.id} className="bg-white p-8 rounded-[40px] border border-slate-100 shadow-sm">
                <div className="flex justify-between items-start mb-6">
                  <div className={`w-12 h-12 rounded-2xl bg-slate-50 flex items-center justify-center ${metric.color}`}><i className={`fa-brands ${metric.icon} text-2xl`}></i></div>
                  <div className={`px-2 py-0.5 rounded-full text-[10px] font-black ${metric.trend === 'up' ? 'bg-emerald-50 text-emerald-600' : 'bg-rose-50 text-rose-600'}`}>{metric.trendValue}</div>
                </div>
                <p className="text-4xl font-black text-slate-800 tracking-tighter leading-none">{metric.value}</p>
                <p className="text-[10px] font-black text-slate-400 uppercase tracking-widest mt-3">{metric.label}</p>
              </div>
            ))}
          </div>

          <div className="grid grid-cols-1 md:grid-cols-2 gap-8">
            <div className="bg-white p-12 rounded-[50px] border border-slate-100">
               <h3 className="text-2xl font-black text-slate-800 mb-2 tracking-tight">Резервное копирование</h3>
               <p className="text-slate-500 mb-8 font-medium">Ваши данные хранятся только в этом браузере.</p>
               <div className="flex flex-wrap gap-4">
                  <button onClick={handleExportData} className="flex-1 px-8 py-4 bg-indigo-600 text-white rounded-2xl font-black text-[10px] uppercase tracking-widest shadow-xl shadow-indigo-100 hover:bg-indigo-700 transition-all active:scale-95 flex items-center justify-center gap-3">
                    Экспорт (.json)
                  </button>
                  <button onClick={() => fileInputRef.current?.click()} className="flex-1 px-8 py-4 border-2 border-indigo-100 text-indigo-600 hover:bg-indigo-50 rounded-2xl font-black text-[10px] uppercase tracking-widest transition-all active:scale-95">
                    Импорт
                  </button>
                  <input type="file" ref={fileInputRef} onChange={handleImportData} className="hidden" accept=".json" />
               </div>
            </div>
            <div className="bg-white p-12 rounded-[50px] border border-slate-100">
               <h3 className="text-2xl font-black text-slate-800 mb-2 tracking-tight">Управление</h3>
               <button onClick={handleResetData} className="w-full px-10 py-4 border-2 border-rose-100 text-rose-400 hover:bg-rose-50 hover:text-rose-500 rounded-2xl font-black text-[10px] uppercase tracking-widest transition-all">Сбросить всё</button>
            </div>
          </div>
        </div>
      )}

      {activeTab === 'ai' && (
        <div className="max-w-4xl mx-auto space-y-10 pb-20 animate-in fade-in zoom-in-95">
           <div className="flex bg-white p-2 rounded-3xl border border-slate-200 w-fit mx-auto shadow-sm">
              <button onClick={() => setAiMode('pitch')} className={`px-10 py-3 rounded-2xl text-[10px] font-black transition-all uppercase tracking-widest ${aiMode === 'pitch' ? 'bg-indigo-600 text-white' : 'text-slate-400'}`}>Копирайтер</button>
              <button onClick={() => setAiMode('import')} className={`px-10 py-3 rounded-2xl text-[10px] font-black transition-all uppercase tracking-widest ${aiMode === 'import' ? 'bg-indigo-600 text-white' : 'text-slate-400'}`}>Умный импорт</button>
           </div>
           
           {aiMode === 'pitch' ? (
             <div className="bg-white rounded-[50px] p-12 shadow-sm border border-slate-100 relative">
                <h3 className="text-3xl font-black text-slate-800 mb-8 tracking-tight leading-none">Генератор питчей</h3>
                <div className="space-y-8">
                   <div className="p-8 bg-slate-50 rounded-[32px] border border-slate-100">
                    {selectedContact ? (
                      <div className="flex items-center justify-between"><div className="flex items-center gap-4"><div className="w-12 h-12 bg-white rounded-xl flex items-center justify-center font-black text-indigo-600 shadow-sm">{selectedContact.name[0]}</div><div><p className="font-black text-slate-800">{selectedContact.name}</p><p className="text-[10px] text-slate-400 font-bold uppercase">{selectedContact.platform}</p></div></div><button onClick={() => setActiveTab('contacts')} className="text-[10px] font-black text-indigo-600 uppercase tracking-widest hover:underline">Сменить</button></div>
                    ) : <button onClick={() => setActiveTab('contacts')} className="w-full py-4 text-slate-400 font-bold italic">Выберите контакт из базы</button>}
                   </div>
                   <textarea className="w-full p-6 rounded-3xl border border-slate-200 min-h-[180px] focus:ring-4 focus:ring-indigo-500/10 outline-none font-bold text-slate-700" placeholder="О чем ваш проект? Какая новость?" value={pitchContext} onChange={(e) => setPitchContext(e.target.value)} />
                   <button onClick={async () => { if(!selectedContact) return; setIsGenerating(true); setAiResult(await generatePitch(selectedContact, pitchContext)); setIsGenerating(false); }} disabled={isGenerating || !selectedContact} className="w-full py-6 bg-slate-900 text-white rounded-[32px] font-black shadow-2xl disabled:opacity-50 transition-all uppercase tracking-widest">
                      {isGenerating ? "Формирую..." : "Сгенерировать"}
                   </button>
                   {aiResult && (
                     <div className="mt-10 p-10 bg-indigo-900 rounded-[40px] text-indigo-50 font-bold relative group shadow-2xl animate-in fade-in slide-in-from-top-6">
                        <button onClick={() => { navigator.clipboard.writeText(aiResult); alert("Скопировано!"); }} className="absolute top-8 right-8 text-indigo-300 hover:text-white transition-colors p-3 bg-white/10 rounded-xl"><i className="fa-solid fa-copy text-xl"></i></button>
                        <div className="whitespace-pre-wrap leading-relaxed text-lg">{aiResult}</div>
                     </div>
                   )}
                </div>
             </div>
           ) : (
             <div className="bg-white rounded-[50px] p-12 shadow-sm border border-slate-100">
                <h3 className="text-3xl font-black text-slate-800 mb-4 tracking-tight">Процессор текста</h3>
                <textarea className="w-full p-6 rounded-3xl border border-slate-200 min-h-[300px] mb-6 font-mono text-sm focus:ring-4 focus:ring-indigo-500/10 outline-none" placeholder="Вставьте текст со списками или заметками..." value={importText} onChange={(e) => setImportText(e.target.value)} />
                <button onClick={async () => {
                  if(!importText.trim()) return;
                  setIsImporting(true);
                  const data = await processSmartImport(importText);
                  setAppData(prev => {
                    const newContacts = [...data.contacts.map(c => ({ id: `ai-${Date.now()}-${Math.random()}`, name: c.name || 'AI Import', category: c.category || 'Blogger', platform: c.platform || 'IG', handle: c.handle || '@', reach: 'н/д', contactUrl: c.contactUrl || '', notes: 'Импорт ИИ', tags: c.tags || [] })), ...prev.contacts];
                    const newTracks = [...data.tracks.map(t => ({ id: `ai-t-${Date.now()}-${Math.random()}`, title: t.title || 'Unknown', artistName: t.artistName || 'Unknown', status: 'In Progress' as const, releaseDate: t.releaseDate || '2025-01-01', genre: t.genre || 'Pop' })), ...prev.tracks];
                    return { ...prev, contacts: newContacts, tracks: newTracks };
                  });
                  setIsImporting(false);
                  setImportText('');
                }} disabled={isImporting || !importText.trim()} className="w-full py-6 bg-indigo-600 text-white rounded-[32px] font-black uppercase tracking-widest">
                   Обработать ИИ
                </button>
             </div>
           )}
        </div>
      )}
    </Layout>
  );
};

export default App;
