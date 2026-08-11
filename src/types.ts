export interface Contact {
  id: string;
  name: string;
  phone: string;
  place: string;
  tag?: 'Personal' | 'Work' | 'Family' | 'VIP' | 'Other';
  notes?: string;
  isFavorite: boolean;
  createdAt: number;
}

export interface ContactFormData {
  name: string;
  phone: string;
  place: string;
  tag: 'Personal' | 'Work' | 'Family' | 'VIP' | 'Other';
  notes: string;
}

export type SortOption = 'name-asc' | 'name-desc' | 'recent' | 'place';
