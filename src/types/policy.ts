/**
 * Policy Types - Based on Policy_Data_Fields.txt
 * These types represent the policy data structure stored in DynamoDB
 */

// Policy type classifications
export type PolicyType =
  | 'Life Insurance'
  | 'Health Insurance'
  | 'Auto Insurance'
  | 'Home Insurance'
  | 'Investment'
  | 'Retirement'
  | 'Disability'
  | 'Critical Illness'
  | 'Other';

// Policy category
export type PolicyCategory = 'Individual' | 'Group' | 'Corporate';

// Policy status
export type PolicyStatus =
  | 'Active'
  | 'Pending'
  | 'Expired'
  | 'Cancelled'
  | 'Lapsed'
  | 'Suspended';

// Payment status
export type PaymentStatus = 'Current' | 'Overdue' | 'Paid' | 'Pending';

// Premium frequency
export type PremiumFrequency = 'Monthly' | 'Quarterly' | 'Semi-Annual' | 'Annual';

// Payment method
export type PaymentMethod = 'Credit Card' | 'Bank Transfer' | 'Cheque' | 'PAD';

// Cancellation reasons
export type CancellationReason =
  | 'Non-Payment'
  | 'Customer Request'
  | 'Policy Replaced'
  | 'Fraud'
  | 'Other';

/**
 * Beneficiary information
 */
export interface Beneficiary {
  name: string;
  relationship: string;
  percentage: number;
  contingent?: boolean;
}

/**
 * Policy document reference
 */
export interface PolicyDocument {
  document_id: string;
  document_type: string;
  file_name: string;
  upload_date: string;
  url?: string;
}

/**
 * Claim summary
 */
export interface ClaimSummary {
  claim_id: string;
  claim_date: string;
  claim_amount: number;
  status: 'Open' | 'Closed' | 'Pending' | 'Denied';
  description?: string;
}

/**
 * Full Policy record as stored in DynamoDB
 */
export interface Policy {
  // Core Policy Identification
  policy_id: string;
  client_id: string;
  policy_number: string;
  policy_type: PolicyType;
  policy_category?: PolicyCategory;
  policy_status: PolicyStatus;
  policy_version?: number;
  parent_policy_id?: string;

  // Coverage Details
  coverage_start_date: string;
  coverage_end_date?: string;
  coverage_amount: number;
  coverage_description?: string;
  coverage_limits?: Record<string, number>;
  exclusions?: string[];

  // Premium & Payment Information
  premium_amount: number;
  premium_frequency: PremiumFrequency;
  billing_cycle?: string;
  payment_method?: PaymentMethod;
  last_payment_date?: string;
  next_payment_due_date?: string;
  payment_status?: PaymentStatus;
  auto_pay_enabled?: boolean;

  // Policy Lifecycle Events
  issue_date: string;
  effective_date: string;
  renewal_date?: string;
  cancellation_date?: string;
  cancellation_reason?: CancellationReason;
  lapse_date?: string;
  reinstatement_date?: string;

  // Claims
  claims_count?: number;
  open_claims_count?: number;
  total_claims_amount?: number;
  last_claim_date?: string;
  claims_history?: ClaimSummary[];

  // Beneficiaries
  beneficiaries?: Beneficiary[];

  // Documents & Attachments
  policy_documents?: PolicyDocument[];
  endorsements?: string[];
  correspondences?: string[];

  // Notes & Freeform Data
  agent_notes?: string;
  internal_notes?: string;
  customer_visible_notes?: string;
  tags?: string[];

  // Audit & System Fields
  created_at: string;
  created_by?: string;
  updated_at: string;
  updated_by?: string;
  deleted_at?: string;
  record_version?: number;
}

/**
 * Policy summary for list views
 */
export interface PolicySummary {
  policy_id: string;
  client_id: string;
  policy_number: string;
  policy_type: PolicyType;
  policy_status: PolicyStatus;
  coverage_amount: number;
  premium_amount: number;
  premium_frequency: PremiumFrequency;
  renewal_date?: string;
  payment_status?: PaymentStatus;
}

/**
 * Policy search/filter parameters
 */
export interface PolicyFilters {
  client_id?: string;
  policy_type?: PolicyType;
  policy_status?: PolicyStatus;
  payment_status?: PaymentStatus;
  renewal_due?: boolean; // Renewal within 30 days
}

/**
 * DynamoDB record for Policy
 */
export interface PolicyRecord {
  pk: string; // POLICY#<policy_id>
  sk: string; // DETAIL
  GSI1PK: string; // CLIENT#<client_id>
  GSI1SK: string; // POLICY#<policy_id>
  entity_type: 'POLICY';
  data: Policy;
}
