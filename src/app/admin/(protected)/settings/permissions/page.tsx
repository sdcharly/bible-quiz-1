import { redirect } from "next/navigation";
import { getAdminSession } from "@/lib/admin-auth";
import { getPermissionTemplates } from "@/lib/permission-templates";
import PermissionTemplatesV2 from "./PermissionTemplatesV2";


async function getAdminData() {
  const session = await getAdminSession();
  
  if (!session) {
    redirect("/admin/login");
  }

  // Get permission templates from the proper permissionTemplates table
  const templates = await getPermissionTemplates();

  return {
    adminEmail: session.email,
    templates
  };
}

export default async function PermissionsPage() {
  const { adminEmail, templates } = await getAdminData();

  return (
    <PermissionTemplatesV2 
      adminEmail={adminEmail}
      templates={templates}
    />
  );
}