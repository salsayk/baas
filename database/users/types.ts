export interface User {
  id: string;
  email: string;
  name: string | null;
  image: string | null;
  provider: string;
  provider_account_id: string;
  created_at: string;
  updated_at: string;
  last_login_at: string;
}

export interface CreateUserInput {
  email: string;
  name?: string | null;
  image?: string | null;
  provider: string;
  provider_account_id: string;
}
