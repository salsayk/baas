export type ContractStatus = 1 | 2 | 3;

export interface Contract {
  contract_id: number;
  contract_name: string;
  contract_description: string | null;
  service_office_id: number;
  customer_id: number;
  contract_type: number;
  status: ContractStatus;
  creation_datetime: string;
  updated_datetime: string;
  contract_start_date: string;
  contract_optional_end_date: string | null;
  contract_amount_value: number | null;
  contract_currency: string;
  pp_proforma_recurrence: number;
  pp_proforma_occasion: string;
  pp_initial_payment_reached_indicator: number;
  pp_initial_amount_value: number;
  pp_upper_cap_reached_indicator: number;
  pp_upper_cap_amount_value: number;
  pp_recurrence_initial_payment_reached_indicator: number;
  pp_recurrence_initial_amount_value: number;
  pp_recurrence_upper_cap_reached_indicator: number;
  pp_recurrence_upper_cap_amount_value: number;
}

export interface CreateContractInput {
  contract_name: string;
  contract_description?: string | null;
  service_office_id: number;
  customer_id: number;
  contract_type: number;
  status?: ContractStatus;
  contract_start_date: string;
  contract_optional_end_date?: string | null;
  contract_amount_value: number | null;
  contract_currency: string;
  pp_proforma_recurrence: number;
  pp_proforma_occasion: string;
  pp_initial_payment_reached_indicator: number;
  pp_initial_amount_value: number;
  pp_upper_cap_reached_indicator: number;
  pp_upper_cap_amount_value: number;
  pp_recurrence_initial_payment_reached_indicator: number;
  pp_recurrence_initial_amount_value: number;
  pp_recurrence_upper_cap_reached_indicator: number;
  pp_recurrence_upper_cap_amount_value: number;
}

export interface UpdateContractInput extends Partial<CreateContractInput> {}
