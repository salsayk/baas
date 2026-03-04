export type AccountStatus = 1 | 2 | 3; // 1=Active, 2=Inactive, 3=Deleted

export interface Account {
  account_id: number;
  user_id: string;
  account_name: string;
  mobile_phone: string | null;
  secondary_phone: string | null;
  email_address: string | null;
  card_holder_name: string | null;
  card_number: string | null;
  card_expiry_month: number | null;
  card_expiry_year: number | null;
  card_last_four: string | null;
  card_cvv: string | null;
  status: AccountStatus;
  created_at: string;
  updated_at: string;
}

export interface CreateAccountInput {
  account_name: string;
  user_id?: string;
  mobile_phone?: string | null;
  secondary_phone?: string | null;
  email_address?: string | null;
  card_holder_name?: string | null;
  card_number?: string | null;
  card_expiry_month?: number | null;
  card_expiry_year?: number | null;
  card_last_four?: string | null;
  card_cvv?: string | null;
  status?: AccountStatus;
}

export interface UpdateAccountInput extends Partial<CreateAccountInput> {}
