'use client';

import { useState, useMemo, useRef, useEffect } from 'react';
import { Plus, Search, Pencil, CheckCircle2, Trash2, SlidersHorizontal, ChevronUp, ChevronDown, ChevronsUpDown, Settings2 } from 'lucide-react';
import { getDaysUntilExpiry, getExpiryStatus } from '@/lib/bikes';
import { Bike, BikeFormData } from '@/types/bike';
import { ColumnConfig } from '@/types/columnConfig';
import { formatDate, cn } from '@/lib/utils';
import { renderCell } from '@/lib/renderCell';
import { AddBikeModal } from './AddBikeModal';
import { MarkFinishedModal } from './MarkFinishedModal';
import { ColumnManagerModal } from './ColumnManagerModal';

interface TrackerProps {
  bikes: Bike[];
  columns: ColumnConfig[];
  isAdmin: boolean;
  onAdd: (data: BikeFormData) => Promise<void>;
  onEdit: (id: string, data: Partial<BikeFormData>) => Promise<void>;
  onDelete: (id: string) => Promise<void>;
  onMarkFinished: (id: string, dateFinished: string, newExpiry: string, remarks: string, extraFields?: Record<string, string>) => Promise<void>;
  onUpdateColumns: (cols: ColumnConfig[]) => Promise<void>;
}

const CATEGORIES = ['DXB1', 'DXB2', 'SHJ', 'AJM', 'RAK', 'FUJ', 'UAQ'];
const PENDING_STATUSES = ['UNDER PASSING FOR RENEWAL', 'ON HIRE', 'REPLACEMENT READY TO RENT', 'WAITING FOR DOCUMENTS'];
const EXPIRY_OPTIONS = [
  { label: 'All Expiry', value: '' },
  { label: 'Overdue', value: 'overdue' },
  { label: 'Within 7 days', value: '7' },
  { label: 'Within 30 days', value: '30' },
  { label: 'Within 60 days', value: '60' },
  { label: 'Within 90 days', value: '90' },
];

const FILTER_OPTIONS = [
  { key: 'category', label: 'Category' },
  { key: 'status', label: 'Pending Remarks' },
  { key: 'subStatus', label: 'Sub Status' },
  { key: 'expiry', label: 'Expiry Range' },
  { key: 'year', label: 'Year' },
];

type SortKey = string | null;
type SortDir = 'asc' | 'desc';

function SortIcon({ active, dir }: { active: boolean; dir: SortDir }) {
  if (!active) return <ChevronsUpDown className="w-3 h-3 text-gray-400 inline ml-1 opacity-50" />;
  return dir === 'asc'
    ? <ChevronUp className="w-3 h-3 text-blue-500 inline ml-1" />
    : <ChevronDown className="w-3 h-3 text-blue-500 inline ml-1" />;
}

const PER_PAGE = 10;

