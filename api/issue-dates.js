import { createClient } from "@supabase/supabase-js";

const supabase = createClient(
  process.env.VITE_SUPABASE_URL || process.env.SUPABASE_URL,
  process.env.VITE_SUPABASE_ANON_KEY || process.env.SUPABASE_ANON_KEY
);

export default async function handler(req, res) {
  res.setHeader("Access-Control-Allow-Origin", "*");
  res.setHeader("Access-Control-Allow-Methods", "POST, DELETE, OPTIONS");
  res.setHeader("Access-Control-Allow-Headers", "Content-Type");

  if (req.method === "OPTIONS") return res.status(200).end();

  // POST: upsert date overrides (single or batch)
  if (req.method === "POST") {
    const { dates } = req.body;

    // dates can be a single object or an array
    const items = Array.isArray(dates) ? dates : [dates];

    if (!items.length || !items[0]?.issueIdentifier) {
      return res.status(400).json({ error: "issueIdentifier is required" });
    }

    try {
      const toUpsert = items.map((d) => ({
        issue_identifier: d.issueIdentifier,
        linear_issue_id: d.linearIssueId || null,
        start_date: d.startDate || null,
        end_date: d.endDate || null,
        opportunity_id: d.opportunityId || null,
        updated_at: new Date().toISOString(),
      }));

      const { data, error } = await supabase
        .from("issue_dates")
        .upsert(toUpsert, { onConflict: "issue_identifier" })
        .select();

      if (error) throw error;

      return res.json({
        success: true,
        saved: data?.length || items.length,
        timestamp: new Date().toISOString(),
      });
    } catch (error) {
      console.error("Error saving issue dates:", error);
      return res.status(500).json({ error: "Failed to save dates", message: error.message });
    }
  }

  // DELETE: remove date override for an issue
  if (req.method === "DELETE") {
    const { issueIdentifier } = req.body;

    if (!issueIdentifier) {
      return res.status(400).json({ error: "issueIdentifier is required" });
    }

    try {
      const { error } = await supabase
        .from("issue_dates")
        .delete()
        .eq("issue_identifier", issueIdentifier);

      if (error) throw error;

      return res.json({ success: true, deleted: issueIdentifier });
    } catch (error) {
      console.error("Error deleting issue date:", error);
      return res.status(500).json({ error: "Failed to delete", message: error.message });
    }
  }

  return res.status(405).json({ error: "Method not allowed" });
}
