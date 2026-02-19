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

  const { opportunities, milestones, linearApiKey, excludedIssues = [] } = req.body;

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
        Authorization: linearApiKey,
        "apollo-require-preflight": "true",
      },
      body: JSON.stringify({
        query: `
          query {
            issues(first: 250, filter: { state: { type: { nin: ["canceled"] } } }) {
              nodes {
                id
                identifier
                title
                description
                state {
                  name
                  type
                }
                dueDate
                priority
                estimate
                project {
                  name
                  id
                }
                team {
                  name
                  key
                }
                cycle {
                  id
                  name
                  number
                  startsAt
                  endsAt
                }
                labels {
                  nodes {
                    name
                  }
                }
                createdAt
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
      return res.json({
        analysis: {
          statusUpdates: [],
          newOpportunities: [],
          scopeChanges: [],
          orphanedIssues: [],
          milestoneHealth: [],
          cycleOpportunities: [],
        },
        issuesAnalyzed: 0,
        timestamp: new Date().toISOString(),
      });
    }

    // Filter out excluded issues
    const excludedIds = new Set(excludedIssues.map(e => e.identifier || e));
    const activeIssues = issues.filter(i => !excludedIds.has(i.identifier));

    // Build a map of all issues currently linked to opportunities
    const linkedIssueIds = new Set();
    opportunities.forEach((opp) => {
      (opp.issues || []).forEach((issueId) => linkedIssueIds.add(issueId));
    });

    // Find orphaned issues (not linked to any opportunity)
    const orphanedIssues = activeIssues.filter(
      (issue) => !linkedIssueIds.has(issue.identifier)
    );

    // Use Claude to analyze
    const anthropic = new Anthropic();

    const prompt = `You are analyzing Linear issues against a product roadmap to provide sync recommendations.

## EXISTING ROADMAP OPPORTUNITIES
These are the current opportunities in the roadmap. Each has a title, area, initiative, status, and linked Linear issues:
${JSON.stringify(
  opportunities.map((o) => ({
    id: o.id,
    title: o.title,
    area: o.area,
    initiative: o.initiative,
    status: o.status,
    month: o.month,
    issues: o.issues || [],
    description: o.description || ''
  })),
  null,
  2
)}

## MILESTONES
${JSON.stringify(milestones || [], null, 2)}

## LINEAR ISSUES (linked to opportunities)
${JSON.stringify(
  activeIssues
    .filter((i) => linkedIssueIds.has(i.identifier))
    .map((i) => ({
      identifier: i.identifier,
      title: i.title,
      state: i.state?.name,
      stateType: i.state?.type,
      priority: i.priority,
      team: i.team?.name,
      project: i.project?.name,
      labels: i.labels?.nodes?.map((l) => l.name),
      dueDate: i.dueDate,
      cycle: i.cycle?.name,
      cycleId: i.cycle?.id,
    })),
  null,
  2
)}

## ORPHANED LINEAR ISSUES (not linked to any opportunity)
${JSON.stringify(
  orphanedIssues.map((i) => ({
    identifier: i.identifier,
    title: i.title,
    description: i.description?.substring(0, 200),
    state: i.state?.name,
    stateType: i.state?.type,
    priority: i.priority,
    team: i.team?.name,
    project: i.project?.name,
    labels: i.labels?.nodes?.map((l) => l.name),
    cycle: i.cycle?.name,
    cycleId: i.cycle?.id,
    cycleStartsAt: i.cycle?.startsAt,
    cycleEndsAt: i.cycle?.endsAt,
  })),
  null,
  2
)}

## ANALYSIS TASKS

Analyze the data and provide recommendations in the following categories:

### 1. STATUS UPDATES
For opportunities with linked Linear issues, recommend status changes based on issue states:
- If ALL linked issues are "Done" → recommend "done"
- If ANY linked issue is "In Progress" or "In Review" → recommend "in_progress"  
- If ANY linked issue is "Blocked" → recommend "blocked" and set atRisk: true
- If overdue issues exist → set atRisk: true with reason

### 2. NEW OPPORTUNITY SUGGESTIONS
**CRITICAL: Before suggesting ANY new opportunity, check if a similar one already exists in the EXISTING ROADMAP OPPORTUNITIES list above.**

For orphaned issues that represent significant features/initiatives, suggest NEW opportunities. BUT:
- Do NOT suggest opportunities that already exist (check titles for semantic similarity)
- Do NOT suggest opportunities if an existing one covers the same scope (even with different wording)
- Group related orphaned issues together into single opportunities
- Only suggest truly new work that isn't represented in the roadmap

For each suggestion, explain why it's NOT a duplicate of existing opportunities.

### 3. SCOPE CHANGES
Identify orphaned issues that should be linked to EXISTING opportunities (scope expansion).

### 4. ORPHANED ISSUES
List remaining orphaned issues that don't fit existing opportunities and aren't significant enough for new ones.
Suggest which area they might belong to.

### 5. MILESTONE HEALTH
For milestones with linked opportunities, assess delivery risk.

### 6. CYCLE-BASED OPPORTUNITIES
Group orphaned issues by their Linear cycle. For each cycle that has 2 or more orphaned issues, suggest an opportunity that represents that cycle's body of work:
- Use the cycle name and its issues to infer a coherent opportunity title and description
- Only suggest cycle-based opportunities for cycles NOT already well-covered by existing roadmap opportunities
- Include ALL orphaned issues from that cycle in the relatedIssues array
- Suggest appropriate area, initiative, and month based on the issues' content and cycle timing

## RESPONSE FORMAT
Return a JSON object (no markdown, just raw JSON):
{
  "statusUpdates": [
    {
      "opportunityId": <number>,
      "opportunityTitle": "<string>",
      "currentStatus": "<string>",
      "recommendedStatus": "not_started" | "in_progress" | "done" | "blocked",
      "reason": "<brief explanation>",
      "relatedIssues": ["PAL-123"],
      "atRisk": <boolean>,
      "atRiskReason": "<string or null>"
    }
  ],
  "newOpportunities": [
    {
      "suggestedTitle": "<string>",
      "description": "<string>",
      "suggestedArea": "<area_id>",
      "suggestedInitiative": "<initiative_id>",
      "suggestedMonth": "<month_id>",
      "relatedIssues": ["PAL-123"],
      "reasoning": "<why this is needed AND why it's not a duplicate of existing opportunities>",
      "notDuplicateBecause": "<explicit explanation of why this doesn't match any existing opportunity>"
    }
  ],
  "scopeChanges": [
    {
      "opportunityId": <number>,
      "opportunityTitle": "<string>",
      "additionalIssues": ["PAL-456"],
      "reasoning": "<why these issues belong to this opportunity>"
    }
  ],
  "orphanedIssues": [
    {
      "identifier": "PAL-789",
      "title": "<string>",
      "team": "<string>",
      "suggestedArea": "<area_id or null>",
      "reasoning": "<why orphaned, what to do with it>"
    }
  ],
  "milestoneHealth": [
    {
      "milestoneId": "<string>",
      "milestoneTitle": "<string>",
      "status": "on_track" | "at_risk" | "blocked",
      "completedOpportunities": <number>,
      "totalOpportunities": <number>,
      "blockers": ["<issue or risk>"],
      "recommendation": "<action to take>"
    }
  ],
  "cycleOpportunities": [
    {
      "cycleName": "<string>",
      "cycleId": "<string>",
      "suggestedTitle": "<string>",
      "description": "<string>",
      "suggestedArea": "<area_id>",
      "suggestedInitiative": "<initiative_id>",
      "suggestedMonth": "<month_id>",
      "relatedIssues": ["PAL-123"],
      "reasoning": "<why this cycle warrants an opportunity>"
    }
  ]
}

Area IDs: visualizer, vinci, spaces, showcase, studio, platform, admin
Initiative IDs: launch, selfserve, embed, ai, commerce, enterprise
Month IDs: dec25, jan26, feb26, mar26, apr26, may26, jun26, jul26, aug26, sep26, oct26, nov26, dec26
Status values: not_started, in_progress, done, blocked`;

    const message = await anthropic.messages.create({
      model: "claude-sonnet-4-20250514",
      max_tokens: 8192,
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
    let analysis = {
      statusUpdates: [],
      newOpportunities: [],
      scopeChanges: [],
      orphanedIssues: [],
      milestoneHealth: [],
    };

    try {
      const jsonMatch = responseText.match(/\{[\s\S]*\}/);
      if (jsonMatch) {
        analysis = JSON.parse(jsonMatch[0]);
      }
    } catch (parseError) {
      console.error("Failed to parse Claude response:", parseError);
      return res.status(500).json({
        error: "Failed to parse analysis",
        rawResponse: responseText,
      });
    }

    // Additional client-side deduplication for new opportunities
    // Filter out suggestions that have very similar titles to existing opportunities
    if (analysis.newOpportunities && analysis.newOpportunities.length > 0) {
      const existingTitlesLower = opportunities.map(o => o.title.toLowerCase().trim());
      
      analysis.newOpportunities = analysis.newOpportunities.filter(suggestion => {
        const suggestedLower = suggestion.suggestedTitle.toLowerCase().trim();
        
        // Check for exact or near-exact title matches
        for (const existingTitle of existingTitlesLower) {
          // Exact match
          if (suggestedLower === existingTitle) {
            return false;
          }
          
          // One contains the other (likely duplicate)
          if (suggestedLower.includes(existingTitle) || existingTitle.includes(suggestedLower)) {
            return false;
          }
          
          // Simple word overlap check (if >70% words match, likely duplicate)
          const suggestedWords = new Set(suggestedLower.split(/\s+/).filter(w => w.length > 3));
          const existingWords = new Set(existingTitle.split(/\s+/).filter(w => w.length > 3));
          
          if (suggestedWords.size > 0 && existingWords.size > 0) {
            let matchCount = 0;
            for (const word of suggestedWords) {
              if (existingWords.has(word)) matchCount++;
            }
            const overlapRatio = matchCount / Math.min(suggestedWords.size, existingWords.size);
            if (overlapRatio > 0.7) {
              return false;
            }
          }
        }
        
        // Also check if the related issues are already linked to an existing opportunity
        if (suggestion.relatedIssues && suggestion.relatedIssues.length > 0) {
          const suggestedIssueSet = new Set(suggestion.relatedIssues);
          for (const opp of opportunities) {
            if (opp.issues && opp.issues.length > 0) {
              const overlap = opp.issues.filter(i => suggestedIssueSet.has(i));
              if (overlap.length > 0) {
                // Issues already linked to another opportunity
                return false;
              }
            }
          }
        }
        
        return true;
      });
    }

    return res.json({
      analysis,
      issuesAnalyzed: activeIssues.length,
      orphanedCount: orphanedIssues.length,
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
