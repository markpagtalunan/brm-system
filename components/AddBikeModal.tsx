'use client';

import { useState, useEffect } from 'react';
import { X } from 'lucide-react';
import { Bike, BikeFormData } from '@/types/bike';
import { cn } from '@/lib/utils';

interface AddBikeModalProps {
  open: boolean;
  onClose: () => void;
  onSubmit: (data: BikeFormData) => Promise<void>;
  editBike?: Bike | null;
}

const CATEGORIES = ['DXB1', 'DXB2', 'SHJ', 'AJM', 'RAK', 'FUJ', 'UAQ'];
const PENDING_REMARKS = [
  'UNDER PASSING FOR RENEWAL',
  'ON HIRE',
  'REPLACEMENT READY TO RENT',
  'WAITING FOR DOCUMENTS',
];
const YEARS = Array.from({ length: 15 }, (_, i) => new Date().getFullYear() - i);

const empty: BikeFormData = {
  srl: 0,
  passingDate: '',
  bikeNumber: 0,
  category: '',
  newNumber: '',
  chassisNo: '',
  tcNo: '',
  year: new Date().getFullYear(),
  registrationExpiryDate: '',
  renewalRemarks: '',
  subStatus: '',
  dateFinished: '',
  newExpiryDate: '',
  pendingRemarks: '',
  status: 'tracker',
};