export function Tracker({ bikes, columns, isAdmin, onAdd, onEdit, onDelete, onMarkFinished, onUpdateColumns }: TrackerProps) {
  const [search, setSearch] = useState('');
  const [filterCat, setFilterCat] = useState('');
  const [filterStatus, setFilterStatus] = useState('');
  const [filterSubStatus, setFilterSubStatus] = useState('');
  const [filterExpiry, setFilterExpiry] = useState('');
  const [filterYear, setFilterYear] = useState('');
  const [enabledFilters, setEnabledFilters] = useState<string[]>(['category', 'status', 'expiry']);
  const [showFilterPanel, setShowFilterPanel] = useState(false);
  const [sortKey, setSortKey] = useState<SortKey>(null);
  const [sortDir, setSortDir] = useState<SortDir>('asc');
  const [page, setPage] = useState(1);
  const [showAdd, setShowAdd] = useState(false);
  const [editBike, setEditBike] = useState<Bike | null>(null);
  const [finishBike, setFinishBike] = useState<Bike | null>(null);
  const [showColumnManager, setShowColumnManager] = useState(false);

  const filterPanelRef = useRef<HTMLDivElement>(null);

  useEffect(() => {
    function handleClick(e: MouseEvent) {
      if (filterPanelRef.current && !filterPanelRef.current.contains(e.target as Node)) {
        setShowFilterPanel(false);
      }
    }
    if (showFilterPanel) document.addEventListener('mousedown', handleClick);
    return () => document.removeEventListener('mousedown', handleClick);
  }, [showFilterPanel]);

  const displayColumns = useMemo(
    () => columns.filter((c) => c.showInTracker).sort((a, b) => a.order - b.order),
    [columns]
  );

  const years = useMemo(
    () => [...new Set(bikes.map((b) => b.year).filter(Boolean))].sort((a, b) => b - a),
    [bikes]
  );
  const subStatuses = useMemo(
    () => [...new Set(bikes.map((b) => b.subStatus).filter(Boolean))].sort(),
    [bikes]
  );

  function handleSort(key: SortKey) {
    if (!key) return;
    if (sortKey === key) setSortDir((d) => (d === 'asc' ? 'desc' : 'asc'));
    else { setSortKey(key); setSortDir('asc'); }
    setPage(1);
  }

  function toggleFilter(key: string, checked: boolean) {
    setEnabledFilters((prev) => checked ? [...prev, key] : prev.filter((k) => k !== key));
    if (!checked) {
      if (key === 'category') setFilterCat('');
      if (key === 'status') setFilterStatus('');
      if (key === 'subStatus') setFilterSubStatus('');
      if (key === 'expiry') setFilterExpiry('');
      if (key === 'year') setFilterYear('');
    }
  }

  const filtered = useMemo(() => {
    return bikes.filter((b) => {
      const q = search.toLowerCase();
      const matchSearch =
        !q ||
        String(b.bikeNumber).includes(q) ||
        (b.chassisNo?.toLowerCase().includes(q) ?? false) ||
        (b.fullReg?.toLowerCase().includes(q) ?? false) ||
        (b.tcNo?.toLowerCase().includes(q) ?? false) ||
        (b.newNumber?.toLowerCase().includes(q) ?? false);
      const matchCat = !filterCat || b.category === filterCat;
      const matchStatus = !filterStatus || b.pendingRemarks === filterStatus;
      const matchSub = !filterSubStatus || b.subStatus === filterSubStatus;
      const matchYear = !filterYear || String(b.year) === filterYear;
      let matchExpiry = true;
      if (filterExpiry) {
        const days = getDaysUntilExpiry(b.registrationExpiryDate);
        if (filterExpiry === 'overdue') matchExpiry = days < 0;
        else matchExpiry = days >= 0 && days <= Number(filterExpiry);
      }
      return matchSearch && matchCat && matchStatus && matchSub && matchYear && matchExpiry;
    });
  }, [bikes, search, filterCat, filterStatus, filterSubStatus, filterYear, filterExpiry]);

  const sorted = useMemo(() => {
    if (!sortKey) return filtered;
    return [...filtered].sort((a, b) => {
      const av = sortKey in a
        ? a[sortKey as keyof Bike]
        : a.extraFields?.[sortKey] ?? '';
      const bv = sortKey in b
        ? b[sortKey as keyof Bike]
        : b.extraFields?.[sortKey] ?? '';
      if (typeof av === 'number' && typeof bv === 'number')
        return sortDir === 'asc' ? av - bv : bv - av;
      const as = String(av ?? '').toLowerCase();
      const bs = String(bv ?? '').toLowerCase();
      return sortDir === 'asc' ? as.localeCompare(bs) : bs.localeCompare(as);
    });
  }, [filtered, sortKey, sortDir]);

  const totalPages = Math.ceil(sorted.length / PER_PAGE);
  const paginated = sorted.slice((page - 1) * PER_PAGE, page * PER_PAGE);

  const activeFilterCount = [filterCat, filterStatus, filterSubStatus, filterExpiry, filterYear].filter(Boolean).length;

  const sortedByLabel = displayColumns.find((c) => c.fieldKey === sortKey)?.label;

  return (
    <div className="p-6">
      {/* Filter bar */}
      <div className="bg-white rounded-xl border border-gray-200 p-4 mb-4">
        <div className="flex items-center gap-3 flex-wrap">
          <div className="flex-1 min-w-56 relative">
            <Search className="w-4 h-4 text-gray-400 absolute left-3 top-1/2 -translate-y-1/2" />
            <input
              type="text"
              placeholder="Search bike no, chassis, TC no, full reg..."
              className="w-full pl-9 pr-4 py-2 text-sm border border-gray-200 rounded-lg focus:outline-none focus:ring-2 focus:ring-blue-500"
              value={search}
              onChange={(e) => { setSearch(e.target.value); setPage(1); }}
            />
          </div>

          {enabledFilters.includes('category') && (
            <select
              className="text-sm border border-gray-200 rounded-lg px-3 py-2 focus:outline-none focus:ring-2 focus:ring-blue-500 text-gray-600"
              value={filterCat}
              onChange={(e) => { setFilterCat(e.target.value); setPage(1); }}
            >
              <option value="">All Categories</option>
              {CATEGORIES.map((c) => <option key={c}>{c}</option>)}
            </select>
          )}

          {enabledFilters.includes('status') && (
            <select
              className="text-sm border border-gray-200 rounded-lg px-3 py-2 focus:outline-none focus:ring-2 focus:ring-blue-500 text-gray-600"
              value={filterStatus}
              onChange={(e) => { setFilterStatus(e.target.value); setPage(1); }}
            >
              <option value="">All Status</option>
              {PENDING_STATUSES.map((s) => <option key={s}>{s}</option>)}
            </select>
          )}

          {enabledFilters.includes('subStatus') && subStatuses.length > 0 && (
            <select
              className="text-sm border border-gray-200 rounded-lg px-3 py-2 focus:outline-none focus:ring-2 focus:ring-blue-500 text-gray-600"
              value={filterSubStatus}
              onChange={(e) => { setFilterSubStatus(e.target.value); setPage(1); }}
            >
              <option value="">All Sub Status</option>
              {subStatuses.map((s) => <option key={s}>{s}</option>)}
            </select>
          )}

          {enabledFilters.includes('year') && years.length > 0 && (
            <select
              className="text-sm border border-gray-200 rounded-lg px-3 py-2 focus:outline-none focus:ring-2 focus:ring-blue-500 text-gray-600"
              value={filterYear}
              onChange={(e) => { setFilterYear(e.target.value); setPage(1); }}
            >
              <option value="">All Years</option>
              {years.map((y) => <option key={y}>{y}</option>)}
            </select>
          )}

          {enabledFilters.includes('expiry') && (
            <select
              className="text-sm border border-gray-200 rounded-lg px-3 py-2 focus:outline-none focus:ring-2 focus:ring-blue-500 text-gray-600"
              value={filterExpiry}
              onChange={(e) => { setFilterExpiry(e.target.value); setPage(1); }}
            >
              {EXPIRY_OPTIONS.map((o) => <option key={o.value} value={o.value}>{o.label}</option>)}
            </select>
          )}

          {/* Filter settings toggle */}
          <div className="relative" ref={filterPanelRef}>
            <button
              onClick={() => setShowFilterPanel((v) => !v)}
              className={cn(
                'p-2 rounded-lg border transition-colors relative',
                showFilterPanel
                  ? 'bg-blue-50 border-blue-200 text-blue-600'
                  : 'border-gray-200 text-gray-500 hover:bg-gray-50'
              )}
              title="Customize filters"
            >
              <SlidersHorizontal className="w-4 h-4" />
              {activeFilterCount > 0 && (
                <span className="absolute -top-1 -right-1 w-4 h-4 bg-blue-600 text-white text-[9px] font-bold rounded-full flex items-center justify-center">
                  {activeFilterCount}
                </span>
              )}
            </button>

            {showFilterPanel && (
              <div className="absolute right-0 top-11 z-30 bg-white border border-gray-200 rounded-xl shadow-xl p-4 w-56">
                <p className="text-xs font-semibold text-gray-500 uppercase tracking-wider mb-3">Show Filters</p>
                <div className="space-y-1">
                  {FILTER_OPTIONS.map((f) => (
                    <label key={f.key} className="flex items-center gap-2.5 py-1.5 cursor-pointer group">
                      <input
                        type="checkbox"
                        checked={enabledFilters.includes(f.key)}
                        onChange={(e) => toggleFilter(f.key, e.target.checked)}
                        className="w-4 h-4 rounded accent-blue-600 cursor-pointer"
                      />
                      <span className="text-sm text-gray-700 group-hover:text-blue-600">{f.label}</span>
                    </label>
                  ))}
                </div>
                {activeFilterCount > 0 && (
                  <button
                    onClick={() => { setFilterCat(''); setFilterStatus(''); setFilterSubStatus(''); setFilterExpiry(''); setFilterYear(''); setPage(1); }}
                    className="mt-3 w-full text-xs text-red-500 hover:text-red-700 py-1.5 border border-red-100 hover:border-red-200 rounded-lg transition-colors"
                  >
                    Clear all filters
                  </button>
                )}
              </div>
            )}
          </div>

          {/* Manage columns (admin only) */}
          {isAdmin && (
            <button
              onClick={() => setShowColumnManager(true)}
              className="p-2 rounded-lg border border-gray-200 text-gray-500 hover:bg-gray-50 transition-colors"
              title="Manage columns"
            >
              <Settings2 className="w-4 h-4" />
            </button>
          )}

          <button
            onClick={() => setShowAdd(true)}
            className="ml-auto bg-blue-600 hover:bg-blue-700 text-white text-sm font-medium px-4 py-2 rounded-lg flex items-center gap-2 transition-colors"
          >
            <Plus className="w-4 h-4" /> Add Bike
          </button>
        </div>
      </div>

      {/* Results summary */}
      <div className="flex items-center justify-between mb-2 px-1">
        <span className="text-xs text-gray-400">
          {filtered.length} bike{filtered.length !== 1 ? 's' : ''} found
          {activeFilterCount > 0 && <span className="text-blue-500"> (filtered)</span>}
        </span>
        {sortKey && sortedByLabel && (
          <span className="text-xs text-gray-400">
            Sorted by <span className="text-gray-600 font-medium">{sortedByLabel}</span> {sortDir === 'asc' ? '↑' : '↓'}
          </span>
        )}
      </div>

      {/* Table */}
      <div className="bg-white rounded-xl border border-gray-200 overflow-hidden">
        <div className="overflow-x-auto">
          <table className="w-full text-sm">
            <thead>
              <tr className="bg-gray-50 text-xs text-gray-500 border-b border-gray-200">
                {displayColumns.map((col) => (
                  <th
                    key={col.id}
                    onClick={() => handleSort(col.fieldKey)}
                    className="text-left px-4 py-3.5 font-semibold uppercase tracking-wider whitespace-nowrap select-none cursor-pointer hover:text-gray-800 hover:bg-gray-100 transition-colors"
                  >
                    {col.label}
                    <SortIcon active={sortKey === col.fieldKey} dir={sortDir} />
                  </th>
                ))}
                <th className="text-left px-4 py-3.5 font-semibold uppercase tracking-wider whitespace-nowrap select-none">
                  Actions
                </th>
              </tr>
            </thead>
            <tbody className="divide-y divide-gray-100">
              {paginated.length === 0 ? (
                <tr>
                  <td colSpan={displayColumns.length + 1} className="px-4 py-10 text-center text-gray-400">
                    No bikes found
                  </td>
                </tr>
              ) : (
                paginated.map((bike) => {
                  const days = getDaysUntilExpiry(bike.registrationExpiryDate);
                  const expiryStatus = getExpiryStatus(days);
                  return (
                    <tr
                      key={bike.id}
                      className={cn(
                        'hover:brightness-95 transition-all',
                        expiryStatus === 'danger' ? 'bg-red-50' : expiryStatus === 'warning' ? 'bg-yellow-50' : ''
                      )}
                    >
                      {displayColumns.map((col) => (
                        <td key={col.id} className="px-4 py-3">
                          {renderCell(col, bike, 'tracker')}
                        </td>
                      ))}
                      <td className="px-4 py-3">
                        <div className="flex items-center gap-1">
                          <button
                            onClick={() => setEditBike(bike)}
                            className="p-1.5 hover:bg-blue-50 rounded-lg text-blue-600 transition-colors"
                            title="Edit"
                          >
                            <Pencil className="w-4 h-4" />
                          </button>
                          <button
                            onClick={() => setFinishBike(bike)}
                            className="p-1.5 hover:bg-green-50 rounded-lg text-green-600 transition-colors"
                            title="Mark as Finished"
                          >
                            <CheckCircle2 className="w-4 h-4" />
                          </button>
                          <button
                            onClick={() => { if (confirm('Delete this bike?')) onDelete(bike.id!); }}
                            className="p-1.5 hover:bg-red-50 rounded-lg text-red-500 transition-colors"
                            title="Delete"
                          >
                            <Trash2 className="w-4 h-4" />
                          </button>
                        </div>
                      </td>
                    </tr>
                  );
                })
              )}
            </tbody>
          </table>
        </div>

        {sorted.length > PER_PAGE && (
          <div className="px-5 py-3 border-t border-gray-100 flex items-center justify-between">
            <span className="text-xs text-gray-400">
              Showing {(page - 1) * PER_PAGE + 1}–{Math.min(page * PER_PAGE, sorted.length)} of {sorted.length}
            </span>
            <Pagination page={page} total={totalPages} onChange={setPage} />
          </div>
        )}
      </div>

      <AddBikeModal open={showAdd} onClose={() => setShowAdd(false)} onSubmit={onAdd} columns={columns} />
      <AddBikeModal
        open={!!editBike}
        onClose={() => setEditBike(null)}
        onSubmit={(data) => onEdit(editBike!.id!, data)}
        editBike={editBike}
        columns={columns}
      />
      <MarkFinishedModal
        open={!!finishBike}
        bike={finishBike}
        onClose={() => setFinishBike(null)}
        columns={columns}
        onSubmit={(id, df, ne, r, ef?) => onMarkFinished(id, df, ne, r, ef)}
      />
      <ColumnManagerModal
        open={showColumnManager}
        columns={columns}
        onClose={() => setShowColumnManager(false)}
        onSave={async (cols) => { await onUpdateColumns(cols); setShowColumnManager(false); }}
      />
    </div>
  );
}

