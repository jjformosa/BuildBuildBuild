import NextAuth from 'next-auth'
import Google from 'next-auth/providers/google'
import Line from 'next-auth/providers/line'
import { MongoDBAdapter } from '@auth/mongodb-adapter'
import clientPromise from './lib/mongodb-client'

export const { handlers, auth, signIn, signOut } = NextAuth({
  adapter: MongoDBAdapter(clientPromise),
  providers: [
    Google,
    Line({
      clientId: process.env.LINE_CLIENT_ID!,
      clientSecret: process.env.LINE_CLIENT_SECRET!,
    }),
  ],
  session: { strategy: 'database' },
  pages: {
    signIn: '/login',
  },
  callbacks: {
    session({ session, user }) {
      session.user.role = user.role ?? 'customer'
      return session
    },
  },
})
