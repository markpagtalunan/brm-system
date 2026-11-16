'use client';

import { useState } from 'react';
import { Plus, Search, Pencil, CheckCircle2, Trash2 } from 'lucide-react';
import { getDaysUntilExpiry, getExpiryStatus } from '@/lib/bikes';
import { Bike } from '@/types/bike';
import { formatDate, cn } from '@/lib/utils';
import { AddBikeModal } from './AddBikeModal';
import { BikeFormData } from '@/types/bike';
import { MarkFinishedModal } from './MarkFinishedModal';

interface TrackerProps {
  bikes: Bike[];
  onAdd: (data: BikeFormData) => Promise<void>;
  onEdit: (id: string, data: Partial<BikeFormData>) => Promise<void>;
  onDelete: (id: string) => Promise<void>;
  onMarkFinished: (id: string, dateFinished: string, newExpiry: string, remarks: string) => Promise<void>;
}

const CATEGORIES = ['DXB1', 'DXB2', 'SHJ', 'AJM', 'RAK', 'FUJ', 'UAQ'];
const STATUSES = ['UNDER PASSING FOR RENEWAL', 'ON HIRE', 'REPLACEMENT READY TO RENT', 'WAITING FOR DOCUMENTS'];

export function Tracker({ bikes, onAdd, onEdit, onDelete, onMarkFinished }: TrackerProps) {
  const [search, setSearch] = useState('');
  const [filterCat, setFilterCat] = useState('');
  const [filterStatus, setFilterStatus] = useState('');
  const [showAdd, setShowAdd] = useState(false);
  const [editBike, setEditBike] = useState<Bike | null>(null);
  const [finishBike, setFinishBike] = useState<Bike | null>(null);
  const [page, setPage] = useState(1);
  const PER_PAGE = 10;

  const filtered = bikes.filter((b) => {
    const q = search.toLowerCase();
    const matchSearch = !q || String(b.bikeNumber).includes(q) || b.chassisNo.toLowerCase().includes(q) || b.fullReg.toLowerCase().includes(q);
    const matchCat = !filterCat || b.category === filterCat;
    const matchStatus = !filterStatus || b.pendingRemarks === filterStatus;
    return matchSearch && matchCat && matchStatus;
  });

  const totalPages = Math.ceil(filtered.length / PER_PAGE);
  const paginated = filtered.slice((page - 1) * PER_PAGE, page * PER_PAGE);

  return (
    <div className="p-8">
      {/* Filters */}
      <div className="bg-white rounded-xl border border-gray-200 p-4 mb-4 flex items-center gap-3 flex-wrap">
        <div className="flex-1 min-w-48 relative">
          <Search className="w-4 h-4 text-gray-400 absolute left-3 top-1/2 -translate-y-1/2" />
          <input
            type="text"
            placeholder="Search bike number, chassis no..."
            className="w-full pl-9 pr-4 py-2 text-sm border border-gray-200 rounded-lg focus:outline-none focus:ring-2 focus:ring-blue-500"
            value={search}
            onChange={(e) => { setSearch(e.target.value); setPage(1); }}
          />
        </div>
        <select
          className="text-sm border border-gray-200 rounded-lg px-3 py-2 focus:outline-none focus:ring-2 focus:ring-blue-500 text-gray-600"
          value={filterCat}
          onChange={(e) => { setFilterCat(e.target.value); setPage(1); }}
        >
          <option value="">All Categories</option>
          {CATEGORIES.map((c) => <option key={c}>{c}</option>)}
        </select>
        <select
          className="text-sm border border-gray-200 rounded-lg px-3 py-2 focus:outline-none focus:ring-2 focus:ring-blue-500 text-gray-600"
          value={filterStatus}
          onChange={(e) => { setFilterStatus(e.target.value); setPage(1); }}
        >
          <option value="">All Status</option>
          {STATUSES.map((s) => <option key={s}>{s}</option>)}
        </select>
        <button
          onClick={() => setShowAdd(true)}
          className="ml-auto bg-blue-600 hover:bg-blue-700 text-white text-sm font-medium px-4 py-2 rounded-lg flex items-center gap-2 transition-colors"
        >
          <Plus className="w-4 h-4" /> Add Bike
        </button>
      </div>

      {/* Table */}
      <div className="bg-white rounded-xl border border-gray-200 overflow-hidden">
        <div className="overflow-x-auto">
          <table className="w-full text-sm">
            <thead>
              <tr className="bg-gray-50 text-xs text-gray-400 border-b border-gray-200">
                {['SRL', 'Bike No.', 'Category', 'Full Reg', 'Chassis No.', 'Year', 'Expiry Date', 'Pending Remarks', 'Actions'].map((h) => (
                  <th key={h} className="text-left px-4 py-3.5 font-semibold uppercase tracking-wider whitespace-nowrap">{h}</th>
                ))}
              </tr>
            </thead>
            <tbody className="divide-y divide-gray-100">
              {paginated.length === 0 ? (
                <tr><td colSpan={9} className="px-4 py-10 text-center text-gray-400">No bikes found</td></tr>
              ) : paginated.map((bike) => {
                const days = getDaysUntilExpiry(bike.registrationExpiryDate);
                const expiryStatus = getExpiryStatus(days);
                return (
                  <tr key={bike.id} className={cn(
                    'hover:brightness-95 transition-all',
                    expiryStatus === 'danger' ? 'bg-red-50' : expiryStatus === 'warning' ? 'bg-yellow-50' : ''
                  )}>
                    <td className="px-4 py-3.5 text-gray-500">{bike.srl}</td>
                    <td className="px-4 py-3.5 font-semibold text-gray-900">{bike.bikeNumber}</td>
                    <td className="px-4 py-3.5">
                      <span className="bg-blue-100 text-blue-700 text-xs font-medium px-2 py-0.5 rounded">
                        {bike.category}
                      </span>
                    </td>
                    <td className="px-4 py-3.5 text-gray-600 font-mono text-xs">{bike.fullReg}</td>
                    <td className="px-4 py-3.5 text-gray-500 font-mono text-xs">{bike.chassisNo?.slice(0, 12)}{bike.chassisNo?.length > 12 ? '...' : ''}</td>
                    <td className="px-4 py-3.5 text-gray-600">{bike.year}</td>
                    <td className="px-4 py-3.5">
                      <div className="flex items-center gap-1.5">
                        <div className={cn('w-2 h-2 rounded-full', expiryStatus === 'danger' ? 'bg-red-500 animate-pulse' : expiryStatus === 'warning' ? 'bg-orange-400' : 'bg-green-400')} />
                        <span className={cn('font-medium', expiryStatus === 'danger' ? 'text-red-600' : expiryStatus === 'warning' ? 'text-orange-500' : 'text-gray-600')}>
                          {formatDate(bike.registrationExpiryDate)}
                        </span>
                      </div>
                    </td>
                    <td className="px-4 py-3.5">
                      {bike.pendingRemarks ? (
                        <span className={cn(
                          'text-xs px-2 py-1 rounded-full whitespace-nowrap',
                          bike.pendingRemarks === 'ON HIRE' ? 'bg-green-100 text-green-700' :
                          bike.pendingRemarks === 'REPLACEMENT READY TO RENT' ? 'bg-blue-100 text-blue-700' :
                          'bg-yellow-100 text-yellow-800'
                        )}>
                          {bike.pendingRemarks}
                        </span>
                      ) : <span className="text-gray-400">—</span>}
                    </td>
                    <td className="px-4 py-3.5">
                      <div className="flex items-center gap-1">
                        <button onClick={() => setEditBike(bike)} className="p-1.5 hover:bg-blue-50 rounded-lg text-blue-600 transition-colors" title="Edit">
                          <Pencil className="w-4 h-4" />
                        </button>
                        <button onClick={() => setFinishBike(bike)} className="p-1.5 hover:bg-green-50 rounded-lg text-green-600 transition-colors" title="Mark as Finished">
                          <CheckCircle2 className="w-4 h-4" />
                        </button>
                        <button onClick={() => { if (confirm('Delete this bike?')) onDelete(bike.id!) }} className="p-1.5 hover:bg-red-50 rounded-lg text-red-500 transition-colors" title="Delete">
                          <Trash2 className="w-4 h-4" />
                        </button>
                      </div>
                    </td>
                  </tr>
                );
              })}
            </tbody>
          </table>
        </div>

        {/* Pagination */}
        {filtered.length > PER_PAGE && (
          <div className="px-5 py-3 border-t border-gray-100 flex items-center justify-between">
            <span className="text-xs text-gray-400">Showing {(page - 1) * PER_PAGE + 1}–{Math.min(page * PER_PAGE, filtered.length)} of {filtered.length} bikes</span>
            <div className="flex items-center gap-1">
              <button onClick={() => setPage((p) => Math.max(1, p - 1))} disabled={page === 1} className="text-xs px-3 py-1.5 border border-gray-200 rounded-lg text-gray-500 hover:bg-gray-50 disabled:opacity-40">Previous</button>
              {Array.from({ length: totalPages }, (_, i) => i + 1).map((p) => (
                <button key={p} onClick={() => setPage(p)} className={cn('text-xs px-3 py-1.5 rounded-lg', p === page ? 'bg-blue-600 text-white' : 'border border-gray-200 text-gray-500 hover:bg-gray-50')}>
                  {p}
                </button>
              ))}
              <button onClick={() => setPage((p) => Math.min(totalPages, p + 1))} disabled={page === totalPages} className="text-xs px-3 py-1.5 border border-gray-200 rounded-lg text-gray-500 hover:bg-gray-50 disabled:opacity-40">Next</button>
            </div>
          </div>
        )}
      </div>

      <AddBikeModal open={showAdd} onClose={() => setShowAdd(false)} onSubmit={onAdd} />
      <AddBikeModal open={!!editBike} onClose={() => setEditBike(null)} onSubmit={(data) => onEdit(editBike!.id!, data)} editBike={editBike} />
      <MarkFinishedModal open={!!finishBike} bike={finishBike} onClose={() => setFinishBike(null)} onSubmit={onMarkFinished} />
    </div>
  );
}
