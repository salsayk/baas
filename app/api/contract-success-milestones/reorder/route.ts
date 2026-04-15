import { NextResponse } from "next/server";
import { getAuthenticatedUser } from "@/app/lib/auth";
import { getDbClient } from "@/database/accounts/db-client";
import {
  reorderSuccessMilestonesBySequenceList,
  userCanAccessContractForSuccessMilestones,
} from "@/app/lib/contract-success-milestones-sequencing";

export async function POST(request: Request) {
  try {
    const { user, error: authError } = await getAuthenticatedUser();
    if (authError) return authError;
    if (!user) return NextResponse.json({ error: "Unauthorized. Please sign in." }, { status: 401 });

    const body = (await request.json()) as { contract_id?: unknown; ordered_sequential_numbers?: unknown };
    const contractId = Number(body.contract_id);
    if (!Number.isFinite(contractId) || contractId <= 0) {
      return NextResponse.json({ error: "Invalid contract_id" }, { status: 400 });
    }
    if (!Array.isArray(body.ordered_sequential_numbers) || body.ordered_sequential_numbers.length === 0) {
      return NextResponse.json({ error: "ordered_sequential_numbers must be a non-empty array" }, { status: 400 });
    }
    const orderedSeq = body.ordered_sequential_numbers.map((x) => Number(x));
    if (orderedSeq.some((n) => !Number.isFinite(n) || n < 1)) {
      return NextResponse.json({ error: "Invalid milestone sequence in ordered_sequential_numbers" }, { status: 400 });
    }

    const client = getDbClient();
    await client.connect();
    try {
      const ok = await userCanAccessContractForSuccessMilestones(client, user.id, contractId);
      if (!ok) return NextResponse.json({ error: "Contract not found" }, { status: 404 });
      await client.query("BEGIN");
      try {
        await reorderSuccessMilestonesBySequenceList(client, contractId, orderedSeq);
        const rowsRes = await client.query(
          `SELECT *
           FROM contract_milestones_data_for_success
           WHERE contract_id = $1
           ORDER BY milestone_sequential_number`,
          [contractId]
        );
        await client.query("COMMIT");
        return NextResponse.json({ milestones: rowsRes.rows });
      } catch (e) {
        await client.query("ROLLBACK");
        throw e;
      }
    } finally {
      await client.end();
    }
  } catch (err) {
    const msg = err instanceof Error ? err.message : "";
    if (msg === "REORDER_COUNT_MISMATCH" || msg === "REORDER_SET_MISMATCH") {
      return NextResponse.json(
        { error: "ordered_sequential_numbers must list every milestone for this contract exactly once" },
        { status: 400 }
      );
    }
    if (msg === "REORDER_ROW_MISSING") {
      return NextResponse.json({ error: "Failed to apply milestone order" }, { status: 500 });
    }
    return NextResponse.json({ error: err instanceof Error ? err.message : "Internal server error" }, { status: 500 });
  }
}

