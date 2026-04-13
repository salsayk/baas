export type ServiceOfficeStatus = 1 | 2 | 3; // 1=Active, 2=Inactive, 3=Deleted

export interface ServiceOffice {
  service_office_id: number;
  service_office_name: string;
  service_office_description: string | null;
  account_id: number;
  country: string | null;
  status: ServiceOfficeStatus;
  /** Active subscription offer currently assigned to this service office (if any). */
  current_subscription_offer_id?: number | null;
  current_subscription_offer_name?: string | null;
  created_at: string;
  updated_at: string;
}

export interface CreateServiceOfficeInput {
  service_office_name: string;
  service_office_description?: string | null;
  account_id: number;
  /** Required when creating a new service office; used to create the initial subscriptions row. */
  subscription_offer_id?: number;
  country?: string | null;
  status?: ServiceOfficeStatus;
}

export interface UpdateServiceOfficeInput {
  service_office_name?: string;
  service_office_description?: string | null;
  account_id?: number;
  subscription_offer_id?: number;
  country?: string | null;
  status?: ServiceOfficeStatus;
}
