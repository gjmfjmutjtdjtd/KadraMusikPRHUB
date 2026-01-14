
export type ContactCategory = 'Blogger' | 'Artist' | 'Agency' | 'Media' | 'Label Artist' | 'Platform Curator';

export interface Contact {
  id: string;
  name: string;
  category: ContactCategory;
  platform: string;
  handle: string;
  reach: string;
  notes: string;
  contactUrl: string;
  tags: string[];
  pitchingUrl?: string;
}

export interface Track {
  id: string;
  title: string;
  artistName: string;
  status: 'Signed' | 'In Progress' | 'Released';
  releaseDate: string;
  isrc?: string;
  upc?: string;
  genre?: string;
  mood?: string;
  assetLink?: string; // Link to WAV/Dropbox/Drive
}

export interface ReleasePlan {
  id: string;
  title: string;
  artist: string;
  date: string;
  status: 'Planning' | 'Pitching' | 'Finalizing' | 'Released';
  tasks: { id: string; label: string; completed: boolean }[];
  budget?: string;
}

export interface Metric {
  id: string;
  label: string;
  value: string;
  trend: 'up' | 'down' | 'neutral';
  trendValue: string;
  icon: string;
  color: string;
}

export interface QuickLink {
  id: string;
  title: string;
  url: string;
  icon: string;
  color: string;
}

export type AppTab = 'contacts' | 'links' | 'ai' | 'label_artists' | 'tracks' | 'platform_pitching' | 'release_plans' | 'statistics';
