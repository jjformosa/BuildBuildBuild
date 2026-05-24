# Book 資源 — 角色 × 狀態 權限真值表

## 狀態轉換

```
private  ──(admin / editor 分享)──▶  shared  ──(admin 發布)──▶  public
```

> 狀態可逆轉，逆轉規則另行設計（與 editor 有無相關）。

---

## 權限說明

| 符號 | 說明 |
|------|------|
| ✓ | 允許 |
| ✗ | 拒絕 |
| ※ | 條件允許（見備註） |

---

## 狀態：private

| 角色 | Read | Edit | 標籤管理 | 分享連結（→ shared） | 發布（→ public） |
|------|:----:|:----:|:--------:|:--------------------:|:----------------:|
| Admin | ✓ | ✓ | ✓ | ✓ | ✗ |
| Editor | ✓ | ✓ | ✓ | ✓ | ✗ |
| Reader | ✗ | ✗ | ✗ | ✗ | ✗ |
| 未登入者 | ✗ | ✗ | ✗ | ✗ | ✗ |

---

## 狀態：shared

| 角色 | Read | Edit | 標籤管理 | 分享連結管理 ※② | 發布（→ public） |
|------|:----:|:----:|:--------:|:---------------:|:----------------:|
| Admin | ✓ | ✓ | ✓ | ✓ | ✓ |
| Editor | ✓ | ✓ | ✓ | ✓ | ✗ |
| Reader | ※① | ✗ | ✗ | ✗ | ✗ |
| 未登入者 | ✗ | ✗ | ✗ | ✗ | ✗ |

---

## 狀態：public

| 角色 | Read | Edit | 標籤管理 | 分享連結管理 | 發布（→ public） |
|------|:----:|:----:|:--------:|:------------:|:----------------:|
| Admin | ✓ | ✓ | ✓ | ✓ | ✓ |
| Editor | ✓ | ✓ | ✓ | ✓ | ✗ |
| Reader | ✓ | ✗ | ✗ | ✗ | ✗ |
| 未登入者 | ✓ | ✗ | ✗ | ✗ | ✗ |

---

## 備註

- **※① 登入後**：Reader 須知道 `/read/<bookId>` 或透過有效的 share link 進入後登入。未登入者點 `/share/<token>` 後導向登入頁，登入後 redirect 回分享連結，解析後進入閱讀頁。
- **※② 分享連結時效**：`shared` 書本的分享連結預設 7 天有效期。Admin / Editor 可「延長七天」（token 不變，URL 恆不變），亦可撤銷（shareStatus → private）。`public` 書本的連結無到期時限。
- **讀者管理**：目前無明確的「讀者名單」機制（已移除 `BookReader` 模型）。讀者存取純粹由 `shareStatus` 決定 — `shared` 時任何持有有效 share link 且已登入的人皆可讀；撤銷連結（shareStatus → private）即為唯一的讀者管理手段。`ReadProgress` 仍記錄閱讀進度，Dashboard 的「與我回憶」section 透過 ReadProgress 顯示讀過的書本。
- **標籤管理**：Dashboard 書本卡片提供 tag 編輯（inline popover）。Admin（owner）與 Editor 皆可管理所有標籤；標籤資料存於 `book.tags`，僅對 Admin / Editor 可見，不影響讀者存取。
- **邀請編輯**：僅 Admin 可執行，不受 book 狀態影響。`book.editorId` 一次僅存一位 editor；Admin 可透過 Dashboard 或編輯頁移除 editor。
- **發布順序**：private 書本須先分享（進入 shared 狀態）才能發布，不可從 private 直接跳至 public。
- **狀態逆轉**：shared → private 透過撤銷分享連結；public → shared / private 規則待設計。