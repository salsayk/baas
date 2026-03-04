export interface SystemLookupValue {
  id: number;
  lookup_table_id: number;
  value_id: number;
  value_name: string;
}

export interface CreateSystemLookupValueInput {
  lookup_table_id: number;
  value_id: number;
  value_name: string;
}

export interface UpdateSystemLookupValueInput {
  value_id?: number;
  value_name?: string;
}
