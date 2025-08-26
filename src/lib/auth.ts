import { betterAuth } from "better-auth"
import { drizzleAdapter } from "better-auth/adapters/drizzle"
import { db } from "./db"


export const auth = betterAuth({
  database: drizzleAdapter(db, {
    provider: "pg",
  }),
  baseURL: process.env.NEXT_PUBLIC_APP_URL || "http://localhost:3000",
  emailAndPassword: {
    enabled: true,
  },
  socialProviders: {
    google: {
      clientId: process.env.GOOGLE_CLIENT_ID as string,
      clientSecret: process.env.GOOGLE_CLIENT_SECRET as string,
      redirectURI: `${process.env.NEXT_PUBLIC_APP_URL || "http://localhost:3000"}/api/auth/callback/google`,
    },
  },
  user: {
    additionalFields: {
      role: {
        type: "string",
        defaultValue: "student",
        required: false,
      },
      phoneNumber: {
        type: "string",
        required: false,
      },
    },
  },
  callbacks: {
    user: {
      create: async ({ user }: { user: { role?: string; email?: string } }) => {
        // Default role is student
        const updatedUser = {
          ...user,
          role: user.role || "student",
        };
        
        // For Google OAuth users, also check for pending invitations after creation
        // This is handled in the dashboard redirect, but we ensure the role is set
        return updatedUser;
      },
    },
  },
})