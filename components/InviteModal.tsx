'use client';

import { useState, useEffect, useCallback } from 'react';
import { X, UserPlus, Trash2, Copy, Check, Mail, Shield, Link } from 'lucide-react';
import { User } from 'firebase/auth';
import {
  getAuthorizedEmails,
  addAuthorizedEmail,
  removeAuthorizedEmail,
  AuthorizedEmail,
} from '@/lib/bikes';
import { formatDate, cn } from '@/lib/utils';

interface InviteModalProps {
  open: boolean;
  onClose: () => void;
  currentUser: User;
}

export function InviteModal({ open, onClose, currentUser }: InviteModalProps) {
  const [emails, setEmails] = useState<AuthorizedEmail[]>([]);
  const [loading, setLoading] = useState(false);
  const [inputEmail, setInputEmail] = useState('');
  const [adding, setAdding] = useState(false);
  const [error, setError] = useState('');
  const [copiedEmail, setCopiedEmail] = useState<string | null>(null);
  const [linkCopied, setLinkCopied] = useState(false);

  const load = useCallback(async () => {
    setLoading(true);
    const list = await getAuthorizedEmails();
    setEmails(list.sort((a, b) => a.email.localeCompare(b.email)));
    setLoading(false);
  }, []);

  useEffect(() => {
    if (open) load();
  }, [open, load]);

  async function handleAdd(e: React.FormEvent) {
    e.preventDefault();
    const email = inputEmail.trim().toLowerCase();
    if (!email) return;
    if (!/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(email)) {
      setError('Please enter a valid email address.');
      return;
    }
    if (emails.some((e) => e.email === email)) {
      setError('This email is already authorized.');
      return;
    }
    setAdding(true);
    setError('');
    await addAuthorizedEmail(email, currentUser.email ?? '');
    setInputEmail('');
    await load();
    setAdding(false);
  }

  async function handleRemove(email: string) {
    if (!confirm(`Remove access for ${email}?`)) return;
    await removeAuthorizedEmail(email);
    await load();
  }

  function copyLink(email: string) {
    const appUrl = typeof window !== 'undefined' ? window.location.origin : '';
    const text = `You've been invited to access BRM System.\n\nSign in with this email: ${email}\nApp URL: ${appUrl}`;
    navigator.clipboard.writeText(text);
    setCopiedEmail(email);
    setTimeout(() => setCopiedEmail(null), 2000);
  }

  function copyAppLink() {
    if (typeof window !== 'undefined') {
      navigator.clipboard.writeText(window.location.origin);
      setLinkCopied(true);
      setTimeout(() => setLinkCopied(false), 2000);
    }
  }

  if (!open) return null;

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/40">
      <div className="bg-white rounded-2xl shadow-2xl w-full max-w-lg max-h-[90vh] flex flex-col">
        {/* Header */}
        <div className="flex items-center justify-between px-6 py-5 border-b border-gray-100">
          <div className="flex items-center gap-3">
            <div className="w-9 h-9 bg-blue-100 rounded-xl flex items-center justify-center">
              <Shield className="w-5 h-5 text-blue-600" />
            </div>
            <div>
              <h2 className="text-base font-semibold text-gray-900">Manage Access</h2>
              <p className="text-xs text-gray-400">Authorize users to sign in to BRM System</p>
            </div>
          </div>
          <button onClick={onClose} className="p-2 hover:bg-gray-100 rounded-lg transition-colors">
            <X className="w-4 h-4 text-gray-500" />
          </button>
        </div>

        {/* App link section */}
        <div className="px-6 py-4 bg-blue-50 border-b border-blue-100 flex items-center gap-3">
          <Link className="w-4 h-4 text-blue-500 flex-shrink-0" />
          <div className="flex-1 min-w-0">
            <p className="text-xs text-blue-700 font-medium">App URL</p>
            <p className="text-xs text-blue-500 truncate">{typeof window !== 'undefined' ? window.location.origin : '—'}</p>
          </div>
          <button
            onClick={copyAppLink}
            className={cn(
              'flex items-center gap-1.5 text-xs px-3 py-1.5 rounded-lg font-medium transition-colors flex-shrink-0',
              linkCopied ? 'bg-green-100 text-green-700' : 'bg-blue-600 text-white hover:bg-blue-700'
            )}
          >
            {linkCopied ? <Check className="w-3.5 h-3.5" /> : <Copy className="w-3.5 h-3.5" />}
            {linkCopied ? 'Copied!' : 'Copy Link'}
          </button>
        </div>

        {/* Add email form */}
        <div className="px-6 py-4 border-b border-gray-100">
          <p className="text-xs font-semibold text-gray-500 uppercase tracking-wider mb-3">Invite a User</p>
          <form onSubmit={handleAdd} className="flex gap-2">
            <div className="flex-1 relative">
              <Mail className="w-4 h-4 text-gray-400 absolute left-3 top-1/2 -translate-y-1/2" />
              <input
                type="email"
                placeholder="user@example.com"
                value={inputEmail}
                onChange={(e) => { setInputEmail(e.target.value); setError(''); }}
                className="w-full pl-9 pr-4 py-2 text-sm border border-gray-200 rounded-lg focus:outline-none focus:ring-2 focus:ring-blue-500"
                disabled={adding}
              />
            </div>
            <button
              type="submit"
              disabled={adding || !inputEmail.trim()}
              className="bg-blue-600 hover:bg-blue-700 disabled:opacity-50 text-white text-sm font-medium px-4 py-2 rounded-lg flex items-center gap-2 transition-colors"
            >
              <UserPlus className="w-4 h-4" />
              {adding ? 'Adding…' : 'Add'}
            </button>
          </form>
          {error && <p className="text-xs text-red-500 mt-2">{error}</p>}
          <p className="text-xs text-gray-400 mt-2">
            Note: All @gmail.com accounts can sign in by default. Use this to authorize work emails.
          </p>
        </div>

        {/* Email list */}
        <div className="flex-1 overflow-y-auto px-6 py-4">
          <p className="text-xs font-semibold text-gray-500 uppercase tracking-wider mb-3">
            Authorized Users
            {emails.length > 0 && (
              <span className="ml-2 bg-gray-100 text-gray-600 px-1.5 py-0.5 rounded text-[10px] font-normal">
                {emails.length}
              </span>
            )}
          </p>

          {loading ? (
            <div className="flex justify-center py-8">
              <div className="w-6 h-6 border-2 border-blue-600 border-t-transparent rounded-full animate-spin" />
            </div>
          ) : emails.length === 0 ? (
            <div className="text-center py-8 text-gray-400">
              <Shield className="w-8 h-8 mx-auto mb-2 opacity-30" />
              <p className="text-sm">No custom authorized users yet</p>
            </div>
          ) : (
            <div className="space-y-2">
              {emails.map((entry) => (
                <div
                  key={entry.email}
                  className="flex items-center gap-3 p-3 bg-gray-50 rounded-xl hover:bg-gray-100 transition-colors group"
                >
                  <div className="w-8 h-8 bg-blue-100 rounded-full flex items-center justify-center flex-shrink-0">
                    <span className="text-blue-600 text-xs font-semibold">
                      {entry.email[0].toUpperCase()}
                    </span>
                  </div>
                  <div className="flex-1 min-w-0">
                    <p className="text-sm font-medium text-gray-900 truncate">{entry.email}</p>
                    {entry.addedAt && (
                      <p className="text-xs text-gray-400">
                        Added {formatDate(entry.addedAt)}
                        {entry.addedBy && ` by ${entry.addedBy}`}
                      </p>
                    )}
                  </div>
                  <div className="flex items-center gap-1 opacity-0 group-hover:opacity-100 transition-opacity">
                    <button
                      onClick={() => copyLink(entry.email)}
                      className={cn(
                        'p-1.5 rounded-lg transition-colors text-xs',
                        copiedEmail === entry.email
                          ? 'bg-green-100 text-green-600'
                          : 'hover:bg-blue-50 text-blue-500'
                      )}
                      title="Copy invite message"
                    >
                      {copiedEmail === entry.email ? <Check className="w-4 h-4" /> : <Copy className="w-4 h-4" />}
                    </button>
                    <button
                      onClick={() => handleRemove(entry.email)}
                      className="p-1.5 hover:bg-red-50 rounded-lg text-red-400 transition-colors"
                      title="Remove access"
                    >
                      <Trash2 className="w-4 h-4" />
                    </button>
                  </div>
                </div>
              ))}
            </div>
          )}
        </div>
      </div>
    </div>
  );
}
