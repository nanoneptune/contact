import { createClient } from '@supabase/supabase-js';
import { Contact } from '../types';

const SUPABASE_URL =
  process.env.SUPABASE_URL || 'https://qyzkvztmdxebgaknuvfl.supabase.co';

const SUPABASE_ANON_KEY =
  process.env.SUPABASE_ANON_KEY ||
  'eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6InF5emt2enRtZHhlYmdha251dmZsIiwicm9sZSI6ImFub24iLCJpYXQiOjE3ODQ4MDExNzMsImV4cCI6MjEwMDM3NzE3M30.I-kL30LBo9P5USOx0BiQ5d3BPSeI432VVQ7XSOtpCVk';

export const supabase = createClient(SUPABASE_URL, SUPABASE_ANON_KEY);

export async function fetchContactsSupabase(): Promise<Contact[] | null> {
  try {
    const { data, error } = await supabase
      .from('contacts')
      .select('*')
      .order('createdAt', { ascending: false });

    if (error) {
      console.warn('Supabase fetch query notice:', error.message);
      return null;
    }

    if (data) {
      return data.map((item: any) => ({
        id: String(item.id),
        name: String(item.name || ''),
        phone: String(item.phone || ''),
        place: String(item.place || ''),
        isFavorite: Boolean(item.isFavorite),
        createdAt: Number(item.createdAt || Date.now()),
      }));
    }
  } catch (err) {
    console.warn('Supabase client error:', err);
  }
  return null;
}

export async function addContactSupabase(contact: Contact): Promise<boolean> {
  try {
    const { error } = await supabase.from('contacts').insert([
      {
        id: contact.id,
        name: contact.name,
        phone: contact.phone,
        place: contact.place,
        isFavorite: contact.isFavorite ? true : false,
        createdAt: contact.createdAt,
      },
    ]);

    if (error) {
      console.warn('Supabase insert notice:', error.message);
      return false;
    }
    return true;
  } catch (err) {
    console.warn('Supabase insert error:', err);
    return false;
  }
}

export async function updateContactSupabase(
  id: string,
  data: { name: string; phone: string; place: string; isFavorite?: boolean }
): Promise<boolean> {
  try {
    const { error } = await supabase
      .from('contacts')
      .update({
        name: data.name,
        phone: data.phone,
        place: data.place,
        ...(data.isFavorite !== undefined ? { isFavorite: data.isFavorite } : {}),
      })
      .eq('id', id);

    if (error) {
      console.warn('Supabase update notice:', error.message);
      return false;
    }
    return true;
  } catch (err) {
    console.warn('Supabase update error:', err);
    return false;
  }
}

export async function deleteContactSupabase(id: string): Promise<boolean> {
  try {
    const { error } = await supabase.from('contacts').delete().eq('id', id);

    if (error) {
      console.warn('Supabase delete notice:', error.message);
      return false;
    }
    return true;
  } catch (err) {
    console.warn('Supabase delete error:', err);
    return false;
  }
}
