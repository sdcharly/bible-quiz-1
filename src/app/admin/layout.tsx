import { redirect } from "next/navigation";
import { getAdminSession } from "@/lib/admin-auth";

export default async function AdminLayout({
  children,
}: {
  children: React.ReactNode;
}) {
  // Check authentication at the layout level for all admin pages
  // Except for the login page which will be handled separately
  const session = await getAdminSession();
  
  if (!session) {
    redirect("/admin/login");
  }

  return <>{children}</>;
}