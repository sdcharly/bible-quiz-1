import { NextResponse } from "next/server";

export async function POST(request: Request) {
  try {
    const body = await request.json();
    const { email } = body;
    
    // Check which emails are valid
    const validAdminEmails = [
      process.env.SUPER_ADMIN_EMAIL,
      process.env.ADMIN_EMAIL
    ].filter(Boolean);
    
    const response = {
      providedEmail: email,
      isValidEmail: validAdminEmails.includes(email),
      validEmails: validAdminEmails.map(e => e ? `${e.substring(0, 3)}...${e.substring(e.lastIndexOf('@'))}` : ''),
      envVars: {
        hasSuperAdminEmail: !!process.env.SUPER_ADMIN_EMAIL,
        hasAdminEmail: !!process.env.ADMIN_EMAIL,
        superAdminStarts: process.env.SUPER_ADMIN_EMAIL?.substring(0, 5),
        adminEmailStarts: process.env.ADMIN_EMAIL?.substring(0, 5)
      }
    };
    
    return NextResponse.json(response);
  } catch (error) {
    return NextResponse.json({ error: "Test failed" }, { status: 500 });
  }
}