'use client';

import { useState, useEffect, useCallback } from 'react';
import { User } from 'firebase/auth';
import { Sidebar } from '@/components/Sidebar';
import { Dashboard } from '@/components/Dashboard';
import { Tracker } from '@/components/Tracker';
import { Finished } from '@/components/Finished';
import { ImportModal } from '@/components/ImportModal';
import { LoginPage } from '@/components/LoginPage';
import { getBikes, addBike, updateBike, deleteBike, markFinished } from '@/lib/bikes';
import { onAuthChange } from '@/lib/auth';
import { Bike, BikeFormData } from '@/types/bike';

type Page = 'dashboard' | 'tracker' | 'finished';

export default function Home() {
  const [authUser, setAuthUser] = useState<User | null | undefined>(undefined); // undefined = loading
  const [page, setPage] = useState<Page>('dashboard');
  const [trackerBikes, setTrackerBikes] = useState<Bike[]>([]);
  const [finishedBikes, setFinishedBikes] = useState<Bike[]>([]);
  const [bikesLoading, setBikesLoading] = useState(false);
  const [showImport, setShowImport] = useState(false);

  // Listen to Firebase auth state
  useEffect(() => {
    const unsub = onAuthChange((user) => setAuthUser(user));
    return unsub;
  }, []);

  const loadBikes = useCallback(async () => {
    setBikesLoading(true);
    const [tracker, finished] = await Promise.all([
      getBikes('tracker'),
      getBikes('finished'),
    ]);
    setTrackerBikes(tracker);
    setFinishedBikes(finished);
    setBikesLoading(false);
  }, []);

  // Load bikes once authenticated
  useEffect(() => {
    if (authUser) loadBikes();
  }, [authUser, loadBikes]);

  const handleAdd = async (data: BikeFormData) => {
    await addBike(data);
    await loadBikes();
  };

  const handleEdit = async (id: string, data: Partial<BikeFormData>) => {
    await updateBike(id, data);
    await loadBikes();
  };

  const handleDelete = async (id: string) => {
    await deleteBike(id);
    await loadBikes();
  };

  const handleMarkFinished = async (id: string, dateFinished: string, newExpiry: string, remarks: string) => {
    await markFinished(id, dateFinished, newExpiry, remarks);
    await loadBikes();
  };

  // Auth loading
  if (authUser === undefined) {
    return (
      <div className="flex h-screen items-center justify-center bg-gray-50">
        <div className="w-8 h-8 border-4 border-blue-600 border-t-transparent rounded-full animate-spin" />
      </div>
    );
  }

  // Not signed in
  if (!authUser) {
    return <LoginPage onSignedIn={() => {}} />;
  }

  // Bikes loading
  if (bikesLoading && trackerBikes.length === 0) {
    return (
      <div className="flex h-screen items-center justify-center bg-gray-50">
        <div className="text-center">
          <div className="w-10 h-10 border-4 border-blue-600 border-t-transparent rounded-full animate-spin mx-auto mb-3" />
          <p className="text-sm text-gray-500">Loading bikes...</p>
        </div>
      </div>
    );
  }

  return (
    <div className="flex h-screen bg-gray-50 overflow-hidden">
      <Sidebar
        activePage={page}
        onNavigate={setPage}
        trackerCount={trackerBikes.length}
        finishedCount={finishedBikes.length}
        onImport={() => setShowImport(true)}
        user={authUser}
      />
      <main className="flex-1 overflow-y-auto">
        {page === 'dashboard' && (
          <Dashboard trackerBikes={trackerBikes} finishedBikes={finishedBikes} />
        )}
        {page === 'tracker' && (
          <Tracker
            bikes={trackerBikes}
            onAdd={handleAdd}
            onEdit={handleEdit}
            onDelete={handleDelete}
            onMarkFinished={handleMarkFinished}
          />
        )}
        {page === 'finished' && (
          <Finished bikes={finishedBikes} onDelete={handleDelete} />
        )}
      </main>

      <ImportModal
        open={showImport}
        onClose={() => setShowImport(false)}
        onDone={() => { setShowImport(false); loadBikes(); }}
      />
    </div>
  );
}
