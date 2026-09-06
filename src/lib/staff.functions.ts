import { createServerFn } from "@tanstack/react-start";
import { createHash, timingSafeEqual } from "node:crypto";

function digest(v: string): Buffer {
  return createHash("sha256").update(v, "utf8").digest();
}

function passwordOk(input: string): boolean {
  const expected = process.env["STAFF_PASSWORD"];
  if (!expected) return false;
  return timingSafeEqual(digest(input), digest(expected));
}

export const verifyStaff = createServerFn({ method: "POST" })
  .inputValidator((data: { password: string }) => data)
  .handler(async ({ data }) => ({ ok: passwordOk(data.password) }));

export const resetLeaderboard = createServerFn({ method: "POST" })
  .inputValidator((data: { password: string; slot?: number | null }) => data)
  .handler(async ({ data }) => {
    if (!passwordOk(data.password)) return { ok: false as const, deleted: 0 };
    const { supabaseAdmin } = await import("@/integrations/supabase/client.server");
    let query = supabaseAdmin.from("lap_times").delete({ count: "exact" });
    query = data.slot != null ? query.eq("slot", data.slot) : query.gt("slot", 0);
    const { count, error } = await query;
    if (error) throw new Error(error.message);
    return { ok: true as const, deleted: count ?? 0 };
  });

export const saveTrackAsStaff = createServerFn({ method: "POST" })
  .inputValidator(
    (data: { password: string; slot: number; name: string; pieces: string[] }) => data,
  )
  .handler(async ({ data }) => {
    if (!passwordOk(data.password)) return { ok: false as const };
    const { supabaseAdmin } = await import("@/integrations/supabase/client.server");
    const { error } = await supabaseAdmin
      .from("tracks")
      .update({ name: data.name.slice(0, 40), pieces: data.pieces })
      .eq("slot", data.slot);
    if (error) throw new Error(error.message);
    return { ok: true as const };
  });
