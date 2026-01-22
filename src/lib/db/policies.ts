/**
 * Policy Database Operations
 */

import {
  getItem,
  putItem,
  queryByGSI1,
  scanByEntityType,
  generateId,
  getCurrentTimestamp,
} from './dynamodb';
import type {
  Policy,
  PolicySummary,
  PolicyFilters,
  PolicyRecord,
} from '../../types';

const ENTITY_TYPE = 'POLICY';

/**
 * Build DynamoDB record from Policy data
 */
function buildPolicyRecord(policy: Policy): PolicyRecord {
  return {
    pk: `POLICY#${policy.policy_id}`,
    sk: 'DETAIL',
    GSI1PK: `CLIENT#${policy.client_id}`,
    GSI1SK: `POLICY#${policy.policy_id}`,
    entity_type: ENTITY_TYPE,
    data: policy,
  };
}

/**
 * Extract Policy data from DynamoDB record
 */
function extractPolicy(record: PolicyRecord): Policy {
  return record.data;
}

/**
 * Convert Policy to PolicySummary
 */
function toSummary(policy: Policy): PolicySummary {
  return {
    policy_id: policy.policy_id,
    client_id: policy.client_id,
    policy_number: policy.policy_number,
    policy_type: policy.policy_type,
    policy_status: policy.policy_status,
    coverage_amount: policy.coverage_amount,
    premium_amount: policy.premium_amount,
    premium_frequency: policy.premium_frequency,
    renewal_date: policy.renewal_date,
    payment_status: policy.payment_status,
  };
}

/**
 * Get a policy by ID
 */
export async function getPolicyById(policyId: string): Promise<Policy | null> {
  const record = await getItem<PolicyRecord>(`POLICY#${policyId}`, 'DETAIL');
  return record ? extractPolicy(record) : null;
}

/**
 * Get all policies with optional filters
 */
export async function getPolicies(filters?: PolicyFilters): Promise<Policy[]> {
  let policies: Policy[];

  // If filtering by client_id, use GSI1
  if (filters?.client_id) {
    const records = await queryByGSI1<PolicyRecord>(
      `CLIENT#${filters.client_id}`,
      { gsi1skPrefix: 'POLICY#' }
    );
    policies = records.map(extractPolicy);
  } else {
    // Otherwise scan all policies
    const records = await scanByEntityType<PolicyRecord>(ENTITY_TYPE);
    policies = records.map(extractPolicy);
  }

  // Apply additional filters
  if (filters) {
    if (filters.policy_type) {
      policies = policies.filter((p) => p.policy_type === filters.policy_type);
    }
    if (filters.policy_status) {
      policies = policies.filter((p) => p.policy_status === filters.policy_status);
    }
    if (filters.payment_status) {
      policies = policies.filter((p) => p.payment_status === filters.payment_status);
    }
    if (filters.renewal_due) {
      const now = new Date();
      const thirtyDaysFromNow = new Date(now.getTime() + 30 * 24 * 60 * 60 * 1000);
      policies = policies.filter((p) => {
        if (!p.renewal_date) return false;
        const renewalDate = new Date(p.renewal_date);
        return renewalDate >= now && renewalDate <= thirtyDaysFromNow;
      });
    }
  }

  return policies;
}

/**
 * Get policy summaries
 */
export async function getPolicySummaries(
  filters?: PolicyFilters
): Promise<PolicySummary[]> {
  const policies = await getPolicies(filters);
  return policies.map(toSummary);
}

/**
 * Get policies for a specific client
 */
export async function getPoliciesForClient(clientId: string): Promise<Policy[]> {
  return getPolicies({ client_id: clientId });
}

/**
 * Get policy summaries for a specific client
 */
export async function getPolicySummariesForClient(
  clientId: string
): Promise<PolicySummary[]> {
  const policies = await getPoliciesForClient(clientId);
  return policies.map(toSummary);
}

/**
 * Create a new policy
 */
export async function createPolicy(
  policyData: Omit<Policy, 'policy_id' | 'created_at' | 'updated_at'>
): Promise<Policy> {
  const now = getCurrentTimestamp();
  const policy: Policy = {
    ...policyData,
    policy_id: generateId('POL'),
    created_at: now,
    updated_at: now,
  };

  const record = buildPolicyRecord(policy);
  await putItem(record);
  return policy;
}

/**
 * Update a policy
 */
export async function updatePolicy(
  policyId: string,
  updates: Partial<Policy>
): Promise<Policy | null> {
  const existing = await getPolicyById(policyId);
  if (!existing) {
    return null;
  }

  const updatedPolicy: Policy = {
    ...existing,
    ...updates,
    policy_id: policyId, // Ensure ID doesn't change
    updated_at: getCurrentTimestamp(),
  };

  const record = buildPolicyRecord(updatedPolicy);
  await putItem(record);
  return updatedPolicy;
}

/**
 * Get policies expiring soon (within 30 days)
 */
export async function getExpiringPolicies(): Promise<Policy[]> {
  return getPolicies({ renewal_due: true });
}

/**
 * Get policies with overdue payments
 */
export async function getOverduePolicies(): Promise<Policy[]> {
  return getPolicies({ payment_status: 'Overdue' });
}

/**
 * Get active policies count for a client
 */
export async function getActivePolicyCount(clientId: string): Promise<number> {
  const policies = await getPolicies({
    client_id: clientId,
    policy_status: 'Active',
  });
  return policies.length;
}

/**
 * Calculate total coverage for a client
 */
export async function getTotalCoverageForClient(clientId: string): Promise<number> {
  const policies = await getPolicies({
    client_id: clientId,
    policy_status: 'Active',
  });
  return policies.reduce((total, p) => total + p.coverage_amount, 0);
}
