export interface UiScreen {
  screen_id: number;
  screen_name: string;
  screen_description: string | null;
}

export interface CreateUiScreenInput {
  screen_name: string;
  screen_description?: string | null;
}

export interface UpdateUiScreenInput {
  screen_name?: string;
  screen_description?: string | null;
}
