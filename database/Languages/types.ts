export interface Language {
  id: number;
  language_name: string;
  direction: 0 | 1;
}

export interface CreateLanguageInput {
  language_name: string;
  direction: 0 | 1;
}

export interface UpdateLanguageInput {
  language_name?: string;
  direction?: 0 | 1;
}
