import React, { useMemo, useState } from 'react';
import { Edit3, Plus, Trash2 } from 'lucide-react';
import { useTravel } from '../context/TravelContext';
import type { CurrencyCode, Expense, ExpenseCategory } from '../types/travel';
import {
  computeBudgetSummary,
  formatCurrency,
  formatDisplayDate,
} from '../utils/travelMath';
import { Modal } from '../components/ui/Modal';
import { ConfirmDialog } from '../components/ui/ConfirmDialog';

const EXPENSE_CATEGORIES: ExpenseCategory[] = [
  'Flights',
  'Accommodation',
  'Food',
  'Transportation',
  'Activities',
  'Shopping',
  'Miscellaneous',
];

const CATEGORY_HEX: Record<ExpenseCategory, string> = {
  Flights: '#1687D9',
  Accommodation: '#56B8E9',
  Food: '#20B486',
  Transportation: '#6366F1',
  Activities: '#F5A623',
  Shopping: '#EC4899',
  Miscellaneous: '#94A3B8',
};

const CURRENCIES: CurrencyCode[] = ['USD', 'EUR', 'GBP', 'JPY', 'AUD', 'CAD'];

export const BudgetPage: React.FC = () => {
  const {
    activeTrip,
    expenses,
    preferences,
    globalSearch,
    saveTrip,
    saveExpense,
    deleteExpense,
    updatePreferences,
    showToast,
  } = useTravel();

  const [modalOpen, setModalOpen] = useState(false);
  const [editingExpense, setEditingExpense] = useState<Expense | null>(null);
  const [deletingExpense, setDeletingExpense] = useState<Expense | null>(null);

  const [formCategory, setFormCategory] = useState<ExpenseCategory>('Food');
  const [formAmount, setFormAmount] = useState('');
  const [formDate, setFormDate] = useState('2026-10-31');
  const [formDescription, setFormDescription] = useState('');
  const [formEstimated, setFormEstimated] = useState(false);
  const [formError, setFormError] = useState('');

  const tripExpenses = useMemo(() => {
    if (!activeTrip) return [];
    const q = globalSearch.trim().toLowerCase();
    return expenses
      .filter((e) => {
        if (e.tripId !== activeTrip.id) return false;
        if (!q) return true;
        return e.description.toLowerCase().includes(q) || e.category.toLowerCase().includes(q);
      })
      .sort((a, b) => b.date.localeCompare(a.date));
  }, [activeTrip, expenses, globalSearch]);

  const summary = useMemo(
    () =>
      computeBudgetSummary(
        activeTrip?.budget ?? 0,
        activeTrip ? expenses.filter((e) => e.tripId === activeTrip.id) : []
      ),
    [activeTrip, expenses]
  );

  // Daily spending series (actual expenses grouped by date)
  const dailySpending = useMemo(() => {
    const map = new Map<string, number>();
    for (const exp of tripExpenses) {
      if (exp.isEstimated) continue;
      map.set(exp.date, (map.get(exp.date) ?? 0) + exp.amount);
    }
    const entries = Array.from(map.entries()).sort((a, b) => a[0].localeCompare(b[0]));
    const maxAmount = Math.max(1, ...entries.map(([, amt]) => amt));
    return entries.map(([date, amount]) => ({
      date,
      amount,
      heightPct: Math.max(8, Math.round((amount / maxAmount) * 100)),
    }));
  }, [tripExpenses]);

  // SVG Donut segments
  const donutSegments = useMemo(() => {
    const nonZero = summary.categoryBreakdown.filter((c) => c.spent > 0);
    const total = nonZero.reduce((acc, c) => acc + c.spent, 0);
    if (total === 0) return [];
    const radius = 56;
    const circumference = 2 * Math.PI * radius;
    let cumulative = 0;
    return nonZero.map((item) => {
      const fraction = item.spent / total;
      const strokeLength = fraction * circumference;
      const offset = -cumulative * circumference;
      cumulative += fraction;
      return {
        ...item,
        strokeLength,
        circumference,
        offset,
        color: CATEGORY_HEX[item.category],
      };
    });
  }, [summary]);

  const currency = activeTrip?.currency ?? preferences.currency;

  const handleCurrencyChange = async (nextCurrency: CurrencyCode) => {
    updatePreferences({ currency: nextCurrency });
    if (activeTrip) {
      await saveTrip({ ...activeTrip, currency: nextCurrency, updatedAt: new Date().toISOString() });
    }
    showToast(`Display currency updated to ${nextCurrency}`, 'info');
  };

  const openAddModal = () => {
    setEditingExpense(null);
    setFormCategory('Food');
    setFormAmount('');
    setFormDate(activeTrip?.departureDate ?? '2026-10-31');
    setFormDescription('');
    setFormEstimated(false);
    setFormError('');
    setModalOpen(true);
  };

  const openEditModal = (exp: Expense) => {
    setEditingExpense(exp);
    setFormCategory(exp.category);
    setFormAmount(String(exp.amount));
    setFormDate(exp.date);
    setFormDescription(exp.description);
    setFormEstimated(!!exp.isEstimated);
    setFormError('');
    setModalOpen(true);
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!activeTrip) return;
    const amt = Number(formAmount);
    if (!Number.isFinite(amt) || amt <= 0 || !formDescription.trim()) {
      setFormError('Enter a valid amount greater than 0 and a description.');
      return;
    }

    const record: Expense = {
      id: editingExpense?.id ?? `exp-${Date.now().toString(36)}`,
      tripId: activeTrip.id,
      category: formCategory,
      amount: amt,
      date: formDate,
      description: formDescription.trim(),
      isEstimated: formEstimated,
    };

    await saveExpense(record, !editingExpense);
    showToast(editingExpense ? 'Expense updated' : 'Expense logged');
    setModalOpen(false);
  };

  if (!activeTrip) {
    return (
      <div className="rounded-2xl border border-[#E5ECF3] dark:border-slate-800 bg-white dark:bg-slate-900 p-10 text-center">
        <p className="text-base font-semibold">Select a trip to track expenses and budgets.</p>
      </div>
    );
  }

  return (
    <div className="space-y-6">
      {/* Header + Currency + Add Button */}
      <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-4">
        <div>
          <p className="text-xs font-semibold text-[#1687D9] dark:text-sky-400">
            {activeTrip.name} · Currency: {currency}
          </p>
          <h2 className="mt-0.5 text-xl font-bold text-[#172B42] dark:text-white">
            Budget &amp; Expense Ledger
          </h2>
        </div>

        <div className="flex items-center gap-2.5 shrink-0">
          <select
            aria-label="Select budget currency"
            value={currency}
            onChange={(e) => handleCurrencyChange(e.target.value as CurrencyCode)}
            className="min-h-[40px] rounded-xl border border-[#E5ECF3] dark:border-slate-700 bg-white dark:bg-slate-900 px-3 text-sm font-semibold"
          >
            {CURRENCIES.map((c) => (
              <option key={c} value={c}>
                {c}
              </option>
            ))}
          </select>

          <button
            type="button"
            onClick={openAddModal}
            className="min-h-[40px] inline-flex items-center gap-1.5 rounded-xl bg-[#1687D9] hover:bg-[#1273BA] px-4 py-2 text-sm font-semibold text-white whitespace-nowrap"
          >
            <Plus className="h-4 w-4" />
            <span>Add Expense</span>
          </button>
        </div>
      </div>

      {/* Budget Overview Cards */}
      <section className="grid grid-cols-2 lg:grid-cols-4 gap-4">
        <div className="rounded-2xl border border-[#E5ECF3] dark:border-slate-800 bg-white dark:bg-slate-900 p-4 sm:p-5">
          <span className="text-xs font-medium text-[#718096] dark:text-slate-400">Total Budget</span>
          <p className="mt-1.5 text-2xl font-bold tabular-nums">
            {formatCurrency(summary.totalBudget, currency)}
          </p>
          <span className="text-xs text-[#718096] dark:text-slate-400">{currency} allocated</span>
        </div>

        <div className="rounded-2xl border border-[#E5ECF3] dark:border-slate-800 bg-white dark:bg-slate-900 p-4 sm:p-5">
          <span className="text-xs font-medium text-[#718096] dark:text-slate-400">Total Spent</span>
          <p className="mt-1.5 text-2xl font-bold tabular-nums text-[#1687D9]">
            {formatCurrency(summary.totalSpent, currency)}
          </p>
          <span className="text-xs text-[#718096] dark:text-slate-400 tabular-nums">
            {summary.percentUsed}% of budget
          </span>
        </div>

        <div className="rounded-2xl border border-[#E5ECF3] dark:border-slate-800 bg-white dark:bg-slate-900 p-4 sm:p-5">
          <span className="text-xs font-medium text-[#718096] dark:text-slate-400">Remaining Balance</span>
          <p
            className={`mt-1.5 text-2xl font-bold tabular-nums ${
              summary.isOverBudget ? 'text-rose-600' : 'text-[#20B486]'
            }`}
          >
            {formatCurrency(summary.remainingBalance, currency)}
          </p>
          <span className="text-xs text-[#718096] dark:text-slate-400">
            {summary.isOverBudget ? 'Over budget' : 'Available to spend'}
          </span>
        </div>

        <div className="rounded-2xl border border-[#E5ECF3] dark:border-slate-800 bg-white dark:bg-slate-900 p-4 sm:p-5">
          <span className="text-xs font-medium text-[#718096] dark:text-slate-400">Estimated Expenses</span>
          <p className="mt-1.5 text-2xl font-bold tabular-nums text-[#F5A623]">
            {formatCurrency(summary.estimatedTotal, currency)}
          </p>
          <span className="text-xs text-[#718096] dark:text-slate-400">Planned future costs</span>
        </div>
      </section>

      {/* Three Responsive Charts */}
      <section className="grid grid-cols-1 lg:grid-cols-3 gap-5">
        {/* 1. Spending by Category Pie/Donut Chart */}
        <div className="rounded-2xl border border-[#E5ECF3] dark:border-slate-800 bg-white dark:bg-slate-900 p-5">
          <h3 className="text-base font-bold mb-4">Spending by Category</h3>
          {donutSegments.length === 0 ? (
            <p className="py-12 text-center text-sm text-[#718096]">
              Log an expense to visualize category distribution.
            </p>
          ) : (
            <div className="flex flex-col items-center gap-5">
              <svg viewBox="0 0 160 160" className="h-36 w-36 shrink-0" role="img" aria-label="Spending by category pie chart">
                <circle
                  cx="80"
                  cy="80"
                  r="56"
                  fill="none"
                  stroke="#E5ECF3"
                  strokeWidth="22"
                  className="dark:stroke-slate-800"
                />
                {donutSegments.map((seg) => (
                  <circle
                    key={seg.category}
                    cx="80"
                    cy="80"
                    r="56"
                    fill="none"
                    stroke={seg.color}
                    strokeWidth="22"
                    strokeDasharray={`${seg.strokeLength} ${seg.circumference}`}
                    strokeDashoffset={seg.offset}
                    transform="rotate(-90 80 80)"
                  />
                ))}
                <text
                  x="80"
                  y="76"
                  textAnchor="middle"
                  className="fill-[#718096] dark:fill-slate-400 text-[10px] font-medium"
                >
                  Spent
                </text>
                <text
                  x="80"
                  y="94"
                  textAnchor="middle"
                  className="fill-[#172B42] dark:fill-white text-[13px] font-bold tabular-nums"
                >
                  {formatCurrency(summary.totalSpent, currency)}
                </text>
              </svg>

              <ul className="w-full space-y-2 text-xs">
                {donutSegments.map((seg) => (
                  <li key={seg.category} className="flex items-center justify-between gap-2">
                    <span className="flex items-center gap-2 text-[#475569] dark:text-slate-300 truncate">
                      <span
                        className="h-2.5 w-2.5 rounded-xs shrink-0"
                        style={{ backgroundColor: seg.color }}
                      />
                      {seg.category}
                    </span>
                    <span className="font-semibold tabular-nums whitespace-nowrap shrink-0">
                      {seg.percentageOfSpent}% · {formatCurrency(seg.spent, currency)}
                    </span>
                  </li>
                ))}
              </ul>
            </div>
          )}
        </div>

        {/* 2. Budget Usage Progress Chart */}
        <div className="rounded-2xl border border-[#E5ECF3] dark:border-slate-800 bg-white dark:bg-slate-900 p-5">
          <h3 className="text-base font-bold mb-4">Budget Usage Progress</h3>
          <div className="space-y-3">
            {summary.categoryBreakdown.map((item) => (
              <div key={item.category} className="space-y-1">
                <div className="flex items-center justify-between text-xs">
                  <span className="font-medium text-[#475569] dark:text-slate-300">{item.category}</span>
                  <span className="font-semibold tabular-nums">
                    {formatCurrency(item.spent, currency)}
                    {item.estimated > 0 ? (
                      <span className="text-[#718096] font-normal">
                        {' '}
                        (+{formatCurrency(item.estimated, currency)} est.)
                      </span>
                    ) : null}
                  </span>
                </div>
                <div className="h-2 w-full rounded-full bg-[#F5F8FC] dark:bg-slate-800 overflow-hidden">
                  <div
                    className="h-full rounded-full"
                    style={{
                      width: `${item.spent > 0 ? Math.max(4, item.percentageOfBudget) : 0}%`,
                      backgroundColor: CATEGORY_HEX[item.category],
                    }}
                  />
                </div>
              </div>
            ))}
          </div>
        </div>

        {/* 3. Daily Spending Chart */}
        <div className="rounded-2xl border border-[#E5ECF3] dark:border-slate-800 bg-white dark:bg-slate-900 p-5 flex flex-col">
          <h3 className="text-base font-bold mb-4">Daily Spending</h3>
          {dailySpending.length === 0 ? (
            <p className="py-12 text-center text-sm text-[#718096]">
              No actual expenses recorded yet.
            </p>
          ) : (
            <div className="flex-1 flex items-end gap-3 pt-6 min-h-[180px]" role="img" aria-label="Daily spending bar chart">
              {dailySpending.map((d) => (
                <div key={d.date} className="flex-1 flex flex-col items-center gap-1.5 h-full justify-end">
                  <span className="text-[11px] font-semibold tabular-nums text-[#172B42] dark:text-slate-200">
                    {formatCurrency(d.amount, currency)}
                  </span>
                  <div className="w-full max-w-[44px] flex-1 flex items-end">
                    <div
                      className="w-full rounded-t-lg bg-[#1687D9] hover:bg-[#56B8E9] transition-colors"
                      style={{ height: `${d.heightPct}%` }}
                      title={`${d.date}: ${formatCurrency(d.amount, currency)}`}
                    />
                  </div>
                  <span className="text-[11px] text-[#718096] dark:text-slate-400 tabular-nums">
                    {d.date.slice(5)}
                  </span>
                </div>
              ))}
            </div>
          )}
        </div>
      </section>

      {/* Transaction History Table */}
      <section className="rounded-2xl border border-[#E5ECF3] dark:border-slate-800 bg-white dark:bg-slate-900 overflow-hidden">
        <div className="px-5 py-4 border-b border-[#E5ECF3] dark:border-slate-800 flex items-center justify-between">
          <h3 className="text-base font-bold">Transaction History</h3>
          <span className="text-xs text-[#718096] dark:text-slate-400 tabular-nums">
            {tripExpenses.length} entries
          </span>
        </div>

        {tripExpenses.length === 0 ? (
          <div className="p-10 text-center text-sm text-[#718096]">
            No expenses logged for this trip yet.
          </div>
        ) : (
          <div className="overflow-x-auto">
            <table className="w-full text-left text-sm">
              <thead className="bg-[#F5F8FC] dark:bg-slate-800/70 text-xs font-semibold text-[#718096] dark:text-slate-400">
                <tr>
                  <th className="px-4 py-3">Date</th>
                  <th className="px-4 py-3">Description</th>
                  <th className="px-4 py-3">Category</th>
                  <th className="px-4 py-3">Type</th>
                  <th className="px-4 py-3 text-right">Amount</th>
                  <th className="px-4 py-3 text-right">Actions</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-[#E5ECF3] dark:divide-slate-800">
                {tripExpenses.map((exp) => (
                  <tr key={exp.id} className="hover:bg-[#F5F8FC]/60 dark:hover:bg-slate-800/40">
                    <td className="px-4 py-3 whitespace-nowrap text-xs text-[#718096] dark:text-slate-400 tabular-nums">
                      {formatDisplayDate(exp.date, preferences.dateFormat)}
                    </td>
                    <td className="px-4 py-3 font-medium text-[#172B42] dark:text-slate-100">
                      {exp.description}
                    </td>
                    <td className="px-4 py-3 text-xs text-[#475569] dark:text-slate-300">
                      {exp.category}
                    </td>
                    <td className="px-4 py-3 text-xs">
                      <span
                        className={
                          exp.isEstimated
                            ? 'text-[#F5A623] font-medium'
                            : 'text-[#20B486] font-medium'
                        }
                      >
                        {exp.isEstimated ? 'Estimated' : 'Actual'}
                      </span>
                    </td>
                    <td className="px-4 py-3 text-right font-bold tabular-nums">
                      {formatCurrency(exp.amount, currency)}
                    </td>
                    <td className="px-4 py-3 text-right whitespace-nowrap">
                      <button
                        type="button"
                        onClick={() => openEditModal(exp)}
                        aria-label={`Edit ${exp.description}`}
                        className="inline-flex h-8 w-8 items-center justify-center rounded-lg text-[#718096] hover:bg-[#F5F8FC] hover:text-[#1687D9]"
                      >
                        <Edit3 className="h-4 w-4" />
                      </button>
                      <button
                        type="button"
                        onClick={() => setDeletingExpense(exp)}
                        aria-label={`Delete ${exp.description}`}
                        className="inline-flex h-8 w-8 items-center justify-center rounded-lg text-[#718096] hover:bg-rose-50 hover:text-rose-600"
                      >
                        <Trash2 className="h-4 w-4" />
                      </button>
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        )}
      </section>

      {/* Add / Edit Expense Modal */}
      <Modal
        open={modalOpen}
        onClose={() => setModalOpen(false)}
        title={editingExpense ? 'Edit Expense' : 'Add Expense'}
        subtitle={`${activeTrip.name} (${currency})`}
        maxWidth="max-w-md"
      >
        <form onSubmit={handleSubmit} className="space-y-4">
          {formError ? (
            <p className="rounded-xl bg-rose-50 px-3 py-2 text-xs font-medium text-rose-600">
              {formError}
            </p>
          ) : null}

          <div className="grid grid-cols-2 gap-3">
            <div>
              <label htmlFor="exp-cat" className="block text-xs font-semibold mb-1">
                Category
              </label>
              <select
                id="exp-cat"
                value={formCategory}
                onChange={(e) => setFormCategory(e.target.value as ExpenseCategory)}
                className="w-full min-h-[40px] rounded-xl border border-[#E5ECF3] dark:border-slate-700 bg-white dark:bg-slate-800 px-3 text-sm"
              >
                {EXPENSE_CATEGORIES.map((c) => (
                  <option key={c} value={c}>
                    {c}
                  </option>
                ))}
              </select>
            </div>
            <div>
              <label htmlFor="exp-amt" className="block text-xs font-semibold mb-1">
                Amount ({currency})
              </label>
              <input
                id="exp-amt"
                type="number"
                min={1}
                step="any"
                value={formAmount}
                onChange={(e) => setFormAmount(e.target.value)}
                className="w-full min-h-[40px] rounded-xl border border-[#E5ECF3] dark:border-slate-700 bg-white dark:bg-slate-800 px-3 text-sm tabular-nums"
              />
            </div>
          </div>

          <div>
            <label htmlFor="exp-date" className="block text-xs font-semibold mb-1">
              Date
            </label>
            <input
              id="exp-date"
              type="date"
              value={formDate}
              onChange={(e) => setFormDate(e.target.value)}
              className="w-full min-h-[40px] rounded-xl border border-[#E5ECF3] dark:border-slate-700 bg-white dark:bg-slate-800 px-3 text-sm"
            />
          </div>

          <div>
            <label htmlFor="exp-desc" className="block text-xs font-semibold mb-1">
              Description
            </label>
            <input
              id="exp-desc"
              type="text"
              value={formDescription}
              onChange={(e) => setFormDescription(e.target.value)}
              placeholder="e.g. Shibuya Ramen Dinner"
              className="w-full min-h-[40px] rounded-xl border border-[#E5ECF3] dark:border-slate-700 bg-white dark:bg-slate-800 px-3.5 text-sm"
            />
          </div>

          <label className="flex items-center gap-2.5 text-sm cursor-pointer">
            <input
              type="checkbox"
              checked={formEstimated}
              onChange={(e) => setFormEstimated(e.target.checked)}
              className="h-4 w-4 rounded border-[#CBD5E1] text-[#1687D9]"
            />
            <span>Mark as estimated future expense (not yet spent)</span>
          </label>

          <div className="pt-3 border-t border-[#E5ECF3] dark:border-slate-800 flex justify-end gap-2">
            <button
              type="button"
              onClick={() => setModalOpen(false)}
              className="min-h-[40px] rounded-xl border border-[#E5ECF3] dark:border-slate-700 px-4 text-sm font-medium"
            >
              Cancel
            </button>
            <button
              type="submit"
              className="min-h-[40px] rounded-xl bg-[#1687D9] hover:bg-[#1273BA] px-5 text-sm font-semibold text-white"
            >
              {editingExpense ? 'Save Changes' : 'Add Expense'}
            </button>
          </div>
        </form>
      </Modal>

      <ConfirmDialog
        open={!!deletingExpense}
        onClose={() => setDeletingExpense(null)}
        onConfirm={async () => {
          if (deletingExpense) {
            await deleteExpense(deletingExpense.id);
            showToast('Expense removed', 'info');
          }
        }}
        title="Delete Expense?"
        message={`Remove "${deletingExpense?.description}" from your budget ledger?`}
        confirmLabel="Delete"
      />
    </div>
  );
};
