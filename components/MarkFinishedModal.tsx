'use client';

import { useState } from 'react';
import { X, CheckCircle2 } from 'lucide-react';
import { Bike } from '@/types/bike';
import { ColumnConfig } from '@/types/columnConfig';
import { cn } from '@/lib/utils';

interface MarkFinishedModalProps {
  open: boolean;
  bike: Bike | null;
  onClose: () => void;
  columns: ColumnConfig[];
  onSubmit: (
    id: string,
    dateFinished: string,
    newExpiry: string,
    remarks: string,
    extraFields?: Record<string, string>
  ) => Promise<void>;
}

export function MarkFinishedModal({ open, bike, onClose, columns, onSubmit }: MarkFinishedModalProps) {
  const [dateFinished, setDateFinished] = useState('');
  const [newExpiry, setNewExpiry] = useState('');
  const [remarks, setRemarks] = useState('');
  const [extraFields, setExtraFields] = useState<Record<string, string>>({});
  const [loading, setLoading] = useState(false);

  if (!open || !bike) return null;

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setLoading(true);
    try {
      await onSubmit(bike.id!, dateFinished, newExpiry, remarks, extraFields);
      setDateFinished('');
      setNewExpiry('');
      setRemarks('');
      setExtraFields({});
      onClose();
    } finally {
      setLoading(false);
    }
  };

  const inputCls = 'w-full px-3 py-2 text-sm border border-gray-200 rounded-lg focus:outline-none focus:ring-2 focus:ring-green-500 focus:border-transparent';
  const labelCls = 'block text-xs font-semibold text-gray-600 mb-1.5';

  const customColumns = columns
    .filter((c) => !c.isCore && c.showInForm)
    .sort((a, b) => a.order - b.order);

  return (
    <div
      className="fixed inset-0 z-50 flex items-center justify-center bg-black/50"
      onClick={(e) => e.target === e.currentTarget && onClose()}
    >
      <div className="bg-white rounded-2xl shadow-2xl w-full max-w-md mx-4">
        <div className="px-6 py-5 border-b border-gray-100 flex items-center justify-between">
          <div className="flex items-center gap-3">
            <div className="w-9 h-9 bg-green-50 rounded-lg flex items-center justify-center">
              <CheckCircle2 className="w-5 h-5 text-green-600" />
            </div>
            <div>
              <h2 className="text-lg font-bold text-gray-900">Mark as Finished</h2>
              <p className="text-xs text-gray-400 mt-0.5">Bike #{bike.bikeNumber} — {bike.category}</p>
            </div>
          </div>
          <button onClick={onClose} className="p-2 hover:bg-gray-100 rounded-lg transition-colors">
            <X className="w-5 h-5 text-gray-400" />
          </button>
        </div>

        <form onSubmit={handleSubmit} className="px-6 py-5 space-y-4">
          <div>
            <label htmlFor="dateFinished" className={labelCls}>Date Finished <span className="text-red-400">*</span></label>
            <input
              id="dateFinished"
              type="date"
              required
              className={inputCls}
              value={dateFinished}
              onChange={(e) => setDateFinished(e.target.value)}
            />
          </div>

          <div>
            <label htmlFor="newExpiry" className={labelCls}>New Expiry Date <span className="text-red-400">*</span></label>
            <input
              id="newExpiry"
              type="date"
              required
              className={inputCls}
              value={newExpiry}
              onChange={(e) => setNewExpiry(e.target.value)}
            />
          </div>

          <div>
            <label className={labelCls}>Renewal Remarks</label>
            <input
              type="text"
              className={inputCls}
              value={remarks}
              onChange={(e) => setRemarks(e.target.value)}
              placeholder="Optional notes about renewal..."
            />
          </div>

          {/* Custom columns */}
          {customColumns.map((col) => (
            <div key={col.id}>
              <label className={labelCls}>{col.label}</label>
              <input
                type={col.type === 'number' ? 'number' : col.type === 'date' ? 'date' : 'text'}
                className={inputCls}
                value={extraFields[col.fieldKey] ?? ''}
                onChange={(e) =>
                  setExtraFields((ef) => ({ ...ef, [col.fieldKey]: e.target.value }))
                }
                placeholder={col.label}
              />
            </div>
          ))}

          <div className="flex items-center justify-end gap-3 pt-2 border-t border-gray-100">
            <button
              type="button"
              onClick={onClose}
              className="px-4 py-2 text-sm font-medium text-gray-600 border border-gray-200 rounded-lg hover:bg-gray-50 transition-colors"
            >
              Cancel
            </button>
            <button
              type="submit"
              disabled={loading}
              className="px-5 py-2 text-sm font-semibold bg-green-600 hover:bg-green-700 disabled:opacity-50 text-white rounded-lg transition-colors flex items-center gap-2"
            >
              {loading ? 'Saving...' : 'Mark as Finished'}
            </button>
          </div>
        </form>
      </div>
    </div>
  );
}
