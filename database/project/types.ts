export type ProjectStatus = 1 | 2 | 3;

export interface Project {
  project_id: number;
  project_name: string;
  service_office_id: number;
  customer_id: number;
  project_scope_description: string;
  status: ProjectStatus;
  creation_datetime: string;
  updated_datetime: string;
}

export interface CreateProjectInput {
  project_name: string;
  service_office_id: number;
  customer_id: number;
  project_scope_description: string;
  status?: ProjectStatus;
}

export interface UpdateProjectInput extends Partial<CreateProjectInput> {}
