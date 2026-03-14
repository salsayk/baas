import { NextResponse } from "next/server";
import { getAuthenticatedUser } from "@/app/lib/auth";
import { getDbClient } from "@/database/accounts/db-client";

const ENTITIES_PAIR_TYPE_PROJECT_CONTRACT = 0;

export async function GET(request: Request) {
  try {
    const { user, error: authError } = await getAuthenticatedUser();
    if (authError) return authError;
    if (!user) {
      return NextResponse.json({ error: "Unauthorized. Please sign in." }, { status: 401 });
    }

    const { searchParams } = new URL(request.url);
    const parentEntityId = searchParams.get("parent_entity_id");
    const parentEntityIds = searchParams.get("parent_entity_ids");
    const entitiesPairType = searchParams.get("entities_pair_type");

    const pairType = entitiesPairType != null ? parseInt(entitiesPairType, 10) : ENTITIES_PAIR_TYPE_PROJECT_CONTRACT;

    let parentIds: number[] = [];
    if (parentEntityIds) {
      parentIds = parentEntityIds.split(",").map((s) => parseInt(s.trim(), 10)).filter((n) => !isNaN(n));
    } else if (parentEntityId) {
      const id = parseInt(parentEntityId, 10);
      if (isNaN(id)) {
        return NextResponse.json({ error: "Invalid parent_entity_id" }, { status: 400 });
      }
      parentIds = [id];
    }
    if (parentIds.length === 0) {
      return NextResponse.json({ error: "parent_entity_id or parent_entity_ids is required" }, { status: 400 });
    }

    const client = getDbClient();
    await client.connect();
    try {
      const placeholders = parentIds.map((_, i) => `$${i + 3}`).join(", ");
      const res = await client.query(
        `SELECT ep.* FROM entities_pairs ep
         INNER JOIN projects p ON p.project_id = ep.parent_entity_id AND ep.entities_pair_type = $2
         INNER JOIN service_offices so ON so.service_office_id = p.service_office_id AND so.status != 3
         INNER JOIN accounts a ON a.account_id = so.account_id AND a.user_id = $1
         WHERE ep.parent_entity_id IN (${placeholders})
         ORDER BY ep.parent_entity_id, ep.sort_order ASC`,
        [user.id, pairType, ...parentIds]
      );
      return NextResponse.json(res.rows);
    } finally {
      await client.end();
    }
  } catch (err) {
    console.error("Entities pairs GET error:", err);
    const msg = err instanceof Error ? err.message : "Internal server error";
    return NextResponse.json({ error: msg }, { status: 500 });
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
    const { project_id: projectId, assignments } = body as {
      project_id: number;
      assignments: Array<{ contract_id: number; sort_order: number }>;
    };

    if (!projectId || !Array.isArray(assignments)) {
      return NextResponse.json({ error: "project_id and assignments array are required" }, { status: 400 });
    }

    const client = getDbClient();
    await client.connect();
    try {
      const accessCheck = await client.query(
        `SELECT p.project_id FROM projects p
         INNER JOIN service_offices so ON so.service_office_id = p.service_office_id AND so.status != 3
         INNER JOIN accounts a ON a.account_id = so.account_id AND a.user_id = $1
         WHERE p.project_id = $2`,
        [user.id, projectId]
      );
      if (accessCheck.rows.length === 0) {
        return NextResponse.json({ error: "Project not found or access denied" }, { status: 404 });
      }

      await client.query("BEGIN");

      await client.query(
        `DELETE FROM entities_pairs
         WHERE parent_entity_id = $1 AND entities_pair_type = $2`,
        [projectId, ENTITIES_PAIR_TYPE_PROJECT_CONTRACT]
      );

      if (assignments.length > 0) {
        const values = assignments.map(
          (a: { contract_id: number; sort_order: number }, i: number) => {
            const base = i * 4;
            return `($${base + 1}, $${base + 2}, $${base + 3}, $${base + 4})`;
          }
        );
        const flatValues = assignments.flatMap((a: { contract_id: number; sort_order: number }) => [
          ENTITIES_PAIR_TYPE_PROJECT_CONTRACT,
          projectId,
          a.contract_id,
          a.sort_order,
        ]);
        await client.query(
          `INSERT INTO entities_pairs (entities_pair_type, parent_entity_id, child_entity_id, sort_order)
           VALUES ${values.join(", ")}`,
          flatValues
        );
      }

      await client.query("COMMIT");
      return NextResponse.json({ success: true }, { status: 201 });
    } catch (err) {
      await client.query("ROLLBACK");
      throw err;
    } finally {
      await client.end();
    }
  } catch (err) {
    console.error("Entities pairs POST error:", err);
    const msg = err instanceof Error ? err.message : "Internal server error";
    return NextResponse.json({ error: msg }, { status: 500 });
  }
}
