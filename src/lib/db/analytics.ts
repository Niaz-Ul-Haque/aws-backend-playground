/**
 * Analytics and Dashboard Metrics
 * Aggregated data for dashboard views and summaries
 */

import { getTasks, getTaskCount, getTodaysTasks, getOverdueTasks, getPendingReviewTasks } from './tasks';
import { getClients, getClientCount } from './clients';
import { getPolicies, getPolicyCount, getExpiringPolicies } from './policies';

/**
 * Task metrics interface
 */
export interface TaskMetrics {
  total: number;
  pending: number;
  inProgress: number;
  completed: number;
  needsReview: number;
  overdue: number;
  dueToday: number;
}

/**
 * Client metrics interface
 */
export interface ClientMetrics {
  total: number;
  active: number;
  prospects: number;
  bySegment: {
    highNetWorth: number;
    massAffluent: number;
    retail: number;
  };
}

/**
 * Policy metrics interface
 */
export interface PolicyMetrics {
  total: number;
  active: number;
  expiringSoon: number;
  byType: Record<string, number>;
}

/**
 * Portfolio metrics interface
 */
export interface PortfolioMetrics {
  totalAUM: number;
  averageClientValue: number;
}

/**
 * Dashboard metrics - combined view
 */
export interface DashboardMetrics {
  tasks: TaskMetrics;
  clients: ClientMetrics;
  policies: PolicyMetrics;
  portfolio: PortfolioMetrics;
}

/**
 * Today's summary
 */
export interface TodaySummary {
  tasksToday: number;
  overdueCount: number;
  pendingReviews: number;
  expiringPolicies: number;
}

/**
 * Weekly summary
 */
export interface WeeklySummary {
  tasksThisWeek: number;
  completedThisWeek: number;
  newClients: number;
  renewalsDue: number;
}

/**
 * Get task-specific metrics
 */
export async function getTaskMetrics(): Promise<TaskMetrics> {
  const [counts, todaysTasks, overdueTasks, pendingReviews] = await Promise.all([
    getTaskCount(),
    getTodaysTasks(),
    getOverdueTasks(),
    getPendingReviewTasks(),
  ]);

  return {
    total: counts.total,
    pending: counts.byStatus['pending'] || 0,
    inProgress: counts.byStatus['in-progress'] || 0,
    completed: counts.byStatus['completed'] || 0,
    needsReview: counts.byStatus['needs-review'] || 0,
    overdue: overdueTasks.length,
    dueToday: todaysTasks.length,
  };
}

/**
 * Get client-specific metrics
 */
export async function getClientMetrics(): Promise<ClientMetrics> {
  const counts = await getClientCount();

  return {
    total: counts.total,
    active: counts.byStatus['Active'] || 0,
    prospects: counts.byStatus['Prospect'] || 0,
    bySegment: {
      highNetWorth: counts.bySegment['High Net Worth'] || 0,
      massAffluent: counts.bySegment['Mass Affluent'] || 0,
      retail: counts.bySegment['Retail'] || 0,
    },
  };
}

/**
 * Get policy-specific metrics
 */
export async function getPolicyMetrics(): Promise<PolicyMetrics> {
  const [counts, expiringPolicies] = await Promise.all([
    getPolicyCount(),
    getExpiringPolicies(),
  ]);

  return {
    total: counts.total,
    active: counts.byStatus['Active'] || 0,
    expiringSoon: expiringPolicies.length,
    byType: counts.byType,
  };
}

/**
 * Get portfolio metrics (AUM calculations)
 */
export async function getPortfolioMetrics(): Promise<PortfolioMetrics> {
  const clients = await getClients();

  const totalAUM = clients.reduce((sum, c) => sum + (c.portfolio_value || 0), 0);
  const clientsWithPortfolio = clients.filter((c) => c.portfolio_value && c.portfolio_value > 0);
  const averageClientValue = clientsWithPortfolio.length > 0
    ? totalAUM / clientsWithPortfolio.length
    : 0;

  return {
    totalAUM,
    averageClientValue,
  };
}

/**
 * Get complete dashboard metrics
 */
export async function getDashboardMetrics(): Promise<DashboardMetrics> {
  const [tasks, clients, policies, portfolio] = await Promise.all([
    getTaskMetrics(),
    getClientMetrics(),
    getPolicyMetrics(),
    getPortfolioMetrics(),
  ]);

  return {
    tasks,
    clients,
    policies,
    portfolio,
  };
}

/**
 * Get today's summary
 */
export async function getTodaySummary(): Promise<TodaySummary> {
  const [todaysTasks, overdueTasks, pendingReviews, expiringPolicies] = await Promise.all([
    getTodaysTasks(),
    getOverdueTasks(),
    getPendingReviewTasks(),
    getExpiringPolicies(),
  ]);

  return {
    tasksToday: todaysTasks.length,
    overdueCount: overdueTasks.length,
    pendingReviews: pendingReviews.length,
    expiringPolicies: expiringPolicies.length,
  };
}

