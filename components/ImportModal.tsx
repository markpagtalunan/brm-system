'use client';

import { useState, useRef } from 'react';
import { X, Upload, FileSpreadsheet, CheckCircle2, AlertCircle, Loader2 } from 'lucide-react';
import * as XLSX from 'xlsx';
import { addBike, deleteAllBikes } from '@/lib/bikes';
import { BikeFormData } from '@/types/bike';
import { cn } from '@/lib/utils';

interface ImportModalProps {
  open: boolean;
  onClose: () => void;
  onDone: () => void;
}

type RowResult = { row: number; bikeNumber: number; status: 'ok' | 'error'; error?: string };

function normalizeHeader(h: string): string {
  return h.toString().trim().toLowerCase().replace(/[\s_\-/]+/g, '');
}

function parseExcelDate(val: unknown): string {
  if (!val) return '';
  if (typeof val === 'number') {
    // Excel serial date
    const date = XLSX.SSF.parse_date_code(val);
    if (date) {
      const y = date.y;
      const m = String(date.m).padStart(2, '0');
      const d = String(date.d).padStart(2, '0');
      return `${y}-${m}-${d}`;
    }
  }
  if (typeof val === 'string' && val.trim()) {
    const d = new Date(val);
    if (!isNaN(d.getTime())) return d.toISOString().split('T')[0];
  }
  return '';
}

function mapRow(raw: Record<string, unknown>): BikeFormData | null {
  const r: Record<string, unknown> = {};
  for (const [k, v] of Object.entries(raw)) {
    r[normalizeHeader(k)] = v;
  }

  const bikeNumber = Number(r['bikenumber'] ?? r['bikeno'] ?? r['bike#'] ?? 0);
  const category = String(r['category'] ?? r['cat'] ?? '').trim().toUpperCase();
  if (!bikeNumber || !category) return null;

  const pendingRaw = String(r['pendingremarks'] ?? r['pending'] ?? r['remarks'] ?? '').trim().toUpperCase();
  const validRemarks = ['UNDER PASSING FOR RENEWAL', 'ON HIRE', 'REPLACEMENT READY TO RENT', 'WAITING FOR DOCUMENTS'];
  const pendingRemarks = validRemarks.includes(pendingRaw) ? pendingRaw as BikeFormData['pendingRemarks'] : '';

  return {
    srl: Number(r['srl'] ?? r['sr'] ?? r['no'] ?? 0),
    passingDate: parseExcelDate(r['passingdate'] ?? r['passing']),
    bikeNumber,
    category,
    newNumber: String(r['newnumber'] ?? r['newno'] ?? '').trim(),
    chassisNo: String(r['chassisno'] ?? r['chassis'] ?? '').trim(),
    tcNo: String(r['tcno'] ?? r['tc'] ?? '').trim(),
    year: Number(r['year'] ?? new Date().getFullYear()),
    registrationExpiryDate: parseExcelDate(r['registrationexpirydate'] ?? r['expirydate'] ?? r['expiry'] ?? r['registrationexpiry']),
    renewalRemarks: String(r['renewalremarks'] ?? r['renewalremark'] ?? '').trim(),
    subStatus: String(r['substatus'] ?? r['sub'] ?? '').trim(),
    dateFinished: parseExcelDate(r['datefinished'] ?? r['finished']),
    newExpiryDate: parseExcelDate(r['newexpirydate'] ?? r['newexpiry']),
    pendingRemarks,
    status: 'tracker',
  };
}

