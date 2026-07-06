import type { SQLiteDatabase } from 'expo-sqlite';

/**
 * Runs on database open via SQLiteProvider's `onInit`. Creates the schema and,
 * on a fresh database, seeds a starter set of categories/subcategories that the
 * user can edit or delete later.
 */
export async function migrateDb(db: SQLiteDatabase) {
  await db.execAsync(`
    PRAGMA journal_mode = WAL;
    PRAGMA foreign_keys = ON;

    CREATE TABLE IF NOT EXISTS categories (
      id INTEGER PRIMARY KEY NOT NULL,
      name TEXT NOT NULL UNIQUE
    );

    CREATE TABLE IF NOT EXISTS subcategories (
      id INTEGER PRIMARY KEY NOT NULL,
      category_id INTEGER NOT NULL REFERENCES categories(id) ON DELETE CASCADE,
      name TEXT NOT NULL
    );

    -- Checking accounts and cards the user pays bills from. identifier holds
    -- the card's last 4 digits or the account number (free-form, may be empty).
    CREATE TABLE IF NOT EXISTS accounts (
      id INTEGER PRIMARY KEY NOT NULL,
      name TEXT NOT NULL,
      type TEXT NOT NULL, -- 'checking' | 'card'
      identifier TEXT NOT NULL DEFAULT '',
      created_at TEXT NOT NULL
    );

    CREATE TABLE IF NOT EXISTS payables (
      id INTEGER PRIMARY KEY NOT NULL,
      supplier TEXT NOT NULL,
      amount_cents INTEGER NOT NULL,
      due_date TEXT NOT NULL,
      category_id INTEGER REFERENCES categories(id) ON DELETE SET NULL,
      subcategory_id INTEGER REFERENCES subcategories(id) ON DELETE SET NULL,
      account_id INTEGER REFERENCES accounts(id) ON DELETE SET NULL,
      source TEXT NOT NULL DEFAULT 'manual',
      paid INTEGER NOT NULL DEFAULT 0,
      created_at TEXT NOT NULL
    );

    -- Financial-institution apps the user chose to capture notifications from.
    CREATE TABLE IF NOT EXISTS notification_sources (
      package TEXT PRIMARY KEY NOT NULL,
      label TEXT NOT NULL
    );

    -- Simple key-value store for app preferences (e.g. dismissed reminders).
    CREATE TABLE IF NOT EXISTS app_settings (
      key TEXT PRIMARY KEY NOT NULL,
      value TEXT NOT NULL
    );

    -- Budget forecast lines (orçamento), with category/subcategory. These are
    -- month-agnostic: a single set of forecasts that the Comparativo screen
    -- reuses for every month it compares against.
    CREATE TABLE IF NOT EXISTS budgets (
      id INTEGER PRIMARY KEY NOT NULL,
      description TEXT NOT NULL DEFAULT '',
      amount_cents INTEGER NOT NULL,
      category_id INTEGER REFERENCES categories(id) ON DELETE SET NULL,
      subcategory_id INTEGER REFERENCES subcategories(id) ON DELETE SET NULL,
      created_at TEXT NOT NULL
    );

    -- Diagnostics: raw notifications received, with the parse outcome. Helps
    -- verify the pipeline and calibrate the parser against real bank texts.
    CREATE TABLE IF NOT EXISTS captured_notifications (
      id INTEGER PRIMARY KEY NOT NULL,
      package TEXT NOT NULL,
      title TEXT,
      text TEXT,
      big_text TEXT,
      post_time INTEGER,
      result TEXT NOT NULL,
      created_at TEXT NOT NULL
    );
  `);

  await addColumnIfMissing(db, 'payables', 'account_id', 'INTEGER REFERENCES accounts(id) ON DELETE SET NULL');
  await addColumnIfMissing(db, 'accounts', 'identifier', "TEXT NOT NULL DEFAULT ''");

  // Budgets used to be scoped to a month; they're now a single, month-agnostic
  // set. Drop the old column on databases that still carry it. Any pre-existing
  // rows keep their forecasts (deduplicate manually if a category was budgeted
  // across several months).
  await dropColumnIfExists(db, 'budgets', 'month');

  // The payables list is now grouped by the month of `due_date`, so every row
  // needs one. Backfill any dateless payables (older entries, pre-this-change
  // notifications) with their creation date so they aren't hidden from the list.
  await db.runAsync(
    `UPDATE payables SET due_date = substr(created_at, 1, 10)
     WHERE due_date IS NULL OR due_date = ''`
  );

  await seedIfEmpty(db);
}

/**
 * Adds a column to an existing table when it isn't there yet. `CREATE TABLE IF
 * NOT EXISTS` never alters a table that already exists, so new columns shipped
 * after a database was first created need this lightweight migration.
 */
async function addColumnIfMissing(
  db: SQLiteDatabase,
  table: string,
  column: string,
  definition: string
) {
  const columns = await db.getAllAsync<{ name: string }>(`PRAGMA table_info(${table})`);
  if (columns.some((c) => c.name === column)) return;
  await db.execAsync(`ALTER TABLE ${table} ADD COLUMN ${column} ${definition}`);
}

/**
 * Removes a column from an existing table when it's still there. Mirrors
 * `addColumnIfMissing` for schema fields that were dropped after a database was
 * first created.
 */
async function dropColumnIfExists(db: SQLiteDatabase, table: string, column: string) {
  const columns = await db.getAllAsync<{ name: string }>(`PRAGMA table_info(${table})`);
  if (!columns.some((c) => c.name === column)) return;
  await db.execAsync(`ALTER TABLE ${table} DROP COLUMN ${column}`);
}

const SEED: Record<string, string[]> = {
  Moradia: ['Aluguel', 'Condomínio', 'Água', 'Luz', 'Internet'],
  Alimentação: ['Supermercado', 'Restaurante', 'Delivery'],
  Transporte: ['Combustível', 'Aplicativo', 'Transporte público'],
  Serviços: ['Streaming', 'Telefonia', 'Assinaturas'],
  Outros: ['Diversos'],
};

async function seedIfEmpty(db: SQLiteDatabase) {
  const row = await db.getFirstAsync<{ count: number }>(
    'SELECT COUNT(*) AS count FROM categories'
  );
  if (row && row.count > 0) return;

  for (const [category, subs] of Object.entries(SEED)) {
    const result = await db.runAsync('INSERT INTO categories (name) VALUES (?)', category);
    const categoryId = result.lastInsertRowId;
    for (const sub of subs) {
      await db.runAsync(
        'INSERT INTO subcategories (category_id, name) VALUES (?, ?)',
        categoryId,
        sub
      );
    }
  }
}
