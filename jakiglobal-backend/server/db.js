import Database from 'better-sqlite3';
import path from 'path';
import fs from 'fs';
import { fileURLToPath } from 'url';

const __dirname = path.dirname(fileURLToPath(import.meta.url));
const dbPath = path.join(__dirname, 'data', 'data.db');
fs.mkdirSync(path.join(__dirname, 'data'), { recursive: true });
const db = new Database(dbPath);
export default db;
