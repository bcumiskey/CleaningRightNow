import { NextAuthOptions } from 'next-auth'
import CredentialsProvider from 'next-auth/providers/credentials'
import { compare } from 'bcryptjs'
import prisma from './prisma'

export const authOptions: NextAuthOptions = {
  session: {
    strategy: 'jwt',
  },
  pages: {
    signIn: '/login',
  },
  providers: [
    CredentialsProvider({
      name: 'credentials',
      credentials: {
        email: { label: 'Email', type: 'email' },
        password: { label: 'Password', type: 'password' },
      },
      async authorize(credentials) {
        if (!credentials?.email || !credentials?.password) {
          return null
        }

        // First try to find admin user
        const user = await prisma.user.findUnique({
          where: { email: credentials.email },
        })

        if (user) {
          const isValid = await compare(credentials.password, user.password)
          if (!isValid) {
            return null
          }

          // For User table logins (admins), also check if they have a matching TeamMember
          // This allows admins to also see their own worker earnings/data
          const matchingTeamMember = await prisma.teamMember.findUnique({
            where: { email: credentials.email },
          })

          return {
            id: user.id,
            email: user.email,
            name: user.name,
            role: 'admin',
            teamMemberId: matchingTeamMember?.id, // Include if they also have a TeamMember record
          }
        }

        // If not admin, try to find worker (team member)
        const worker = await prisma.teamMember.findUnique({
          where: { email: credentials.email },
        })

        if (!worker || !worker.password || !worker.isActive) {
          return null
        }

        const isValidWorker = await compare(credentials.password, worker.password)
        if (!isValidWorker) {
          return null
        }

        return {
          id: worker.id,
          email: worker.email,
          name: worker.name,
          role: worker.role || 'worker',
          teamMemberId: worker.id, // Always set for TeamMember logins
        }
      },
    }),
  ],
  callbacks: {
    async jwt({ token, user }) {
      if (user) {
        token.id = user.id
        token.role = (user as { role?: string }).role
        // Store teamMemberId if provided (for TeamMember logins)
        const userWithTeamMemberId = user as { teamMemberId?: string }
        if (userWithTeamMemberId.teamMemberId) {
          token.teamMemberId = userWithTeamMemberId.teamMemberId
        }
      }
      return token
    },
    async session({ session, token }) {
      if (session.user) {
        const tokenData = token as { id?: string; role?: string; teamMemberId?: string }
        ;(session.user as { id?: string }).id = tokenData.id
        ;(session.user as { role?: string }).role = tokenData.role
        // Include teamMemberId if present
        if (tokenData.teamMemberId) {
          ;(session.user as { teamMemberId?: string }).teamMemberId = tokenData.teamMemberId
        }
      }
      return session
    },
  },
}
