// api/linear-write.js
// Executes Linear GraphQL mutations after user confirmation.
// Claude proposes, humans approve, this endpoint runs.

export default async function handler(req, res) {
  res.setHeader("Access-Control-Allow-Origin", "*");
  res.setHeader("Access-Control-Allow-Methods", "POST, OPTIONS");
  res.setHeader("Access-Control-Allow-Headers", "Content-Type");
  if (req.method === "OPTIONS") return res.status(200).end();
  if (req.method !== "POST") return res.status(405).json({ error: "Method not allowed" });

  const { linearApiKey, operation, variables } = req.body;

  if (!linearApiKey) {
    return res.status(400).json({ error: "Linear API key required" });
  }

  // Map operation names to GraphQL mutations
  const mutations = {
    createIssue: `
      mutation CreateIssue($input: IssueCreateInput!) {
        issueCreate(input: $input) {
          success
          issue {
            id identifier title url
            state { name type }
            assignee { name }
            project { name }
            team { name key }
          }
        }
      }
    `,
    updateIssue: `
      mutation UpdateIssue($id: String!, $input: IssueUpdateInput!) {
        issueUpdate(id: $id, input: $input) {
          success
          issue {
            id identifier title url
            state { name type }
            assignee { name }
            project { name }
          }
        }
      }
    `,
    createComment: `
      mutation CreateComment($issueId: String!, $body: String!) {
        commentCreate(input: { issueId: $issueId, body: $body }) {
          success
          comment { id body }
        }
      }
    `,
  };

  const mutation = mutations[operation];
  if (!mutation) {
    return res.status(400).json({ error: `Unknown operation: ${operation}` });
  }

  try {
    // Resolve human-readable names to Linear UUIDs
    const resolvedVars = await resolveVariables(linearApiKey, operation, variables);

    const response = await fetch("https://api.linear.app/graphql", {
      method: "POST",
      headers: {
        "Content-Type": "application/json",
        Authorization: linearApiKey,
        "apollo-require-preflight": "true",
      },
      body: JSON.stringify({ query: mutation, variables: resolvedVars }),
    });

    const data = await response.json();
    if (data.errors) {
      return res.status(400).json({ error: data.errors[0]?.message, details: data.errors });
    }

    return res.json({ success: true, data: data.data });
  } catch (error) {
    console.error("Linear write error:", error);
    return res.status(500).json({ error: error.message });
  }
}

// ========== LINEAR GRAPHQL HELPER ==========

async function fetchLinear(linearApiKey, query, variables = {}) {
  const response = await fetch("https://api.linear.app/graphql", {
    method: "POST",
    headers: {
      "Content-Type": "application/json",
      Authorization: linearApiKey,
      "apollo-require-preflight": "true",
    },
    body: JSON.stringify({ query, variables }),
  });
  return response.json();
}

// ========== ID RESOLUTION ==========
// Linear mutations require UUIDs. The assistant works with human-readable names.
// This resolves teamKey → teamId, projectName → projectId, etc.

async function resolveIds(linearApiKey, input) {
  const resolved = { ...input };

  // Resolve team key → ID
  if (input.teamKey) {
    const { data } = await fetchLinear(linearApiKey, `{ teams { nodes { id key } } }`);
    const team = data?.teams?.nodes?.find(t => t.key === input.teamKey);
    if (team) resolved.teamId = team.id;
    delete resolved.teamKey;
  }

  // Resolve project name → ID
  if (input.projectName) {
    const { data } = await fetchLinear(linearApiKey, `{ projects { nodes { id name } } }`);
    const project = data?.projects?.nodes?.find(p =>
      p.name.toLowerCase() === input.projectName.toLowerCase()
    );
    if (project) resolved.projectId = project.id;
    delete resolved.projectName;
  }

  // Resolve assignee name → ID
  if (input.assigneeName) {
    const { data } = await fetchLinear(linearApiKey, `{ users { nodes { id name displayName } } }`);
    const user = data?.users?.nodes?.find(u =>
      (u.displayName || u.name).toLowerCase() === input.assigneeName.toLowerCase()
    );
    if (user) resolved.assigneeId = user.id;
    delete resolved.assigneeName;
  }

  // Resolve state name → ID (needs teamId)
  if (input.stateName && resolved.teamId) {
    const { data } = await fetchLinear(
      linearApiKey,
      `{ workflowStates(filter: { team: { id: { eq: "${resolved.teamId}" } } }) { nodes { id name type } } }`
    );
    const state = data?.workflowStates?.nodes?.find(s =>
      s.name.toLowerCase() === input.stateName.toLowerCase()
    );
    if (state) resolved.stateId = state.id;
    delete resolved.stateName;
  }

  // Resolve issue identifier → ID
  if (input.issueIdentifier || input.parentIssueIdentifier) {
    const identifier = input.issueIdentifier || input.parentIssueIdentifier;
    const { data } = await fetchLinear(
      linearApiKey,
      `{ issues(filter: { identifier: { eq: "${identifier}" } }) { nodes { id } } }`
    );
    if (data?.issues?.nodes?.[0]) {
      if (input.issueIdentifier) resolved.id = data.issues.nodes[0].id;
      if (input.parentIssueIdentifier) resolved.parentId = data.issues.nodes[0].id;
    }
    delete resolved.issueIdentifier;
    delete resolved.parentIssueIdentifier;
  }

  // Remove display-only fields that Linear doesn't accept
  delete resolved.labelNames;
  delete resolved.opportunityId;

  return resolved;
}

// ========== VARIABLE RESOLUTION PER OPERATION ==========

async function resolveVariables(linearApiKey, operation, variables) {
  if (operation === "createIssue") {
    // variables.input contains the create fields
    const input = variables.input || variables;
    const resolved = await resolveIds(linearApiKey, input);
    // Build Linear IssueCreateInput
    const createInput = {};
    if (resolved.teamId) createInput.teamId = resolved.teamId;
    if (resolved.title) createInput.title = resolved.title;
    if (resolved.description) createInput.description = resolved.description;
    if (resolved.projectId) createInput.projectId = resolved.projectId;
    if (resolved.assigneeId) createInput.assigneeId = resolved.assigneeId;
    if (resolved.priority != null) createInput.priority = resolved.priority;
    if (resolved.dueDate) createInput.dueDate = resolved.dueDate;
    if (resolved.parentId) createInput.parentId = resolved.parentId;
    if (resolved.stateId) createInput.stateId = resolved.stateId;
    return { input: createInput };
  }

  if (operation === "updateIssue") {
    // variables should have { id (or issueIdentifier), ...updateFields }
    const resolved = await resolveIds(linearApiKey, variables);
    const id = resolved.id;
    const input = {};
    if (resolved.title) input.title = resolved.title;
    if (resolved.description) input.description = resolved.description;
    if (resolved.stateId) input.stateId = resolved.stateId;
    if (resolved.assigneeId) input.assigneeId = resolved.assigneeId;
    if (resolved.priority != null) input.priority = resolved.priority;
    if (resolved.dueDate) input.dueDate = resolved.dueDate;
    if (resolved.projectId) input.projectId = resolved.projectId;
    return { id, input };
  }

  if (operation === "createComment") {
    // variables should have { issueIdentifier, body }
    const resolved = await resolveIds(linearApiKey, {
      issueIdentifier: variables.issueIdentifier,
    });
    return { issueId: resolved.id, body: variables.body };
  }

  // Fallback: return as-is
  return variables;
}
