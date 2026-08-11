import express from "express";
import path from "path";
import { createServer as createViteServer } from "vite";
import {
  getAllContactsDB,
  addContactDB,
  updateContactDB,
  deleteContactDB,
} from "./src/db/sqlite";
import {
  fetchContactsSupabase,
  addContactSupabase,
  updateContactSupabase,
  deleteContactSupabase,
} from "./src/db/supabaseStore";

async function startServer() {
  const app = express();
  const PORT = 3000;

  app.use(express.json());

  // Supabase Health Check Endpoint
  app.get("/api/supabase-status", async (_req, res) => {
    const { data, error } = await fetchContactsSupabase();
    if (error) {
      return res.json({ connected: false, error, count: 0 });
    }
    return res.json({ connected: true, error: null, count: data ? data.length : 0 });
  });

  // API REST Routes for Supabase & SQLite Operations
  app.get("/api/contacts", async (_req, res) => {
    try {
      // Attempt to fetch from Supabase
      const { data: supabaseContacts, error: sbError } = await fetchContactsSupabase();

      if (!sbError && supabaseContacts !== null) {
        return res.json({
          source: "supabase",
          contacts: supabaseContacts,
          error: null,
        });
      }

      // Fallback to SQLite if Supabase fails or table not configured
      const sqliteContacts = await getAllContactsDB();
      res.json({
        source: "sqlite",
        contacts: sqliteContacts,
        error: sbError || "Supabase not connected",
      });
    } catch (err: any) {
      console.error("Error fetching contacts:", err);
      const sqliteContacts = await getAllContactsDB();
      res.json({
        source: "sqlite",
        contacts: sqliteContacts,
        error: err?.message || "Failed to fetch contacts from Supabase",
      });
    }
  });

  app.post("/api/contacts", async (req, res) => {
    try {
      const { name, phone, place } = req.body;
      if (!name || !phone || !place) {
        return res.status(400).json({ error: "Name, phone, and place are required" });
      }

      const id = `contact-${Date.now()}-${Math.random().toString(36).substring(2, 6)}`;
      const createdAt = Date.now();
      const newContact = {
        id,
        name,
        phone,
        place,
        isFavorite: false,
        createdAt,
      };

      // Store in local SQLite
      await addContactDB(newContact);

      // Attempt storing in Supabase
      const sbResult = await addContactSupabase(newContact);

      res.status(201).json({
        contact: newContact,
        supabaseSaved: sbResult.success,
        supabaseError: sbResult.error,
      });
    } catch (err: any) {
      console.error("Error creating contact:", err);
      res.status(500).json({ error: "Failed to create contact" });
    }
  });

  app.put("/api/contacts/:id", async (req, res) => {
    try {
      const { id } = req.params;
      const { name, phone, place, isFavorite } = req.body;

      // Update in local SQLite
      await updateContactDB(id, { name, phone, place, isFavorite });

      // Update in Supabase
      const sbResult = await updateContactSupabase(id, { name, phone, place, isFavorite });

      res.json({
        success: true,
        supabaseSaved: sbResult.success,
        supabaseError: sbResult.error,
      });
    } catch (err: any) {
      console.error("Error updating contact:", err);
      res.status(500).json({ error: "Failed to update contact" });
    }
  });

  app.delete("/api/contacts/:id", async (req, res) => {
    try {
      const { id } = req.params;

      // Delete from local SQLite
      await deleteContactDB(id);

      // Delete from Supabase
      const sbResult = await deleteContactSupabase(id);

      res.json({
        success: true,
        supabaseDeleted: sbResult.success,
        supabaseError: sbResult.error,
      });
    } catch (err: any) {
      console.error("Error deleting contact:", err);
      res.status(500).json({ error: "Failed to delete contact" });
    }
  });

  // Vite middleware for development
  if (process.env.NODE_ENV !== "production") {
    const vite = await createViteServer({
      server: { middlewareMode: true },
      appType: "spa",
    });
    app.use(vite.middlewares);
  } else {
    const distPath = path.join(process.cwd(), "dist");
    app.use(express.static(distPath));
    app.get("*", (_req, res) => {
      res.sendFile(path.join(distPath, "index.html"));
    });
  }

  app.listen(PORT, "0.0.0.0", () => {
    console.log(`Server running on http://0.0.0.0:${PORT}`);
  });
}

startServer();
