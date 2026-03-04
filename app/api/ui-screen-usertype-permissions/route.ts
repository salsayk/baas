import { NextResponse } from "next/server";
import { getAuthenticatedUser } from "@/app/lib/auth";
import { getDbClient } from "@/database/accounts/db-client";

const USER_TYPE_LOOKUP_ID = 2;
const PERMISSION_LOOKUP_ID = 5;

export async function GET(request: Request) {
  try {
    const { user, error: authError } = await getAuthenticatedUser();
    if (authError) return authError;
    if (!user) {
      return NextResponse.json({ error: "Unauthorized. Please sign in." }, { status: 401 });
    }

    const { searchParams } = new URL(request.url);
    const screenId = searchParams.get("screen_id");
    const languageId = searchParams.get("language_id");

    if (!screenId) {
      return NextResponse.json(
        { error: "screen_id is required" },
        { status: 400 }
      );
    }

    const scrId = Number(screenId);
    if (!Number.isInteger(scrId) || scrId < 1) {
      return NextResponse.json(
        { error: "screen_id must be a positive integer" },
        { status: 400 }
      );
    }

    const langId = languageId ? Number(languageId) : null;

    const client = getDbClient();
    await client.connect();
    try {
      const res = await client.query(
        `SELECT p.screen_id, p.user_type, p.permission
         FROM ui_screen_usertype_permissions p
         WHERE p.screen_id = $1
         ORDER BY p.user_type, p.permission`,
        [scrId]
      );

      const rows = res.rows as Array<{ screen_id: number; user_type: number; permission: number }>;

      if (rows.length === 0) {
        return NextResponse.json([]);
      }

      const userTypeIds = [...new Set(rows.map((r) => r.user_type))];
      const permissionIds = [...new Set(rows.map((r) => r.permission))];

      let userTypeLabels: Record<number, string> = {};
      let permissionLabels: Record<number, string> = {};

      const userTypeRes = langId
        ? await client.query(
            `SELECT v.value_id, COALESCE(t.value_name, v.value_name) AS value_name
             FROM system_lookup_values v
             LEFT JOIN system_lookup_value_translations t ON t.system_lookup_value_id = v.id AND t.language_id = $1
             WHERE v.lookup_table_id = $2 AND v.value_id = ANY($3::bigint[])`,
            [langId, USER_TYPE_LOOKUP_ID, userTypeIds]
          )
        : await client.query(
            `SELECT value_id, value_name FROM system_lookup_values
             WHERE lookup_table_id = $1 AND value_id = ANY($2::bigint[])`,
            [USER_TYPE_LOOKUP_ID, userTypeIds]
          );

      userTypeRes.rows.forEach((r: { value_id: number; value_name: string }) => {
        userTypeLabels[r.value_id] = r.value_name;
      });

      const permissionRes = langId
        ? await client.query(
            `SELECT v.value_id, COALESCE(t.value_name, v.value_name) AS value_name
             FROM system_lookup_values v
             LEFT JOIN system_lookup_value_translations t ON t.system_lookup_value_id = v.id AND t.language_id = $1
             WHERE v.lookup_table_id = $2 AND v.value_id = ANY($3::bigint[])`,
            [langId, PERMISSION_LOOKUP_ID, permissionIds]
          )
        : await client.query(
            `SELECT value_id, value_name FROM system_lookup_values
             WHERE lookup_table_id = $1 AND value_id = ANY($2::bigint[])`,
            [PERMISSION_LOOKUP_ID, permissionIds]
          );

      permissionRes.rows.forEach((r: { value_id: number; value_name: string }) => {
        permissionLabels[r.value_id] = r.value_name;
      });

      const enriched = rows.map((r) => ({
        ...r,
        user_type_name: userTypeLabels[r.user_type] ?? String(r.user_type),
        permission_name: permissionLabels[r.permission] ?? String(r.permission),
      }));

      return NextResponse.json(enriched);
    } finally {
      await client.end();
    }
  } catch (err) {
    console.error("UI screen usertype permissions GET error:", err);
    return NextResponse.json(
      { error: err instanceof Error ? err.message : "Internal server error" },
      { status: 500 }
    );
  }
}

export async function POST(request: Request) {
  try {
    const { user, error: authError } = await getAuthenticatedUser();
    if (authError) return authError;
    if (!user) {
      return NextResponse.json({ error: "Unauthorized. Please sign in." }, { status: 401 });
    }

    const body = await request.json();
    const screenId = Number(body.screen_id);
    const userType = Number(body.user_type);
    const permission = Number(body.permission);

    if (!Number.isInteger(screenId) || screenId < 1) {
      return NextResponse.json({ error: "screen_id must be a positive integer" }, { status: 400 });
    }
    if (!Number.isInteger(userType) || userType < 0) {
      return NextResponse.json({ error: "user_type must be a non-negative integer" }, { status: 400 });
    }
    if (!Number.isInteger(permission) || permission < 0) {
      return NextResponse.json({ error: "permission must be a non-negative integer" }, { status: 400 });
    }

    const client = getDbClient();
    await client.connect();
    try {
      const res = await client.query(
        `INSERT INTO ui_screen_usertype_permissions (screen_id, user_type, permission)
         VALUES ($1, $2, $3)
         ON CONFLICT (screen_id, user_type) DO UPDATE SET permission = EXCLUDED.permission
         RETURNING screen_id, user_type, permission`,
        [screenId, userType, permission]
      );

      return NextResponse.json(res.rows[0], { status: 201 });
    } catch (err: unknown) {
      const pgErr = err as { code?: string };
      if (pgErr?.code === "23505") {
        return NextResponse.json(
          { error: "This user_type already exists for this screen" },
          { status: 400 }
        );
      }
      throw err;
    } finally {
      await client.end();
    }
  } catch (err) {
    console.error("UI screen usertype permissions POST error:", err);
    return NextResponse.json(
      { error: err instanceof Error ? err.message : "Internal server error" },
      { status: 500 }
    );
  }
}

export async function DELETE(request: Request) {
  try {
    const { user, error: authError } = await getAuthenticatedUser();
    if (authError) return authError;
    if (!user) {
      return NextResponse.json({ error: "Unauthorized. Please sign in." }, { status: 401 });
    }

    const { searchParams } = new URL(request.url);
    const screenId = searchParams.get("screen_id");
    const userType = searchParams.get("user_type");

    if (!screenId || userType === null || userType === "") {
      return NextResponse.json(
        { error: "screen_id and user_type are required" },
        { status: 400 }
      );
    }

    const scrId = Number(screenId);
    const ut = Number(userType);

    if (!Number.isInteger(scrId) || scrId < 1 || !Number.isInteger(ut) || ut < 0) {
      return NextResponse.json(
        { error: "Invalid screen_id or user_type" },
        { status: 400 }
      );
    }

    const client = getDbClient();
    await client.connect();
    try {
      const res = await client.query(
        `DELETE FROM ui_screen_usertype_permissions
         WHERE screen_id = $1 AND user_type = $2
         RETURNING screen_id, user_type, permission`,
        [scrId, ut]
      );

      if (res.rows.length === 0) {
        return NextResponse.json({ error: "Permission not found" }, { status: 404 });
      }

      return NextResponse.json({ success: true });
    } finally {
      await client.end();
    }
  } catch (err) {
    console.error("UI screen usertype permissions DELETE error:", err);
    return NextResponse.json(
      { error: err instanceof Error ? err.message : "Internal server error" },
      { status: 500 }
    );
  }
}
