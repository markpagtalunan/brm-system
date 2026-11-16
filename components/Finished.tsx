'use client';

import { useState } from 'react';
import { Search, Trash2 } from 'lucide-react';
import { Bike } from '@/types/bike';
import { formatDate, cn } from '@/lib/utils';

interface FinishedProps {
  bikes: Bike[];
  onDelete: (id: string) => Promise<void>;
}

const CATEGORIES = ['DXB1', 'DXB2', 'SHJ', 'AJM', 'RAK', 'FUJ', 'UAQ'];

export function Finished({ bikes, onDelete }: FinishedProps) {
  const [search, setSearch] = useState('');
  const [filterCat, setFilterCat] = useState('');
  const [page, setPage] = useState(1);
  const PER_PAGE = 10;

  const filtered = bikes.filter((b) => {
    const q = search.toLowerCase();
    const matchSearch = !q || String(b.bikeNumber).includes(q) || b.chassisNo.toLowerCase().includes(q) || b.fullReg.toLowerCase().includes(q);
    const matchCat = !filterCat || b.category === filterCat;
    return matchSearch && matchCat;
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
        <div className="ml-auto text-sm text-gray-500">
          <span className="font-semibold text-green-600">{bikes.length}</span> completed renewals
        </div>
      </div>

      {/* Table */}
      <div className="bg-white rounded-xl border border-gray-200 overflow-hidden">
        <div className="overflow-x-auto">
          <table className="w-full text-sm">
            <thead>
              <tr className="bg-gray-50 text-xs text-gray-400 border-b border-gray-200">
                {['SRL', 'Bike No.', 'Category', 'Full Reg', 'Chassis No.', 'Year', 'Old Expiry', 'New Expiry', 'Date Finished', 'Remarks', 'Actions'].map((h) => (
                  <th key={h} className="text-left px-4 py-3.5 font-semibold uppercase tracking-wider whitespace-nowrap">{h}</th>
                ))}
              </tr>
            </thead>
            <tbody className="divide-y divide-gray-100">
              {paginated.length === 0 ? (
                <tr><td colSpan={11} className="px-4 py-10 text-center text-gray-400">No finished records found</td></tr>
              ) : paginated.map((bike) => (
                <tr key={bike.id} className="hover:bg-gray-50 transition-colors">
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
                  <td className="px-4 py-3.5 text-gray-500 line-through text-xs">{formatDate(bike.registrationExpiryDate)}</td>
                  <td className="px-4 py-3.5">
                    <span className="text-green-600 font-medium">{bike.newExpiryDate ? formatDate(bike.newExpiryDate) : '—'}</span>
                  </td>
                  <td className="px-4 py-3.5 text-gray-600">{bike.dateFinished ? formatDate(bike.dateFinished) : '—'}</td>
                  <td className="px-4 py-3.5 text-gray-500 text-xs max-w-32 truncate">{bike.renewalRemarks || '—'}</td>
                  <td className="px-4 py-3.5">
                    <button
                      onClick={() => { if (confirm('Delete this record?')) onDelete(bike.id!) }}
                      className="p-1.5 hover:bg-red-50 rounded-lg text-red-500 transition-colors"
                      title="Delete"
                    >
                      <Trash2 className="w-4 h-4" />
                    </button>
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>

        {/* Pagination */}
        {filtered.length > PER_PAGE && (
          <div className="px-5 py-3 border-t border-gray-100 flex items-center justify-between">
            <span className="text-xs text-gray-400">Showing {(page - 1) * PER_PAGE + 1}–{Math.min(page * PER_PAGE, filtered.length)} of {filtered.length} records</span>
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
    </div>
  );
}
