import {
  collection,
  doc,
  addDoc,
  updateDoc,
  deleteDoc,
  getDocs,
  getDoc,
  setDoc,
  query,
  where,
  orderBy,
  serverTimestamp,
  Timestamp,
} from 'firebase/firestore';
import { db } from './firebase';
import { Bike, BikeFormData } from '@/types/bike';

const AUTHORIZED_EMAILS_COLLECTION = 'authorizedEmails';

const COLLECTION = 'bikes';

function toFirestore(data: BikeFormData) {
  return {
    ...data,
    fullReg: `${data.bikeNumber}${data.category}`,
    updatedAt: serverTimestamp(),
  };
}

function fromFirestore(id: string, data: Record<string, unknown>): Bike {
  const toStr = (v: unknown) =>
    v instanceof Timestamp ? v.toDate().toISOString() : (v as string) ?? '';
  return {
    id,
    srl: (data.srl as number) ?? 0,
    passingDate: toStr(data.passingDate),
    bikeNumber: (data.bikeNumber as number) ?? 0,
    category: (data.category as string) ?? '',
    fullReg: (data.fullReg as string) ?? '',
    newNumber: (data.newNumber as string) ?? '',
    chassisNo: (data.chassisNo as string) ?? '',
    tcNo: (data.tcNo as string) ?? '',
    year: (data.year as number) ?? 0,
    registrationExpiryDate: toStr(data.registrationExpiryDate),
    renewalRemarks: (data.renewalRemarks as string) ?? '',
    subStatus: (data.subStatus as string) ?? '',
    dateFinished: toStr(data.dateFinished),
    newExpiryDate: toStr(data.newExpiryDate),
    pendingRemarks: (data.pendingRemarks as Bike['pendingRemarks']) ?? '',
    status: (data.status as Bike['status']) ?? 'tracker',
    extraFields: (data.extraFields as Record<string, string>) ?? {},
    createdAt: toStr(data.createdAt),
    updatedAt: toStr(data.updatedAt),
  };
}

export async function getBikes(status?: Bike['status']): Promise<Bike[]> {
  const ref = collection(db, COLLECTION);
  const q = status
    ? query(ref, where('status', '==', status), orderBy('srl'))
    : query(ref, orderBy('srl'));
  const snap = await getDocs(q);
  return snap.docs.map((d) => fromFirestore(d.id, d.data()));
}

export async function addBike(data: BikeFormData): Promise<string> {
  const ref = collection(db, COLLECTION);
  const doc = await addDoc(ref, {
    ...toFirestore(data),
    createdAt: serverTimestamp(),
  });
  return doc.id;
}

export async function updateBike(id: string, data: Partial<BikeFormData>): Promise<void> {
  const ref = doc(db, COLLECTION, id);
  const update: Record<string, unknown> = { ...data, updatedAt: serverTimestamp() };
  if (data.bikeNumber || data.category) {
    update.fullReg = `${data.bikeNumber}${data.category}`;
  }
  await updateDoc(ref, update);
}

export async function markFinished(
  id: string,
  dateFinished: string,
  newExpiryDate: string,
  renewalRemarks: string,
  extraFields?: Record<string, string>
): Promise<void> {
  const ref = doc(db, COLLECTION, id);
  await updateDoc(ref, {
    status: 'finished',
    dateFinished,
    newExpiryDate,
    renewalRemarks,
    ...(extraFields ? { extraFields } : {}),
    updatedAt: serverTimestamp(),
  });
}

export async function deleteBike(id: string): Promise<void> {
  await deleteDoc(doc(db, COLLECTION, id));
}

export interface AuthorizedEmail {
  email: string;
  addedAt: string;
  addedBy: string;
}

export async function getAuthorizedEmails(): Promise<AuthorizedEmail[]> {
  const snap = await getDocs(collection(db, AUTHORIZED_EMAILS_COLLECTION));
  return snap.docs.map((d) => ({
    email: d.id,
    addedAt: d.data().addedAt ?? '',
    addedBy: d.data().addedBy ?? '',
  }));
}

export async function addAuthorizedEmail(email: string, addedBy: string): Promise<void> {
  const ref = doc(db, AUTHORIZED_EMAILS_COLLECTION, email.toLowerCase().trim());
  await setDoc(ref, { addedAt: new Date().toISOString(), addedBy });
}

export async function removeAuthorizedEmail(email: string): Promise<void> {
  await deleteDoc(doc(db, AUTHORIZED_EMAILS_COLLECTION, email.toLowerCase().trim()));
}

export async function isEmailInFirestore(email: string): Promise<boolean> {
  const ref = doc(db, AUTHORIZED_EMAILS_COLLECTION, email.toLowerCase().trim());
  const snap = await getDoc(ref);
  return snap.exists();
}

export function getDaysUntilExpiry(expiryDate: string): number {
  if (!expiryDate) return 999;
  const expiry = new Date(expiryDate);
  const today = new Date();
  today.setHours(0, 0, 0, 0);
  return Math.ceil((expiry.getTime() - today.getTime()) / (1000 * 60 * 60 * 24));
}

export function getExpiryStatus(days: number): 'danger' | 'warning' | 'ok' {
  if (days <= 7) return 'danger';
  if (days <= 30) return 'warning';
  return 'ok';
}
