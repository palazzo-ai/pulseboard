export default async function handler(req, res) {
  res.setHeader('Access-Control-Allow-Origin', '*');
  res.setHeader('Access-Control-Allow-Methods', 'POST, OPTIONS');
  res.setHeader('Access-Control-Allow-Headers', 'Content-Type');
  if (req.method === 'OPTIONS') return res.status(200).end();
  if (req.method !== 'POST') return res.status(405).json({ error: 'Method not allowed' });

  const { linearApiKey } = req.body;
  if (!linearApiKey) return res.status(400).json({ error: 'Linear API key required' });

  try {
    let allIssues = [];
    let hasNextPage = true;
    let afterCursor = null;

    while (hasNextPage && allIssues.length < 500) {
      const afterClause = afterCursor ? `after: "${afterCursor}"` : '';
      const query = `
        query {
          issues(first: 100 ${afterClause} filter: { state: { type: { nin: ["canceled"] } } }) {
            pageInfo { hasNextPage endCursor }
            nodes {
              id identifier title
              state { name type }
              assignee { name displayName }
              priority priorityLabel
              dueDate
              project { name }
              team { name key }
              labels { nodes { name } }
              parent { id identifier title }
              children { nodes { id identifier title } }
              updatedAt
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
      hasNextPage = data.data?.issues?.pageInfo?.hasNextPage || false;
      afterCursor = data.data?.issues?.pageInfo?.endCursor || null;
    }

    const issues = allIssues.map(issue => ({
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
      parentIdentifier: issue.parent?.identifier || null,
      children: (issue.children?.nodes || []).map(c => c.identifier),
      url: `https://linear.app/palazzo-ai/issue/${issue.identifier}`,
    }));

    return res.json({
      issues,
      totalCount: issues.length,
      timestamp: new Date().toISOString(),
    });
  } catch (error) {
    console.error('Fetch issues error:', error);
    return res.status(500).json({ error: error.message });
  }
}