/**
 * Get weekly summary
 */
export async function getWeeklySummary(): Promise<WeeklySummary> {
  const [tasks, clients, expiringPolicies] = await Promise.all([
    getTasks({ due_date: 'week' }),
    getClients(),
    getExpiringPolicies(),
  ]);

  // Calculate tasks completed this week
  const now = new Date();
  const startOfWeek = new Date(now);
  startOfWeek.setDate(now.getDate() - now.getDay());
  startOfWeek.setHours(0, 0, 0, 0);

  const allTasks = await getTasks();
  const completedThisWeek = allTasks.filter((t) => {
    if (t.status !== 'completed' || !t.completed_at) return false;
    const completedDate = new Date(t.completed_at);
    return completedDate >= startOfWeek;
  });

  // Calculate new clients this week
  const newClients = clients.filter((c) => {
    const createdDate = new Date(c.created_at);
    return createdDate >= startOfWeek;
  });

  return {
    tasksThisWeek: tasks.length,
    completedThisWeek: completedThisWeek.length,
    newClients: newClients.length,
    renewalsDue: expiringPolicies.length,
  };
}

/**
 * Premium analytics interfaces
 */
export interface TimeRange {
  start: Date;
  end: Date;
}

export interface PremiumBreakdown {
  policyType: string;
  totalPremium: number;
  policyCount: number;
  averagePremium: number;
}

export interface MonthlyTrend {
  month: string;
  newPolicies: number;
  totalPremium: number;
  newClients: number;
}

export interface QuarterlyMetrics {
  quarter: string;
  totalPremium: number;
  newPolicies: number;
  newClients: number;
  activeClients: number;
  retentionRate: number;
  averagePremium: number;
}

/**
 * Get total premiums collected in a time range
 */
export async function getTotalPremiums(timeRange?: TimeRange): Promise<number> {
  const policies = await getPolicies();
  
  let filteredPolicies = policies.filter((p) => p.policy_status === 'Active');
  
  // If time range provided, filter by policy creation date or payment date
  if (timeRange) {
    filteredPolicies = filteredPolicies.filter((p) => {
      const policyDate = new Date(p.created_at);
      return policyDate >= timeRange.start && policyDate <= timeRange.end;
    });
  }
  
  const totalPremium = filteredPolicies.reduce((sum, p) => {
    return sum + (p.premium_amount || 0);
  }, 0);
  
  return totalPremium;
}

/**
 * Break down premium revenue by policy type for a given year
 */
export async function getPremiumBreakdownByType(year?: number): Promise<PremiumBreakdown[]> {
  const policies = await getPolicies();
  
  // Filter by year if provided
  let filteredPolicies = policies;
  if (year) {
    filteredPolicies = policies.filter((p) => {
      const policyYear = new Date(p.created_at).getFullYear();
      return policyYear === year;
    });
  }
  
  // Group by policy type
  const breakdownMap = new Map<string, { total: number; count: number }>();
  
  filteredPolicies.forEach((p) => {
    if (p.policy_status !== 'Active') return;
    
    const type = p.policy_type || 'Other';
    const premium = p.premium_amount || 0;
    
    if (!breakdownMap.has(type)) {
      breakdownMap.set(type, { total: 0, count: 0 });
    }
    
    const current = breakdownMap.get(type)!;
    current.total += premium;
    current.count += 1;
  });
  
  // Convert to array
  const breakdown: PremiumBreakdown[] = [];
  breakdownMap.forEach((value, key) => {
    breakdown.push({
      policyType: key,
      totalPremium: value.total,
      policyCount: value.count,
      averagePremium: value.count > 0 ? value.total / value.count : 0,
    });
  });
  
  // Sort by total premium descending
  breakdown.sort((a, b) => b.totalPremium - a.totalPremium);
  
  return breakdown;
}

/**
 * Get distribution of clients across different insurance types
 */
export async function getClientDistributionByType(): Promise<Record<string, number>> {
  const policies = await getPolicies();
  const activeClientIds = new Set<string>();
  
  // Count unique clients per policy type
  const distribution: Record<string, Set<string>> = {};
  
  policies.forEach((p) => {
    if (p.policy_status !== 'Active') return;
    
    const type = p.policy_type || 'Other';
    if (!distribution[type]) {
      distribution[type] = new Set();
    }
    distribution[type].add(p.client_id);
    activeClientIds.add(p.client_id);
  });
  
  // Convert to counts
  const result: Record<string, number> = {};
  Object.keys(distribution).forEach((type) => {
    result[type] = distribution[type].size;
  });
  
  return result;
}

