export default async function handler(req, res) {
  res.setHeader('Access-Control-Allow-Origin', '*');
  res.setHeader('Access-Control-Allow-Methods', 'POST, OPTIONS');
  res.setHeader('Access-Control-Allow-Headers', 'Content-Type');
  if (req.method === 'OPTIONS') return res.status(200).end();
  if (req.method !== 'POST') return res.status(405).json({ error: 'Method not allowed' });

  const { linearApiKey, query } = req.body;
  if (!linearApiKey) return res.status(400).json({ error: 'Linear API key required' });
  if (!query || query.trim().length < 2) return res.json({ issues: [] });

  try {
    // Check if query looks like an issue identifier (e.g. PAL-1234)
    const isIdentifier = /^[A-Z]+-\d+$/i.test(query.trim());

    let gql;
    if (isIdentifier) {
      const [teamKey, num] = query.trim().toUpperCase().split('-');
      gql = `query {
        issues(first: 1, filter: {
          team: { key: { eq: "${teamKey}" } }
          number: { eq: ${parseInt(num, 10)} }
        }) {
          nodes {
            id identifier title
            state { name type }
            assignee { name displayName }
            priority priorityLabel
            labels { nodes { name } }
            project { name }
          }
        }
      }`;
    } else {
      // Free text search
      gql = `query {
        searchIssues(query: "${query.replace(/"/g, '\\"')}", first: 10) {
          nodes {
            ... on Issue {
              id identifier title
              state { name type }
              assignee { name displayName }
              priority priorityLabel
              labels { nodes { name } }
              project { name }
            }
          }
        }
      }`;
    }

    const response = await fetch('https://api.linear.app/graphql', {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        Authorization: linearApiKey,
        'apollo-require-preflight': 'true',
      },
      body: JSON.stringify({ query: gql }),
    });

    const data = await response.json();
    if (data.errors) return res.status(400).json({ error: 'Linear API error', details: data.errors });

    const nodes = isIdentifier
      ? (data.data?.issues?.nodes || [])
      : (data.data?.searchIssues?.nodes || []);

    const issues = nodes.filter(n => n.identifier).map(issue => ({
      identifier: issue.identifier,
      title: issue.title,
      state: issue.state,
      assignee: issue.assignee?.displayName || issue.assignee?.name || null,
      priority: issue.priority,
      priorityLabel: issue.priorityLabel,
      labels: (issue.labels?.nodes || []).map(l => l.name),
      project: issue.project?.name || null,
      url: `https://linear.app/palazzo-ai/issue/${issue.identifier}`,
    }));

    return res.json({ issues });
  } catch (error) {
    console.error('Search issues error:', error);
    return res.status(500).json({ error: error.message });
  }
}
