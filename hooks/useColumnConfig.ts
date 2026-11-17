'use client';

import { useState, useEffect, useCallback } from 'react';
import { doc, getDoc, setDoc } from 'firebase/firestore';
import { db } from '@/lib/firebase';
import { ColumnConfig } from '@/types/columnConfig';
import { DEFAULT_COLUMNS, saveColumnConfig } from '@/lib/columnConfig';

export function useColumnConfig(authReady = false) {
  const [columns, setColumns] = useState<ColumnConfig[]>([]);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    if (!authReady) return;
    async function load() {
      const ref = doc(db, 'settings', 'columns');
      const snap = await getDoc(ref);
      if (!snap.exists()) {
        await setDoc(ref, { columns: DEFAULT_COLUMNS });
        setColumns(DEFAULT_COLUMNS);
      } else {
        setColumns(snap.data().columns as ColumnConfig[]);
      }
      setLoading(false);
    }
    load();
  }, [authReady]);

  const updateColumns = useCallback(async (cols: ColumnConfig[]) => {
    await saveColumnConfig(cols);
    setColumns(cols);
  }, []);

  const trackerColumns = columns
    .filter((c) => c.showInTracker)
    .sort((a, b) => a.order - b.order);

  const finishedColumns = columns
    .filter((c) => c.showInFinished)
    .sort((a, b) => a.order - b.order);

  return { columns, trackerColumns, finishedColumns, loading, updateColumns };
}