/**
 * Display monthly sales trends for the past N months
 */
export async function getMonthlySalesTrends(months: number = 6): Promise<MonthlyTrend[]> {
  const [policies, clients] = await Promise.all([getPolicies(), getClients()]);
  
  const now = new Date();
  const trends: MonthlyTrend[] = [];
  
  // Generate data for each of the past N months
  for (let i = months - 1; i >= 0; i--) {
    const monthDate = new Date(now.getFullYear(), now.getMonth() - i, 1);
    const monthStart = new Date(monthDate.getFullYear(), monthDate.getMonth(), 1);
    const monthEnd = new Date(monthDate.getFullYear(), monthDate.getMonth() + 1, 0, 23, 59, 59);
    
    // Filter policies created in this month
    const monthPolicies = policies.filter((p) => {
      const createdDate = new Date(p.created_at);
      return createdDate >= monthStart && createdDate <= monthEnd;
    });
    
    // Filter clients created in this month
    const monthClients = clients.filter((c) => {
      const createdDate = new Date(c.created_at);
      return createdDate >= monthStart && createdDate <= monthEnd;
    });
    
    const totalPremium = monthPolicies.reduce((sum, p) => sum + (p.premium_amount || 0), 0);
    
    trends.push({
      month: monthDate.toLocaleDateString('en-US', { year: 'numeric', month: 'short' }),
      newPolicies: monthPolicies.length,
      totalPremium,
      newClients: monthClients.length,
    });
  }
  
  return trends;
}

/**
 * Compare quarterly revenue between two quarters
 */
export async function getQuarterlyRevenue(quarters: string[]): Promise<Record<string, number>> {
  const policies = await getPolicies();
  const result: Record<string, number> = {};
  
  quarters.forEach((quarter) => {
    // Parse quarter string like "Q4 2025" or "Q1 2026"
    const match = quarter.match(/Q(\d)\s+(\d{4})/);
    if (!match) return;
    
    const q = parseInt(match[1]);
    const year = parseInt(match[2]);
    
    // Calculate quarter date range
    const startMonth = (q - 1) * 3; // Q1=0, Q2=3, Q3=6, Q4=9
    const quarterStart = new Date(year, startMonth, 1);
    const quarterEnd = new Date(year, startMonth + 3, 0, 23, 59, 59);
    
    // Filter policies created in this quarter
    const quarterPolicies = policies.filter((p) => {
      const createdDate = new Date(p.created_at);
      return createdDate >= quarterStart && createdDate <= quarterEnd;
    });
    
    const revenue = quarterPolicies.reduce((sum, p) => sum + (p.premium_amount || 0), 0);
    result[quarter] = revenue;
  });
  
  return result;
}

/**
 * Get comprehensive quarterly metrics for dashboard
 */
export async function getQuarterlyMetrics(quarter: string): Promise<QuarterlyMetrics> {
  const [policies, clients] = await Promise.all([getPolicies(), getClients()]);
  
  // Parse quarter string like "Q1 2026"
  const match = quarter.match(/Q(\d)\s+(\d{4})/);
  if (!match) {
    throw new Error('Invalid quarter format. Use "Q1 2026" format.');
  }
  
  const q = parseInt(match[1]);
  const year = parseInt(match[2]);
  
  // Calculate quarter date range
  const startMonth = (q - 1) * 3;
  const quarterStart = new Date(year, startMonth, 1);
  const quarterEnd = new Date(year, startMonth + 3, 0, 23, 59, 59);
  
  // Policies created this quarter
  const newPolicies = policies.filter((p) => {
    const createdDate = new Date(p.created_at);
    return createdDate >= quarterStart && createdDate <= quarterEnd;
  });
  
  // Clients created this quarter
  const newClients = clients.filter((c) => {
    const createdDate = new Date(c.created_at);
    return createdDate >= quarterStart && createdDate <= quarterEnd;
  });
  
  // Active clients at end of quarter
  const activeClients = clients.filter((c) => c.client_status === 'Active').length;
  
  // Total premium from new policies
  const totalPremium = newPolicies.reduce((sum, p) => sum + (p.premium_amount || 0), 0);
  const averagePremium = newPolicies.length > 0 ? totalPremium / newPolicies.length : 0;
  
  // Calculate retention rate (simplified: active clients / total clients)
  const retentionRate = clients.length > 0 ? (activeClients / clients.length) * 100 : 0;
  
  return {
    quarter,
    totalPremium,
    newPolicies: newPolicies.length,
    newClients: newClients.length,
    activeClients,
    retentionRate: Math.round(retentionRate * 10) / 10, // Round to 1 decimal
    averagePremium: Math.round(averagePremium * 100) / 100, // Round to 2 decimals
  };
}
