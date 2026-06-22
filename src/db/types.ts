export type Category = {
  id: number;
  name: string;
};

export type Subcategory = {
  id: number;
  category_id: number;
  name: string;
};

export type PayableSource = 'manual' | 'notification';

export type Payable = {
  id: number;
  supplier: string;
  amount_cents: number;
  due_date: string; // ISO 'YYYY-MM-DD'
  category_id: number | null;
  subcategory_id: number | null;
  source: PayableSource;
  paid: number; // 0 | 1
  created_at: string; // ISO datetime
};

/** A payable joined with the display names of its category/subcategory. */
export type PayableWithNames = Payable & {
  category_name: string | null;
  subcategory_name: string | null;
};

export type PayableInput = {
  supplier: string;
  amount_cents: number;
  due_date: string;
  category_id: number | null;
  subcategory_id: number | null;
  source?: PayableSource;
  paid?: boolean;
};
