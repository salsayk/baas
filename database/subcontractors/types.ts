export type SubcontractorStatus = 1 | 2 | 3;

export interface Subcontractor {
  subcontractor_id: number;
  subcontractor_name: string;
  service_office_id: number;
  status: SubcontractorStatus;
  contact_person_name: string | null;
  contact_person_phone: string | null;
  contact_person_email: string | null;
  contact_person_address: string | null;
  creation_datetime: string;
  updated_datetime: string;
}

export interface CreateSubcontractorInput {
  subcontractor_name: string;
  service_office_id: number;
  status?: SubcontractorStatus;
  contact_person_name?: string | null;
  contact_person_phone?: string | null;
  contact_person_email?: string | null;
  contact_person_address?: string | null;
}

export interface UpdateSubcontractorInput extends Partial<CreateSubcontractorInput> {}
