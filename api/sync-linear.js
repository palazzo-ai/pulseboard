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

  const { 
    linearApiKey, 
    lastSyncAt,  // ISO timestamp or null for first sync
    opportunities, 
    milestones,
    excludedIssues = [],  // Issue identifiers to ignore
    areas,  // Area definitions for context
    initiatives  // Initiative definitions for context
  } = req.body;

  if (!linearApiKey) {
    return res.status(400).json({ error: "Linear API key is required" });
  }

  if (!process.env.ANTHROPIC_API_KEY) {
    return res.status(500).json({ 
      error: "Server configuration error", 
      message: "ANTHROPIC_API_KEY environment variable is not set" 
    });
  }

  try {
    // Calculate date filter - last sync or 3 weeks ago for first sync
    const sinceDate = lastSyncAt 
      ? new Date(lastSyncAt).toISOString()
      : new Date(Date.now() - 21 * 24 * 60 * 60 * 1000).toISOString();

    // Fetch issues from Linear with expanded data
    const linearResponse = await fetch("https://api.linear.app/graphql", {
      method: "POST",
      headers: {
        "Content-Type": "application/json",
        "Authorization": linearApiKey,
        "apollo-require-preflight": "true",
      },
      body: JSON.stringify({
        query: `
          query GetIssuesSince($since: DateTime!) {
            issues(
              first: 250
              filter: { 
                updatedAt: { gte: $since }
              }
              orderBy: updatedAt
            ) {
              nodes {
                id
                identifier
                title
                description
                state {
                  name
                  type
                }
                priority
                estimate
                dueDate
                createdAt
                updatedAt
                project {
                  id
                  name
                  state
                  targetDate
                }
                team {
                  key
                  name
                }
                labels {
                  nodes {
                    name
                  }
                }
                parent {
                  identifier
                }
              }
            }
            projects(first: 50) {
              nodes {
                id
                name
                description
                state
                targetDate
                teams {
                  nodes {
                    key
                    name
                  }
                }
                issues {
                  nodes {
                    identifier
                  }
                }
              }
            }
          }
        `,
        variables: {
          since: sinceDate
        }
      }),
    });

    if (!linearResponse.ok) {
      const errorText = await linearResponse.text();
      return res.status(400).json({
        error: "Linear API request failed",
        status: linearResponse.status,
        details: errorText,
      });
    }

    const linearData = await linearResponse.json();

    if (linearData.errors) {
      console.error("Linear API errors:", linearData.errors);
      return res.status(400).json({
        error: "Failed to fetch from Linear API",
        details: linearData.errors,
      });
    }

    const issues = linearData.data?.issues?.nodes || [];
    const projects = linearData.data?.projects?.nodes || [];

    // Filter out excluded issues
    const filteredIssues = issues.filter(
      issue => !excludedIssues.includes(issue.identifier)
    );

    if (filteredIssues.length === 0) {
      return res.json({ 
        recommendations: [], 
        analyzedCount: 0,
        message: "No new issues found since last sync",
        syncTimestamp: new Date().toISOString()
      });
    }

    // Build context for Claude
    const anthropic = new Anthropic();

    // Get all currently linked issues across opportunities
    const linkedIssues = new Set();
    opportunities.forEach(opp => {
      (opp.issues || []).forEach(issue => linkedIssues.add(issue));
    });

    const prompt = `You are analyzing Linear project management data to help maintain a product roadmap.

## CONTEXT

### Roadmap Areas (product verticals)
${JSON.stringify(areas, null, 2)}

### Roadmap Initiatives (strategic themes)
${JSON.stringify(initiatives, null, 2)}

### Current Roadmap Opportunities
${JSON.stringify(opportunities.map(o => ({
  id: o.id,
  title: o.title,
  area: o.area,
  initiative: o.initiative,
  month: o.month,
  status: o.status,
  milestoneId: o.milestoneId,
  linkedIssues: o.issues || [],
  description: o.description
})), null, 2)}

### Current Milestones
${JSON.stringify(milestones.map(m => ({
  id: m.id,
  title: m.title,
  area: m.area,
  month: m.month,
  description: m.description
})), null, 2)}

### Issues Already Linked to Opportunities
${JSON.stringify([...linkedIssues], null, 2)}

## NEW LINEAR DATA (since ${sinceDate})

### Issues (${filteredIssues.length} total)
${JSON.stringify(filteredIssues.map(i => ({
  identifier: i.identifier,
  title: i.title,
  description: i.description?.substring(0, 200),
  state: i.state?.name,
  stateType: i.state?.type,
  priority: i.priority,
  estimate: i.estimate,
  dueDate: i.dueDate,
  team: i.team?.name,
  teamKey: i.team?.key,
  project: i.project?.name,
  labels: i.labels?.nodes?.map(l => l.name) || [],
  createdAt: i.createdAt,
  isSubIssue: !!i.parent
})), null, 2)}

### Active Projects
${JSON.stringify(projects.filter(p => p.state !== 'completed' && p.state !== 'canceled').map(p => ({
  id: p.id,
  name: p.name,
  description: p.description?.substring(0, 200),
  state: p.state,
  targetDate: p.targetDate,
  teams: p.teams?.nodes?.map(t => t.name) || [],
  issueCount: p.issues?.nodes?.length || 0
})), null, 2)}

## YOUR TASK

Analyze the Linear data and produce recommendations in these categories:

### 1. NEW OPPORTUNITIES
Look for clusters of related issues that suggest work not captured in the roadmap:
- Multiple issues around a common theme with no matching opportunity
- New Linear projects with significant scope
- Issues with high priority/estimate that seem strategic

For each, suggest:
- A title for the new opportunity
- Which area it belongs to (must be one of the defined areas)
- Which initiative it aligns with (must be one of the defined initiatives)  
- Suggested month (format: dec25, jan26, feb26, mar26, apr26, may26, jun26, jul26, aug26, sep26, oct26, nov26, dec26)
- Which issues should be linked
- Confidence: high/medium/low

### 2. SCOPE CHANGES
Find existing opportunities where:
- New issues have been created that clearly relate to the opportunity
- The scope appears to have grown significantly
- Note: Only flag if there are NEW issues not already linked

### 3. ORPHANED ISSUES
Issues that:
- Are NOT already linked to any opportunity
- Are NOT sub-issues (have no parent)
- Appear to be feature work (not bugs, chores, or maintenance)
- Don't fit into any suggested new opportunity

### 4. MILESTONE HEALTH
For each milestone, assess:
- Are there issues in Linear that should feed this milestone but aren't linked?
- Are there concerning status patterns (blocked issues, overdue)?

## OUTPUT FORMAT

Return a JSON object (no markdown, just raw JSON):

{
  "newOpportunities": [
    {
      "confidence": "high|medium|low",
      "title": "Suggested opportunity title",
      "description": "Brief description of what this covers",
      "area": "area_id",
      "initiative": "initiative_id", 
      "suggestedMonth": "mon26",
      "issues": [
        { "identifier": "PAL-123", "title": "Issue title" }
      ],
      "reasoning": "Why this should be a new opportunity"
    }
  ],
  "scopeChanges": [
    {
      "confidence": "high|medium|low",
      "opportunityId": 123,
      "opportunityTitle": "Existing opp title",
      "currentIssueCount": 3,
      "newIssues": [
        { "identifier": "PAL-456", "title": "New issue title" }
      ],
      "reasoning": "Why this indicates scope change"
    }
  ],
  "orphanedIssues": [
    {
      "identifier": "PAL-789",
      "title": "Issue title",
      "team": "Team name",
      "suggestedArea": "area_id",
      "reasoning": "Why this is orphaned / what it might relate to"
    }
  ],
  "milestoneHealth": [
    {
      "milestoneId": "m1",
      "milestoneTitle": "Milestone name",
      "status": "healthy|at_risk|critical",
      "concerns": ["List of specific concerns"],
      "unlinkedIssues": [
        { "identifier": "PAL-999", "title": "Issue that should be linked" }
      ]
    }
  ],
  "summary": {
    "totalIssuesAnalyzed": 0,
    "newOpportunitiesFound": 0,
    "scopeChangesDetected": 0,
    "orphanedIssuesFound": 0,
    "milestonesAtRisk": 0
  }
}

Be conservative - only suggest new opportunities when there's a clear cluster of related work. Don't suggest opportunities for individual bug fixes or small tasks.`;

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

    const responseText = message.content[0].type === "text" ? message.content[0].text : "";

    // Parse the JSON response
    let analysis;
    try {
      // Try to extract JSON from the response (handle potential markdown wrapping)
      let jsonStr = responseText;
      const jsonMatch = responseText.match(/\{[\s\S]*\}/);
      if (jsonMatch) {
        jsonStr = jsonMatch[0];
      }
      analysis = JSON.parse(jsonStr);
    } catch (parseError) {
      console.error("Failed to parse Claude response:", parseError);
      console.error("Raw response:", responseText);
      return res.status(500).json({
        error: "Failed to parse analysis",
        rawResponse: responseText.substring(0, 1000),
      });
    }

    return res.json({
      ...analysis,
      analyzedCount: filteredIssues.length,
      syncTimestamp: new Date().toISOString(),
      sinceDate: sinceDate
    });

  } catch (error) {
    console.error("Sync error:", error);
    return res.status(500).json({
      error: "Internal server error",
      message: error.message,
    });
  }
}
