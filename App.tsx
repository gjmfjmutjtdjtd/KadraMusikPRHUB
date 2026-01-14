import React, { useState, useMemo, useEffect, useRef } from 'react';
import { ref, onValue, set } from 'firebase/database';
import { db } from './services/firebaseConfig'; // Убедитесь, что путь верный
import Layout from './components/Layout.tsx';
import ContactCard from './components/ContactCard.tsx';
import Modal from './components/Modal.tsx';
import { Contact, QuickLink, Track, AppTab, ReleasePlan, Metric, ContactCategory } from './types.ts';
import { INITIAL_CONTACTS, INITIAL_LINKS, INITIAL_LABEL_ARTISTS, INITIAL_TRACKS, INITIAL_PLATFORM_CONTACTS, INITIAL_RELEASE_PLANS, INITIAL_METRICS } from './constants.tsx';

// Структура данных в Firebase
interface AppData {
  contacts: Contact[];
  platformContacts: Contact[];
  labelArtists: Contact[];
  tracks: Track[];
  releasePlans: ReleasePlan[];
  links: QuickLink[];
  metrics: Metric[];
}

const App: React.FC = () => {
  const [activeTab, setActiveTab] = useState<AppTab>('contacts');
  const [saveStatus, setSaveStatus] = useState<'idle' | 'saving' | 'saved'>('idle');
  const [searchTerm, setSearchTerm] = useState('');
  const [filterCategory, setFilterCategory] = useState<ContactCategory | 'All'>('All');

  // Основное состояние приложения
  const [appData, setAppData] = useState<AppData>({
    contacts: [],
    platformContacts: [],
    labelArtists: [],
    tracks: [],
    releasePlans: [],
    links: [],
    metrics: INITIAL_METRICS
  });

  // --- СИНХРОНИЗАЦИЯ С FIREBASE ---

  useEffect(() => {
    const dataRef = ref(db, 'pr_hub_v2_data');
    
    // Подписываемся на изменения в БД
    const unsubscribe = onValue(dataRef, (snapshot) => {
      const val = snapshot.val();
      if (val) {
        setAppData(val);
      } else {
        // Если база пуста (первый запуск), записываем начальные данные
        const defaultData = {
          contacts: INITIAL_CONTACTS,
          platformContacts: INITIAL_PLATFORM_CONTACTS,
          labelArtists: INITIAL_LABEL_ARTISTS,
          tracks: INITIAL_TRACKS,
          releasePlans: INITIAL_RELEASE_PLANS,
          links: INITIAL_LINKS,
          metrics: INITIAL_METRICS
        };
        set(dataRef, defaultData);
      }
    });

    return () => unsubscribe();
  }, []);

  // Универсальная функция для обновления данных в облаке
  const syncWithFirebase = (newData: AppData) => {
    setSaveStatus('saving');
    set(ref(db, 'pr_hub_v2_data'), newData)
      .then(() => {
        setSaveStatus('saved');
        setTimeout(() => setSaveStatus('idle'), 2000);
      })
      .catch((err) => {
        console.error("Firebase Sync Error:", err);
        setSaveStatus('idle');
      });
  };

  // --- ЛОГИКА МОДАЛОК И ФОРМ ---

  const [isModalOpen, setIsModalOpen] = useState(false);
  const [modalType, setModalType] = useState<'contact' | 'track' | 'plan' | 'link' | null>(null);
  const [editingId, setEditingId] = useState<string | null>(null);
  const [newFormData, setNewFormData] = useState<any>({});

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
    
    const updated = { ...appData };
    
    if (modalType === 'contact') {
      const item: Contact = {
        id: editingId || `c-${Date.now()}`,
        name: newFormData.name || 'Новый контакт',
        category: newFormData.category || 'Blogger',
        platform: newFormData.platform || 'Instagram',
        handle: newFormData.handle || '@',
        reach: newFormData.reach || 'н/д',
        contactUrl: newFormData.url || '',
        notes: newFormData.notes || '',
        tags: newFormData.tags ? newFormData.tags.split(',').map((t: string) => t.trim()).filter(Boolean) : [],
      };
      
      // Удаляем старую версию при редактировании
      if (editingId) {
        updated.contacts = updated.contacts.filter(i => i.id !== editingId);
        updated.labelArtists = updated.labelArtists.filter(i => i.id !== editingId);
        updated.platformContacts = updated.platformContacts.filter(i => i.id !== editingId);
      }

      if (item.category === 'Label Artist') updated.labelArtists = [item, ...updated.labelArtists];
      else if (item.category === 'Platform Curator') updated.platformContacts = [item, ...updated.platformContacts];
      else updated.contacts = [item, ...updated.contacts];
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
    }

    else if (modalType === 'plan') {
      const item: ReleasePlan = {
        id: editingId || `rp-${Date.now()}`,
        title: newFormData.title || 'Новый план',
        artist: newFormData.artist || 'Неизвестен',
        date: newFormData.date || new Date().toISOString().split('T')[0],
        status: newFormData.status || 'Planning',
        tasks: newFormData.tasks || [
          { id: '1', label: 'Пресс-кит', completed: false },
          { id: '2', label: 'Питчинг', completed: false }
        ]
      };
      updated.releasePlans = editingId ? updated.releasePlans.map(i => i.id === editingId ? item : i) : [item, ...updated.releasePlans];
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
    }

    syncWithFirebase(updated);
    setIsModalOpen(false);
    setNewFormData({});
  };

  const handleDelete = (id: string, type: keyof AppData) => {
    if (!confirm("Удалить эту запись?")) return;
    const updated = {
      ...appData,
      [type]: (appData[type] as any[]).filter((item: any) => item.id !== id)
    };
    syncWithFirebase(updated);
  };

  const handleResetData = () => {
    if (confirm("Сбросить всю базу данных до начальных значений?")) {
      const initial = {
        contacts: INITIAL_CONTACTS,
        platformContacts: INITIAL_PLATFORM_CONTACTS,
        labelArtists: INITIAL_LABEL_ARTISTS,
        tracks: INITIAL_TRACKS,
        releasePlans: INITIAL_RELEASE_PLANS,
        links: INITIAL_LINKS,
        metrics: INITIAL_METRICS
      };
      syncWithFirebase(initial);
    }
  };

  // --- ФИЛЬТРАЦИЯ ---
  const filteredContacts = useMemo(() => appData.contacts.filter(c => (filterCategory === 'All' || c.category === filterCategory) && c.name.toLowerCase().includes(searchTerm.toLowerCase())), [appData.contacts, searchTerm, filterCategory]);
  const filteredPlatformContacts = useMemo(() => appData.platformContacts.filter(c => c.name.toLowerCase().includes(searchTerm.toLowerCase())), [appData.platformContacts, searchTerm]);
  const filteredLabelArtists = useMemo(() => appData.labelArtists.filter(c => c.name.toLowerCase().includes(searchTerm.toLowerCase())), [appData.labelArtists, searchTerm]);
  const filteredTracks = useMemo(() => appData.tracks.filter(t => t.title.toLowerCase().includes(searchTerm.toLowerCase()) || t.artistName.toLowerCase().includes(searchTerm.toLowerCase())), [appData.tracks, searchTerm]);
  const filteredPlans = useMemo(() => appData.releasePlans.filter(p => p.title.toLowerCase().includes(searchTerm.toLowerCase()) || p.artist.toLowerCase().includes(searchTerm.toLowerCase())), [appData.releasePlans, searchTerm]);

  return (
    <Layout activeTab={activeTab} setActiveTab={setActiveTab}>
      {/* Индикатор сохранения */}
      <div className="fixed top-6 right-8 z-[60] flex items-center gap-2 pointer-events-none">
        {saveStatus === 'saving' && <div className="bg-indigo-600 text-white px-4 py-2 rounded-full text-[10px] font-black uppercase tracking-widest shadow-xl animate-pulse flex items-center gap-2"><i className="fa-solid fa-cloud-arrow-up"></i> Синхронизация...</div>}
        {saveStatus === 'saved' && <div className="bg-emerald-500 text-white px-4 py-2 rounded-full text-[10px] font-black uppercase tracking-widest shadow-xl flex items-center gap-2"><i className="fa-solid fa-check"></i> Облако обновлено</div>}
      </div>

      {/* Верхняя панель поиска и кнопок */}
      {activeTab !== 'ai' && activeTab !== 'statistics' && (
        <div className="flex flex-col md:flex-row gap-4 mb-8">
          <div className="relative flex-1 group">
            <i className="fa-solid fa-magnifying-glass absolute left-4 top-1/2 -translate-y-1/2 text-slate-400 group-focus-within:text-indigo-600"></i>
            <input
              type="text"
              placeholder="Поиск..."
              className="w-full pl-12 pr-4 py-3.5 rounded-2xl border border-slate-200 outline-none bg-white shadow-sm"
              value={searchTerm}
              onChange={(e) => setSearchTerm(e.target.value)}
            />
          </div>
          <button onClick={() => openCreateModal('contact')} className="px-6 py-3.5 bg-indigo-600 text-white rounded-2xl font-black uppercase tracking-widest text-xs hover:bg-indigo-700 shadow-xl transition-all">
            + Добавить
          </button>
          <button onClick={handleResetData} className="px-4 py-3.5 bg-slate-100 text-slate-400 rounded-2xl hover:bg-red-50 hover:text-red-500 transition-colors">
            <i className="fa-solid fa-rotate-right"></i>
          </button>
        </div>
      )}

      {/* Контент вкладок (Остальные части рендеринга остаются такими же, как у вас) */}
      <div className="animate-in fade-in slide-in-from-bottom-4">
        {activeTab === 'contacts' && (
          <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-6">
            {filteredContacts.map(c => <ContactCard key={c.id} contact={c} onDelete={(id) => handleDelete(id, 'contacts')} onEdit={() => openCreateModal('contact', c)} onDraft={() => {}} />)}
          </div>
        )}
        {/* Добавьте остальные вкладки по аналогии... */}
      </div>

      {/* Модалка */}
      <Modal isOpen={isModalOpen} onClose={() => setIsModalOpen(false)} title={editingId ? 'Редактировать' : 'Создать'}>
        <form onSubmit={handleFormSubmit} className="space-y-5">
           {/* Код вашей формы из оригинального файла остается здесь без изменений */}
           <input 
              type="text" 
              placeholder="Название" 
              className="w-full p-4 bg-slate-50 border border-slate-200 rounded-xl"
              value={newFormData.name || newFormData.title || ''} 
              onChange={e => setNewFormData({...newFormData, name: e.target.value, title: e.target.value})}
              required 
            />
           <button type="submit" className="w-full py-5 bg-indigo-600 text-white rounded-2xl font-black uppercase tracking-widest text-[10px] shadow-2xl">
             {editingId ? 'Обновить в облаке' : 'Сохранить в облако'}
           </button>
        </form>
      </Modal>
    </Layout>
  );
};

export default App;
