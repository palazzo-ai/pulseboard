export default async function handler(req, res) {
  res.setHeader('Access-Control-Allow-Origin', '*');
  res.setHeader('Access-Control-Allow-Methods', 'POST, OPTIONS');
  res.setHeader('Access-Control-Allow-Headers', 'Content-Type');
  if (req.method === 'OPTIONS') return res.status(200).end();
  if (req.method !== 'POST') return res.status(405).json({ error: 'Method not allowed' });

  const { linearApiKey } = req.body;
  if (!linearApiKey) return res.status(400).json({ error: 'Linear API key required' });

  try {
    async function linearQuery(query) {
      const response = await fetch('https://api.linear.app/graphql', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          Authorization: linearApiKey,
          'apollo-require-preflight': 'true',
        },
        body: JSON.stringify({ query }),
      });
      return response.json();
    }

    // 1. Fetch "Showcase Onboarding" project issues (checklist trackers with full descriptions)
    const onboardingResult = await linearQuery(`
      query {
        issues(
          first: 50
          filter: {
            project: { name: { eq: "Showcase Onboarding" } }
            state: { type: { nin: ["canceled"] } }
          }
        ) {
          nodes {
            id identifier title description
            state { name type }
            labels { nodes { name } }
            updatedAt
          }
        }
      }
    `);

    // 2. Fetch "P0: Launch Blocking Features" project issues
    const p0Result = await linearQuery(`
      query {
        issues(
          first: 100
          filter: {
            project: { name: { eq: "P0: Launch Blocking Features" } }
            state: { type: { nin: ["canceled"] } }
          }
        ) {
          nodes {
            id identifier title
            state { name type }
            assignee { name displayName }
            priority priorityLabel
            labels { nodes { name } }
            updatedAt
          }
        }
      }
    `);

    // 3. Fetch self-serve issues from Spaces and Studio projects
    const selfServeResult = await linearQuery(`
      query {
        spacesIssues: issues(
          first: 50
          filter: {
            project: { name: { in: ["Spaces"] } }
            state: { type: { nin: ["canceled", "completed"] } }
          }
        ) {
          nodes {
            id identifier title
            state { name type }
            assignee { name displayName }
            priority priorityLabel
            labels { nodes { name } }
            dueDate
            updatedAt
          }
        }
        studioIssues: issues(
          first: 50
          filter: {
            project: { name: { in: ["Studio"] } }
            state: { type: { nin: ["canceled", "completed"] } }
          }
        ) {
          nodes {
            id identifier title
            state { name type }
            assignee { name displayName }
            priority priorityLabel
            labels { nodes { name } }
            dueDate
            updatedAt
          }
        }
      }
    `);

    const onboardingIssues = onboardingResult.data?.issues?.nodes || [];

    const p0Issues = (p0Result.data?.issues?.nodes || []).map(issue => ({
      identifier: issue.identifier,
      title: issue.title,
      state: issue.state,
      assignee: issue.assignee?.displayName || issue.assignee?.name || null,
      priority: issue.priority,
      priorityLabel: issue.priorityLabel,
      labels: (issue.labels?.nodes || []).map(l => l.name),
      url: `https://linear.app/palazzo-ai/issue/${issue.identifier}`,
    }));

    const spacesIssues = (selfServeResult.data?.spacesIssues?.nodes || []).map(issue => ({
      identifier: issue.identifier,
      title: issue.title,
      state: issue.state,
      assignee: issue.assignee?.displayName || issue.assignee?.name || null,
      priority: issue.priority,
      priorityLabel: issue.priorityLabel,
      labels: (issue.labels?.nodes || []).map(l => l.name),
      dueDate: issue.dueDate,
      url: `https://linear.app/palazzo-ai/issue/${issue.identifier}`,
    }));

    const studioIssues = (selfServeResult.data?.studioIssues?.nodes || []).map(issue => ({
      identifier: issue.identifier,
      title: issue.title,
      state: issue.state,
      assignee: issue.assignee?.displayName || issue.assignee?.name || null,
      priority: issue.priority,
      priorityLabel: issue.priorityLabel,
      labels: (issue.labels?.nodes || []).map(l => l.name),
      dueDate: issue.dueDate,
      url: `https://linear.app/palazzo-ai/issue/${issue.identifier}`,
    }));

    return res.json({
      onboardingChecklists: onboardingIssues,
      p0Blockers: p0Issues,
      spacesIssues,
      studioIssues,
      timestamp: new Date().toISOString(),
    });
  } catch (error) {
    console.error('Launch data fetch error:', error);
    return res.status(500).json({ error: error.message });
  }
}
