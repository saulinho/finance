import type { SQLiteDatabase } from 'expo-sqlite';

import type { Category, Subcategory } from './types';

export function listCategories(db: SQLiteDatabase) {
  return db.getAllAsync<Category>('SELECT * FROM categories ORDER BY name COLLATE NOCASE');
}

export async function createCategory(db: SQLiteDatabase, name: string) {
  const result = await db.runAsync('INSERT INTO categories (name) VALUES (?)', name.trim());
  return result.lastInsertRowId;
}

export function updateCategory(db: SQLiteDatabase, id: number, name: string) {
  return db.runAsync('UPDATE categories SET name = ? WHERE id = ?', name.trim(), id);
}

export function deleteCategory(db: SQLiteDatabase, id: number) {
  // ON DELETE CASCADE removes subcategories; payables keep the row with NULL category.
  return db.runAsync('DELETE FROM categories WHERE id = ?', id);
}

export function listSubcategories(db: SQLiteDatabase, categoryId: number) {
  return db.getAllAsync<Subcategory>(
    'SELECT * FROM subcategories WHERE category_id = ? ORDER BY name COLLATE NOCASE',
    categoryId
  );
}

export async function createSubcategory(db: SQLiteDatabase, categoryId: number, name: string) {
  const result = await db.runAsync(
    'INSERT INTO subcategories (category_id, name) VALUES (?, ?)',
    categoryId,
    name.trim()
  );
  return result.lastInsertRowId;
}

export function updateSubcategory(db: SQLiteDatabase, id: number, name: string) {
  return db.runAsync('UPDATE subcategories SET name = ? WHERE id = ?', name.trim(), id);
}

export function deleteSubcategory(db: SQLiteDatabase, id: number) {
  return db.runAsync('DELETE FROM subcategories WHERE id = ?', id);
}
