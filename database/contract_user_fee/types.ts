export interface ContractUserFee {
  contract_id: number;
  user_professional_grade: number;
  user_hourly_rate: number;
  user_hourly_rate_discount: number;
}

export interface CreateContractUserFeeInput {
  contract_id: number;
  user_professional_grade: number | null;
  user_hourly_rate: number | null;
  user_hourly_rate_discount: number | null;
}

export interface UpdateContractUserFeeInput {
  user_hourly_rate: number | null;
  user_hourly_rate_discount: number | null;
}

