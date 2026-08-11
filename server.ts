import express from "express";
import path from "path";
import { createServer as createViteServer } from "vite";
import {
  getAllContactsDB,
  addContactDB,
  updateContactDB,
  deleteContactDB,
} from "./src/db/sqlite";

async function startServer() {
  const app = express();
  const PORT = 3000;

  app.use(express.json());

  // API REST Routes for SQLite Operations
  app.get("/api/contacts", async (_req, res) => {
    try {
      const contacts = await getAllContactsDB();
      res.json(contacts);
    } catch (err: any) {
      console.error("Error fetching contacts:", err);
      res.status(500).json({ error: "Failed to fetch contacts" });
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

      await addContactDB(newContact);
      res.status(201).json(newContact);
    } catch (err: any) {
      console.error("Error creating contact:", err);
      res.status(500).json({ error: "Failed to create contact" });
    }
  });

  app.put("/api/contacts/:id", async (req, res) => {
    try {
      const { id } = req.params;
      const { name, phone, place, isFavorite } = req.body;

      await updateContactDB(id, { name, phone, place, isFavorite });
      res.json({ success: true });
    } catch (err: any) {
      console.error("Error updating contact:", err);
      res.status(500).json({ error: "Failed to update contact" });
    }
  });

  app.delete("/api/contacts/:id", async (req, res) => {
    try {
      const { id } = req.params;
      await deleteContactDB(id);
      res.json({ success: true });
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
