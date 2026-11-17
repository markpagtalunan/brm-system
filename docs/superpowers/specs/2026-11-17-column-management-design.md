# Column Management Design
**Date:** 2026-11-17  
**Project:** BRM System

---

## Intent & Why

All table columns in the Tracker and Finished views are currently hardcoded in component files. Adding a field or reordering columns requires a code change. This feature gives users a UI to add custom columns, reorder all columns, and control which columns appear in the add/edit form — with config stored globally in Firestore so all authorized users see the same layout.

---

## Goals

- Add new custom columns (text, number, or date type) to the Tracker and Finished tables
- Reorder ALL columns (both core/existing and custom) using up/down controls
- Toggle per column: show in Tracker table | show in Finished table | show in add/edit form
- Config is global — shared across all authorized users, stored in Firestore
- Existing core columns preserve their custom cell rendering (category badge, expiry color coding, chassis truncation, etc.)
- Core columns cannot be deleted; custom columns can (with confirmation dialog — data stays in Firestore untouched)

---

## Non-goals

- Per-user column preferences (this is a shared admin config)
- Independent ordering for Tracker vs Finished (same `order` value, different `showInTracker`/`showInFinished` flags)
- Renaming or deleting existing core columns
- Column-level access permissions

---

## Anti-goals

- Breaking existing bike data, Firestore queries, sort/filter/search/pagination features
- Pulling in a drag-and-drop library (up/down arrow buttons instead)
- Destroying custom field data on delete (data stays in `extraFields`, only the config entry is removed)

---

## Constraints

- Next.js App Router, TypeScript, Tailwind CSS
- Firebase Firestore for all persistence
- No new npm dependencies beyond what already exists

---

## Approach: Option B — Full column management

A single Firestore document (`settings/columns`) stores an array of `ColumnConfig` objects. Both tables read from this config. A `ColumnManagerModal` component provides the management UI, accessible **only to the admin user** (hardcoded owner email: `geopagtalunan@gmail.com`) via a button in the Tracker and Finished table toolbars. Other authorized users see the columns but cannot manage them.

---

## Data Model Changes

### New: `types/columnConfig.ts`

```typescript
export interface ColumnConfig {
  id: string;             // stable unique key (e.g. 'srl', 'custom_abc123')
  label: string;          // display name in header and form
  fieldKey: string;       // matches Bike field name or extraFields key
  type: 'text' | 'number' | 'date';
  isCore: boolean;        // true = existing field, cannot be deleted
  showInTracker: boolean;
  showInFinished: boolean;
  showInForm: boolean;    // show input field in AddBikeModal / MarkFinishedModal
  order: number;          // global sort order (Actions column is always last, unmanaged)
}
```

### Updated: `types/bike.ts`

Add to `Bike` interface:
```typescript
extraFields?: Record<string, string>;  // stores custom column values
```

### Firestore: `settings/columns` document

Shape: `{ columns: ColumnConfig[] }`

**Seeded defaults (matches current hardcoded layout):**

| id | label | fieldKey | showInTracker | showInFinished | showInForm |
|----|-------|----------|--------------|----------------|------------|
| srl | SRL | srl | true | true | true |
| passingDate | Passing Date | passingDate | true | true | true |
| bikeNumber | Bike No. | bikeNumber | true | true | true |
| category | Category | category | true | true | true |
| fullReg | Full Reg | fullReg | true | true | false |
| newNumber | New Number | newNumber | true | true | true |
| chassisNo | Chassis No. | chassisNo | true | true | true |
| tcNo | TC No. | tcNo | true | true | true |
| year | Year | year | true | true | true |
| registrationExpiryDate | Expiry Date | registrationExpiryDate | true | true | true |
| renewalRemarks | Renewal Remarks | renewalRemarks | true | true | true |
| subStatus | Sub Status | subStatus | true | true | true |
| pendingRemarks | Pending Remarks | pendingRemarks | true | false | true |
| dateFinished | Date Finished | dateFinished | false | true | true |
| newExpiryDate | New Expiry Date | newExpiryDate | false | true | true |

`fullReg` defaults `showInForm: false` because it is auto-computed from bikeNumber + category.

---

## New Files

| File | Purpose |
|------|---------|
| `types/columnConfig.ts` | ColumnConfig interface |
| `lib/columnConfig.ts` | Firestore read/write + seeding defaults |
| `hooks/useColumnConfig.ts` | React hook — fetches config, exposes ordered lists |
| `components/ColumnManagerModal.tsx` | Management UI (admin only) |

---

## Modified Files

| File | Change |
|------|--------|
| `types/bike.ts` | Add `extraFields` field |
| `lib/bikes.ts` | Pass through `extraFields` in add/update/markFinished + fix `fromFirestore` deserialization |
| `components/Tracker.tsx` | Dynamic headers + cell renderer from config; "Manage Columns" button for admin |
| `components/Finished.tsx` | Same |
| `components/AddBikeModal.tsx` | Conditionally show core inputs + render extra fields |
| `components/MarkFinishedModal.tsx` | Same; widen `onSubmit` to include `extraFields` |
| `app/page.tsx` | Fetch column config on load, pass to tables + modals |

