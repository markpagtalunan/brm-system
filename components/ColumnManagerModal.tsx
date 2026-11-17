'use client';

import { useState, useEffect } from 'react';
import { X, ChevronUp, ChevronDown, Trash2, Plus } from 'lucide-react';
import { ColumnConfig } from '@/types/columnConfig';
import { cn } from '@/lib/utils';

interface ColumnManagerModalProps {
  open: boolean;
  columns: ColumnConfig[];
  onClose: () => void;
  onSave: (cols: ColumnConfig[]) => Promise<void>;
}

export function ColumnManagerModal({ open, columns, onClose, onSave }: ColumnManagerModalProps) {
  const [localCols, setLocalCols] = useState<ColumnConfig[]>([]);
  const [newLabel, setNewLabel] = useState('');
  const [newType, setNewType] = useState<'text' | 'number' | 'date'>('text');
  const [saving, setSaving] = useState(false);
  const [confirmDelete, setConfirmDelete] = useState<string | null>(null);

  useEffect(() => {
    if (open) {
      setLocalCols([...columns].sort((a, b) => a.order - b.order));
      setNewLabel('');
      setNewType('text');
      setConfirmDelete(null);
    }
  }, [open, columns]);

  if (!open) return null;

  function reorder(cols: ColumnConfig[]): ColumnConfig[] {
    return cols.map((c, i) => ({ ...c, order: i }));
  }

  async function moveUp(index: number) {
    if (index === 0) return;
    const next = [...localCols];
    [next[index - 1], next[index]] = [next[index], next[index - 1]];
    const reordered = reorder(next);
    setLocalCols(reordered);
    setSaving(true);
    await onSave(reordered);
    setSaving(false);
  }

  async function moveDown(index: number) {
    if (index === localCols.length - 1) return;
    const next = [...localCols];
    [next[index], next[index + 1]] = [next[index + 1], next[index]];
    const reordered = reorder(next);
    setLocalCols(reordered);
    setSaving(true);
    await onSave(reordered);
    setSaving(false);
  }

  async function toggle(id: string, field: 'showInTracker' | 'showInFinished' | 'showInForm', value: boolean) {
    const updated = localCols.map((c) => (c.id === id ? { ...c, [field]: value } : c));
    setLocalCols(updated);
    setSaving(true);
    await onSave(updated);
    setSaving(false);
  }

  async function confirmAndDelete() {
    if (!confirmDelete) return;
    const updated = localCols.filter((c) => c.fieldKey !== confirmDelete);
    const reordered = reorder(updated);
    setLocalCols(reordered);
    setConfirmDelete(null);
    setSaving(true);
    await onSave(reordered);
    setSaving(false);
  }

  async function addColumn() {
    if (!newLabel.trim()) return;
    const fieldKey = `custom_${Date.now()}`;
    const newCol: ColumnConfig = {
      id: fieldKey,
      label: newLabel.trim(),
      fieldKey,
      type: newType,
      isCore: false,
      showInTracker: true,
      showInFinished: true,
      showInForm: true,
      order: localCols.length,
    };
    const updated = [...localCols, newCol];
    setLocalCols(updated);
    setNewLabel('');
    setSaving(true);
    await onSave(updated);
    setSaving(false);
  }

  const toggleBtn = (active: boolean, label: string, onClick: () => void) => (
    <button
      onClick={onClick}
      title={label}
      className={cn(
        'text-[10px] font-semibold px-1.5 py-0.5 rounded border transition-colors',
        active
          ? 'bg-blue-100 border-blue-300 text-blue-700'
          : 'bg-gray-100 border-gray-200 text-gray-400 hover:text-gray-600'
      )}
    >
      {label}
    </button>
  );

  return (
    <div
      className="fixed inset-0 z-50 flex items-center justify-center bg-black/50"
      onClick={(e) => e.target === e.currentTarget && onClose()}
    >
      <div className="bg-white rounded-2xl shadow-2xl w-full max-w-lg mx-4 max-h-[85vh] flex flex-col">
        {/* Header */}
        <div className="px-6 py-4 border-b border-gray-100 flex items-center justify-between flex-shrink-0">
          <div>
            <h2 className="text-base font-bold text-gray-900">Manage Columns</h2>
            <p className="text-xs text-gray-400 mt-0.5">Reorder, show/hide, and add custom columns</p>
          </div>
          <div className="flex items-center gap-2">
            {saving && <span className="text-xs text-gray-400">Saving…</span>}
            <button onClick={onClose} className="p-2 hover:bg-gray-100 rounded-lg transition-colors">
              <X className="w-4 h-4 text-gray-400" />
            </button>
          </div>
        </div>

        {/* Column list */}
        <div className="overflow-y-auto flex-1 px-4 py-3">
          {/* Legend */}
          <div className="flex items-center justify-end gap-1 mb-2 pr-6">
            <span className="text-[10px] text-gray-400 mr-1">Toggle:</span>
            <span className="text-[10px] font-semibold bg-blue-100 border border-blue-300 text-blue-700 px-1.5 py-0.5 rounded">T</span>
            <span className="text-[10px] text-gray-400">Tracker</span>
            <span className="text-[10px] font-semibold bg-blue-100 border border-blue-300 text-blue-700 px-1.5 py-0.5 rounded ml-1">F</span>
            <span className="text-[10px] text-gray-400">Finished</span>
            <span className="text-[10px] font-semibold bg-blue-100 border border-blue-300 text-blue-700 px-1.5 py-0.5 rounded ml-1">Form</span>
            <span className="text-[10px] text-gray-400">Form</span>
          </div>

          <div className="space-y-1">
            {localCols.map((col, index) => (
              <div
                key={col.id}
                className="flex items-center gap-2 px-2 py-2 rounded-lg hover:bg-gray-50 group"
              >
                {/* Up/Down */}
                <div className="flex flex-col gap-0.5 flex-shrink-0">
                  <button
                    onClick={() => moveUp(index)}
                    disabled={index === 0}
                    className="p-0.5 rounded hover:bg-gray-200 disabled:opacity-20 disabled:cursor-not-allowed transition-colors"
                  >
                    <ChevronUp className="w-3 h-3 text-gray-500" />
                  </button>
                  <button
                    onClick={() => moveDown(index)}
                    disabled={index === localCols.length - 1}
                    className="p-0.5 rounded hover:bg-gray-200 disabled:opacity-20 disabled:cursor-not-allowed transition-colors"
                  >
                    <ChevronDown className="w-3 h-3 text-gray-500" />
                  </button>
                </div>

                {/* Label */}
                <span className="flex-1 text-sm text-gray-700 truncate">
                  {col.label}
                  {!col.isCore && (
                    <span className="ml-1.5 text-[10px] text-gray-400 font-normal">custom</span>
                  )}
                </span>

                {/* Toggles */}
                <div className="flex items-center gap-1 flex-shrink-0">
                  {toggleBtn(col.showInTracker, 'T', () => toggle(col.id, 'showInTracker', !col.showInTracker))}
                  {toggleBtn(col.showInFinished, 'F', () => toggle(col.id, 'showInFinished', !col.showInFinished))}
                  {toggleBtn(col.showInForm, 'Form', () => toggle(col.id, 'showInForm', !col.showInForm))}
                </div>

                {/* Delete (custom only) */}
                {!col.isCore ? (
                  <button
                    onClick={() => setConfirmDelete(col.fieldKey)}
                    className="p-1 hover:bg-red-50 rounded text-red-400 hover:text-red-600 transition-colors flex-shrink-0"
                    title="Delete column"
                  >
                    <Trash2 className="w-3.5 h-3.5" />
                  </button>
                ) : (
                  <div className="w-5 flex-shrink-0" />
                )}
              </div>
            ))}
          </div>

          {/* Delete confirmation */}
          {confirmDelete && (
            <div className="mt-3 p-3 bg-red-50 border border-red-200 rounded-xl text-sm">
              <p className="text-red-800 font-medium mb-1">Delete this column?</p>
              <p className="text-red-600 text-xs mb-3">
                This will hide the column from all tables. Existing data for this column will be kept on bike records.
              </p>
              <div className="flex gap-2">
                <button
                  onClick={confirmAndDelete}
                  className="px-3 py-1.5 text-xs font-semibold bg-red-600 hover:bg-red-700 text-white rounded-lg transition-colors"
                >
                  Delete
                </button>
                <button
                  onClick={() => setConfirmDelete(null)}
                  className="px-3 py-1.5 text-xs font-medium border border-gray-200 text-gray-600 hover:bg-gray-50 rounded-lg transition-colors"
                >
                  Cancel
                </button>
              </div>
            </div>
          )}

          {/* Add column */}
          <div className="mt-4 pt-3 border-t border-gray-100">
            <p className="text-xs font-semibold text-gray-500 uppercase tracking-wider mb-2 flex items-center gap-1.5">
              <Plus className="w-3.5 h-3.5" /> Add Column
            </p>
            <div className="flex gap-2">
              <input
                type="text"
                placeholder="Column name..."
                value={newLabel}
                onChange={(e) => setNewLabel(e.target.value)}
                onKeyDown={(e) => e.key === 'Enter' && addColumn()}
                className="flex-1 px-3 py-2 text-sm border border-gray-200 rounded-lg focus:outline-none focus:ring-2 focus:ring-blue-500"
              />
              <select
                value={newType}
                onChange={(e) => setNewType(e.target.value as 'text' | 'number' | 'date')}
                className="px-3 py-2 text-sm border border-gray-200 rounded-lg focus:outline-none focus:ring-2 focus:ring-blue-500 text-gray-600"
              >
                <option value="text">Text</option>
                <option value="number">Number</option>
                <option value="date">Date</option>
              </select>
              <button
                onClick={addColumn}
                disabled={!newLabel.trim()}
                className="px-4 py-2 text-sm font-semibold bg-blue-600 hover:bg-blue-700 disabled:opacity-40 text-white rounded-lg transition-colors"
              >
                Add
              </button>
            </div>
          </div>
        </div>
      </div>
    </div>
  );
}
