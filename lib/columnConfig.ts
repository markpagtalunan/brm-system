import { doc, getDoc, setDoc } from 'firebase/firestore';
import { db } from './firebase';
import { ColumnConfig } from '@/types/columnConfig';

export const DEFAULT_COLUMNS: ColumnConfig[] = [
  { order: 0,  id: 'srl',                      label: 'SRL',              fieldKey: 'srl',                      type: 'number', isCore: true, showInTracker: true,  showInFinished: true,  showInForm: true  },
  { order: 1,  id: 'passingDate',               label: 'Passing Date',     fieldKey: 'passingDate',              type: 'date',   isCore: true, showInTracker: true,  showInFinished: true,  showInForm: true  },
  { order: 2,  id: 'bikeNumber',                label: 'Bike No.',         fieldKey: 'bikeNumber',               type: 'number', isCore: true, showInTracker: true,  showInFinished: true,  showInForm: true  },
  { order: 3,  id: 'category',                  label: 'Category',         fieldKey: 'category',                 type: 'text',   isCore: true, showInTracker: true,  showInFinished: true,  showInForm: true  },
  { order: 4,  id: 'fullReg',                   label: 'Full Reg',         fieldKey: 'fullReg',                  type: 'text',   isCore: true, showInTracker: true,  showInFinished: true,  showInForm: false },
  { order: 5,  id: 'newNumber',                 label: 'New Number',       fieldKey: 'newNumber',                type: 'text',   isCore: true, showInTracker: true,  showInFinished: true,  showInForm: true  },
  { order: 6,  id: 'chassisNo',                 label: 'Chassis No.',      fieldKey: 'chassisNo',                type: 'text',   isCore: true, showInTracker: true,  showInFinished: true,  showInForm: true  },
  { order: 7,  id: 'tcNo',                      label: 'TC No.',           fieldKey: 'tcNo',                     type: 'text',   isCore: true, showInTracker: true,  showInFinished: true,  showInForm: true  },
  { order: 8,  id: 'year',                      label: 'Year',             fieldKey: 'year',                     type: 'number', isCore: true, showInTracker: true,  showInFinished: true,  showInForm: true  },
  { order: 9,  id: 'registrationExpiryDate',    label: 'Expiry Date',      fieldKey: 'registrationExpiryDate',   type: 'date',   isCore: true, showInTracker: true,  showInFinished: true,  showInForm: true  },
  { order: 10, id: 'renewalRemarks',            label: 'Renewal Remarks',  fieldKey: 'renewalRemarks',           type: 'text',   isCore: true, showInTracker: true,  showInFinished: true,  showInForm: true  },
  { order: 11, id: 'subStatus',                 label: 'Sub Status',       fieldKey: 'subStatus',                type: 'text',   isCore: true, showInTracker: true,  showInFinished: true,  showInForm: true  },
  { order: 12, id: 'pendingRemarks',            label: 'Pending Remarks',  fieldKey: 'pendingRemarks',           type: 'text',   isCore: true, showInTracker: true,  showInFinished: false, showInForm: true  },
  { order: 13, id: 'dateFinished',              label: 'Date Finished',    fieldKey: 'dateFinished',             type: 'date',   isCore: true, showInTracker: false, showInFinished: true,  showInForm: true  },
  { order: 14, id: 'newExpiryDate',             label: 'New Expiry Date',  fieldKey: 'newExpiryDate',            type: 'date',   isCore: true, showInTracker: false, showInFinished: true,  showInForm: true  },
];

export async function getColumnConfig(): Promise<ColumnConfig[]> {
  const ref = doc(db, 'settings', 'columns');
  const snap = await getDoc(ref);
  if (!snap.exists()) return DEFAULT_COLUMNS;
  return snap.data().columns as ColumnConfig[];
}

export async function saveColumnConfig(columns: ColumnConfig[]): Promise<void> {
  const ref = doc(db, 'settings', 'columns');
  await setDoc(ref, { columns });
}
