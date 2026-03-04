export type CustomerStatus = 1 | 2 | 3;

export interface Customer {
  customer_id: number;
  customer_name: string;
  service_office_id: number;
  legal_id: string | null;
  mobile_phone: string | null;
  secondary_phone: string | null;
  email_address: string;
  address_country: string | null;
  address_city: string | null;
  address_street: string | null;
  address_street_number: number | null;
  address_zip_code: string | null;
  status: CustomerStatus;
  creation_datetime: string;
  updated_datetime: string;
}

export interface CreateCustomerInput {
  customer_name: string;
  service_office_id: number;
  legal_id?: string | null;
  mobile_phone?: string | null;
  secondary_phone?: string | null;
  email_address: string;
  address_country?: string | null;
  address_city?: string | null;
  address_street?: string | null;
  address_street_number?: number | null;
  address_zip_code?: string | null;
  status?: CustomerStatus;
}

export interface UpdateCustomerInput extends Partial<CreateCustomerInput> {}
