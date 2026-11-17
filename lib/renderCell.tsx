'use client';

import React from 'react';
import { Bike } from '@/types/bike';
import { ColumnConfig } from '@/types/columnConfig';
import { formatDate, cn } from '@/lib/utils';
import { getDaysUntilExpiry, getExpiryStatus } from '@/lib/bikes';

export function renderCell(
  col: ColumnConfig,
  bike: Bike,
  view: 'tracker' | 'finished'
): React.ReactNode {
  switch (col.fieldKey) {
    case 'srl':
      return <span className="text-gray-500 text-xs">{bike.srl}</span>;

    case 'passingDate':
      return (
        <span className="text-gray-500 text-xs whitespace-nowrap">
          {formatDate(bike.passingDate)}
        </span>
      );

    case 'bikeNumber':
      return <span className="font-semibold text-gray-900">{bike.bikeNumber}</span>;

    case 'category':
      return (
        <span className="bg-blue-100 text-blue-700 text-xs font-medium px-2 py-0.5 rounded">
          {bike.category}
        </span>
      );

    case 'fullReg':
      return <span className="text-gray-700 font-mono text-xs">{bike.fullReg}</span>;

    case 'newNumber':
      return <span className="text-gray-500 text-xs">{bike.newNumber || '—'}</span>;

    case 'chassisNo':
      return (
        <span className="text-gray-500 font-mono text-xs" title={bike.chassisNo}>
          {bike.chassisNo?.slice(0, 14)}
          {(bike.chassisNo?.length ?? 0) > 14 ? '…' : ''}
        </span>
      );

    case 'tcNo':
      return <span className="text-gray-500 font-mono text-xs">{bike.tcNo || '—'}</span>;

    case 'year':
      return <span className="text-gray-600 text-xs">{bike.year}</span>;

    case 'registrationExpiryDate': {
      if (view === 'finished') {
        return (
          <span className="text-gray-400 text-xs line-through whitespace-nowrap">
            {formatDate(bike.registrationExpiryDate)}
          </span>
        );
      }
      const days = getDaysUntilExpiry(bike.registrationExpiryDate);
      const status = getExpiryStatus(days);
      return (
        <div className="flex items-center gap-1.5">
          <div
            className={cn(
              'w-2 h-2 rounded-full flex-shrink-0',
              status === 'danger'
                ? 'bg-red-500 animate-pulse'
                : status === 'warning'
                ? 'bg-orange-400'
                : 'bg-green-400'
            )}
          />
          <span
            className={cn(
              'font-medium text-xs',
              status === 'danger'
                ? 'text-red-600'
                : status === 'warning'
                ? 'text-orange-500'
                : 'text-gray-600'
            )}
          >
            {formatDate(bike.registrationExpiryDate)}
          </span>
        </div>
      );
    }

    case 'renewalRemarks':
      return (
        <span
          className="text-gray-500 text-xs max-w-[8rem] truncate block"
          title={bike.renewalRemarks}
        >
          {bike.renewalRemarks || '—'}
        </span>
      );

    case 'subStatus':
      return <span className="text-gray-500 text-xs">{bike.subStatus || '—'}</span>;

    case 'pendingRemarks':
      return bike.pendingRemarks ? (
        <span
          className={cn(
            'text-xs px-2 py-1 rounded-full whitespace-nowrap',
            bike.pendingRemarks === 'ON HIRE'
              ? 'bg-green-100 text-green-700'
              : bike.pendingRemarks === 'REPLACEMENT READY TO RENT'
              ? 'bg-blue-100 text-blue-700'
              : 'bg-yellow-100 text-yellow-800'
          )}
        >
          {bike.pendingRemarks}
        </span>
      ) : (
        <span className="text-gray-400">—</span>
      );

    case 'dateFinished':
      return (
        <span className="text-gray-600 text-xs whitespace-nowrap">
          {bike.dateFinished ? formatDate(bike.dateFinished) : '—'}
        </span>
      );

    case 'newExpiryDate':
      return (
        <span className="text-green-600 font-medium text-xs">
          {bike.newExpiryDate ? formatDate(bike.newExpiryDate) : '—'}
        </span>
      );

    default:
      return (
        <span className="text-gray-500 text-xs">
          {bike.extraFields?.[col.fieldKey] || '—'}
        </span>
      );
  }
}
