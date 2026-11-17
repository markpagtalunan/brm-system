# Column Management Implementation Plan

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:subagent-driven-development (recommended) or superpowers:executing-plans to implement this plan task-by-task. Steps use checkbox (`- [ ]`) syntax for tracking.

**Goal:** Add a global column management system that lets the admin add custom columns, reorder all columns, and toggle form/table visibility — config stored in Firestore, shared across all users.

**Architecture:** A `ColumnConfig[]` array lives in Firestore at `settings/columns`; a `useColumnConfig` hook fetches and seeds it on first load. `app/page.tsx` holds the config state and passes `columns`, `isAdmin`, and `onUpdateColumns` down to `Tracker` and `Finished`. A `renderCell` utility handles per-column cell formatting for both tables. A `ColumnManagerModal` (admin-gated) provides the management UI.

**Tech Stack:** Next.js App Router, TypeScript (strict), Firebase Firestore, Tailwind CSS, Lucide React icons.

**Spec:** `docs/superpowers/specs/2026-11-17-column-management-design.md`

## Global Constraints

- TypeScript strict mode on — no implicit `any`, all types explicit
- No new npm dependencies
- Admin email (hardcoded): `geopagtalunan@gmail.com`
- Custom column `fieldKey` format: `"custom_"` + `String(Date.now())`
- Firestore document path: `settings/columns`, shape: `{ columns: ColumnConfig[] }`
- Required core fields in `AddBikeModal` always visible regardless of `showInForm`: `srl`, `bikeNumber`, `category`, `chassisNo`, `year`, `registrationExpiryDate`
- Core fields in `MarkFinishedModal` (`dateFinished`, `newExpiry`, `renewalRemarks`) always visible regardless of `showInForm` — only custom columns are dynamically toggled there
- `Actions` column is always last; it is not part of `ColumnConfig` and is not manageable
- `fullReg` read-only preview in `AddBikeModal` always visible regardless of `showInForm` (its toggle controls table visibility only)

## Review Focus

1. **First load with no `settings/columns` document** — seeding must write exactly once and not throw. Verified in Task 2: seed path runs only when `!snap.exists()`.
2. **`showInForm: false` on a required core field** — form must still work. Verified in Task 8: required fields (srl, bikeNumber, category, chassisNo, year, registrationExpiryDate) render unconditionally.
3. **Custom column `sortKey` not in `keyof Bike`** — sort comparator must not crash. Verified in Task 6/7: comparator checks `extraFields?.[key]` for non-core keys.
4. **Delete custom column** — confirmation dialog fires; after confirm, column disappears from both tables without page reload. Verified in Task 5: `updateColumns` removes the config entry and re-renders via hook state update.
5. **Up/down arrows at list boundaries** — first row up-arrow and last row down-arrow are disabled. Verified in Task 5: button disabled when `index === 0` (up) or `index === columns.length - 1` (down).

---

## Task 1: Foundation — types and Firestore lib

**Files:**
- Create: `types/columnConfig.ts`
- Modify: `types/bike.ts`
- Create: `lib/columnConfig.ts`

**Interfaces:**
- Produces:
  - `ColumnConfig` interface (exported from `types/columnConfig.ts`)
  - `DEFAULT_COLUMNS: ColumnConfig[]` (exported from `lib/columnConfig.ts`)
  - `getColumnConfig(): Promise<ColumnConfig[]>` (exported from `lib/columnConfig.ts`)
  - `saveColumnConfig(columns: ColumnConfig[]): Promise<void>` (exported from `lib/columnConfig.ts`)

- [ ] **Step 1: Create `types/columnConfig.ts`**

  Export this exact interface:
  ```typescript
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
  ```

- [ ] **Step 2: Update `types/bike.ts`**

  Add `extraFields?: Record<string, string>;` to the `Bike` interface (after `updatedAt`). `BikeFormData` picks it up automatically via `Omit`.

