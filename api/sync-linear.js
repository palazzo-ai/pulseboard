import Anthropic from "@anthropic-ai/sdk";

export default async function handler(req, res) {
  // Set CORS headers
  res.setHeader("Access-Control-Allow-Origin", "*");
  res.setHeader("Access-Control-Allow-Methods", "POST, OPTIONS");
  res.setHeader("Access-Control-Allow-Headers", "Content-Type");

  if (req.method === "OPTIONS") {
    return res.status(200).end();
  }

  if (req.method !== "POST") {
    return res.status(405).json({ error: "Method not allowed" });
  }

  const { opportunities, linearApiKey } = req.body;

  if (!linearApiKey) {
    return res.status(400).json({ error: "Linear API key is required" });
  }

  if (!opportunities || !Array.isArray(opportunities)) {
    return res.status(400).json({ error: "Opportunities array is required" });
  }

  try {
    // Fetch issues from Linear
    const linearResponse = await fetch("https://api.linear.app/graphql", {
      method: "POST",
      headers: {
        "Content-Type": "application/json",
        "Authorization": linearApiKey, // NO Bearer prefix for Linear
        "apollo-require-preflight": "true", // Required by Linear to prevent CSRF
      },
      body: JSON.stringify({
        query: `
          query {
            issues(first: 100) {
              nodes {
                id
                identifier
                title
                state {
                  name
                  type
                }
                dueDate
                project {
                  name
                }
                labels {
                  nodes {
                    name
                  }
                }
                updatedAt
              }
            }
          }
        `,
      }),
    });

    const linearData = await linearResponse.json();

    if (linearData.errors) {
      console.error("Linear API errors:", linearData.errors);
      return res.status(400).json({
        error: "Failed to fetch from Linear API",
        details: linearData.errors,
      });
    }

    const issues = linearData.data?.issues?.nodes || [];

    if (issues.length === 0) {
      return res.json({ recommendations: [], message: "No issues found in Linear" });
    }

    // Use Claude to analyze and match
    const anthropic = new Anthropic();

    const prompt = `You are analyzing Linear issues to recommend status updates for a product roadmap.

Here are the current roadmap opportunities:
${JSON.stringify(
  opportunities.map((o) => ({
    id: o.id,
    title: o.title,
    status: o.status,
    area: o.area,
    initiative: o.initiative,
  })),
  null,
  2
)}

Here are the Linear issues:
${JSON.stringify(
  issues.map((i) => ({
    identifier: i.identifier,
    title: i.title,
    state: i.state?.name,
    stateType: i.state?.type,
    dueDate: i.dueDate,
    project: i.project?.name,
    labels: i.labels?.nodes?.map((l) => l.name),
  })),
  null,
  2
)}

Analyze the Linear issues and match them to roadmap opportunities. For each match, recommend a status update if the Linear status suggests the roadmap status should change.

Status mapping:
- Linear "Triage", "Backlog", "Todo" → roadmap "not_started"
- Linear "In Progress", "In Review" → roadmap "in_progress"
- Linear "Done" → roadmap "done"
- Linear "Canceled" → roadmap "done" (or keep current)
- Linear "Blocked" → roadmap "blocked"

For opportunities with multiple related issues, use this rollup logic:
- If ALL issues are done → "done"
- If ANY issue is in progress/review → "in_progress"
- If ANY issue is blocked → "blocked"
- If ALL issues are not started → "not_started"

Also flag opportunities as "at risk" if:
- Due date has passed but not done
- Issues are blocked
- No progress on issues that should have started

Return a JSON array of recommendations:
[
  {
    "opportunityId": <number>,
    "opportunityTitle": "<string>",
    "currentStatus": "<string>",
    "recommendedStatus": "<string>",
    "reason": "<brief explanation>",
    "relatedIssues": ["PAL-123", "PAL-456"],
    "atRisk": <boolean>,
    "atRiskReason": "<string or null>"
  }
]

Only include opportunities where you recommend a change or want to flag a risk. Return valid JSON only, no markdown.`;

    const message = await anthropic.messages.create({
      model: "claude-sonnet-4-20250514",
      max_tokens: 4096,
      messages: [
        {
          role: "user",
          content: prompt,
        },
      ],
    });

    const responseText =
      message.content[0].type === "text" ? message.content[0].text : "";

    // Parse the JSON response
    let recommendations = [];
    try {
      // Try to extract JSON from the response
      const jsonMatch = responseText.match(/\[[\s\S]*\]/);
      if (jsonMatch) {
        recommendations = JSON.parse(jsonMatch[0]);
      }
    } catch (parseError) {
      console.error("Failed to parse Claude response:", parseError);
      return res.status(500).json({
        error: "Failed to parse recommendations",
        rawResponse: responseText,
      });
    }

    return res.json({
      recommendations,
      issuesAnalyzed: issues.length,
      timestamp: new Date().toISOString(),
    });
  } catch (error) {
    console.error("Sync error:", error);
    return res.status(500).json({
      error: "Internal server error",
      message: error.message,
    });
  }
}
