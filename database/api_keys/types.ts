export interface ApiKey {
  id: string;
  user_id: string;
  name: string;
  key: string;
  type: "dev" | "prod";
  usage: number;
  limit: number;
  created_at: string;
}

export interface CreateApiKeyInput {
  name: string;
  key: string;
  type: "dev" | "prod";
  limit?: number;
}

export interface UpdateApiKeyInput {
  name?: string;
  type?: "dev" | "prod";
  limit?: number;
}
