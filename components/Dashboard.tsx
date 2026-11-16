'use client';

import { getDaysUntilExpiry, getExpiryStatus } from '@/lib/bikes';
import { Bike } from '@/types/bike';
import { formatDate, cn } from '@/lib/utils';
import { AlertTriangle, Clock, CheckCircle2, Layers } from 'lucide-react';

interface DashboardProps {
  trackerBikes: Bike[];
  finishedBikes: Bike[];
}

export function Dashboard({ trackerBikes, finishedBikes }: DashboardProps) {
  const allBikes = [...trackerBikes, ...finishedBikes];
  const expiringSoon = trackerBikes
    .map((b) => ({ ...b, days: getDaysUntilExpiry(b.registrationExpiryDate) }))
    .filter((b) => b.days <= 30)
    .sort((a, b) => a.days - b.days);

  const categoryCount = allBikes.reduce<Record<string, number>>((acc, b) => {
    acc[b.category] = (acc[b.category] || 0) + 1;
    return acc;
  }, {});
  const categories = Object.entries(categoryCount).sort((a, b) => b[1] - a[1]);
  const catColors = ['bg-blue-500', 'bg-indigo-500', 'bg-purple-400', 'bg-pink-400', 'bg-cyan-400'];

  const stats = [
    { label: 'Total Bikes', value: allBikes.length, sub: 'All registered bikes', subColor: 'text-gray-400', icon: Layers, iconBg: 'bg-blue-50', iconColor: 'text-blue-600' },
    { label: 'In Tracker', value: trackerBikes.length, sub: 'Active registrations', subColor: 'text-orange-500', icon: Clock, iconBg: 'bg-orange-50', iconColor: 'text-orange-500' },
    { label: 'Expiring Soon', value: expiringSoon.length, sub: 'Within 30 days', subColor: 'text-red-400', icon: AlertTriangle, iconBg: 'bg-red-50', iconColor: 'text-red-500' },
    { label: 'Finished', value: finishedBikes.length, sub: 'Completed renewals', subColor: 'text-green-500', icon: CheckCircle2, iconBg: 'bg-green-50', iconColor: 'text-green-500' },
  ];

  return (
    <div className="p-8 space-y-6">
      {/* Stat Cards */}
      <div className="grid grid-cols-4 gap-4">
        {stats.map(({ label, value, sub, subColor, icon: Icon, iconBg, iconColor }) => (
          <div key={label} className="bg-white rounded-xl border border-gray-200 p-5">
            <div className="flex items-center justify-between mb-3">
              <span className="text-sm text-gray-500 font-medium">{label}</span>
              <div className={cn('w-9 h-9 rounded-lg flex items-center justify-center', iconBg)}>
                <Icon className={cn('w-5 h-5', iconColor)} />
              </div>
            </div>
            <div className="text-3xl font-bold text-gray-900">{value}</div>
            <div className={cn('text-xs mt-1', subColor)}>{sub}</div>
          </div>
        ))}
      </div>

      {/* Bottom row */}
      <div className="grid grid-cols-3 gap-4">
        {/* Expiring Soon Table */}
        <div className="col-span-2 bg-white rounded-xl border border-gray-200">
          <div className="px-5 py-4 border-b border-gray-100 flex items-center justify-between">
            <div>
              <h2 className="font-semibold text-gray-900">Expiring Soon</h2>
              <p className="text-xs text-gray-400 mt-0.5">Registrations expiring within 30 days</p>
            </div>
            {expiringSoon.length > 0 && (
              <span className="bg-red-100 text-red-600 text-xs font-semibold px-2.5 py-1 rounded-full">
                {expiringSoon.length} urgent
              </span>
            )}
          </div>
          {expiringSoon.length === 0 ? (
            <div className="px-5 py-10 text-center text-gray-400 text-sm">No bikes expiring soon</div>
          ) : (
            <table className="w-full text-sm">
              <thead>
                <tr className="text-xs text-gray-400 border-b border-gray-100">
                  <th className="text-left px-5 py-3 font-medium">BIKE NO.</th>
                  <th className="text-left px-4 py-3 font-medium">CATEGORY</th>
                  <th className="text-left px-4 py-3 font-medium">EXPIRY DATE</th>
                  <th className="text-left px-4 py-3 font-medium">DAYS LEFT</th>
                  <th className="text-left px-4 py-3 font-medium">STATUS</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-gray-50">
                {expiringSoon.slice(0, 5).map((bike) => {
                  const status = getExpiryStatus(bike.days);
                  return (
                    <tr key={bike.id} className={cn(status === 'danger' ? 'bg-red-50' : 'bg-yellow-50')}>
                      <td className="px-5 py-3 font-semibold text-gray-900">{bike.bikeNumber}</td>
                      <td className="px-4 py-3 text-gray-600">{bike.category}</td>
                      <td className="px-4 py-3 text-gray-600">{formatDate(bike.registrationExpiryDate)}</td>
                      <td className="px-4 py-3">
                        <span className={cn('font-bold', status === 'danger' ? 'text-red-600' : 'text-orange-500')}>
                          {bike.days} day{bike.days !== 1 ? 's' : ''}
                        </span>
                      </td>
                      <td className="px-4 py-3">
                        <span className={cn(
                          'text-xs px-2 py-1 rounded-full',
                          bike.pendingRemarks === 'ON HIRE' ? 'bg-green-100 text-green-700' : 'bg-yellow-100 text-yellow-800'
                        )}>
                          {bike.pendingRemarks || '—'}
                        </span>
                      </td>
                    </tr>
                  );
                })}
              </tbody>
            </table>
          )}
        </div>

        {/* Category Breakdown */}
        <div className="bg-white rounded-xl border border-gray-200">
          <div className="px-5 py-4 border-b border-gray-100">
            <h2 className="font-semibold text-gray-900">By Category</h2>
            <p className="text-xs text-gray-400 mt-0.5">Breakdown per category</p>
          </div>
          <div className="p-5 space-y-4">
            {categories.length === 0 ? (
              <p className="text-sm text-gray-400 text-center py-4">No data yet</p>
            ) : (
              categories.map(([cat, count], i) => (
                <div key={cat}>
                  <div className="flex justify-between text-sm mb-1.5">
                    <span className="font-medium text-gray-700">{cat}</span>
                    <span className="text-gray-500">{count} bikes</span>
                  </div>
                  <div className="w-full bg-gray-100 rounded-full h-2">
                    <div
                      className={cn('h-2 rounded-full', catColors[i % catColors.length])}
                      style={{ width: `${Math.round((count / allBikes.length) * 100)}%` }}
                    />
                  </div>
                </div>
              ))
            )}
          </div>
        </div>
      </div>
    </div>
  );
}
