import { NextRequest, NextResponse } from "next/server";
import { db } from "@/lib/db";
import { account, user } from "@/lib/schema";

export async function GET(req: NextRequest) {
  try {
    // Get all accounts
    const accounts = await db
      .select()
      .from(account)
      .orderBy(account.createdAt);

    // Get all users
    const users = await db
      .select()
      .from(user)
      .orderBy(user.createdAt);

    return NextResponse.json({
      accounts: accounts.map(acc => ({
        id: acc.id,
        accountId: acc.accountId,
        providerId: acc.providerId,
        userId: acc.userId,
        hasPassword: !!acc.password,
        createdAt: acc.createdAt,
      })),
      users: users.map(u => ({
        id: u.id,
        email: u.email,
        name: u.name,
        role: u.role,
        phoneNumber: u.phoneNumber,
        emailVerified: u.emailVerified,
        createdAt: u.createdAt,
      })),
      totalAccounts: accounts.length,
      totalUsers: users.length,
    });
  } catch (error) {
    console.error("Error fetching accounts:", error);
    return NextResponse.json(
      { error: "Failed to fetch accounts" },
      { status: 500 }
    );
  }
}