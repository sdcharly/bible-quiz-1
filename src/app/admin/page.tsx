import { redirect } from "next/navigation";
import { getAdminSession } from "@/lib/admin-auth";


export default async function AdminPage() {
  const session = await getAdminSession();
  
  if (!session) {
    redirect("/admin/login");
  } else {
    redirect("/admin/dashboard");
  }
}