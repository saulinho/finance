import type { SQLiteDatabase } from 'expo-sqlite';

export type ComparisonSub = {
  id: number | null;
  name: string;
  budget: number; // previsto, em centavos
  spent: number; // gasto, em centavos
};

export type ComparisonCategory = ComparisonSub & {
  subcategories: ComparisonSub[];
};

export type MonthComparison = {
  categories: ComparisonCategory[];
  totalBudget: number;
  totalSpent: number;
};

type Row = {
  category_id: number | null;
  category_name: string | null;
  subcategory_id: number | null;
  subcategory_name: string | null;
  total: number;
};

const BUDGET_SQL = `
  SELECT b.category_id, c.name AS category_name,
         b.subcategory_id, s.name AS subcategory_name,
         SUM(b.amount_cents) AS total
  FROM budgets b
  LEFT JOIN categories c ON c.id = b.category_id
  LEFT JOIN subcategories s ON s.id = b.subcategory_id
  WHERE b.month = ?
  GROUP BY b.category_id, b.subcategory_id
`;

const SPENT_SQL = `
  SELECT p.category_id, c.name AS category_name,
         p.subcategory_id, s.name AS subcategory_name,
         SUM(p.amount_cents) AS total
  FROM payables p
  LEFT JOIN categories c ON c.id = p.category_id
  LEFT JOIN subcategories s ON s.id = p.subcategory_id
  WHERE substr(p.due_date, 1, 7) = ?
  GROUP BY p.category_id, p.subcategory_id
`;

export type CategorySpend = {
  id: number | null;
  name: string;
  total: number; // em centavos
};

const PAID_BY_CATEGORY_SQL = `
  SELECT p.category_id AS id, c.name AS name, SUM(p.amount_cents) AS total
  FROM payables p
  LEFT JOIN categories c ON c.id = p.category_id
  WHERE p.paid = 1 AND substr(p.due_date, 1, 7) = ?
  GROUP BY p.category_id
  ORDER BY total DESC
`;

/**
 * Sums the month's paid payables (contas baixadas) per category, ordered from
 * the highest spend to the lowest. Feeds the Comparativo bar chart.
 */
export async function getPaidByCategory(
  db: SQLiteDatabase,
  month: string
): Promise<CategorySpend[]> {
  const rows = await db.getAllAsync<CategorySpend>(PAID_BY_CATEGORY_SQL, month);
  return rows.map((r) => ({ ...r, name: r.name ?? 'Sem categoria' }));
}

/**
 * Builds a per-category / per-subcategory comparison of the month's budget
 * (previsto) against the payables due that month (gasto).
 */
export async function getMonthComparison(
  db: SQLiteDatabase,
  month: string
): Promise<MonthComparison> {
  const [budgetRows, spentRows] = await Promise.all([
    db.getAllAsync<Row>(BUDGET_SQL, month),
    db.getAllAsync<Row>(SPENT_SQL, month),
  ]);

  type Acc = ComparisonSub & { subMap: Map<string, ComparisonSub> };
  const cats = new Map<string, Acc>();
  const key = (id: number | null) => (id === null ? 'none' : String(id));

  const ensureCat = (id: number | null, name: string | null): Acc => {
    const k = key(id);
    let cat = cats.get(k);
    if (!cat) {
      cat = { id, name: name ?? 'Sem categoria', budget: 0, spent: 0, subMap: new Map() };
      cats.set(k, cat);
    }
    return cat;
  };

  const ensureSub = (cat: Acc, id: number | null, name: string | null): ComparisonSub => {
    const k = key(id);
    let sub = cat.subMap.get(k);
    if (!sub) {
      sub = { id, name: name ?? 'Sem subcategoria', budget: 0, spent: 0 };
      cat.subMap.set(k, sub);
    }
    return sub;
  };

  for (const r of budgetRows) {
    const cat = ensureCat(r.category_id, r.category_name);
    cat.budget += r.total;
    ensureSub(cat, r.subcategory_id, r.subcategory_name).budget += r.total;
  }
  for (const r of spentRows) {
    const cat = ensureCat(r.category_id, r.category_name);
    cat.spent += r.total;
    ensureSub(cat, r.subcategory_id, r.subcategory_name).spent += r.total;
  }

  const byName = (a: { name: string }, b: { name: string }) =>
    a.name.localeCompare(b.name, 'pt-BR');

  const categories: ComparisonCategory[] = [...cats.values()]
    .map(({ subMap, ...cat }) => ({
      ...cat,
      subcategories: [...subMap.values()].sort(byName),
    }))
    .sort(byName);

  const totalBudget = categories.reduce((sum, c) => sum + c.budget, 0);
  const totalSpent = categories.reduce((sum, c) => sum + c.spent, 0);

  return { categories, totalBudget, totalSpent };
}
