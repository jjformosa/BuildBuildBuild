## ADDED Requirements

### Requirement: Visual page separator between articles
The system SHALL render a decorative `· · ·` separator element between each consecutive pair of page articles on the read page.

#### Scenario: Separator placement
- **WHEN** two adjacent pages are rendered
- **THEN** a separator element appears between them, outside either article's DOM boundary

#### Scenario: Separator appearance
- **WHEN** the separator is visible
- **THEN** it displays three middle-dot characters (`· · ·`) centered horizontally, in `#2C1810` at 30% opacity, with small letter-spacing, and no page number or date

#### Scenario: No trailing separator
- **WHEN** the last page article is rendered
- **THEN** no separator appears after it

### Requirement: Increased page minimum height
Each page article SHALL occupy at least 65vh on viewports narrower than the `sm` breakpoint, and at least 75vh on wider viewports.

#### Scenario: Short content page on desktop
- **WHEN** a page has only one image and one short sentence
- **THEN** the article element is at least 75vh tall, with whitespace filling the remainder

#### Scenario: Long content page
- **WHEN** a page has many paragraphs exceeding 75vh
- **THEN** the article grows naturally beyond the minimum with no clipping

#### Scenario: Mobile viewport
- **WHEN** the viewport width is below the `sm` breakpoint
- **THEN** the article minimum height is 65vh
