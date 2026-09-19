import { Pool } from 'pg';

let pool = null;
let ready = null;

// In-memory fallback so the app still renders when DATABASE_URL is absent
// (local preview, first Vercel build before env vars land).
const mem = { clients: [], interactions: [], seq: 1 };

export const hasDb = () => Boolean(process.env.DATABASE_URL);

function getPool() {
  if (!pool) {
    pool = new Pool({
      connectionString: process.env.DATABASE_URL,
      ssl: { rejectUnauthorized: false },
      max: 3,
    });
  }
  return pool;
}

const SCHEMA = `
CREATE TABLE IF NOT EXISTS clients (
  id SERIAL PRIMARY KEY,
  company TEXT NOT NULL,
  contact_name TEXT,
  position TEXT,
  phone TEXT,
  email TEXT,
  status TEXT DEFAULT 'lead',
  industry TEXT,
  company_birthday DATE,
  contact_birthday DATE,
  products TEXT,
  notes TEXT,
  created_at TIMESTAMPTZ DEFAULT NOW()
);
CREATE TABLE IF NOT EXISTS interactions (
  id SERIAL PRIMARY KEY,
  client_id INTEGER REFERENCES clients(id) ON DELETE CASCADE,
  kind TEXT NOT NULL,
  body TEXT,
  created_at TIMESTAMPTZ DEFAULT NOW()
);
`;

export async function db() {
  if (!hasDb()) return null;
  if (!ready) ready = getPool().query(SCHEMA);
  await ready;
  return getPool();
}

export async function listClients() {
  const p = await db();
  if (!p) return mem.clients;
  const { rows } = await p.query('SELECT * FROM clients ORDER BY created_at DESC');
  return rows;
}

export async function createClient(c) {
  const p = await db();
  if (!p) {
    const row = { id: mem.seq++, created_at: new Date().toISOString(), ...c };
    mem.clients.unshift(row);
    return row;
  }
  const { rows } = await p.query(
    `INSERT INTO clients (company, contact_name, position, phone, email, status, industry, company_birthday, contact_birthday, products, notes)
     VALUES ($1,$2,$3,$4,$5,$6,$7,$8,$9,$10,$11) RETURNING *`,
    [c.company, c.contact_name, c.position, c.phone, c.email, c.status || 'lead', c.industry,
     c.company_birthday || null, c.contact_birthday || null, c.products, c.notes]
  );
  return rows[0];
}

export async function updateClient(id, c) {
  const p = await db();
  if (!p) {
    const i = mem.clients.findIndex((x) => String(x.id) === String(id));
    if (i < 0) return null;
    mem.clients[i] = { ...mem.clients[i], ...c };
    return mem.clients[i];
  }
  const { rows } = await p.query(
    `UPDATE clients SET company=$2, contact_name=$3, position=$4, phone=$5, email=$6, status=$7,
     industry=$8, company_birthday=$9, contact_birthday=$10, products=$11, notes=$12 WHERE id=$1 RETURNING *`,
    [id, c.company, c.contact_name, c.position, c.phone, c.email, c.status, c.industry,
     c.company_birthday || null, c.contact_birthday || null, c.products, c.notes]
  );
  return rows[0];
}

export async function deleteClient(id) {
  const p = await db();
  if (!p) {
    mem.clients = mem.clients.filter((x) => String(x.id) !== String(id));
    mem.interactions = mem.interactions.filter((x) => String(x.client_id) !== String(id));
    return;
  }
  await p.query('DELETE FROM clients WHERE id=$1', [id]);
}

export async function listInteractions(clientId) {
  const p = await db();
  if (!p) {
    return mem.interactions.filter((x) => !clientId || String(x.client_id) === String(clientId));
  }
  const q = clientId
    ? ['SELECT * FROM interactions WHERE client_id=$1 ORDER BY created_at DESC', [clientId]]
    : ['SELECT * FROM interactions ORDER BY created_at DESC LIMIT 100', []];
  const { rows } = await p.query(q[0], q[1]);
  return rows;
}

export async function addInteraction(clientId, kind, body) {
  const p = await db();
  if (!p) {
    const row = { id: mem.seq++, client_id: clientId, kind, body, created_at: new Date().toISOString() };
    mem.interactions.unshift(row);
    return row;
  }
  const { rows } = await p.query(
    'INSERT INTO interactions (client_id, kind, body) VALUES ($1,$2,$3) RETURNING *',
    [clientId, kind, body]
  );
  return rows[0];
}
