import { createClient } from '@supabase/supabase-js';
import { Contact } from '../types';

const SUPABASE_URL =
  process.env.SUPABASE_URL || 'https://qyzkvztmdxebgaknuvfl.supabase.co';

const SUPABASE_ANON_KEY =
  process.env.SUPABASE_ANON_KEY ||
  'eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6InF5emt2enRtZHhlYmdha251dmZsIiwicm9sZSI6ImFub24iLCJpYXQiOjE3ODQ4MDExNzMsImV4cCI6MjEwMDM3NzE3M30.I-kL30LBo9P5USOx0BiQ5d3BPSeI432VVQ7XSOtpCVk';

export const supabase = createClient(SUPABASE_URL, SUPABASE_ANON_KEY);

export interface SupabaseResponse<T> {
  data: T | null;
  error: string | null;
}

export async function fetchContactsSupabase(): Promise<SupabaseResponse<Contact[]>> {
  try {
    const { data, error } = await supabase.from('contacts').select('*');

    if (error) {
      console.warn('Supabase fetch query error:', error.message);
      return { data: null, error: error.message };
    }

    if (data) {
      const contacts: Contact[] = data.map((item: any) => ({
        id: String(item.id || ''),
        name: String(item.name || ''),
        phone: String(item.phone || ''),
        place: String(item.place || ''),
        email: item.email ? String(item.email) : undefined,
        isFavorite: Boolean(
          item.isFavorite ?? item.is_favorite ?? item.isfavorite ?? false
        ),
        createdAt: Number(
          item.createdAt ?? item.created_at ?? item.createdat ?? Date.now()
        ),
      })).sort((a, b) => b.createdAt - a.createdAt);

      return { data: contacts, error: null };
    }

    return { data: [], error: null };
  } catch (err: any) {
    console.error('Supabase client exception:', err);
    return { data: null, error: err?.message || 'Failed to connect to Supabase' };
  }
}

export async function addContactSupabase(contact: Contact): Promise<{ success: boolean; error: string | null }> {
  try {
    const payload = {
      id: contact.id,
      name: contact.name,
      phone: contact.phone,
      place: contact.place,
      email: contact.email || null,
      isFavorite: Boolean(contact.isFavorite),
      createdAt: contact.createdAt,
    };

    const { error } = await supabase.from('contacts').insert([payload]);

    if (error) {
      console.warn('Supabase insert error:', error.message);
      return { success: false, error: error.message };
    }

    return { success: true, error: null };
  } catch (err: any) {
    console.error('Supabase insert exception:', err);
    return { success: false, error: err?.message || 'Insert failed' };
  }
}

export async function updateContactSupabase(
  id: string,
  data: { name: string; phone: string; place: string; email?: string; isFavorite?: boolean }
): Promise<{ success: boolean; error: string | null }> {
  try {
    const updateData: any = {
      name: data.name,
      phone: data.phone,
      place: data.place,
      email: data.email || null,
    };

    if (data.isFavorite !== undefined) {
      updateData.isFavorite = data.isFavorite;
    }

    const { error } = await supabase
      .from('contacts')
      .update(updateData)
      .eq('id', id);

    if (error) {
      console.warn('Supabase update error:', error.message);
      return { success: false, error: error.message };
    }

    return { success: true, error: null };
  } catch (err: any) {
    console.error('Supabase update exception:', err);
    return { success: false, error: err?.message || 'Update failed' };
  }
}

export async function deleteContactSupabase(id: string): Promise<{ success: boolean; error: string | null }> {
  try {
    const { error } = await supabase.from('contacts').delete().eq('id', id);

    if (error) {
      console.warn('Supabase delete error:', error.message);
      return { success: false, error: error.message };
    }

    return { success: true, error: null };
  } catch (err: any) {
    console.error('Supabase delete exception:', err);
    return { success: false, error: err?.message || 'Delete failed' };
  }
}
