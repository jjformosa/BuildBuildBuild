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

- **※① BookReader 記錄**：Reader 須曾透過有效的 share link（`/share/<token>`）進入，系統自動建立 `BookReader` 記錄後方可讀取。未登入者點 `/share/<token>` 後導向登入頁，登入後 redirect 回分享連結，建立記錄後進入閱讀頁。直接訪問 `/read/<bookId>` 而無 BookReader 記錄者將被拒絕（403）。
- **※② 分享連結時效**：`shared` 書本的分享連結預設 7 天有效期。Admin / Editor 可「延長七天」（token 不變，URL 恆不變），亦可撤銷（shareStatus → private）。`public` 書本的連結無到期時限。
- **讀者管理**：透過 `BookReader` 模型記錄每位讀者（bookId + userId + joinedAt）。Reader 透過 share link 進入時自動靜默建立記錄；Admin / Editor 可在編輯頁查看讀者名單並移除個別讀者（刪除記錄，不設黑名單）。被移除者可再次點 share link 重新加入。撤銷分享連結（shareStatus → private）後，由於存取條件為 `shareStatus === 'shared' && isBookReader`，所有讀者（含已有記錄者）立即失去存取權。`ReadProgress` 仍記錄閱讀進度。
- **標籤管理**：Dashboard 書本卡片提供 tag 編輯（inline popover）。Admin（owner）與 Editor 皆可管理所有標籤；標籤資料存於 `book.tags`，僅對 Admin / Editor 可見，不影響讀者存取。
- **邀請編輯**：僅 Admin 可執行，不受 book 狀態影響。`book.editorId` 一次僅存一位 editor；Admin 可透過 Dashboard 或編輯頁移除 editor。
- **發布順序**：private 書本須先分享（進入 shared 狀態）才能發布，不可從 private 直接跳至 public。
- **狀態逆轉**：shared → private 透過撤銷分享連結；public → shared / private 規則待設計。