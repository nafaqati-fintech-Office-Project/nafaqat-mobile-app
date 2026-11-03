import {
  loadAnnouncedIds,
  loadLevels,
  saveAnnouncedIds,
  saveLevels,
} from './alertStore';
import { planLocalAlerts, planServerAlerts, type LocalAlert } from './budgetAlerts';
import { notifyAlert } from './notify';
import { OVERALL } from './notificationLink';
import { getNotifications } from './notificationsService';
import { getCurrentBudget } from '@/features/budget/budgetService';
import { categoryLabelKey, codeForCategory } from '@/features/transactions/categoryDisplay';
import { spentByCategory } from '@/features/transactions/transactionsRepo';
import { getLanguage, t } from '@/i18n';
import { formatMoney } from '@/utils/money';

const PAGE_SIZE = 20;
const MAX_BANNERS = 3; // per run, so a long absence does not bury the phone
const DAY_MS = 86_400_000;

// Phone banners for the server's newest alerts. Runs after each unread-count poll; never throws.
export async function announceServerAlerts(): Promise<void> {
  try {
    const page = await getNotifications(0, PAGE_SIZE);
    const [known, levels] = await Promise.all([loadAnnouncedIds(), loadLevels()]);
    const plan = planServerAlerts(page.items, known, levels);
    if (plan.ids.length === 0 && known) return;

    await saveAnnouncedIds(known, plan.ids);
    await saveLevels(plan.levels);
    for (const n of plan.show.slice(-MAX_BANNERS)) {
      await notifyAlert({
        title: n.title,
        body: n.message,
        data: { referenceType: n.referenceType, referenceId: n.referenceId, categoryCode: n.categoryCode },
      });
    }
  } catch {
    // The next poll tries again.
  }
}

function localContent(alert: LocalAlert) {
  const language = getLanguage();
  const key = categoryLabelKey(alert.scope);
  const category = alert.scope === OVERALL ? t('alerts.overall') : key ? t(key) : alert.scope;
  const params = { category, percent: String(alert.percent) };
  return {
    title: t(alert.level === 'exceeded' ? 'alerts.exceededTitle' : 'alerts.warningTitle', params),
    body: t('alerts.body', {
      ...params,
      spent: formatMoney(alert.spent, alert.currency, language),
      limit: formatMoney(alert.limit, alert.currency, language),
    }),
  };
}

// After a new bank SMS is saved: has this month's spending reached 80% or 100% of a limit? Never throws.
export async function checkBudgetOnPhone(): Promise<void> {
  try {
    const budget = await getCurrentBudget();
    if (!budget) return;
    const from = budget.startDate.getTime();
    const to = new Date(budget.endDate.getFullYear(), budget.endDate.getMonth(), budget.endDate.getDate()).getTime() + DAY_MS;
    const byCategory = await spentByCategory(from, to, budget.currency);
    const total = [...byCategory.values()].reduce((sum, value) => sum + value, 0);

    const announced = await loadLevels();
    const { alerts, levels } = planLocalAlerts(budget, { total, byCategory }, announced, codeForCategory);
    if (alerts.length === 0) return;

    await saveLevels(levels);
    for (const alert of alerts.slice(-MAX_BANNERS)) {
      await notifyAlert({
        ...localContent(alert),
        data: { referenceType: 'BUDGET', referenceId: alert.budgetId, categoryCode: alert.categoryCode },
      });
    }
  } catch {
    // A budget check must not stop the SMS pipeline.
  }
}
