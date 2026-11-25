import React, { useMemo, useState } from 'react';
import {
  BookmarkPlus,
  Check,
  Edit3,
  Layers,
  Plus,
  Trash2,
} from 'lucide-react';
import { useTravel } from '../context/TravelContext';
import type { PackingCategory, PackingItem, PackingTemplate } from '../types/travel';
import { computePackingProgress } from '../utils/travelMath';
import { Modal } from '../components/ui/Modal';
import { ConfirmDialog } from '../components/ui/ConfirmDialog';

const PACKING_CATEGORIES: Array<'All' | PackingCategory> = [
  'All',
  'Clothing',
  'Electronics',
  'Toiletries',
  'Documents',
  'Accessories',
  'Medicines',
  'Travel Essentials',
  'Custom Items',
];

export const PackingPage: React.FC = () => {
  const {
    activeTrip,
    packingItems,
    packingTemplates,
    globalSearch,
    savePackingItem,
    deletePackingItem,
    applyPackingTemplate,
    savePackingTemplate,
    deletePackingTemplate,
    showToast,
  } = useTravel();

  const [categoryFilter, setCategoryFilter] = useState<'All' | PackingCategory>('All');
  const [newName, setNewName] = useState('');
  const [newCategory, setNewCategory] = useState<PackingCategory>('Clothing');
  const [newQuantity, setNewQuantity] = useState(1);
  const [editingItem, setEditingItem] = useState<PackingItem | null>(null);
  const [editName, setEditName] = useState('');
  const [editCategory, setEditCategory] = useState<PackingCategory>('Clothing');
  const [editQuantity, setEditQuantity] = useState(1);

  const [templatesModalOpen, setTemplatesModalOpen] = useState(false);
  const [templateName, setTemplateName] = useState('');
  const [templateDesc, setTemplateDesc] = useState('');
  const [deletingItem, setDeletingItem] = useState<PackingItem | null>(null);

  const tripItems = useMemo(() => {
    if (!activeTrip) return [];
    return packingItems.filter((item) => item.tripId === activeTrip.id);
  }, [activeTrip, packingItems]);

  const progress = useMemo(() => computePackingProgress(tripItems), [tripItems]);

  const filteredItems = useMemo(() => {
    const q = globalSearch.trim().toLowerCase();
    return tripItems.filter((item) => {
      if (categoryFilter !== 'All' && item.category !== categoryFilter) return false;
      if (!q) return true;
      return item.name.toLowerCase().includes(q) || item.category.toLowerCase().includes(q);
    });
  }, [tripItems, categoryFilter, globalSearch]);

  const handleAddItem = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!activeTrip) return;
    if (!newName.trim()) {
      showToast('Enter an item name before adding.', 'error');
      return;
    }

    const item: PackingItem = {
      id: `pkg-${Date.now().toString(36)}`,
      tripId: activeTrip.id,
      name: newName.trim(),
      category: newCategory,
      packed: false,
      quantity: Math.max(1, Number(newQuantity) || 1),
    };

    await savePackingItem(item, true);
    setNewName('');
    setNewQuantity(1);
    showToast(`Added "${item.name}"`);
  };

  const handleTogglePacked = async (item: PackingItem) => {
    await savePackingItem({ ...item, packed: !item.packed }, false);
  };

  const handleSaveEdit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!editingItem || !editName.trim()) return;
    await savePackingItem(
      {
        ...editingItem,
        name: editName.trim(),
        category: editCategory,
        quantity: Math.max(1, Number(editQuantity) || 1),
      },
      false
    );
    showToast(`Updated "${editName.trim()}"`);
    setEditingItem(null);
  };

  const handleSaveAsTemplate = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!templateName.trim() || tripItems.length === 0) return;
    const tpl: PackingTemplate = {
      id: `tpl-${Date.now().toString(36)}`,
      name: templateName.trim(),
      description: templateDesc.trim() || `Saved from ${activeTrip?.name ?? 'trip'}`,
      items: tripItems.map((i) => ({
        name: i.name,
        category: i.category,
        quantity: i.quantity,
      })),
    };
    await savePackingTemplate(tpl);
    setTemplateName('');
    setTemplateDesc('');
    showToast(`Saved template "${tpl.name}"`);
  };

  if (!activeTrip) {
    return (
      <div className="rounded-2xl border border-[#E5ECF3] dark:border-slate-800 bg-white dark:bg-slate-900 p-10 text-center">
        <p className="text-base font-semibold">Select a trip to manage your packing list.</p>
      </div>
    );
  }

  return (
    <div className="space-y-6">
      {/* Progress Section */}
      <section className="rounded-2xl border border-[#E5ECF3] dark:border-slate-800 bg-white dark:bg-slate-900 p-5">
        <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-4">
          <div>
            <p className="text-xs font-semibold text-[#1687D9] dark:text-sky-400">
              {activeTrip.name}
            </p>
            <h2 className="mt-0.5 text-xl font-bold text-[#172B42] dark:text-white">
              Packing Progress
            </h2>
          </div>

          <button
            type="button"
            onClick={() => setTemplatesModalOpen(true)}
            className="min-h-[40px] inline-flex items-center gap-1.5 rounded-xl border border-[#E5ECF3] dark:border-slate-700 bg-[#F5F8FC] dark:bg-slate-800 px-3.5 py-2 text-xs font-semibold text-[#172B42] dark:text-slate-100 hover:border-[#1687D9]/50"
          >
            <Layers className="h-4 w-4 text-[#1687D9]" />
            <span>Packing Templates ({packingTemplates.length})</span>
          </button>
        </div>

        <div className="mt-4 grid grid-cols-2 sm:grid-cols-4 gap-3">
          <div className="rounded-xl bg-[#F5F8FC] dark:bg-slate-800/70 p-3.5">
            <span className="text-xs text-[#718096] dark:text-slate-400">Total Items</span>
            <p className="mt-1 text-2xl font-bold tabular-nums">{progress.total}</p>
          </div>
          <div className="rounded-xl bg-[#F5F8FC] dark:bg-slate-800/70 p-3.5">
            <span className="text-xs text-[#718096] dark:text-slate-400">Packed</span>
            <p className="mt-1 text-2xl font-bold tabular-nums text-[#20B486]">{progress.packed}</p>
          </div>
          <div className="rounded-xl bg-[#F5F8FC] dark:bg-slate-800/70 p-3.5">
            <span className="text-xs text-[#718096] dark:text-slate-400">Remaining</span>
            <p className="mt-1 text-2xl font-bold tabular-nums text-[#F5A623]">{progress.remaining}</p>
          </div>
          <div className="rounded-xl bg-[#F5F8FC] dark:bg-slate-800/70 p-3.5">
            <span className="text-xs text-[#718096] dark:text-slate-400">Completion</span>
            <p className="mt-1 text-2xl font-bold tabular-nums text-[#1687D9]">{progress.percentage}%</p>
          </div>
        </div>

        <div className="mt-4">
          <div className="h-2.5 w-full rounded-full bg-[#F5F8FC] dark:bg-slate-800 overflow-hidden">
            <div
              className="h-full rounded-full bg-[#20B486] transition-all duration-300"
              style={{ width: `${progress.percentage}%` }}
            />
          </div>
        </div>
      </section>

      {/* Add Custom Item Bar */}
      <form
        onSubmit={handleAddItem}
        className="rounded-2xl border border-[#E5ECF3] dark:border-slate-800 bg-white dark:bg-slate-900 p-4 grid grid-cols-1 sm:grid-cols-12 gap-3 items-end"
      >
        <div className="sm:col-span-5">
          <label htmlFor="pkg-name" className="block text-xs font-semibold mb-1">
            Add Packing Item
          </label>
          <input
            id="pkg-name"
            type="text"
            value={newName}
            onChange={(e) => setNewName(e.target.value)}
            placeholder="e.g. Travel umbrella, eSIM QR printout..."
            className="w-full min-h-[42px] rounded-xl border border-[#E5ECF3] dark:border-slate-700 bg-[#F5F8FC] dark:bg-slate-800 px-3.5 text-sm focus:bg-white dark:focus:bg-slate-900 focus:border-[#1687D9] focus:outline-none"
          />
        </div>

        <div className="sm:col-span-3">
          <label htmlFor="pkg-cat" className="block text-xs font-semibold mb-1">
            Category
          </label>
          <select
            id="pkg-cat"
            value={newCategory}
            onChange={(e) => setNewCategory(e.target.value as PackingCategory)}
            className="w-full min-h-[42px] rounded-xl border border-[#E5ECF3] dark:border-slate-700 bg-[#F5F8FC] dark:bg-slate-800 px-3 text-sm"
          >
            {PACKING_CATEGORIES.filter((c) => c !== 'All').map((c) => (
              <option key={c} value={c}>
                {c}
              </option>
            ))}
          </select>
        </div>

        <div className="sm:col-span-2">
          <label htmlFor="pkg-qty" className="block text-xs font-semibold mb-1">
            Qty
          </label>
          <input
            id="pkg-qty"
            type="number"
            min={1}
            max={99}
            value={newQuantity}
            onChange={(e) => setNewQuantity(Number(e.target.value))}
            className="w-full min-h-[42px] rounded-xl border border-[#E5ECF3] dark:border-slate-700 bg-[#F5F8FC] dark:bg-slate-800 px-3 text-sm tabular-nums"
          />
        </div>

        <div className="sm:col-span-2">
          <button
            type="submit"
            className="w-full min-h-[42px] inline-flex items-center justify-center gap-1.5 rounded-xl bg-[#1687D9] hover:bg-[#1273BA] px-4 text-sm font-semibold text-white transition-colors"
          >
            <Plus className="h-4 w-4" />
            <span>Add Item</span>
          </button>
        </div>
      </form>

      {/* Category Filter Tabs */}
      <div
        className="flex items-center gap-1.5 overflow-x-auto pb-1"
        role="tablist"
        aria-label="Filter packing items by category"
      >
        {PACKING_CATEGORIES.map((cat) => {
          const active = categoryFilter === cat;
          return (
            <button
              key={cat}
              type="button"
              role="tab"
              aria-selected={active}
              onClick={() => setCategoryFilter(cat)}
              className={`min-h-[38px] px-3.5 py-1.5 rounded-xl text-xs font-semibold border transition-colors whitespace-nowrap shrink-0 ${
                active
                  ? 'bg-[#1687D9] text-white border-[#1687D9]'
                  : 'bg-white dark:bg-slate-900 text-[#718096] dark:text-slate-300 border-[#E5ECF3] dark:border-slate-800 hover:text-[#172B42]'
              }`}
            >
              {cat}
            </button>
          );
        })}
      </div>

      {/* Checklist Items */}
      <section className="rounded-2xl border border-[#E5ECF3] dark:border-slate-800 bg-white dark:bg-slate-900 overflow-hidden">
        {filteredItems.length === 0 ? (
          <div className="p-10 text-center">
            <p className="text-base font-semibold">No packing items in this category</p>
            <p className="mt-1 text-sm text-[#718096] dark:text-slate-400">
              Add custom items above or apply a reusable packing template.
            </p>
          </div>
        ) : (
          <ul className="divide-y divide-[#E5ECF3] dark:divide-slate-800">
            {filteredItems.map((item) => (
              <li
                key={item.id}
                className="flex items-center justify-between gap-3 px-4 py-3 hover:bg-[#F5F8FC]/60 dark:hover:bg-slate-800/40 transition-colors"
              >
                <button
                  type="button"
                  onClick={() => handleTogglePacked(item)}
                  aria-label={`${item.packed ? 'Unpack' : 'Pack'} ${item.name}`}
                  className="flex-1 flex items-center gap-3 text-left min-h-[40px]"
                >
                  <span
                    className={`flex h-6 w-6 shrink-0 items-center justify-center rounded-lg border transition-colors ${
                      item.packed
                        ? 'bg-[#20B486] border-[#20B486] text-white'
                        : 'border-[#CBD5E1] dark:border-slate-600 bg-white dark:bg-slate-800'
                    }`}
                  >
                    {item.packed ? <Check className="h-3.5 w-3.5" strokeWidth={2.5} /> : null}
                  </span>

                  <div className="min-w-0 flex-1">
                    <span
                      className={`block text-sm font-medium ${
                        item.packed
                          ? 'line-through text-[#718096] dark:text-slate-500'
                          : 'text-[#172B42] dark:text-slate-100'
                      }`}
                    >
                      {item.name}
                    </span>
                    <span className="text-xs text-[#718096] dark:text-slate-400 tabular-nums">
                      {item.category} · Qty {item.quantity}
                    </span>
                  </div>
                </button>

                <div className="flex items-center gap-1 shrink-0">
                  <button
                    type="button"
                    onClick={() => {
                      setEditingItem(item);
                      setEditName(item.name);
                      setEditCategory(item.category);
                      setEditQuantity(item.quantity);
                    }}
                    aria-label={`Edit ${item.name}`}
                    className="min-h-[36px] min-w-[36px] flex items-center justify-center rounded-lg text-[#718096] hover:bg-[#F5F8FC] hover:text-[#1687D9] dark:hover:bg-slate-800"
                  >
                    <Edit3 className="h-4 w-4" />
                  </button>
                  <button
                    type="button"
                    onClick={() => setDeletingItem(item)}
                    aria-label={`Delete ${item.name}`}
                    className="min-h-[36px] min-w-[36px] flex items-center justify-center rounded-lg text-[#718096] hover:bg-rose-50 hover:text-rose-600 dark:hover:bg-rose-950/40"
                  >
                    <Trash2 className="h-4 w-4" />
                  </button>
                </div>
              </li>
            ))}
          </ul>
        )}
      </section>

      {/* Edit Item Modal */}
      <Modal
        open={!!editingItem}
        onClose={() => setEditingItem(null)}
        title="Edit Packing Item"
        maxWidth="max-w-md"
      >
        <form onSubmit={handleSaveEdit} className="space-y-4">
          <div>
            <label htmlFor="edit-pkg-name" className="block text-xs font-semibold mb-1">
              Item Name
            </label>
            <input
              id="edit-pkg-name"
              type="text"
              value={editName}
              onChange={(e) => setEditName(e.target.value)}
              className="w-full min-h-[40px] rounded-xl border border-[#E5ECF3] dark:border-slate-700 bg-white dark:bg-slate-800 px-3.5 text-sm"
            />
          </div>
          <div className="grid grid-cols-2 gap-3">
            <div>
              <label htmlFor="edit-pkg-cat" className="block text-xs font-semibold mb-1">
                Category
              </label>
              <select
                id="edit-pkg-cat"
                value={editCategory}
                onChange={(e) => setEditCategory(e.target.value as PackingCategory)}
                className="w-full min-h-[40px] rounded-xl border border-[#E5ECF3] dark:border-slate-700 bg-white dark:bg-slate-800 px-3 text-sm"
              >
                {PACKING_CATEGORIES.filter((c) => c !== 'All').map((c) => (
                  <option key={c} value={c}>
                    {c}
                  </option>
                ))}
              </select>
            </div>
            <div>
              <label htmlFor="edit-pkg-qty" className="block text-xs font-semibold mb-1">
                Quantity
              </label>
              <input
                id="edit-pkg-qty"
                type="number"
                min={1}
                value={editQuantity}
                onChange={(e) => setEditQuantity(Number(e.target.value))}
                className="w-full min-h-[40px] rounded-xl border border-[#E5ECF3] dark:border-slate-700 bg-white dark:bg-slate-800 px-3 text-sm tabular-nums"
              />
            </div>
          </div>
          <div className="flex justify-end gap-2 pt-2">
            <button
              type="button"
              onClick={() => setEditingItem(null)}
              className="min-h-[40px] rounded-xl border border-[#E5ECF3] dark:border-slate-700 px-4 text-sm font-medium"
            >
              Cancel
            </button>
            <button
              type="submit"
              className="min-h-[40px] rounded-xl bg-[#1687D9] px-5 text-sm font-semibold text-white"
            >
              Save
            </button>
          </div>
        </form>
      </Modal>

      {/* Reusable Packing Templates Modal */}
      <Modal
        open={templatesModalOpen}
        onClose={() => setTemplatesModalOpen(false)}
        title="Reusable Packing Templates"
        subtitle="Apply a curated list or save your current items as a reusable template."
        maxWidth="max-w-xl"
      >
        <div className="space-y-5">
          <div className="space-y-3">
            {packingTemplates.map((tpl) => (
              <div
                key={tpl.id}
                className="rounded-xl border border-[#E5ECF3] dark:border-slate-800 bg-[#F5F8FC] dark:bg-slate-800/60 p-4 flex items-center justify-between gap-3"
              >
                <div className="min-w-0">
                  <h4 className="text-sm font-bold text-[#172B42] dark:text-white">{tpl.name}</h4>
                  <p className="text-xs text-[#718096] dark:text-slate-400">
                    {tpl.description} · {tpl.items.length} items
                  </p>
                </div>
                <div className="flex items-center gap-1.5 shrink-0">
                  <button
                    type="button"
                    onClick={async () => {
                      await applyPackingTemplate(activeTrip.id, tpl);
                      setTemplatesModalOpen(false);
                    }}
                    className="min-h-[36px] rounded-xl bg-[#1687D9] hover:bg-[#1273BA] px-3 text-xs font-semibold text-white"
                  >
                    Apply
                  </button>
                  <button
                    type="button"
                    onClick={async () => {
                      await deletePackingTemplate(tpl.id);
                      showToast(`Deleted template "${tpl.name}"`, 'info');
                    }}
                    aria-label={`Delete template ${tpl.name}`}
                    className="min-h-[36px] min-w-[36px] flex items-center justify-center rounded-lg text-[#718096] hover:bg-rose-50 hover:text-rose-600"
                  >
                    <Trash2 className="h-4 w-4" />
                  </button>
                </div>
              </div>
            ))}
          </div>

          <form
            onSubmit={handleSaveAsTemplate}
            className="border-t border-[#E5ECF3] dark:border-slate-800 pt-4 space-y-3"
          >
            <h4 className="text-sm font-bold flex items-center gap-1.5">
              <BookmarkPlus className="h-4 w-4 text-[#1687D9]" />
              Save Current List as Template
            </h4>
            <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
              <input
                type="text"
                value={templateName}
                onChange={(e) => setTemplateName(e.target.value)}
                placeholder="Template name (e.g. Winter Ski Trip)"
                className="min-h-[40px] rounded-xl border border-[#E5ECF3] dark:border-slate-700 bg-white dark:bg-slate-800 px-3 text-sm"
              />
              <input
                type="text"
                value={templateDesc}
                onChange={(e) => setTemplateDesc(e.target.value)}
                placeholder="Short description"
                className="min-h-[40px] rounded-xl border border-[#E5ECF3] dark:border-slate-700 bg-white dark:bg-slate-800 px-3 text-sm"
              />
            </div>
            <button
              type="submit"
              className="min-h-[40px] rounded-xl bg-[#172B42] dark:bg-sky-600 px-4 text-xs font-semibold text-white"
            >
              Save New Template ({tripItems.length} items)
            </button>
          </form>
        </div>
      </Modal>

      <ConfirmDialog
        open={!!deletingItem}
        onClose={() => setDeletingItem(null)}
        onConfirm={async () => {
          if (deletingItem) {
            await deletePackingItem(deletingItem.id);
            showToast(`Removed "${deletingItem.name}"`, 'info');
          }
        }}
        title="Delete Packing Item?"
        message={`Remove "${deletingItem?.name}" from your packing checklist?`}
        confirmLabel="Delete"
      />
    </div>
  );
};
