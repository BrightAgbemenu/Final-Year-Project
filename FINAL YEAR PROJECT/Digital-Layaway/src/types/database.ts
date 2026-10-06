export type Profile = {
  id: string;
  full_name: string | null;
  phone: string | null;
  business_name: string | null;
  created_at: string;
};

export type LayawayProfile = {
  id: string;
  artisan_id: string;
  client_name: string;
  client_phone: string | null;
  item_description: string;
  total_cost: number;
  created_at: string;
  updated_at: string;
};

export type Installment = {
  id: string;
  profile_id: string;
  amount: number;
  payment_date: string;
  receipt_no: string | null;
  note: string | null;
  voided_at: string | null;
  void_reason: string | null;
};

export type LayawayWithTotals = LayawayProfile & {
  total_paid: number;
  balance: number;
  installment_count: number;
  payments: { amount: number; payment_date: string }[];
};

export type LogPaymentResult = {
  new_balance: number;
  installment_id: string;
  receipt_no: string;
  total_paid: number;
  total_cost: number;
};
