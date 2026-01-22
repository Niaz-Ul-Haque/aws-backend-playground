/**
 * Client Types - Based on Client_Data_Fields.txt
 * These types represent the client data structure stored in DynamoDB
 */

// Client type enum
export type ClientType = 'Individual' | 'Corporate' | 'Trust' | 'Other';

// Client status enum
export type ClientStatus = 'Active' | 'Inactive' | 'Prospect' | 'Dormant';

// Risk profile for investment preferences
export type RiskProfile = 'conservative' | 'moderate' | 'aggressive';

// KYC status
export type KYCStatus = 'Pending' | 'Completed' | 'Failed';

// Contact method preferences
export type ContactMethod = 'Email' | 'Phone' | 'Text';

// Contact time preferences
export type ContactTime = 'Morning' | 'Afternoon' | 'Evening';

// Language preferences
export type LanguagePreference = 'English' | 'French' | 'Spanish' | 'Other';

// Client segment classification
export type ClientSegment = 'Retail' | 'Mass Affluent' | 'High Net Worth';

// Address type
export type AddressType = 'Home' | 'Work' | 'Mailing';

// Gender options
export type Gender = 'Male' | 'Female' | 'Non-Binary' | 'Other';

// Marital status
export type MaritalStatus = 'Single' | 'Married' | 'Divorced' | 'Widowed' | 'Common-law';

/**
 * Full Client record as stored in DynamoDB
 */
export interface Client {
  // Identification
  client_id: string;
  client_type?: ClientType;
  client_status?: ClientStatus;
  external_client_reference?: string;

  // Profile
  first_name: string;
  middle_name?: string;
  last_name: string;
  preferred_name?: string;
  date_of_birth?: string; // ISO date string
  gender?: Gender;
  sin_last4?: string;
  marital_status?: MaritalStatus;
  occupation?: string;
  employer_name?: string;

  // Contact Information
  primary_email?: string;
  secondary_email?: string;
  primary_phone?: string;
  secondary_phone?: string;
  preferred_contact_method?: ContactMethod;
  preferred_contact_time?: ContactTime;
  language_preference?: LanguagePreference;

  // Address Information
  address_line_1?: string;
  address_line_2?: string;
  city?: string;
  state_province?: string;
  postal_code?: string;
  country?: string;
  address_type?: AddressType;
  is_primary_address?: boolean;

  // Relationship Metadata
  account_manager_id?: string;
  client_segment?: ClientSegment;
  onboarding_date?: string;
  offboarding_date?: string;
  referral_source?: string;
  relationship_start_date?: string;
  relationship_end_date?: string;

  // Compliance & Consent
  kyc_status?: KYCStatus;
  kyc_completed_date?: string;
  consent_marketing?: boolean;
  consent_data_processing?: boolean;
  consent_timestamp?: string;
  privacy_policy_version_accepted?: string;

  // Notes & Unstructured Data
  internal_notes?: string;
  client_tags?: string[];
  last_interaction_summary?: string;

  // Audit & System Fields
  created_at: string;
  created_by?: string;
  updated_at: string;
  updated_by?: string;
  deleted_at?: string;
  record_version?: number;

  // Financial Summary (computed/aggregated)
  portfolio_value?: number;
  risk_profile?: RiskProfile;
  next_meeting?: string;
  last_contact?: string;
}

/**
 * Client summary for list views
 */
export interface ClientSummary {
  client_id: string;
  first_name: string;
  last_name: string;
  primary_email?: string;
  client_status?: ClientStatus;
  client_segment?: ClientSegment;
  portfolio_value?: number;
  risk_profile?: RiskProfile;
  next_meeting?: string;
  account_manager_id?: string;
}

/**
 * Client search/filter parameters
 */
export interface ClientFilters {
  name?: string;
  client_status?: ClientStatus;
  client_segment?: ClientSegment;
  client_type?: ClientType;
  risk_profile?: RiskProfile;
  account_manager_id?: string;
}

/**
 * DynamoDB record for Client
 */
export interface ClientRecord {
  pk: string; // CLIENT#<client_id>
  sk: string; // PROFILE
  GSI1PK: string; // TYPE#CLIENT
  GSI1SK: string; // STATUS#<status>#<client_id>
  entity_type: 'CLIENT';
  data: Client;
}
