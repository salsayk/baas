export interface SystemLookup {
  lookup_table_id: number;
  lookup_table_name: string;
  lookup_table_description: string | null;
}

export interface CreateSystemLookupInput {
  lookup_table_name: string;
  lookup_table_description?: string | null;
}

export interface UpdateSystemLookupInput {
  lookup_table_name?: string;
  lookup_table_description?: string | null;
}
