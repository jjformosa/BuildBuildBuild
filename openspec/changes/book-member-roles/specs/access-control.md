## access-control

### User Role

`IUser.role: 'admin' | 'customer'`

- `admin`：全站管理者，可建立 book、邀請 editor、產生 share link
- `customer`：一般使用者；依 book 層級身份決定可做什麼

### Book 層級身份

| 身份 | 條件 | 可做的事 |
|---|---|---|
| owner（admin）| `book.createdBy === userId` | 建立/刪除 book、邀請 editor、產生 share link、編輯 |
| editor（customer）| `book.editorId === userId` | 新增/編輯/刪除 page、產生 share link |
| reader（customer）| 持有有效 share token | 瀏覽 book |

### Helper 函式介面

```ts
canEditBook(userId: string, book: IBook): boolean
canReadBook(userId: string, book: IBook, token?: string): Promise<boolean>
```

### API 驗證規則

| Endpoint | 驗證 |
|---|---|
| `POST /api/books` | session.user.role === 'admin' |
| `PATCH/DELETE /api/books/[bookId]` | canEditBook |
| `POST /api/books/[bookId]/invite` | session.user.role === 'admin' + book owner |
| `POST /api/books/[bookId]/pages` | canEditBook |
| `PATCH/DELETE /api/books/[bookId]/pages/[pageId]` | canEditBook |
| `POST /api/upload/presign` | canEditBook |
| `POST /api/books/[bookId]/share` | canEditBook |
| `GET /api/share/[token]` | 公開 |
| `GET /read/[bookId]` | canReadBook（middleware 層）|
