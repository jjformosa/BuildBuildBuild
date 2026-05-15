## ADDED Requirements

### Requirement: Book page count limit
A book SHALL NOT exceed 30 pages. The editor SHALL prevent adding new pages once the limit is reached and display an inline alert.

#### Scenario: At limit — add page blocked
- **WHEN** a book already has 30 pages and the user clicks "新增頁面"
- **THEN** no API call is made and an inline alert is shown: "已達頁數上限（30 頁）"

#### Scenario: Below limit — add page allowed
- **WHEN** a book has fewer than 30 pages
- **THEN** the add-page buttons remain active and no alert is shown

### Requirement: Page image count limit
A carousel page SHALL NOT exceed 15 images. The editor SHALL prevent uploading additional images once the limit is reached and display an inline alert.

#### Scenario: At limit — upload blocked
- **WHEN** a carousel page already has 15 images and the user attempts to upload more
- **THEN** no upload is initiated and an inline alert is shown: "已達圖片上限（15 張）"

#### Scenario: Below limit — upload allowed
- **WHEN** a carousel page has fewer than 15 images
- **THEN** the upload button remains active and no alert is shown
