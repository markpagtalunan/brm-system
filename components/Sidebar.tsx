'use client';

import { LayoutDashboard, ClipboardList, CheckCircle2, Upload, Shield, LogOut } from 'lucide-react';
import { cn } from '@/lib/utils';
import { signOut } from '@/lib/auth';
import { User } from 'firebase/auth';

type Page = 'dashboard' | 'tracker' | 'finished';

interface SidebarProps {
  activePage: Page;
  onNavigate: (page: Page) => void;
  trackerCount: number;
  finishedCount: number;
  onImport: () => void;
  user: User;
}

export function Sidebar({ activePage, onNavigate, trackerCount, finishedCount, onImport, user }: SidebarProps) {
  const navItems = [
    { id: 'dashboard' as Page, label: 'Dashboard', icon: LayoutDashboard },
    { id: 'tracker' as Page, label: 'Tracker', icon: ClipboardList, badge: trackerCount, badgeColor: 'bg-orange-100 text-orange-600' },
    { id: 'finished' as Page, label: 'Finished', icon: CheckCircle2, badge: finishedCount, badgeColor: 'bg-green-100 text-green-600' },
  ];

  const initials = user.displayName
    ? user.displayName.split(' ').map((n) => n[0]).join('').slice(0, 2).toUpperCase()
    : (user.email?.[0] ?? 'U').toUpperCase();

  return (
    <aside className="w-60 bg-white border-r border-gray-200 flex flex-col flex-shrink-0 h-screen">
      {/* Logo */}
      <div className="px-5 py-5 border-b border-gray-100">
        <div className="flex items-center gap-2.5">
          <div className="w-8 h-8 bg-blue-600 rounded-lg flex items-center justify-center">
            <Shield className="w-4 h-4 text-white" />
          </div>
          <div>
            <div className="font-bold text-gray-900 text-sm leading-none">BRM System</div>
            <div className="text-xs text-gray-400 mt-0.5">Bike Registration</div>
          </div>
        </div>
      </div>

      {/* Nav */}
      <nav className="flex-1 px-3 py-4 space-y-1 overflow-y-auto">
        <p className="text-xs font-semibold text-gray-400 uppercase tracking-wider px-2 mb-2">Main</p>
        {navItems.map(({ id, label, icon: Icon, badge, badgeColor }) => (
          <button
            key={id}
            onClick={() => onNavigate(id)}
            className={cn(
              'w-full flex items-center gap-3 px-2 py-2.5 rounded-md text-sm transition-colors',
              activePage === id
                ? 'bg-blue-50 text-blue-600 font-semibold'
                : 'text-gray-600 hover:bg-gray-50 font-medium'
            )}
          >
            <Icon className="w-4 h-4 flex-shrink-0" />
            <span className="flex-1 text-left">{label}</span>
            {badge !== undefined && badge > 0 && (
              <span className={cn('text-xs font-semibold px-1.5 py-0.5 rounded-full', badgeColor)}>
                {badge}
              </span>
            )}
          </button>
        ))}

        <p className="text-xs font-semibold text-gray-400 uppercase tracking-wider px-2 mb-2 mt-4">Settings</p>
        <button onClick={onImport} className="w-full flex items-center gap-3 px-2 py-2.5 rounded-md text-sm text-gray-600 hover:bg-gray-50 font-medium transition-colors">
          <Upload className="w-4 h-4 flex-shrink-0" />
          <span>Import Excel</span>
        </button>
      </nav>

      {/* User + Sign out */}
      <div className="px-3 py-4 border-t border-gray-100">
        <div className="flex items-center gap-3 px-2">
          {user.photoURL ? (
            // eslint-disable-next-line @next/next/no-img-element
            <img src={user.photoURL} alt="avatar" className="w-8 h-8 rounded-full flex-shrink-0 object-cover" referrerPolicy="no-referrer" />
          ) : (
            <div className="w-8 h-8 bg-blue-100 rounded-full flex items-center justify-center text-blue-600 font-semibold text-sm flex-shrink-0">
              {initials}
            </div>
          )}
          <div className="min-w-0 flex-1">
            <div className="text-sm font-medium text-gray-900 truncate">{user.displayName ?? 'User'}</div>
            <div className="text-xs text-gray-400 truncate">{user.email}</div>
          </div>
          <button
            onClick={() => signOut()}
            title="Sign out"
            className="p-1.5 hover:bg-red-50 rounded-lg text-gray-400 hover:text-red-500 transition-colors flex-shrink-0"
          >
            <LogOut className="w-4 h-4" />
          </button>
        </div>
      </div>
    </aside>
  );
}
