# Project Conventions

## Commands requiring manual execution

Provide commands but do NOT execute them directly for:

- **Package management**: `npm install`, `pnpm add`, `npm run`, etc.
- **Version control (destructive/remote)**: `git push`, `git reset`, `git restore`, `git rebase`, `git merge` and any other irreversible or remote-affecting git commands

Read-only git commands (`git log`, `git diff`, `git status`, `git show`, `git rev-parse`, etc.) may be run directly.

`git commit`, `git add`, `git branch`, `git checkout -b` may be run directly.
