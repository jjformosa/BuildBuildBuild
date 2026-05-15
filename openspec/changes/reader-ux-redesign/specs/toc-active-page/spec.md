## ADDED Requirements

### Requirement: TOC highlights currently visible page
The desktop TOC SHALL display a distinct visual indicator (►) on the page item that currently occupies the most viewport space, updating in real time as the reader scrolls.

#### Scenario: Single page in view
- **WHEN** one page article occupies the centre of the scroll container viewport
- **THEN** its corresponding TOC item shows the ► indicator and uses a stronger text color

#### Scenario: Page transitions
- **WHEN** the reader scrolls and a different page crosses the centre threshold
- **THEN** the ► indicator moves to the newly centred page's TOC item within one animation frame

#### Scenario: No page centred (between pages)
- **WHEN** no page article intersects the centre detection zone
- **THEN** the previously active indicator remains visible (no flicker to no-selection state)

#### Scenario: Three visual states in TOC
- **WHEN** the TOC renders
- **THEN** each item is in exactly one of three states: unread-inactive (○), currently-viewing (►), or read (●)

#### Scenario: Mobile TOC
- **WHEN** the viewport is below the `md` breakpoint and the mobile bottom sheet is closed
- **THEN** no active-page indicator is visible (mobile relies on page layout for pagination feel)

### Requirement: Active page detection hook
The system SHALL provide a `useActivePage` hook that accepts a scroll container ref and a list of page IDs, returning the ID of the page currently most centred in the viewport.

#### Scenario: Centre zone detection
- **WHEN** a page article occupies the middle 30% of the scroll container height (rootMargin: "-35% 0px -35% 0px")
- **THEN** `useActivePage` returns that page's ID

#### Scenario: Multiple pages partially in centre zone
- **WHEN** two pages both intersect the centre zone simultaneously
- **THEN** the hook returns the ID of the page with the larger intersection ratio
