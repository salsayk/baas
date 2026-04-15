export interface ContractMilestoneSuccessData {
  contract_id: number;
  milestone_sequential_number: number;
  milestone_criteria: string;
  milestone_due_date: string | null;
  milestone_type: number;
  milestone_amount: number | null;
  milestone_percentage: number | null;
  milestone_percentage_reference_figure: number | null;
  milestone_percentage_reference_figure_description: string | null;
  min_payment_amount: number | null;
  max_payment_amount: number | null;
  progress_status: number | null;
  milestone_condition_met_indicator: number;
  progress_status_date: string | null;
  milestone_met_date: string | null;
  progress_status_user_id: number | null;
  milestone_met_mark_user_id: number | null;
}

export interface CreateContractMilestoneSuccessInput {
  contract_id: number;
  milestone_sequential_number: number | null;
  milestone_criteria: string | null;
  milestone_due_date: string | null;
  milestone_type: number | null;
  milestone_amount: number | null;
  milestone_percentage: number | null;
  milestone_percentage_reference_figure: number | null;
  milestone_percentage_reference_figure_description: string | null;
  min_payment_amount: number | null;
  max_payment_amount: number | null;
  progress_status: number | null;
  milestone_condition_met_indicator: number | null;
  progress_status_date: string | null;
  milestone_met_date: string | null;
  progress_status_user_id: number | null;
  milestone_met_mark_user_id: number | null;
}

export interface UpdateContractMilestoneSuccessInput {
  milestone_criteria?: string | null;
  milestone_due_date?: string | null;
  milestone_type?: number | null;
  milestone_amount?: number | null;
  milestone_percentage?: number | null;
  milestone_percentage_reference_figure?: number | null;
  milestone_percentage_reference_figure_description?: string | null;
  min_payment_amount?: number | null;
  max_payment_amount?: number | null;
  progress_status?: number | null;
  milestone_condition_met_indicator?: number | null;
  progress_status_date?: string | null;
  milestone_met_date?: string | null;
  progress_status_user_id?: number | null;
  milestone_met_mark_user_id?: number | null;
}

