import { NextResponse } from "next/server";
import { checkMaintenanceMode } from "@/lib/maintenance";

export async function GET() {
  try {
    const maintenanceStatus = await checkMaintenanceMode();
    
    return NextResponse.json(maintenanceStatus);
  } catch (error) {
    console.error("Error checking maintenance status:", error);
    return NextResponse.json(
      { isEnabled: false, message: "" },
      { status: 500 }
    );
  }
}