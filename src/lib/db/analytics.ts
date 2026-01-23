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