---

## Admin Access Control

The "Manage Columns" button is only rendered if the current user's email matches the hardcoded admin email (`geopagtalunan@gmail.com`). No new role concept is introduced — it's a simple email check in the component. Regular authorized users see the columns but cannot open the manager.

---

## ColumnManagerModal UI

Triggered by a sliders icon button in both table toolbars (admin only).

```
┌─────────────────────────────────────────────────────────────┐
│  Manage Columns                                         [×] │
├─────────────────────────────────────────────────────────────┤
│  [↑][↓]  SRL              [Tracker ✓][Fin ✓][Form ✓]       │
│  [↑][↓]  Passing Date     [Tracker ✓][Fin ✓][Form ✓]       │
│  [↑][↓]  Bike No.         [Tracker ✓][Fin ✓][Form ✓]       │
│  [↑][↓]  Category         [Tracker ✓][Fin ✓][Form ✓]       │
│  ...                                                        │
│  [↑][↓]  My Custom Field  [Tracker ✓][Fin  ][Form ✓]  [🗑] │
├─────────────────────────────────────────────────────────────┤
│  + Add Column                                               │
│    Name: [____________]  Type: [text ▼]                     │
│                                              [Add]          │
└─────────────────────────────────────────────────────────────┘
```

- Up/Down arrows move a column one step; top row up-arrow and bottom row down-arrow are disabled
- Three toggle buttons per row: Tracker | Finished | Form — click to toggle on/off
- Delete (trash icon) only shown for custom columns (`isCore: false`)
- Deleting a custom column shows a confirmation dialog: *"This will hide the column from all tables. Existing data for this column will be kept on bike records."* — user must confirm before deletion
- "Add Column" section: label input + type selector (text/number/date), all three toggles default to `true`
- Changes save immediately on each interaction (optimistic UI + Firestore write); no Save button needed

---

## Cell Rendering

`renderCell(col: ColumnConfig, bike: Bike, view: 'tracker' | 'finished'): ReactNode`

Switch on `col.fieldKey`:
- Core fields → existing formatting preserved (category badge, expiry color — with `line-through` variant for Finished, chassis truncation, status badges, etc.)
- Custom fields → `bike.extraFields?.[col.fieldKey] ?? '—'`

Both tables replace their current manually-ordered `<td>` blocks with a `.map()` over the filtered + sorted column config.

Sorting on custom columns: the sort comparator checks `bike.extraFields?.[sortKey] ?? ''` for non-core keys. Sorting works but is string-based for all custom column types.

---

## Form Rendering

**Core columns with `showInForm: false`:** their existing form inputs are hidden in `AddBikeModal` / `MarkFinishedModal`.

**Core columns with `showInForm: true`:** existing inputs shown as today, no structural change.

**`fullReg`:** the read-only computed preview field always stays visible in `AddBikeModal` regardless of its `showInForm` toggle, since it provides useful feedback while filling in `bikeNumber` + `category`. Its toggle only controls whether it appears as a column in the tables.

**Custom columns with `showInForm: true`:** dynamic inputs appended in column `order` after the last core input:
- `text` → `<input type="text" />`
- `number` → `<input type="number" />`
- `date` → `<input type="date" />`

Values read/written as `bike.extraFields[col.fieldKey]`.

`MarkFinishedModal` state and `onSubmit` signature are widened to carry `extraFields`.

---

## Loading & Caching

`useColumnConfig` hook:
1. On mount, fetch `settings/columns` from Firestore
2. If document doesn't exist, seed it with the defaults above and write it back
3. Expose `trackerColumns`, `finishedColumns`, `allColumns`, `loading`, `updateColumns`
4. `ColumnManagerModal` calls `updateColumns(columns)` which writes the full array back

Config is re-fetched on modal close so tables stay in sync without a full page reload.

---

## Builder's Calls

- No drag-and-drop library — up/down arrows only
- Immediate save per toggle/reorder — no Save button
- `fullReg` read-only preview stays in form unconditionally; its `showInForm` toggle controls table visibility only
- `Actions` column is unmanaged — always last, not in config
- Custom column `fieldKey` = `custom_` + `Date.now()` suffix for uniqueness
- Config seeding happens client-side on first fetch — no migration script
- `fromFirestore` in `lib/bikes.ts` explicitly deserializes `extraFields` to avoid silent data drops
- Sorted-by label in Tracker/Finished header area reads from column config (not the old hardcoded `COLUMNS` array)
- Custom column sort is string-based (acceptable tradeoff; can be improved later)
- Admin check: single hardcoded email `geopagtalunan@gmail.com` — no role model added
