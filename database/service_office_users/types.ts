export type ServiceOfficeUserStatus = 1 | 2 | 3;

export interface ServiceOfficeUser {
  service_office_user_id: number;
  user_name: string;
  user_type: number;
  user_professional_grade: number;
  service_office_id: number;
  subcontractor_id: number | null;
  mobile_phone: string;
  secondary_phone: string | null;
  email_address: string;
  status: ServiceOfficeUserStatus;
  password: string | null;
  last_password_change: string | null;
  creation_datetime: string;
  updated_datetime: string;
}

/** Form state allows null for user_professional_grade (unselected); API requires number (value_id can be 0). */
export type ServiceOfficeUserFormState = Omit<CreateServiceOfficeUserInput, "user_professional_grade"> & {
  user_professional_grade: number | null;
  status: number;
};

export interface CreateServiceOfficeUserInput {
  user_name: string;
  user_type: number;
  user_professional_grade: number;
  service_office_id: number;
  subcontractor_id?: number | null;
  mobile_phone: string;
  secondary_phone?: string | null;
  email_address: string;
  status?: ServiceOfficeUserStatus;
}

export interface UpdateServiceOfficeUserInput extends Partial<CreateServiceOfficeUserInput> {}