function Pagination({ page, total, onChange }: { page: number; total: number; onChange: (p: number) => void }) {
  const pages = buildPageRange(page, total);
  return (
    <div className="flex items-center gap-1">
      <button
        onClick={() => onChange(Math.max(1, page - 1))}
        disabled={page === 1}
        className="text-xs px-3 py-1.5 border border-gray-200 rounded-lg text-gray-500 hover:bg-gray-50 disabled:opacity-40"
      >
        Previous
      </button>
      {pages.map((p, i) =>
        p === '...' ? (
          <span key={`ellipsis-${i}`} className="text-xs px-2 text-gray-400">…</span>
        ) : (
          <button
            key={p}
            onClick={() => onChange(p as number)}
            className={cn(
              'text-xs px-3 py-1.5 rounded-lg',
              p === page ? 'bg-blue-600 text-white' : 'border border-gray-200 text-gray-500 hover:bg-gray-50'
            )}
          >
            {p}
          </button>
        )
      )}
      <button
        onClick={() => onChange(Math.min(total, page + 1))}
        disabled={page === total}
        className="text-xs px-3 py-1.5 border border-gray-200 rounded-lg text-gray-500 hover:bg-gray-50 disabled:opacity-40"
      >
        Next
      </button>
    </div>
  );
}

function buildPageRange(current: number, total: number): (number | '...')[] {
  if (total <= 7) return Array.from({ length: total }, (_, i) => i + 1);
  const pages: (number | '...')[] = [1];
  if (current > 3) pages.push('...');
  for (let i = Math.max(2, current - 1); i <= Math.min(total - 1, current + 1); i++) pages.push(i);
  if (current < total - 2) pages.push('...');
  pages.push(total);
  return pages;
}