- [ ] **Step 3: Create `lib/columnConfig.ts`**

  Import `ColumnConfig` from `@/types/columnConfig`. Import `db` from `@/lib/firebase`. Import `doc`, `getDoc`, `setDoc` from `firebase/firestore`.

  Export `DEFAULT_COLUMNS: ColumnConfig[]` — the 15-entry array from the spec (all `isCore: true`), with `order` values 0–14. Exact entries:

  | order | id | label | fieldKey | type | showInTracker | showInFinished | showInForm |
  |---|---|---|---|---|---|---|---|
  | 0 | srl | SRL | srl | number | true | true | true |
  | 1 | passingDate | Passing Date | passingDate | date | true | true | true |
  | 2 | bikeNumber | Bike No. | bikeNumber | number | true | true | true |
  | 3 | category | Category | category | text | true | true | true |
  | 4 | fullReg | Full Reg | fullReg | text | true | true | false |
  | 5 | newNumber | New Number | newNumber | text | true | true | true |
  | 6 | chassisNo | Chassis No. | chassisNo | text | true | true | true |
  | 7 | tcNo | TC No. | tcNo | text | true | true | true |
  | 8 | year | Year | year | number | true | true | true |
  | 9 | registrationExpiryDate | Expiry Date | registrationExpiryDate | date | true | true | true |
  | 10 | renewalRemarks | Renewal Remarks | renewalRemarks | text | true | true | true |
  | 11 | subStatus | Sub Status | subStatus | text | true | true | true |
  | 12 | pendingRemarks | Pending Remarks | pendingRemarks | text | true | false | true |
  | 13 | dateFinished | Date Finished | dateFinished | date | false | true | true |
  | 14 | newExpiryDate | New Expiry Date | newExpiryDate | date | false | true | true |

  Export `async function getColumnConfig(): Promise<ColumnConfig[]>` — reads `settings/columns`, returns `data.columns as ColumnConfig[]` if exists, else returns `DEFAULT_COLUMNS` (does NOT seed here — seeding is the hook's responsibility).

  Export `async function saveColumnConfig(columns: ColumnConfig[]): Promise<void>` — writes `{ columns }` to `settings/columns` using `setDoc` with `{ merge: false }`.

- [ ] **Step 4: Verify TypeScript compiles**

  Run: `npm run build`
  Expected: no TypeScript errors in the new/modified files.

- [ ] **Step 5: Commit**

  ```
  git add types/columnConfig.ts types/bike.ts lib/columnConfig.ts
  git commit -m "feat: add ColumnConfig type, extraFields to Bike, and Firestore column config lib"
  ```

---

## Task 2: `useColumnConfig` hook

**Files:**
- Create: `hooks/useColumnConfig.ts`

**Interfaces:**
- Consumes: `ColumnConfig` from `types/columnConfig`, `getColumnConfig`, `saveColumnConfig`, `DEFAULT_COLUMNS` from `lib/columnConfig`
- Produces:
  ```typescript
  function useColumnConfig(): {
    columns: ColumnConfig[];
    trackerColumns: ColumnConfig[];
    finishedColumns: ColumnConfig[];
    loading: boolean;
    updateColumns: (cols: ColumnConfig[]) => Promise<void>;
  }
  ```

- [ ] **Step 1: Create `hooks/useColumnConfig.ts`**

  `'use client'` directive at top. Import `useState`, `useEffect`, `useCallback` from `react`. Import `db` from `@/lib/firebase`. Import `doc`, `getDoc`, `setDoc` from `firebase/firestore`. Import `ColumnConfig` from `@/types/columnConfig`. Import `DEFAULT_COLUMNS`, `saveColumnConfig` from `@/lib/columnConfig`.

  On mount: call `getDoc(doc(db, 'settings', 'columns'))`. If `!snap.exists()`, call `setDoc` to seed with `{ columns: DEFAULT_COLUMNS }` then set state to `DEFAULT_COLUMNS`. Otherwise parse `snap.data().columns as ColumnConfig[]` and set state.

  `trackerColumns`: `columns.filter(c => c.showInTracker).sort((a, b) => a.order - b.order)`
  `finishedColumns`: `columns.filter(c => c.showInFinished).sort((a, b) => a.order - b.order)`

  `updateColumns(cols)`: calls `saveColumnConfig(cols)` then sets local state to `cols`.

- [ ] **Step 2: Verify TypeScript compiles**

  Run: `npm run build`
  Expected: no errors.

- [ ] **Step 3: Commit**

  ```
  git add hooks/useColumnConfig.ts
  git commit -m "feat: add useColumnConfig hook with Firestore seeding"
  ```

---

## Task 3: Update `lib/bikes.ts`

**Files:**
- Modify: `lib/bikes.ts`

**Interfaces:**
- `markFinished` new signature:
  ```typescript
  async function markFinished(
    id: string,
    dateFinished: string,
    newExpiryDate: string,
    renewalRemarks: string,
    extraFields?: Record<string, string>
  ): Promise<void>
  ```

- [ ] **Step 1: Update `fromFirestore` to deserialize `extraFields`**

  After the existing `updatedAt` line, add:
  ```typescript
  extraFields: (data.extraFields as Record<string, string>) ?? {},
  ```

- [ ] **Step 2: Update `toFirestore` to include `extraFields`**

  The spread `...data` already carries `extraFields` since it's on `BikeFormData`. No structural change needed — verify that `toFirestore` does not explicitly omit `extraFields`. (It currently only spreads `data` and adds `fullReg` + `updatedAt`, so `extraFields` will be included automatically.)

- [ ] **Step 3: Widen `markFinished` signature**

  Add `extraFields?: Record<string, string>` parameter. In the `updateDoc` call, spread `...(extraFields ? { extraFields } : {})` into the update object.

- [ ] **Step 4: Verify TypeScript compiles**

  Run: `npm run build`
  Expected: no errors.

- [ ] **Step 5: Commit**

  ```
  git add lib/bikes.ts
  git commit -m "feat: add extraFields support to fromFirestore and markFinished"
  ```

---

## Task 4: `renderCell` utility

**Files:**
- Create: `lib/renderCell.tsx`

**Interfaces:**
- Consumes: `Bike` from `types/bike`, `ColumnConfig` from `types/columnConfig`, `formatDate` from `lib/utils`, `getDaysUntilExpiry`, `getExpiryStatus` from `lib/bikes`, `cn` from `lib/utils`
- Produces:
  ```typescript
  function renderCell(col: ColumnConfig, bike: Bike, view: 'tracker' | 'finished'): React.ReactNode
  ```

- [ ] **Step 1: Create `lib/renderCell.tsx`**

  `'use client'` at top. Switch on `col.fieldKey`, returning the existing JSX cell content (without the `<td>` wrapper — the caller wraps in `<td>`). Copy the exact markup from the current `Tracker.tsx` and `Finished.tsx` row cells:

  - `srl`: `<span className="text-gray-500 text-xs">{bike.srl}</span>`
  - `passingDate`: `<span className="text-gray-500 text-xs whitespace-nowrap">{formatDate(bike.passingDate)}</span>`
  - `bikeNumber`: `<span className="font-semibold text-gray-900">{bike.bikeNumber}</span>`
  - `category`: blue badge span as in Tracker
  - `fullReg`: `<span className="text-gray-700 font-mono text-xs">{bike.fullReg}</span>`
  - `newNumber`: `<span className="text-gray-500 text-xs">{bike.newNumber || '—'}</span>`
  - `chassisNo`: truncate-to-14 with `title` tooltip as in Tracker
  - `tcNo`: `<span className="text-gray-500 font-mono text-xs">{bike.tcNo || '—'}</span>`
  - `year`: `<span className="text-gray-600 text-xs">{bike.year}</span>`
  - `registrationExpiryDate`: if `view === 'tracker'`, render the dot + colored date indicator from Tracker; if `view === 'finished'`, render `<span className="text-gray-400 text-xs line-through whitespace-nowrap">{formatDate(bike.registrationExpiryDate)}</span>`
  - `renewalRemarks`: `<span className="text-gray-500 text-xs max-w-[8rem] truncate block" title={bike.renewalRemarks}>{bike.renewalRemarks || '—'}</span>`
  - `subStatus`: `<span className="text-gray-500 text-xs">{bike.subStatus || '—'}</span>`
  - `pendingRemarks`: color-coded badge as in Tracker (or `—`)
  - `dateFinished`: `<span className="text-gray-600 text-xs whitespace-nowrap">{bike.dateFinished ? formatDate(bike.dateFinished) : '—'}</span>`
  - `newExpiryDate`: `<span className="text-green-600 font-medium text-xs">{bike.newExpiryDate ? formatDate(bike.newExpiryDate) : '—'}</span>`
  - default (custom columns): `<span className="text-gray-500 text-xs">{bike.extraFields?.[col.fieldKey] || '—'}</span>`

  The `registrationExpiryDate` case requires `getDaysUntilExpiry` and `getExpiryStatus`. Import them.

- [ ] **Step 2: Verify TypeScript compiles**

  Run: `npm run build`
  Expected: no errors.

- [ ] **Step 3: Commit**

  ```
  git add lib/renderCell.tsx
  git commit -m "feat: add renderCell utility for dynamic column rendering"
  ```

---

## Task 5: `ColumnManagerModal` component

**Files:**
- Create: `components/ColumnManagerModal.tsx`

**Interfaces:**
- Consumes: `ColumnConfig` from `types/columnConfig`
- Props:
  ```typescript
  interface ColumnManagerModalProps {
    open: boolean;
    columns: ColumnConfig[];
    onClose: () => void;
    onSave: (cols: ColumnConfig[]) => Promise<void>;
  }
  ```

- [ ] **Step 1: Create `components/ColumnManagerModal.tsx`**

  `'use client'`. Import `useState`, `useEffect` from `react`. Import `X`, `ChevronUp`, `ChevronDown`, `Trash2`, `Plus` from `lucide-react`. Import `ColumnConfig` from `@/types/columnConfig`. Import `cn` from `@/lib/utils`.

  Local state: `localCols: ColumnConfig[]` initialized from `columns` prop on each open (via `useEffect` on `open`). `newLabel: string`, `newType: 'text' | 'number' | 'date'`, `saving: boolean`, `confirmDelete: string | null` (holds `fieldKey` of column pending delete confirmation).

  **Move up:** `moveUp(index: number)` — swap `localCols[index]` with `localCols[index - 1]`, reassign `order` values as sequential 0..n-1, then call `onSave(reordered)` and update `localCols`.

  **Move down:** `moveDown(index: number)` — swap with index + 1, same reorder/save logic.

  **Toggle:** `toggle(id: string, field: 'showInTracker' | 'showInFinished' | 'showInForm', value: boolean)` — update that field on matching column, call `onSave(updated)`.

  **Delete flow:** clicking trash sets `confirmDelete = col.fieldKey`. Confirmation dialog shows with message: *"This will hide the column from all tables. Existing data for this column will be kept on bike records."* Confirm button calls `onSave(localCols.filter(c => c.fieldKey !== confirmDelete))` then clears `confirmDelete`.

  **Add column:** `addColumn()` — guard: `newLabel.trim()` must be non-empty. Create new `ColumnConfig` with `id = 'custom_' + Date.now()`, `fieldKey = 'custom_' + Date.now()`, `label = newLabel.trim()`, `type = newType`, `isCore = false`, `showInTracker = true`, `showInFinished = true`, `showInForm = true`, `order = localCols.length`. Call `onSave([...localCols, newCol])`. Reset `newLabel` to `''`.

  **Layout:** modal overlay. Header "Manage Columns" + close button. Scrollable list of rows. Each row:
  ```
  [↑][↓]  {col.label}  [T][F][Form]  [🗑 if !isCore]
  ```
  Toggle buttons use `cn` to show active (blue background) vs inactive (gray). Up disabled when `index === 0`; down disabled when `index === localCols.length - 1`.

  Add column form at bottom inside the modal (not a separate section): label `<input>` + type `<select>` + "Add" `<button>`.

  If `confirmDelete !== null`, render an inline confirmation panel (not a separate modal) below the column list.

  Return `null` if `!open`.

- [ ] **Step 2: Verify TypeScript compiles**

  Run: `npm run build`
  Expected: no errors.

- [ ] **Step 3: Commit**

  ```
  git add components/ColumnManagerModal.tsx
  git commit -m "feat: add ColumnManagerModal with reorder, toggle, add, and delete"
  ```

---

## Task 6: Update `Tracker.tsx`

**Files:**
- Modify: `components/Tracker.tsx`

**Interfaces:**
- Consumes: `ColumnConfig` from `types/columnConfig`, `renderCell` from `lib/renderCell`, `ColumnManagerModal` from `components/ColumnManagerModal`
- Updated `TrackerProps`:
  ```typescript
  interface TrackerProps {
    bikes: Bike[];
    columns: ColumnConfig[];
    isAdmin: boolean;
    onAdd: (data: BikeFormData) => Promise<void>;
    onEdit: (id: string, data: Partial<BikeFormData>) => Promise<void>;
    onDelete: (id: string) => Promise<void>;
    onMarkFinished: (id: string, dateFinished: string, newExpiry: string, remarks: string, extraFields?: Record<string, string>) => Promise<void>;
    onUpdateColumns: (cols: ColumnConfig[]) => Promise<void>;
  }
  ```

- [ ] **Step 1: Update imports and props**

  Add `ColumnConfig` import from `@/types/columnConfig`. Add `renderCell` import from `@/lib/renderCell`. Add `ColumnManagerModal` import from `./ColumnManagerModal`. Add `Settings2` icon import from `lucide-react`. Update `TrackerProps` to the interface above. Add `showColumnManager: boolean` state.

- [ ] **Step 2: Remove the hardcoded `COLUMNS` constant and local `Column` type**

  Replace the `COLUMNS` array with derived display columns:
  ```typescript
  const displayColumns = props.columns.filter(c => c.showInTracker).sort((a, b) => a.order - b.order);
  ```

- [ ] **Step 3: Update sort type**

  Change `type SortKey = keyof Bike | null` to `type SortKey = string | null`.

  Update the sort comparator in `sorted` useMemo:
  ```typescript
  const av = sortKey && sortKey in bike
    ? bike[sortKey as keyof Bike]
    : bike.extraFields?.[sortKey!] ?? '';
  ```
  Apply the same logic for `bv`. Keep the number comparison branch (`typeof av === 'number'`) before the string fallback.

- [ ] **Step 4: Replace hardcoded `<thead>` with dynamic mapping**

  Map over `displayColumns` for `<th>` elements. Each `<th>` uses `col.id` as `key`, `col.label` as text, `col.fieldKey` as the sort key (instead of `col.sortKey`). Sort icon shown when `col.fieldKey !== null`.

- [ ] **Step 5: Replace hardcoded `<tbody>` cell block with `renderCell`**

  Replace the 13 hardcoded `<td>` elements per row with:
  ```tsx
  {displayColumns.map(col => (
    <td key={col.id} className="px-4 py-3">
      {renderCell(col, bike, 'tracker')}
    </td>
  ))}
  ```
  The Actions `<td>` is added after this map, unchanged.

- [ ] **Step 6: Update "Sorted by" label**

  Change `COLUMNS.find(c => c.sortKey === sortKey)?.label` to `displayColumns.find(c => c.fieldKey === sortKey)?.label`.

- [ ] **Step 7: Update `colSpan` for empty state**

  Change `colSpan={COLUMNS.length}` to `colSpan={displayColumns.length + 1}` (the `+1` is for the unmanaged Actions column).

- [ ] **Step 8: Add "Manage Columns" button (admin only)**

  In the filter bar, after the existing `SlidersHorizontal` filter button and before the "Add Bike" button, add:
  ```tsx
  {isAdmin && (
    <button
      onClick={() => setShowColumnManager(true)}
      className="p-2 rounded-lg border border-gray-200 text-gray-500 hover:bg-gray-50 transition-colors"
      title="Manage columns"
    >
      <Settings2 className="w-4 h-4" />
    </button>
  )}
  ```

- [ ] **Step 9: Add `ColumnManagerModal` at end of component return**

  ```tsx
  <ColumnManagerModal
    open={showColumnManager}
    columns={props.columns}
    onClose={() => setShowColumnManager(false)}
    onSave={async (cols) => { await props.onUpdateColumns(cols); setShowColumnManager(false); }}
  />
  ```

- [ ] **Step 10: Pass `columns` to `AddBikeModal` and `MarkFinishedModal`**

  Add `columns={props.columns}` prop to both `AddBikeModal` usages and to `MarkFinishedModal`.
  Update `MarkFinishedModal`'s `onSubmit` call to pass `extraFields` (from the widened modal — this is consumed in Task 9; for now pass it through):
  `onSubmit={(id, df, ne, r, ef) => props.onMarkFinished(id, df, ne, r, ef)}`

- [ ] **Step 11: Verify TypeScript compiles**

  Run: `npm run build`
  Expected: no errors (Tasks 8 and 9 prop changes will cause errors there — those are fixed in their own tasks; Tracker itself must compile).

- [ ] **Step 12: Commit**

  ```
  git add components/Tracker.tsx
  git commit -m "feat: make Tracker columns dynamic with renderCell and admin column manager"
  ```

---

## Task 7: Update `Finished.tsx`

**Files:**
- Modify: `components/Finished.tsx`

**Interfaces:**
- Updated `FinishedProps`:
  ```typescript
  interface FinishedProps {
    bikes: Bike[];
    columns: ColumnConfig[];
    isAdmin: boolean;
    onDelete: (id: string) => Promise<void>;
    onUpdateColumns: (cols: ColumnConfig[]) => Promise<void>;
  }
  ```

- [ ] **Step 1: Update imports and props**

  Same pattern as Task 6: add `ColumnConfig`, `renderCell`, `ColumnManagerModal`, `Settings2` imports. Update `FinishedProps`. Add `showColumnManager` state.

- [ ] **Step 2: Replace hardcoded columns**

  ```typescript
  const displayColumns = props.columns.filter(c => c.showInFinished).sort((a, b) => a.order - b.order);
  ```

- [ ] **Step 3: Update sort type to `string | null`**

  Same comparator update as Task 6 Step 3, but passing `'finished'` to `renderCell`.

- [ ] **Step 4: Replace `<thead>` and `<tbody>` with dynamic mapping**

  Same pattern as Task 6 Steps 4–5. Use `'finished'` for `renderCell` view param. Actions `<td>` (single delete button) appended after the map.

- [ ] **Step 5: Update "Sorted by" label and `colSpan`**

  Same as Task 6 Steps 6–7.

- [ ] **Step 6: Add "Manage Columns" button**

  Finished's filter bar has no "Add" button — place the `Settings2` button at the far right (where the "X completed" count currently is), to the left of that count.

- [ ] **Step 7: Add `ColumnManagerModal` at end of return**

  Same as Task 6 Step 9 but using `showInFinished` filtered columns view.

- [ ] **Step 8: Verify TypeScript compiles**

  Run: `npm run build`
  Expected: no errors.

- [ ] **Step 9: Commit**

  ```
  git add components/Finished.tsx
  git commit -m "feat: make Finished columns dynamic with renderCell and admin column manager"
  ```

---

## Task 8: Update `AddBikeModal.tsx`

**Files:**
- Modify: `components/AddBikeModal.tsx`

**Interfaces:**
- Updated `AddBikeModalProps`:
  ```typescript
  interface AddBikeModalProps {
    open: boolean;
    onClose: () => void;
    onSubmit: (data: BikeFormData) => Promise<void>;
    editBike?: Bike | null;
    columns: ColumnConfig[];
  }
  ```

- [ ] **Step 1: Add `columns` prop and import `ColumnConfig`**

  Import `ColumnConfig` from `@/types/columnConfig`.

- [ ] **Step 2: Update `empty` initial state to include `extraFields`**

  Add `extraFields: {}` to the `empty` constant. Update the `useEffect` initialization: when `editBike` is set, also carry over `editBike.extraFields ?? {}`.

- [ ] **Step 3: Wrap non-required core inputs with `showInForm` guard**

  The following core fields are NOT in the required list and should be conditionally rendered based on `columns.find(c => c.fieldKey === 'X')?.showInForm !== false`:
  - `passingDate`
  - `newNumber`
  - `tcNo`
  - `renewalRemarks`
  - `subStatus`
  - `pendingRemarks`
  - `dateFinished` (already in form but rarely needed in Add)
  - `newExpiryDate` (same)

  Required fields (`srl`, `bikeNumber`, `category`, `chassisNo`, `year`, `registrationExpiryDate`) remain unconditional.

  `fullReg` read-only preview remains unconditional (per Global Constraints).

  For each conditional field, wrap its `<div>` with:
  ```tsx
  {columns.find(c => c.fieldKey === 'passingDate')?.showInForm !== false && (
    <div>...</div>
  )}
  ```
  If `columns` is empty or the column is not found, default to showing (treat missing as `true`).

- [ ] **Step 4: Render custom column inputs after the last core field**

  Before the footer `<div>`, add:
  ```tsx
  {columns
    .filter(c => !c.isCore && c.showInForm)
    .sort((a, b) => a.order - b.order)
    .map(col => (
      <div key={col.id}>
        <label className={labelCls}>{col.label}</label>
        <input
          type={col.type === 'number' ? 'number' : col.type === 'date' ? 'date' : 'text'}
          className={inputCls}
          value={form.extraFields?.[col.fieldKey] ?? ''}
          onChange={(e) =>
            setForm(f => ({
              ...f,
              extraFields: { ...f.extraFields, [col.fieldKey]: e.target.value },
            }))
          }
          placeholder={col.label}
        />
      </div>
    ))
  }
  ```

- [ ] **Step 5: Verify TypeScript compiles**

  Run: `npm run build`
  Expected: no errors.

- [ ] **Step 6: Commit**

  ```
  git add components/AddBikeModal.tsx
  git commit -m "feat: add dynamic extra fields and showInForm gating to AddBikeModal"
  ```

---

## Task 9: Update `MarkFinishedModal.tsx`

**Files:**
- Modify: `components/MarkFinishedModal.tsx`

**Interfaces:**
- Updated `MarkFinishedModalProps`:
  ```typescript
  interface MarkFinishedModalProps {
    open: boolean;
    bike: Bike | null;
    onClose: () => void;
    columns: ColumnConfig[];
    onSubmit: (
      id: string,
      dateFinished: string,
      newExpiry: string,
      remarks: string,
      extraFields?: Record<string, string>
    ) => Promise<void>;
  }
  ```

- [ ] **Step 1: Add `columns` prop and `extraFields` state**

  Import `ColumnConfig` from `@/types/columnConfig`. Add `columns` to props. Add `const [extraFields, setExtraFields] = useState<Record<string, string>>({})`.

  Reset `extraFields` to `{}` in `handleSubmit` after the `onSubmit` call (alongside the existing resets).

- [ ] **Step 2: Pass `extraFields` to `onSubmit`**

  Change: `await onSubmit(bike.id!, dateFinished, newExpiry, remarks);`
  To: `await onSubmit(bike.id!, dateFinished, newExpiry, remarks, extraFields);`

- [ ] **Step 3: Render custom column inputs**

  After the `Renewal Remarks` field div and before the footer `<div>`, add the same pattern as Task 8 Step 4 but reading/writing `extraFields` state:
  ```tsx
  {columns
    .filter(c => !c.isCore && c.showInForm)
    .sort((a, b) => a.order - b.order)
    .map(col => (
      <div key={col.id}>
        <label className={labelCls}>{col.label}</label>
        <input
          type={col.type === 'number' ? 'number' : col.type === 'date' ? 'date' : 'text'}
          className={inputCls}
          value={extraFields[col.fieldKey] ?? ''}
          onChange={(e) =>
            setExtraFields(ef => ({ ...ef, [col.fieldKey]: e.target.value }))
          }
          placeholder={col.label}
        />
      </div>
    ))
  }
  ```

- [ ] **Step 4: Verify TypeScript compiles**

  Run: `npm run build`
  Expected: no errors.

- [ ] **Step 5: Commit**

  ```
  git add components/MarkFinishedModal.tsx
  git commit -m "feat: add extra fields and widen onSubmit signature in MarkFinishedModal"
  ```

---

## Task 10: Wire up `app/page.tsx`

**Files:**
- Modify: `app/page.tsx`

**Interfaces:**
- Consumes all produced interfaces from previous tasks.
- Closes the loop: `page.tsx` owns column state; passes it to Tracker and Finished.

- [ ] **Step 1: Import `useColumnConfig` and derive `isAdmin`**

  Add import: `import { useColumnConfig } from '@/hooks/useColumnConfig';`

  Inside `Home()`, after the existing `useState` declarations, add:
  ```typescript
  const { columns, updateColumns } = useColumnConfig();
  const isAdmin = authUser?.email === 'geopagtalunan@gmail.com';
  ```

- [ ] **Step 2: Widen `handleMarkFinished`**

  Current signature: `async (id: string, dateFinished: string, newExpiry: string, remarks: string)`
  New signature: `async (id: string, dateFinished: string, newExpiry: string, remarks: string, extraFields?: Record<string, string>)`

  Pass `extraFields` through to `markFinished(id, dateFinished, newExpiry, remarks, extraFields)`.

- [ ] **Step 3: Pass new props to `<Tracker>`**

  Add to `<Tracker>`:
  ```tsx
  columns={columns}
  isAdmin={isAdmin}
  onUpdateColumns={updateColumns}
  ```
  Update `onMarkFinished` to match new signature (the type already widened in Step 2).

- [ ] **Step 4: Pass new props to `<Finished>`**

  Add to `<Finished>`:
  ```tsx
  columns={columns}
  isAdmin={isAdmin}
  onUpdateColumns={updateColumns}
  ```

- [ ] **Step 5: Verify full TypeScript compile**

  Run: `npm run build`
  Expected: zero TypeScript errors across all files.

- [ ] **Step 6: Start dev server and do a full manual walkthrough**

  Run: `npm run dev`

  Verify:
  1. Tables render correctly with same columns as before (seed fires on first load)
  2. As admin (`geopagtalunan@gmail.com`), "Manage Columns" button appears in Tracker and Finished toolbars
  3. Open Column Manager — all 15 columns listed with correct toggles
  4. Toggle "Tracker" off on "Pending Remarks" — column disappears from Tracker table immediately
  5. Add a custom column "Notes" (text type) — appears at end of both tables and in Add Bike form
  6. Enter a value for "Notes" in Add Bike modal — value saved and shown in table
  7. Reorder: move "Notes" up one position — order persists after modal close and reopen
  8. Delete "Notes" — confirmation dialog appears; after confirm, column gone from tables
  9. As non-admin user (different email), "Manage Columns" button does not appear
  10. Mark a bike as finished — MarkFinishedModal works, bike moves to Finished table

- [ ] **Step 7: Commit**

  ```
  git add app/page.tsx
  git commit -m "feat: wire column management into page — passes columns, isAdmin, and updateColumns to tables"
  ```
