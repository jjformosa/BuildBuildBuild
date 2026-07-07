<!-- BEGIN:nextjs-agent-rules -->
# This is NOT the Next.js you know

This version has breaking changes — APIs, conventions, and file structure may all differ from your training data. Read the relevant guide in `node_modules/next/dist/docs/` before writing any code. Heed deprecation notices.
<!-- END:nextjs-agent-rules -->

## Project Reading Shortcut

When the user says `閱讀專案文件`, read and summarize the project from these sources before making assumptions or writing code:

1. Start with the core product context:
   - `forlove10grams/docs/product-brief.md`
   - `forlove10grams/docs/backlog.md`
   - `forlove10grams/docs/user-stories.md`

2. Read the technical and decision memos:
   - `forlove10grams/docs/s3-access-control-memo.md`
   - `forlove10grams/docs/pwa-feasibility-memo.md`

3. Read current feature specs under:
   - `forlove10grams/docs/superpowers/specs/`

4. Use implementation plans under this directory only as supporting detail when needed:
   - `forlove10grams/docs/superpowers/plans/`

5. For frontend/design/testing workflow context, read:
   - `forlove10grams/docs/ai-agent-suggestions/frontend_design/`
   - `forlove10grams/docs/ai-agent-suggestions/frontend_test/`
   - `forlove10grams/docs/samples/`

6. Treat document status labels as potentially stale. After reading docs, quickly cross-check the actual code for important feature status, especially:
   - quick capture: `forlove10grams/lib/quick-capture.ts`, `forlove10grams/components/quick-capture-bar.tsx`, `forlove10grams/app/api/books/quick/route.ts`
   - mobile upload: `forlove10grams/components/media-uploader.tsx`
   - page dates: `forlove10grams/lib/models/page.ts`, `forlove10grams/components/book-editor-client.tsx`
   - sharing/readers: `forlove10grams/lib/models/share.ts`, `forlove10grams/lib/models/book-reader.ts`, `forlove10grams/app/share/[token]/page.tsx`
   - not-yet-implemented directions: search for `audio`, `BookMessage`, and `Collection` before claiming they exist.
