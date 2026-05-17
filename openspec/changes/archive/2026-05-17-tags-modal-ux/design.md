## Context

Tags were implemented inline: `TagInput` is embedded directly in the dashboard `BookCard` and at the bottom of the editor sidebar. Two problems emerged:
1. The autocomplete dropdown is clipped or hidden by overflow constraints in both locations
2. Tag deletion was missing from dashboard; editors couldn't delete tags

All tag API endpoints (`POST /api/books/[bookId]/tags`, `DELETE /api/books/[bookId]/tags/[tagName]`) already use `canEditBook()` which permits owners AND editors. No backend changes are needed.

## Goals / Non-Goals

**Goals:**
- One shared `TagManagerModal` component used by both dashboard and editor
- Modal shows current tags as deletable chips + `TagInput` for adding
- Full add + delete available in both contexts
- Editors (not just owners) can manage tags

**Non-Goals:**
- Tag renaming or merging across books
- Bulk tag operations
- Tag search/filter in the modal itself
- Any API changes

## Decisions

### Decision: Single shared modal component

A single `TagManagerModal` component receives `bookId`, `initialTags`, `onClose`, and an optional `isOwner` flag (not needed—deletion is already gated by `canEditBook` on the server; client always shows delete UI).

**Alternative considered**: Separate modal per context. Rejected—duplicates logic.

### Decision: Modal receives tags as controlled state, callbacks for add/remove

The modal owns no async state itself. Parent passes `tags: string[]`, `onAdd`, `onRemove`, `onClose`. This keeps the modal pure and reusable.

**Alternative**: Modal fetches its own tags on open. Rejected—requires extra API call and complicates state sync with parent.

### Decision: Remove inline TagInput from editor sidebar entirely

The sidebar Tags section is replaced with a single `[標籤]` button. This frees sidebar space and eliminates the clipping issue.

### Decision: Dashboard BookCard stays as `div` (not reverted to `Link`)

The refactor from `Link` to `div + Link` inside was done in the previous iteration to allow the tag button. Keep as-is; the modal button replaces the inline TagInput toggle.

## Risks / Trade-offs

- [Risk] Modal blocks interaction with the rest of the page → Mitigation: standard backdrop click / Escape to close
- [Risk] Tags shown in modal may be stale if another session modifies them → Acceptable: low concurrency expected; modal re-opens fresh each time
