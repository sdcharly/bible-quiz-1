import { NextRequest, NextResponse } from "next/server";

import { getAdminSession, logActivity } from "@/lib/admin-auth";
import {
  getPermissionTemplates,
  createPermissionTemplate,
  updatePermissionTemplate,
  deletePermissionTemplate,
} from "@/lib/permission-templates";
import { logger } from "@/lib/logger";

// GET /api/admin/settings/permissions/templates - Get all templates
export async function GET() {
  // Verify admin authentication
  const session = await getAdminSession();
  if (!session) {
    logger.warn("Unauthorized admin API access attempt to src/app/api/admin/settings/permissions/templates/route.ts");
    return NextResponse.json(
      { error: "Unauthorized - Admin access required" },
      { status: 401 }
    );
  }
  logger.log(`Admin ${session.email} accessing GET src/app/api/admin/settings/permissions/templates/route.ts`);

  try {
    const templates = await getPermissionTemplates();
    
    return NextResponse.json({ templates });
  } catch (error) {
    if (error instanceof Error && error.message.includes("Unauthorized")) {
      return NextResponse.json(
        { error: "Unauthorized - Admin access required" },
        { status: 401 }
      );
    }
    
    return NextResponse.json(
      { error: "Failed to fetch permission templates" },
      { status: 500 }
    );
  }
}

// POST /api/admin/settings/permissions/templates - Create new template
export async function POST(request: NextRequest) {
  // Verify admin authentication
  const session = await getAdminSession();
  if (!session) {
    logger.warn("Unauthorized admin API access attempt to src/app/api/admin/settings/permissions/templates/route.ts");
    return NextResponse.json(
      { error: "Unauthorized - Admin access required" },
      { status: 401 }
    );
  }
  logger.log(`Admin ${session.email} accessing POST src/app/api/admin/settings/permissions/templates/route.ts`);

  try {
    // Admin already authenticated above
    const body = await request.json();
    
    const { name, description, permissions, isDefault } = body;
    
    if (!name || !permissions) {
      return NextResponse.json(
        { error: "Name and permissions are required" },
        { status: 400 }
      );
    }
    
    const template = await createPermissionTemplate({
      name,
      description,
      permissions,
      isDefault,
      createdBy: session.id,
    });
    
    if (!template) {
      return NextResponse.json(
        { error: "Failed to create template" },
        { status: 500 }
      );
    }
    
    await logActivity(
      session.id,
      "create_permission_template",
      "permission_template",
      template.id,
      {
        templateName: name,
        isDefault,
      }
    );
    
    return NextResponse.json({ template });
  } catch (error) {
    if (error instanceof Error && error.message.includes("Unauthorized")) {
      return NextResponse.json(
        { error: "Unauthorized - Admin access required" },
        { status: 401 }
      );
    }
    
    return NextResponse.json(
      { error: "Failed to create permission template" },
      { status: 500 }
    );
  }
}

// PUT /api/admin/settings/permissions/templates - Update template
export async function PUT(request: NextRequest) {
  // Verify admin authentication
  const session = await getAdminSession();
  if (!session) {
    logger.warn("Unauthorized admin API access attempt to src/app/api/admin/settings/permissions/templates/route.ts");
    return NextResponse.json(
      { error: "Unauthorized - Admin access required" },
      { status: 401 }
    );
  }
  logger.log(`Admin ${session.email} accessing PUT src/app/api/admin/settings/permissions/templates/route.ts`);

  try {
    // Admin already authenticated above
    const body = await request.json();
    
    const { id, name, description, permissions, isDefault, isActive } = body;
    
    if (!id) {
      return NextResponse.json(
        { error: "Template ID is required" },
        { status: 400 }
      );
    }
    
    const template = await updatePermissionTemplate(id, {
      name,
      description,
      permissions,
      isDefault,
      isActive,
    });
    
    if (!template) {
      return NextResponse.json(
        { error: "Failed to update template" },
        { status: 500 }
      );
    }
    
    await logActivity(
      session.id,
      "update_permission_template",
      "permission_template",
      id,
      {
        updates: { name, description, permissions, isDefault, isActive },
      }
    );
    
    return NextResponse.json({ template });
  } catch (error) {
    if (error instanceof Error && error.message.includes("Unauthorized")) {
      return NextResponse.json(
        { error: "Unauthorized - Admin access required" },
        { status: 401 }
      );
    }
    
    return NextResponse.json(
      { error: "Failed to update permission template" },
      { status: 500 }
    );
  }
}

// DELETE /api/admin/settings/permissions/templates - Delete template
export async function DELETE(request: NextRequest) {
  // Verify admin authentication
  const session = await getAdminSession();
  if (!session) {
    logger.warn("Unauthorized admin API access attempt to src/app/api/admin/settings/permissions/templates/route.ts");
    return NextResponse.json(
      { error: "Unauthorized - Admin access required" },
      { status: 401 }
    );
  }
  logger.log(`Admin ${session.email} accessing DELETE src/app/api/admin/settings/permissions/templates/route.ts`);

  try {
    // Admin already authenticated above
    const { searchParams } = new URL(request.url);
    const id = searchParams.get("id");
    
    if (!id) {
      return NextResponse.json(
        { error: "Template ID is required" },
        { status: 400 }
      );
    }
    
    const success = await deletePermissionTemplate(id);
    
    if (!success) {
      return NextResponse.json(
        { error: "Failed to delete template or template is default" },
        { status: 400 }
      );
    }
    
    await logActivity(
      session.id,
      "delete_permission_template",
      "permission_template",
      id,
      {}
    );
    
    return NextResponse.json({ success: true });
  } catch (error) {
    if (error instanceof Error && error.message.includes("Unauthorized")) {
      return NextResponse.json(
        { error: "Unauthorized - Admin access required" },
        { status: 401 }
      );
    }
    
    return NextResponse.json(
      { error: "Failed to delete permission template" },
      { status: 500 }
    );
  }
}