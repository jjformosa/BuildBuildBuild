## Why

The current tags UI embeds `TagInput` inline—inside the dashboard card and at the bottom of the editor sidebar—making the autocomplete dropdown invisible or awkward on both mobile and desktop. Users also cannot delete tags from the dashboard, and editors (non-owners) cannot manage tags at all. Consolidating tag management into a modal creates a consistent, fully-featured entry point from every context.

## What Changes

- Replace the inline `TagInput` in `BookCard` (dashboard) with a `[＋ 標籤]` button that opens a `TagManagerModal`
- Replace the inline `TagInput` at the bottom of the book editor sidebar with a `[標籤]` button that opens the same `TagManagerModal`
- The modal shows current tags as deletable chips and an `TagInput` (with visible autocomplete dropdown) for adding new ones
- Tag deletion is now available in both dashboard and editor contexts (previously only in editor)
- Permission fix: editors (`editorId`) can now add/delete tags (dashboard quick-add previously worked, but deletion was editor-only via PATCH which required admin role—this is now unified through the dedicated `/api/books/[bookId]/tags` endpoints that already use `canEditBook`)

## Capabilities

### New Capabilities
- `tag-manager-modal`: A shared modal component for viewing, adding, and deleting tags on a book, usable from both dashboard and editor contexts

### Modified Capabilities
- `dashboard-book-list`: Book cards gain a tag management button that opens the modal instead of inline tag input
- `book-management`: Editor sidebar gains a tag button that opens the modal; inline TagInput section is removed

## Impact

- `forlove10grams/components/tag-input.tsx` — unchanged (reused inside modal)
- `forlove10grams/components/dashboard-books-client.tsx` — BookCard refactored
- `forlove10grams/components/book-editor-client.tsx` — sidebar Tags section replaced
- New: `forlove10grams/components/tag-manager-modal.tsx`
- No API changes required (existing `/api/books/[bookId]/tags` endpoints already support both add and delete with `canEditBook` permission)