export function ImportModal({ open, onClose, onDone }: ImportModalProps) {
  const [file, setFile] = useState<File | null>(null);
  const [preview, setPreview] = useState<BikeFormData[]>([]);
  const [sheet, setSheet] = useState('');
  const [sheets, setSheets] = useState<string[]>([]);
  const [results, setResults] = useState<RowResult[]>([]);
  const [importing, setImporting] = useState(false);
  const [done, setDone] = useState(false);
  const [dragOver, setDragOver] = useState(false);
  const [replaceStep, setReplaceStep] = useState<'idle' | 'deleting' | 'importing'>('idle');
  const [deletedCount, setDeletedCount] = useState(0);
  const fileRef = useRef<HTMLInputElement>(null);

  if (!open) return null;

  const handleFile = (f: File) => {
    setFile(f);
    setResults([]);
    setDone(false);
    const reader = new FileReader();
    reader.onload = (e) => {
      const data = new Uint8Array(e.target!.result as ArrayBuffer);
      const wb = XLSX.read(data, { type: 'array', cellDates: false });
      setSheets(wb.SheetNames);
      const firstSheet = wb.SheetNames[0];
      setSheet(firstSheet);
      loadSheet(wb, firstSheet);
    };
    reader.readAsArrayBuffer(f);
  };

  const loadSheet = (wb: XLSX.WorkBook, sheetName: string) => {
    const ws = wb.Sheets[sheetName];
    const rows = XLSX.utils.sheet_to_json<Record<string, unknown>>(ws, { defval: '' });
    const mapped = rows.map(mapRow).filter(Boolean) as BikeFormData[];
    setPreview(mapped);
  };

  const handleSheetChange = (name: string) => {
    setSheet(name);
    if (!file) return;
    const reader = new FileReader();
    reader.onload = (e) => {
      const data = new Uint8Array(e.target!.result as ArrayBuffer);
      const wb = XLSX.read(data, { type: 'array', cellDates: false });
      loadSheet(wb, name);
    };
    reader.readAsArrayBuffer(file);
  };

  const runImport = async (rows: BikeFormData[]) => {
    const res: RowResult[] = [];
    for (let i = 0; i < rows.length; i++) {
      const bike = rows[i];
      try {
        await addBike(bike);
        res.push({ row: i + 1, bikeNumber: bike.bikeNumber, status: 'ok' });
      } catch (err) {
        res.push({ row: i + 1, bikeNumber: bike.bikeNumber, status: 'error', error: String(err) });
      }
      setResults([...res]);
    }
  };

  const handleImport = async () => {
    setImporting(true);
    setResults([]);
    await runImport(preview);
    setImporting(false);
    setDone(true);
  };

  const handleReplaceAll = async () => {
    setImporting(true);
    setResults([]);
    setReplaceStep('deleting');
    const count = await deleteAllBikes();
    setDeletedCount(count);
    setReplaceStep('importing');
    await runImport(preview);
    setReplaceStep('idle');
    setImporting(false);
    setDone(true);
  };

  const success = results.filter((r) => r.status === 'ok').length;
  const errors = results.filter((r) => r.status === 'error').length;

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/50"
      onClick={(e) => e.target === e.currentTarget && !importing && onClose()}>
      <div className="bg-white rounded-2xl shadow-2xl w-full max-w-2xl mx-4 max-h-[90vh] overflow-y-auto">
        {/* Header */}
        <div className="px-6 py-5 border-b border-gray-100 flex items-center justify-between sticky top-0 bg-white z-10">
          <div className="flex items-center gap-3">
            <div className="w-9 h-9 bg-blue-50 rounded-lg flex items-center justify-center">
              <FileSpreadsheet className="w-5 h-5 text-blue-600" />
            </div>
            <div>
              <h2 className="text-lg font-bold text-gray-900">Import from Excel</h2>
              <p className="text-xs text-gray-400 mt-0.5">Upload your MONITORING SHEET.xlsx</p>
            </div>
          </div>
          <button onClick={onClose} disabled={importing} className="p-2 hover:bg-gray-100 rounded-lg transition-colors disabled:opacity-40">
            <X className="w-5 h-5 text-gray-400" />
          </button>
        </div>

        <div className="px-6 py-5 space-y-5">
          {/* Drop zone */}
          {!file && (
            <div
              className={cn(
                'border-2 border-dashed rounded-xl p-10 text-center cursor-pointer transition-colors',
                dragOver ? 'border-blue-400 bg-blue-50' : 'border-gray-200 hover:border-blue-300 hover:bg-gray-50'
              )}
              onClick={() => fileRef.current?.click()}
              onDragOver={(e) => { e.preventDefault(); setDragOver(true); }}
              onDragLeave={() => setDragOver(false)}
              onDrop={(e) => { e.preventDefault(); setDragOver(false); const f = e.dataTransfer.files[0]; if (f) handleFile(f); }}
            >
              <Upload className="w-10 h-10 text-gray-300 mx-auto mb-3" />
              <p className="text-sm font-medium text-gray-600">Drop your Excel file here</p>
              <p className="text-xs text-gray-400 mt-1">or click to browse — .xlsx, .xls supported</p>
              <input ref={fileRef} type="file" accept=".xlsx,.xls" className="hidden" onChange={(e) => { const f = e.target.files?.[0]; if (f) handleFile(f); }} />
            </div>
          )}

          {/* File loaded */}
          {file && (
            <>
              <div className="flex items-center gap-3 p-3 bg-gray-50 rounded-lg">
                <FileSpreadsheet className="w-5 h-5 text-green-600 flex-shrink-0" />
                <div className="flex-1 min-w-0">
                  <p className="text-sm font-medium text-gray-800 truncate">{file.name}</p>
                  <p className="text-xs text-gray-400">{preview.length} rows detected</p>
                </div>
                {!importing && !done && (
                  <button onClick={() => { setFile(null); setPreview([]); setSheets([]); }} className="text-xs text-gray-400 hover:text-red-500 transition-colors">
                    Remove
                  </button>
                )}
              </div>

              {/* Sheet selector */}
              {sheets.length > 1 && (
                <div>
                  <label className="block text-xs font-semibold text-gray-600 mb-1.5">Select Sheet</label>
                  <div className="flex gap-2 flex-wrap">
                    {sheets.map((s) => (
                      <button
                        key={s}
                        onClick={() => handleSheetChange(s)}
                        className={cn(
                          'text-xs px-3 py-1.5 rounded-lg border transition-colors',
                          sheet === s ? 'bg-blue-600 text-white border-blue-600' : 'border-gray-200 text-gray-600 hover:bg-gray-50'
                        )}
                      >
                        {s}
                      </button>
                    ))}
                  </div>
                </div>
              )}

              {/* Preview table */}
              {preview.length > 0 && !done && (
                <div>
                  <p className="text-xs font-semibold text-gray-500 mb-2 uppercase tracking-wide">Preview — first 5 rows</p>
                  <div className="overflow-x-auto rounded-lg border border-gray-100">
                    <table className="w-full text-xs">
                      <thead>
                        <tr className="bg-gray-50 text-gray-400">
                          {['SRL', 'Bike No.', 'Category', 'Chassis No.', 'Expiry Date', 'Pending Remarks'].map((h) => (
                            <th key={h} className="text-left px-3 py-2 font-semibold whitespace-nowrap">{h}</th>
                          ))}
                        </tr>
                      </thead>
                      <tbody className="divide-y divide-gray-50">
                        {preview.slice(0, 5).map((b, i) => (
                          <tr key={i}>
                            <td className="px-3 py-2 text-gray-500">{b.srl}</td>
                            <td className="px-3 py-2 font-semibold text-gray-800">{b.bikeNumber}</td>
                            <td className="px-3 py-2"><span className="bg-blue-100 text-blue-700 px-1.5 py-0.5 rounded text-xs">{b.category}</span></td>
                            <td className="px-3 py-2 font-mono text-gray-500">{b.chassisNo?.slice(0, 14)}</td>
                            <td className="px-3 py-2 text-gray-600">{b.registrationExpiryDate || '—'}</td>
                            <td className="px-3 py-2 text-gray-500">{b.pendingRemarks || '—'}</td>
                          </tr>
                        ))}
                      </tbody>
                    </table>
                  </div>
                  {preview.length > 5 && <p className="text-xs text-gray-400 mt-1.5">...and {preview.length - 5} more rows</p>}
                </div>
              )}

              {/* Progress */}
              {importing && (
                <div className="space-y-2">
                  {replaceStep === 'deleting' && (
                    <div className="flex items-center gap-2 text-sm text-gray-600">
                      <Loader2 className="w-4 h-4 animate-spin text-red-500" />
                      Deleting existing bikes...
                    </div>
                  )}
                  {(replaceStep === 'importing' || replaceStep === 'idle') && (
                    <>
                      <div className="flex items-center gap-2 text-sm text-gray-600">
                        <Loader2 className="w-4 h-4 animate-spin text-blue-500" />
                        {replaceStep === 'importing' && deletedCount > 0
                          ? `Deleted ${deletedCount} — importing ${results.length} of ${preview.length}...`
                          : `Importing ${results.length} of ${preview.length}...`}
                      </div>
                      <div className="w-full bg-gray-100 rounded-full h-2">
                        <div className="bg-blue-500 h-2 rounded-full transition-all" style={{ width: `${(results.length / preview.length) * 100}%` }} />
                      </div>
                    </>
                  )}
                </div>
              )}

              {/* Done summary */}
              {done && (
                <div className={cn('rounded-xl p-4 flex items-start gap-3', errors === 0 ? 'bg-green-50' : 'bg-yellow-50')}>
                  {errors === 0
                    ? <CheckCircle2 className="w-5 h-5 text-green-600 flex-shrink-0 mt-0.5" />
                    : <AlertCircle className="w-5 h-5 text-yellow-600 flex-shrink-0 mt-0.5" />}
                  <div>
                    <p className="text-sm font-semibold text-gray-800">
                      {errors === 0 ? 'Import complete!' : 'Import finished with errors'}
                    </p>
                    <p className="text-xs text-gray-500 mt-0.5">
                      {success} imported successfully{errors > 0 ? `, ${errors} failed` : ''}
                    </p>
                  </div>
                </div>
              )}
            </>
          )}

          {/* Footer */}
          <div className="flex items-center justify-end gap-3 pt-2 border-t border-gray-100">
            <button onClick={done ? onDone : onClose} disabled={importing} className="px-4 py-2 text-sm font-medium text-gray-600 border border-gray-200 rounded-lg hover:bg-gray-50 disabled:opacity-40 transition-colors">
              {done ? 'Close' : 'Cancel'}
            </button>
            {!done && preview.length > 0 && (
              <>
                <button
                  onClick={handleImport}
                  disabled={importing}
                  className="px-5 py-2 text-sm font-semibold bg-blue-600 hover:bg-blue-700 disabled:opacity-50 text-white rounded-lg transition-colors flex items-center gap-2"
                >
                  {importing && replaceStep === 'idle' ? <><Loader2 className="w-4 h-4 animate-spin" /> Importing...</> : `Add ${preview.length} bikes`}
                </button>
                <button
                  onClick={handleReplaceAll}
                  disabled={importing}
                  className="px-5 py-2 text-sm font-semibold bg-red-600 hover:bg-red-700 disabled:opacity-50 text-white rounded-lg transition-colors flex items-center gap-2"
                >
                  {importing && replaceStep !== 'idle' ? <><Loader2 className="w-4 h-4 animate-spin" /> {replaceStep === 'deleting' ? 'Deleting...' : 'Importing...'}</> : `Replace All (${preview.length} bikes)`}
                </button>
              </>
            )}
          </div>
        </div>
      </div>
    </div>
  );
}
