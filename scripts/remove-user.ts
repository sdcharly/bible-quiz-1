import { db } from "@/lib/db";
import { user } from "@/lib/schema";
import { eq } from "drizzle-orm";

async function removeUser() {
  const email = "talmidhouse@gmail.com";
  
  try {
    // First check if user exists
    const existingUser = await db
      .select()
      .from(user)
      .where(eq(user.email, email))
      .limit(1);

    if (existingUser.length === 0) {
      console.log(`User with email ${email} not found.`);
      process.exit(0);
    }

    // Delete the user
    await db.delete(user).where(eq(user.email, email));
    
    console.log(`Successfully removed user: ${email}`);
    console.log(`User ID was: ${existingUser[0].id}`);
    console.log(`User name was: ${existingUser[0].name}`);
  } catch (error) {
    console.error("Error removing user:", error);
    process.exit(1);
  }
  
  process.exit(0);
}

removeUser();