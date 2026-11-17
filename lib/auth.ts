import {
  GoogleAuthProvider,
  signInWithPopup,
  signOut as firebaseSignOut,
  onAuthStateChanged,
  User,
} from 'firebase/auth';
import { auth } from './firebase';
import { isEmailInFirestore } from './bikes';

const ALLOWED_EMAILS = ['fleet2@easylease.ae'];
const ALLOWED_DOMAINS = ['gmail.com'];

export function isEmailAllowed(email: string): boolean {
  if (ALLOWED_EMAILS.includes(email.toLowerCase())) return true;
  const domain = email.split('@')[1]?.toLowerCase();
  return ALLOWED_DOMAINS.includes(domain);
}

async function isEmailAuthorized(email: string): Promise<boolean> {
  if (isEmailAllowed(email)) return true;
  return isEmailInFirestore(email);
}

export async function signInWithGoogle(): Promise<{ user: User | null; error: string | null }> {
  const provider = new GoogleAuthProvider();
  provider.setCustomParameters({ prompt: 'select_account' });

  try {
    const result = await signInWithPopup(auth, provider);
    const email = result.user.email ?? '';

    if (!(await isEmailAuthorized(email))) {
      await firebaseSignOut(auth);
      return {
        user: null,
        error: `Access denied for ${email}. Only authorised accounts can sign in.`,
      };
    }

    return { user: result.user, error: null };
  } catch (err: unknown) {
    const code = (err as { code?: string }).code;
    if (code === 'auth/popup-closed-by-user' || code === 'auth/cancelled-popup-request') {
      return { user: null, error: null };
    }
    return { user: null, error: 'Sign-in failed. Please try again.' };
  }
}

export async function signOut(): Promise<void> {
  await firebaseSignOut(auth);
}

export function onAuthChange(callback: (user: User | null) => void) {
  return onAuthStateChanged(auth, callback);
}
