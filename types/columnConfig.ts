export interface ColumnConfig {
  id: string;
  label: string;
  fieldKey: string;
  type: 'text' | 'number' | 'date';
  isCore: boolean;
  showInTracker: boolean;
  showInFinished: boolean;
  showInForm: boolean;
  order: number;
}
