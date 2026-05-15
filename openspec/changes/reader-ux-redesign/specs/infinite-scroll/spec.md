## ADDED Requirements

### Requirement: Generic infinite scroll hook
The system SHALL provide a `useInfiniteScroll` hook that accepts a fetch function and manages loading state, pagination cursor, and a sentinel ref for triggering new fetches.

#### Scenario: Initial load
- **WHEN** the hook is initialized with an `initialItems` array
- **THEN** those items are returned immediately without triggering a network request

#### Scenario: Sentinel enters viewport
- **WHEN** the sentinel element (attached via the returned `sentinelRef`) enters the viewport
- **THEN** the hook calls the provided `fetchMore` function if `hasMore` is true and no fetch is already in progress

#### Scenario: Fetch returns items
- **WHEN** `fetchMore` resolves with a non-empty array
- **THEN** those items are appended to the existing list and the cursor advances

#### Scenario: Fetch returns empty array
- **WHEN** `fetchMore` resolves with an empty array
- **THEN** `hasMore` is set to false and no further fetches are triggered

#### Scenario: Fetch in progress
- **WHEN** the sentinel enters the viewport while a fetch is already in progress
- **THEN** the hook SHALL NOT initiate a second concurrent fetch

### Requirement: Paginated pages API endpoint
The system SHALL expose `GET /api/books/[bookId]/pages?after=<pageId>&limit=<n>` returning the next batch of pages after the given cursor.

#### Scenario: Valid cursor
- **WHEN** a valid `after` page ID is provided
- **THEN** the endpoint returns up to `limit` pages that come after that ID in `book.pageOrder`, in order

#### Scenario: No cursor (first batch)
- **WHEN** no `after` parameter is provided
- **THEN** the endpoint returns the first `limit` pages

#### Scenario: Cursor at end of list
- **WHEN** the `after` ID is the last page in `pageOrder`
- **THEN** the endpoint returns an empty array

#### Scenario: Unauthorized access
- **WHEN** the requester is not authenticated or does not have read access
- **THEN** the endpoint returns 401 or 403

### Requirement: Read page uses incremental loading
The read page SHALL render the first 5 pages via SSR and load subsequent pages client-side as the reader scrolls.

#### Scenario: Initial page load
- **WHEN** the reader opens a book
- **THEN** the first 5 pages are visible immediately without any client-side fetch

#### Scenario: Reader scrolls past penultimate loaded page
- **WHEN** the sentinel (placed after the last loaded page) enters the viewport
- **THEN** the next batch of pages is fetched and appended to the list

#### Scenario: All pages loaded
- **WHEN** the total number of loaded pages equals the total page count
- **THEN** the sentinel is removed and no further fetches occur
