
import { Contact, QuickLink, Track, ReleasePlan, Metric } from './types';

export const INITIAL_CONTACTS: Contact[] = [
  {
    id: '1',
    name: 'Алексей Ривера',
    category: 'Blogger',
    platform: 'Instagram',
    handle: '@arivera_travel',
    reach: '250k',
    contactUrl: 'https://instagram.com/arivera_travel',
    notes: 'Тревел и лайфстайл. Высокая вовлеченность.',
    tags: ['Путешествия', 'Люкс']
  },
  {
    id: '2',
    name: 'Луна Рэй',
    category: 'Artist',
    platform: 'Telegram',
    handle: 'lunaray_official',
    reach: '1.2M ежемесячно',
    contactUrl: 'https://t.me/lunaray_official',
    notes: 'Восходящая звезда инди-попа. Открыта к коллаборациям.',
    tags: ['Музыка', 'Инди']
  }
];

export const INITIAL_PLATFORM_CONTACTS: Contact[] = [
  {
    id: 'pc-1',
    name: 'Spotify for Artists',
    category: 'Platform Curator',
    platform: 'Spotify',
    handle: 'Editorial',
    reach: 'Весь мир',
    contactUrl: 'https://artists.spotify.com/',
    notes: 'Прямой питчинг через дашборд Spotify for Artists.',
    tags: ['Глобальный', 'Приоритет'],
    pitchingUrl: 'https://artists.spotify.com/c/pitch'
  },
  {
    id: 'pc-3',
    name: 'Яндекс Музыка',
    category: 'Platform Curator',
    platform: 'Yandex Music',
    handle: 'Редакция',
    reach: 'СНГ / Мир',
    contactUrl: 'https://music.yandex.ru/artists',
    notes: 'Подача заявок в плейлисты и программу "Искра".',
    tags: ['Мажор', 'СНГ'],
    pitchingUrl: 'https://yandex.ru/support/music/performers/pitching.html'
  }
];

export const INITIAL_LABEL_ARTISTS: Contact[] = [
  {
    id: 'la-1',
    name: 'Shadow Echo',
    category: 'Label Artist',
    platform: 'Universal',
    handle: '@shadow_echo',
    reach: '800k',
    contactUrl: 'https://t.me/shadow_echo_mgmt',
    notes: 'Техно-проект. Контракт до 2026 года.',
    tags: ['Techno', 'Mainstage']
  }
];

export const INITIAL_TRACKS: Track[] = [
  { id: 't1', title: 'Midnight Drive', artistName: 'Shadow Echo', status: 'Released', releaseDate: '2024-05-20', genre: 'Techno', isrc: 'RU-A12-24-00001' },
  { id: 't2', title: 'Summer Breeze', artistName: 'Mira Vane', status: 'In Progress', releaseDate: '2024-08-15', genre: 'Pop', isrc: 'RU-A12-24-00002' }
];

export const INITIAL_RELEASE_PLANS: ReleasePlan[] = [
  {
    id: 'rp1',
    title: 'Neon Nights (LP)',
    artist: 'Shadow Echo',
    date: '2025-04-12',
    status: 'Pitching',
    tasks: [
      { id: 'tsk1', label: 'Финальная обложка готова', completed: true },
      { id: 'tsk2', label: 'Питчинг в Spotify отправлен', completed: true },
      { id: 'tsk3', label: 'Пресс-кит разослан блогерам', completed: false },
      { id: 'tsk4', label: 'ТикТок сниппет опубликован', completed: false }
    ]
  }
];

export const INITIAL_METRICS: Metric[] = [
  { id: 'm1', label: 'Слушатели в Spotify', value: '1.24M', trend: 'up', trendValue: '+12%', icon: 'fa-spotify', color: 'text-emerald-500' },
  { id: 'm2', label: 'Сохранения треков', value: '450K', trend: 'up', trendValue: '+5%', icon: 'fa-heart', color: 'text-rose-500' },
  { id: 'm3', label: 'Engagement Rate IG', value: '4.8%', trend: 'down', trendValue: '-0.2%', icon: 'fa-instagram', color: 'text-pink-500' },
  { id: 'm4', label: 'Просмотры в TikTok', value: '2.1M', trend: 'up', trendValue: '+28%', icon: 'fa-tiktok', color: 'text-slate-800' }
];

export const INITIAL_LINKS: QuickLink[] = [
  { id: '1', title: 'Пресс-кит (EPK)', url: 'https://google.com', icon: 'fa-briefcase', color: 'bg-indigo-500' },
  { id: '2', title: 'Медиа-план', url: 'https://notion.so', icon: 'fa-calendar-check', color: 'bg-emerald-500' },
  { id: '3', title: 'Аналитика', url: 'https://analytics.google.com', icon: 'fa-chart-line', color: 'bg-blue-500' }
];
