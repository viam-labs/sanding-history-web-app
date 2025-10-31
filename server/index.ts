import { config } from 'dotenv';
import { resolve } from 'path';
import { fileURLToPath } from 'url';
import { dirname } from 'path';

// Load .env from server directory
const __filename = fileURLToPath(import.meta.url);
const __dirname = dirname(__filename);
config({ path: resolve(__dirname, '.env') });

import express from 'express';
import cors from 'cors';
import { MongoClient, Db, Collection, ObjectId } from 'mongodb';

const app = express();
app.use(cors());
app.use(express.json());

const uri = process.env.MONGODB_URI!;
if (!uri) {
  console.error('MONGODB_URI not set');
  process.exit(1);
}
const client = new MongoClient(uri);
const DB_NAME = process.env.MONGODB_DB || 'viking';
const COLLECTION = 'sanding_notes';

let db: Db | null = null;

async function getCollection(): Promise<Collection> {
  if (!db) {
    await client.connect();
    db = client.db(DB_NAME);
    console.log(`Connected to MongoDB: ${DB_NAME}`);
  }
  return db.collection(COLLECTION);
}

// Create note (we delete existing for this pass first to preserve current behavior)
app.post('/api/notes', async (req, res) => {
  try {
    const {
      organization_id,
      location_id,
      robot_id,
      pass_id,
      note_text,
      created_at,
      created_by,
    } = req.body || {};
    if (!organization_id || !location_id || !robot_id || !pass_id || typeof note_text !== 'string') {
      return res.status(400).json({ error: 'Missing required fields: organization_id, location_id, robot_id, pass_id, note_text' });
    }
    const col = await getCollection();
    await col.deleteMany({ organization_id, location_id, robot_id, pass_id });
    const doc = {
      organization_id,
      location_id,
      robot_id,
      pass_id,
      note_text,
      created_at: created_at || new Date().toISOString(),
      created_by: created_by || 'summary-web-app',
    };
    const result = await col.insertOne(doc);
    return res.status(201).json({ _id: result.insertedId });
  } catch (e: any) {
    console.error(e);
    return res.status(500).json({ error: 'Failed to save note' });
  }
});

// Fetch notes for multiple passes (sorted newest first)
app.get('/api/notes', async (req, res) => {
  try {
    const organizationId = String(req.query.organizationId || '');
    const robotId = String(req.query.robotId || '');
    const locationId = String(req.query.locationId || '');
    const passIds = String(req.query.passIds || '')
      .split(',')
      .map(s => s.trim())
      .filter(Boolean);

    if (!organizationId || !locationId || !robotId || passIds.length === 0) {
      return res.status(400).json({ error: 'Missing required query params: organizationId, locationId, robotId, passIds' });
    }

    const col = await getCollection();
    const query: any = {
      organization_id: organizationId,
      location_id: locationId,
      robot_id: robotId,
      pass_id: { $in: passIds },
    };

    const rows = await col
      .find(query)
      .sort({ created_at: -1 })
      .toArray();

    // Return PassNote shape
    const notes = rows.map(r => ({
      pass_id: r.pass_id,
      note_text: r.note_text,
      created_at: typeof r.created_at === 'string' ? r.created_at : new Date(r.created_at).toISOString(),
      created_by: r.created_by || 'summary-web-app',
    }));
    return res.json(notes);
  } catch (e: any) {
    console.error(e);
    return res.status(500).json({ error: 'Failed to fetch notes' });
  }
});

// Delete all notes for a pass
app.delete('/api/notes', async (req, res) => {
  try {
    const organizationId = String(req.query.organizationId || '');
    const robotId = String(req.query.robotId || '');
    const locationId = String(req.query.locationId || '');
    const passId = String(req.query.passId || '');

    if (!organizationId || !locationId || !robotId || !passId) {
      return res.status(400).json({ error: 'Missing required query params: organizationId, locationId, robotId, passId' });
    }

    const col = await getCollection();
    const query: any = {
      organization_id: organizationId,
      location_id: locationId,
      robot_id: robotId,
      pass_id: passId
    };
    const result = await col.deleteMany(query);
    return res.json({ deletedCount: result.deletedCount });
  } catch (e: any) {
    console.error(e);
    return res.status(500).json({ error: 'Failed to delete notes' });
  }
});

// Delete old notes (keep newest)
app.delete('/api/notes/old', async (req, res) => {
  try {
    const organizationId = String(req.query.organizationId || '');
    const robotId = String(req.query.robotId || '');
    const locationId = String(req.query.locationId || '');
    const passId = String(req.query.passId || '');

    if (!organizationId || !locationId || !robotId || !passId) {
      return res.status(400).json({ error: 'Missing required query params: organizationId, locationId, robotId, passId' });
    }

    const col = await getCollection();
    const query: any = {
      organization_id: organizationId,
      location_id: locationId,
      robot_id: robotId,
      pass_id: passId
    };

    const docs = await col.find(query).sort({ created_at: -1 }).toArray();
    if (docs.length <= 1) return res.json({ deletedCount: 0 });

    const idsToDelete = docs.slice(1).map(d => d._id as ObjectId);
    const result = await col.deleteMany({ _id: { $in: idsToDelete } });
    return res.json({ deletedCount: result.deletedCount });
  } catch (e: any) {
    console.error(e);
    return res.status(500).json({ error: 'Failed to delete old notes' });
  }
});

const PORT = process.env.PORT || 3001;
app.listen(PORT, () => {
  console.log(`Notes API listening on http://localhost:${PORT}`);
});