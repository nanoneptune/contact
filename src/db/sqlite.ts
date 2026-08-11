import initSqlJs, { Database } from 'sql.js';
import fs from 'fs';
import path from 'path';
import { Contact } from '../types';

const DB_FILE = path.join(process.cwd(), 'contacts.sqlite');

let db: Database | null = null;

export async function getDb(): Promise<Database> {
  if (db) return db;

  const SQL = await initSqlJs();

  if (fs.existsSync(DB_FILE)) {
    const filebuffer = fs.readFileSync(DB_FILE);
    db = new SQL.Database(filebuffer);
  } else {
    db = new SQL.Database();
  }

  // Ensure contacts table exists in SQLite
  db.run(`
    CREATE TABLE IF NOT EXISTS contacts (
      id TEXT PRIMARY KEY,
      name TEXT NOT NULL,
      phone TEXT NOT NULL,
      place TEXT NOT NULL,
      email TEXT,
      isFavorite INTEGER DEFAULT 0,
      createdAt INTEGER NOT NULL
    );
  `);

  // Safely attempt adding email column if missing
  try {
    db.run(`ALTER TABLE contacts ADD COLUMN email TEXT;`);
  } catch (_e) {
    // Column already exists
  }

  saveDb();
  return db;
}

export function saveDb() {
  if (!db) return;
  const data = db.export();
  const buffer = Buffer.from(data);
  fs.writeFileSync(DB_FILE, buffer);
}

export async function getAllContactsDB(): Promise<Contact[]> {
  const database = await getDb();
  const stmt = database.prepare('SELECT * FROM contacts ORDER BY createdAt DESC');
  const contacts: Contact[] = [];
  while (stmt.step()) {
    const row = stmt.getAsObject();
    contacts.push({
      id: String(row.id),
      name: String(row.name),
      phone: String(row.phone),
      place: String(row.place),
      email: row.email ? String(row.email) : undefined,
      isFavorite: Boolean(row.isFavorite),
      createdAt: Number(row.createdAt),
    });
  }
  stmt.free();
  return contacts;
}

export async function addContactDB(contact: {
  id: string;
  name: string;
  phone: string;
  place: string;
  email?: string;
  isFavorite?: boolean;
  createdAt?: number;
}): Promise<Contact> {
  const database = await getDb();
  const createdAt = contact.createdAt || Date.now();
  const isFavorite = contact.isFavorite ? 1 : 0;
  const email = contact.email || null;

  database.run(
    'INSERT INTO contacts (id, name, phone, place, email, isFavorite, createdAt) VALUES (?, ?, ?, ?, ?, ?, ?)',
    [contact.id, contact.name, contact.phone, contact.place, email, isFavorite, createdAt]
  );

  saveDb();

  return {
    id: contact.id,
    name: contact.name,
    phone: contact.phone,
    place: contact.place,
    email: contact.email || undefined,
    isFavorite: Boolean(isFavorite),
    createdAt,
  };
}

export async function updateContactDB(
  id: string,
  data: { name: string; phone: string; place: string; email?: string; isFavorite?: boolean }
): Promise<void> {
  const database = await getDb();
  const email = data.email || null;

  if (data.isFavorite !== undefined) {
    database.run(
      'UPDATE contacts SET name = ?, phone = ?, place = ?, email = ?, isFavorite = ? WHERE id = ?',
      [data.name, data.phone, data.place, email, data.isFavorite ? 1 : 0, id]
    );
  } else {
    database.run('UPDATE contacts SET name = ?, phone = ?, place = ?, email = ? WHERE id = ?', [
      data.name,
      data.phone,
      data.place,
      email,
      id,
    ]);
  }
  saveDb();
}

export async function deleteContactDB(id: string): Promise<void> {
  const database = await getDb();
  database.run('DELETE FROM contacts WHERE id = ?', [id]);
  saveDb();
}
