export type BikeStatus = 'tracker' | 'finished';

export type PendingRemarks =
  | 'UNDER PASSING FOR RENEWAL'
  | 'ON HIRE'
  | 'REPLACEMENT READY TO RENT'
  | 'WAITING FOR DOCUMENTS'
  | '';

export interface Bike {
  id?: string;
  srl: number;
  passingDate: string;
  bikeNumber: number;
  category: string;
  fullReg: string;
  newNumber: string;
  chassisNo: string;
  tcNo: string;
  year: number;
  registrationExpiryDate: string;
  renewalRemarks: string;
  subStatus: string;
  dateFinished: string;
  newExpiryDate: string;
  pendingRemarks: PendingRemarks;
  status: BikeStatus;
  extraFields?: Record<string, string>;
  createdAt?: string;
  updatedAt?: string;
}

export type BikeFormData = Omit<Bike, 'id' | 'createdAt' | 'updatedAt' | 'fullReg'>;
