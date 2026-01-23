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

/**
 * Get policies by type
 */
export async function getPoliciesByType(type: string): Promise<Policy[]> {
  const policies = await getPolicies();
  return policies.filter((p) => p.policy_type === type);
}

/**
 * Get policies by status
 */
export async function getPoliciesByStatus(
  status: 'Active' | 'Pending' | 'Expired' | 'Cancelled' | 'Lapsed'
): Promise<Policy[]> {
  return getPolicies({ policy_status: status });
}

/**
 * Get policies expiring this week
 */
export async function getExpiringThisWeek(): Promise<Policy[]> {
  const policies = await getPolicies();
  const now = new Date();
  const startOfWeek = new Date(now);
  startOfWeek.setDate(now.getDate() - now.getDay());
  startOfWeek.setHours(0, 0, 0, 0);
  const endOfWeek = new Date(startOfWeek);
  endOfWeek.setDate(startOfWeek.getDate() + 7);

  return policies.filter((p) => {
    if (!p.renewal_date) return false;
    const renewalDate = new Date(p.renewal_date);
    return renewalDate >= now && renewalDate < endOfWeek;
  });
}

/**
 * Get policies expiring this month
 */
export async function getExpiringThisMonth(): Promise<Policy[]> {
  const policies = await getPolicies();
  const now = new Date();
  const endOfMonth = new Date(now.getFullYear(), now.getMonth() + 1, 0);

  return policies.filter((p) => {
    if (!p.renewal_date) return false;
    const renewalDate = new Date(p.renewal_date);
    return renewalDate >= now && renewalDate <= endOfMonth;
  });
}

/**
 * Get policies by coverage amount range
 */
export async function getPoliciesByCoverage(
  min?: number,
  max?: number
): Promise<Policy[]> {
  const policies = await getPolicies();
  return policies.filter((p) => {
    if (min !== undefined && p.coverage_amount < min) return false;
    if (max !== undefined && p.coverage_amount > max) return false;
    return true;
  });
}

/**
 * Search policies by policy number, type, or status
 */
export async function searchPolicies(query: string): Promise<Policy[]> {
  const policies = await getPolicies();
  const searchTerm = query.toLowerCase();

  return policies.filter((p) =>
    p.policy_number.toLowerCase().includes(searchTerm) ||
    p.policy_type.toLowerCase().includes(searchTerm) ||
    p.policy_status.toLowerCase().includes(searchTerm) ||
    (p.agent_notes && p.agent_notes.toLowerCase().includes(searchTerm)) ||
    (p.tags && p.tags.some((tag) => tag.toLowerCase().includes(searchTerm)))
  );
}

/**
 * Get policy counts grouped by type and status
 */
export async function getPolicyCount(): Promise<{
  total: number;
  byType: Record<string, number>;
  byStatus: Record<string, number>;
}> {
  const policies = await getPolicies();

  const byType: Record<string, number> = {};
  const byStatus: Record<string, number> = {
    Active: 0,
    Pending: 0,
    Expired: 0,
    Cancelled: 0,
    Lapsed: 0,
    Suspended: 0,
  };

  for (const policy of policies) {
    byType[policy.policy_type] = (byType[policy.policy_type] || 0) + 1;
    byStatus[policy.policy_status] = (byStatus[policy.policy_status] || 0) + 1;
  }

  return {
    total: policies.length,
    byType,
    byStatus,
  };
}

/**
 * Get policies that need renewal action (expiring within 30 days and active)
 */
export async function getRenewalReminders(): Promise<Policy[]> {
  const policies = await getPolicies();
  const now = new Date();
  const thirtyDaysFromNow = new Date(now.getTime() + 30 * 24 * 60 * 60 * 1000);

  return policies.filter((p) => {
    if (p.policy_status !== 'Active') return false;
    if (!p.renewal_date) return false;
    const renewalDate = new Date(p.renewal_date);
    return renewalDate >= now && renewalDate <= thirtyDaysFromNow;
  });
}
