import type { DefaultSession } from 'next-auth'

declare module 'next-auth' {
  interface Session {
    user: {
      role: 'admin' | 'customer'
      nicknameIsSet: boolean
    } & DefaultSession['user']
  }

  interface User {
    role?: 'admin' | 'customer'
    nickname?: string | null
  }
}
