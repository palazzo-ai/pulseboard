export default async function handler(req, res) {
  res.setHeader('Access-Control-Allow-Origin', '*');
  res.setHeader('Access-Control-Allow-Methods', 'POST, OPTIONS');
  res.setHeader('Access-Control-Allow-Headers', 'Content-Type');
  if (req.method === 'OPTIONS') return res.status(200).end();
  if (req.method !== 'POST') return res.status(405).json({ error: 'Method not allowed' });

  const { linearApiKey, issueIdentifiers } = req.body;
  if (!linearApiKey) return res.status(400).json({ error: 'Linear API key required' });
  if (!issueIdentifiers?.length) return res.json({ issues: [] });

  try {
    // Group identifiers by team key (e.g. "PAL-1179" → team "PAL", number 1179)
    const teamGroups = {};
    issueIdentifiers.forEach(id => {
      const match = id.match(/^([A-Z]+)-(\d+)$/);
      if (match) {
        const [, teamKey, num] = match;
        if (!teamGroups[teamKey]) teamGroups[teamKey] = [];
        teamGroups[teamKey].push(parseInt(num, 10));
      }
    });

    let allIssues = [];

    // Fetch each team's issues using number filter (precise, no broad scan)
    for (const [teamKey, numbers] of Object.entries(teamGroups)) {
      // Batch in chunks of 50 to avoid overly large filters
      for (let i = 0; i < numbers.length; i += 50) {
        const batch = numbers.slice(i, i + 50);
        const query = `
          query {
            issues(
              first: 50
              filter: {
                team: { key: { eq: "${teamKey}" } }
                number: { in: [${batch.join(',')}] }
              }
            ) {
              nodes {
                id identifier title
                state { name type }
                assignee { name displayName }
                priority priorityLabel
                dueDate
                project { name }
                team { name key }
                labels { nodes { name } }
                createdAt updatedAt
              }
            }
          }
        `;

        const response = await fetch('https://api.linear.app/graphql', {
          method: 'POST',
          headers: {
            'Content-Type': 'application/json',
            Authorization: linearApiKey,
            'apollo-require-preflight': 'true',
          },
          body: JSON.stringify({ query }),
        });

        const data = await response.json();
        if (data.errors) return res.status(400).json({ error: 'Linear API error', details: data.errors });

        const nodes = data.data?.issues?.nodes || [];
        allIssues = allIssues.concat(nodes);
      }
    }

    const matched = allIssues.map(issue => ({
      identifier: issue.identifier,
      title: issue.title,
      state: issue.state,
      assignee: issue.assignee?.displayName || issue.assignee?.name || null,
      priority: issue.priority,
      priorityLabel: issue.priorityLabel,
      dueDate: issue.dueDate,
      project: issue.project?.name || null,
      team: issue.team ? { name: issue.team.name, key: issue.team.key } : null,
      labels: (issue.labels?.nodes || []).map(l => l.name),
      url: `https://linear.app/palazzo-ai/issue/${issue.identifier}`,
    }));

    return res.json({
      issues: matched,
      matchedCount: matched.length,
      requestedCount: issueIdentifiers.length,
      timestamp: new Date().toISOString(),
    });
  } catch (error) {
    console.error('Launch issues fetch error:', error);
    return res.status(500).json({ error: error.message });
  }
}