export function AddBikeModal({ open, onClose, onSubmit, editBike }: AddBikeModalProps) {
  const [form, setForm] = useState<BikeFormData>(empty);
  const [loading, setLoading] = useState(false);

  useEffect(() => {
    if (open) {
      setForm(editBike ? { ...editBike } as BikeFormData : empty);
    }
  }, [open, editBike]);

  if (!open) return null;

  const set = (key: keyof BikeFormData, val: unknown) =>
    setForm((f) => ({ ...f, [key]: val }));

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setLoading(true);
    try {
      await onSubmit(form);
      onClose();
    } finally {
      setLoading(false);
    }
  };

  const inputCls = 'w-full px-3 py-2 text-sm border border-gray-200 rounded-lg focus:outline-none focus:ring-2 focus:ring-blue-500 focus:border-transparent';
  const labelCls = 'block text-xs font-semibold text-gray-600 mb-1.5';

  return (
    <div
      className="fixed inset-0 z-50 flex items-center justify-center bg-black/50"
      onClick={(e) => e.target === e.currentTarget && onClose()}
    >
      <div className="bg-white rounded-2xl shadow-2xl w-full max-w-2xl mx-4 max-h-[90vh] overflow-y-auto">
        {/* Header */}
        <div className="px-6 py-5 border-b border-gray-100 flex items-center justify-between sticky top-0 bg-white z-10">
          <div>
            <h2 className="text-lg font-bold text-gray-900">{editBike ? 'Edit Bike' : 'Add New Bike'}</h2>
            <p className="text-xs text-gray-400 mt-0.5">Fill in the registration details</p>
          </div>
          <button onClick={onClose} className="p-2 hover:bg-gray-100 rounded-lg transition-colors">
            <X className="w-5 h-5 text-gray-400" />
          </button>
        </div>

        <form onSubmit={handleSubmit} className="px-6 py-5 space-y-4">
          <div className="grid grid-cols-2 gap-4">
            <div>
              <label className={labelCls}>SRL <span className="text-red-400">*</span></label>
              <input type="number" required className={inputCls} value={form.srl || ''} onChange={(e) => set('srl', Number(e.target.value))} placeholder="e.g. 1" />
            </div>
            <div>
              <label className={labelCls}>Passing Date</label>
              <input type="date" className={inputCls} value={form.passingDate} onChange={(e) => set('passingDate', e.target.value)} />
            </div>
          </div>

          <div className="grid grid-cols-2 gap-4">
            <div>
              <label className={labelCls}>Bike Number <span className="text-red-400">*</span></label>
              <input type="number" required className={inputCls} value={form.bikeNumber || ''} onChange={(e) => set('bikeNumber', Number(e.target.value))} placeholder="e.g. 42096" />
            </div>
            <div>
              <label className={labelCls}>Category <span className="text-red-400">*</span></label>
              <select required className={cn(inputCls, 'text-gray-700')} value={form.category} onChange={(e) => set('category', e.target.value)}>
                <option value="">Select category...</option>
                {CATEGORIES.map((c) => <option key={c}>{c}</option>)}
              </select>
            </div>
          </div>

          <div className="grid grid-cols-2 gap-4">
            <div>
              <label className={labelCls}>Full Registration</label>
              <input type="text" readOnly className={cn(inputCls, 'bg-gray-50 text-gray-400')} value={form.bikeNumber && form.category ? `${form.bikeNumber}${form.category}` : ''} placeholder="Auto-generated" />
            </div>
            <div>
              <label className={labelCls}>New Number</label>
              <input type="text" className={inputCls} value={form.newNumber} onChange={(e) => set('newNumber', e.target.value)} placeholder="If changed" />
            </div>
          </div>

          <div className="grid grid-cols-2 gap-4">
            <div>
              <label className={labelCls}>Chassis No. <span className="text-red-400">*</span></label>
              <input type="text" required className={cn(inputCls, 'font-mono')} value={form.chassisNo} onChange={(e) => set('chassisNo', e.target.value)} placeholder="e.g. MD2A11CX9RCB10294" />
            </div>
            <div>
              <label className={labelCls}>TC No.</label>
              <input type="text" className={cn(inputCls, 'font-mono')} value={form.tcNo} onChange={(e) => set('tcNo', e.target.value)} placeholder="e.g. 50299925" />
            </div>
          </div>

          <div className="grid grid-cols-2 gap-4">
            <div>
              <label className={labelCls}>Year <span className="text-red-400">*</span></label>
              <select required className={cn(inputCls, 'text-gray-700')} value={form.year} onChange={(e) => set('year', Number(e.target.value))}>
                {YEARS.map((y) => <option key={y}>{y}</option>)}
              </select>
            </div>
            <div>
              <label className={labelCls}>Registration Expiry Date <span className="text-red-400">*</span></label>
              <input type="date" required className={inputCls} value={form.registrationExpiryDate} onChange={(e) => set('registrationExpiryDate', e.target.value)} />
            </div>
          </div>

          <div>
            <label className={labelCls}>Renewal Remarks</label>
            <input type="text" className={inputCls} value={form.renewalRemarks} onChange={(e) => set('renewalRemarks', e.target.value)} placeholder="Optional notes..." />
          </div>

          <div>
            <label className={labelCls}>Sub Status</label>
            <input type="text" className={inputCls} value={form.subStatus} onChange={(e) => set('subStatus', e.target.value)} placeholder="Optional sub status..." />
          </div>

          <div>
            <label className={labelCls}>Pending Remarks</label>
            <select className={cn(inputCls, 'text-gray-700')} value={form.pendingRemarks} onChange={(e) => set('pendingRemarks', e.target.value as BikeFormData['pendingRemarks'])}>
              <option value="">Select status...</option>
              {PENDING_REMARKS.map((r) => <option key={r}>{r}</option>)}
            </select>
          </div>

          {/* Footer */}
          <div className="flex items-center justify-end gap-3 pt-2 border-t border-gray-100">
            <button type="button" onClick={onClose} className="px-4 py-2 text-sm font-medium text-gray-600 border border-gray-200 rounded-lg hover:bg-gray-50 transition-colors">
              Cancel
            </button>
            <button type="submit" disabled={loading} className="px-5 py-2 text-sm font-semibold bg-blue-600 hover:bg-blue-700 disabled:opacity-50 text-white rounded-lg transition-colors flex items-center gap-2">
              {loading ? 'Saving...' : editBike ? 'Save Changes' : 'Add to Tracker'}
            </button>
          </div>
        </form>
      </div>
    </div>
  );
}
