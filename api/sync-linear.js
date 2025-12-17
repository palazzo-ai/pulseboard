// Vercel Serverless Function for Linear Sync
// This endpoint fetches Linear issues and uses Claude to analyze status recommendations

export default async function handler(req, res) {
  if (req.method !== 'POST') {
    return res.status(405).json({ error: 'Method not allowed' });
  }

  try {
    const { opportunities, linearApiKey } = req.body;
    
    const anthropicApiKey = process.env.ANTHROPIC_API_KEY;
    if (!anthropicApiKey) {
      return res.status(500).json({ error: 'ANTHROPIC_API_KEY not configured' });
    }

    if (!linearApiKey) {
      return res.status(400).json({ error: 'Linear API key required' });
    }

    // Collect all unique issue IDs from opportunities
    const allIssueIds = new Set();
    opportunities.forEach(opp => {
      (opp.issues || []).forEach(issue => allIssueIds.add(issue));
    });

    if (allIssueIds.size === 0) {
      return res.status(200).json({ 
        recommendations: [],
        message: 'No opportunities have linked Linear issues' 
      });
    }

    // Fetch issues from Linear GraphQL API
    const linearIssues = await fetchLinearIssues(Array.from(allIssueIds), linearApiKey);

    // Build context for Claude
    const opportunitiesWithIssues = opportunities
      .filter(opp => opp.issues && opp.issues.length > 0)
      .map(opp => ({
        id: opp.id,
        title: opp.title,
        currentStatus: opp.status || 'not_started',
        currentAtRisk: opp.atRisk || false,
        currentAtRiskReason: opp.atRiskReason || '',
        month: opp.month,
        milestoneId: opp.milestoneId,
        issues: opp.issues.map(issueId => {
          const issue = linearIssues.find(i => i.identifier === issueId);
          return issue ? {
            id: issueId,
            title: issue.title,
            status: issue.status,
            priority: issue.priority,
            dueDate: issue.dueDate,
            assignee: issue.assignee,
            labels: issue.labels
          } : { id: issueId, status: 'NOT_FOUND' };
        })
      }));

    // Call Claude to analyze and recommend
    const claudeResponse = await fetch('https://api.anthropic.com/v1/messages', {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        'x-api-key': anthropicApiKey,
        'anthropic-version': '2023-06-01',
      },
      body: JSON.stringify({
        model: 'claude-sonnet-4-20250514',
        max_tokens: 4096,
        messages: [{
          role: 'user',
          content: `You are analyzing Linear issues to recommend status updates for a product roadmap tool called Pulseboard.

## Context
- Each "opportunity" is a high-level roadmap item that may have multiple Linear issues
- Status options: not_started, in_progress, done, blocked
- You need to recommend status changes based on Linear issue statuses
- You can also flag items as "at risk" with a reason

## Status Mapping Logic
- Linear "Triage", "Backlog", "Todo" → not_started
- Linear "In Progress", "In Review" → in_progress  
- Linear "Done", "Canceled" → done
- Linear "Blocked" → blocked

## Rollup Logic for Multiple Issues
- If ALL issues are Done → opportunity is done
- If ANY issue is In Progress/In Review → opportunity is in_progress
- If ANY issue is Blocked → opportunity is blocked
- If ALL issues are not started → opportunity is not_started

## At-Risk Criteria
- Due date passed but not done
- Milestone approaching (within current month) but not done
- Blocked status
- Issues stuck in same status for extended time

## Current Data
${JSON.stringify(opportunitiesWithIssues, null, 2)}

## Your Task
Analyze each opportunity and return a JSON array of recommendations. Only include opportunities that need changes.

Return ONLY a JSON array with this structure (no markdown, no explanation):
[
  {
    "opportunityId": number,
    "opportunityTitle": "string",
    "currentStatus": "string",
    "recommendedStatus": "string",
    "statusReason": "string explaining why",
    "currentAtRisk": boolean,
    "recommendAtRisk": boolean,
    "atRiskReason": "string or null",
    "issuesSummary": "brief summary of issue statuses"
  }
]

If no changes needed, return an empty array: []`
        }]
      }),
    });

    if (!claudeResponse.ok) {
      const error = await claudeResponse.text();
      console.error('Claude API error:', error);
      return res.status(500).json({ error: 'Failed to analyze with Claude' });
    }

    const claudeData = await claudeResponse.json();
    const analysisText = claudeData.content[0].text;
    
    // Parse Claude's response
    let recommendations;
    try {
      recommendations = JSON.parse(analysisText);
    } catch (e) {
      // Try to extract JSON from the response
      const jsonMatch = analysisText.match(/\[[\s\S]*\]/);
      if (jsonMatch) {
        recommendations = JSON.parse(jsonMatch[0]);
      } else {
        console.error('Failed to parse Claude response:', analysisText);
        recommendations = [];
      }
    }

    return res.status(200).json({ 
      recommendations,
      issuesFetched: linearIssues.length,
      opportunitiesAnalyzed: opportunitiesWithIssues.length
    });

  } catch (error) {
    console.error('Sync error:', error);
    return res.status(500).json({ error: error.message });
  }
}

async function fetchLinearIssues(issueIds, apiKey) {
  // Build GraphQL query to fetch multiple issues by identifier
  const query = `
    query GetIssues($filter: IssueFilter) {
      issues(filter: $filter, first: 250) {
        nodes {
          id
          identifier
          title
          description
          priority
          priorityLabel
          state {
            name
            type
          }
          dueDate
          assignee {
            name
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
  `;

  // Linear doesn't support IN queries by identifier directly, so we need to use OR filters
  const filter = {
    or: issueIds.map(id => ({ identifier: { eq: id } }))
  };

  const response = await fetch('https://api.linear.app/graphql', {
    method: 'POST',
    headers: {
      'Content-Type': 'application/json',
      'Authorization': apiKey.startsWith('Bearer ') ? apiKey : `Bearer ${apiKey}`,
    },
    body: JSON.stringify({ query, variables: { filter } }),
  });

  if (!response.ok) {
    throw new Error('Failed to fetch from Linear API');
  }

  const data = await response.json();
  
  if (data.errors) {
    console.error('Linear GraphQL errors:', data.errors);
    throw new Error('Linear API returned errors');
  }

  return (data.data?.issues?.nodes || []).map(issue => ({
    identifier: issue.identifier,
    title: issue.title,
    status: issue.state?.name || 'Unknown',
    statusType: issue.state?.type || 'unknown',
    priority: issue.priorityLabel,
    dueDate: issue.dueDate,
    assignee: issue.assignee?.name,
    labels: issue.labels?.nodes?.map(l => l.name) || [],
    updatedAt: issue.updatedAt
  }));
}
