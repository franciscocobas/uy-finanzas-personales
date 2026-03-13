import type { NextAuthConfig } from "next-auth"

export default {
  pages: {
    signIn: "/login",
  },
  callbacks: {
    authorized({ auth, request: { nextUrl } }) {
      const isLoggedIn = !!auth?.user
      const isLoginPage = nextUrl.pathname === "/login"

      if (!isLoggedIn && !isLoginPage) return false
      if (isLoggedIn && isLoginPage) {
        return Response.redirect(new URL("/", nextUrl))
      }
      return true
    },
  },
  providers: [],
} satisfies NextAuthConfig
