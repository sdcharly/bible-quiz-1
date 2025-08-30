import { createAuthClient } from "better-auth/react"

// Dynamically determine the base URL
const getBaseURL = () => {
  if (process.env.NEXT_PUBLIC_APP_URL) {
    return process.env.NEXT_PUBLIC_APP_URL;
  }
  
  if (typeof window !== 'undefined') {
    // Use the current origin in the browser
    return window.location.origin;
  }
  
  // Default for server-side rendering
  return "http://localhost:3000";
};

export const authClient = createAuthClient({
  baseURL: getBaseURL(),
})

export const {
  signIn,
  signOut,
  signUp,
  useSession,
  getSession,
} = authClient