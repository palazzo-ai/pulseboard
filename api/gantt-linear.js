import { createClient } from "@supabase/supabase-js";

const supabase = createClient(
  process.env.VITE_SUPABASE_URL || process.env.SUPABASE_URL,
  process.env.VITE_SUPABASE_ANON_KEY || process.env.SUPABASE_ANON_KEY
);

export default async function handler(req, res) {
  res.setHeader("Access-Control-Allow-Origin", "*");
  res.setHeader("Access-Control-Allow-Methods", "POST, OPTIONS");
  res.setHeader("Access-Control-Allow-Headers", "Content-Type");

  if (req.method === "OPTIONS") return res.status(200).end();
  if (req.method !== "POST") return res.status(405).json({ error: "Method not allowed" });

  const { linearApiKey, teamId, projectId } = req.body;

  if (!linearApiKey) {
    return res.status(400).json({ error: "Linear API key is required" });
  }

  try {
    // 1. Fetch all Pulseboard date overrides from Supabase
    let dateOverrides = {};
    try {
      const { data: overrides, error } = await supabase
        .from("issue_dates")
        .select("*");
      if (!error && overrides) {
        overrides.forEach((o) => {
          dateOverrides[o.issue_identifier] = {
            startDate: o.start_date,
            endDate: o.end_date,
            opportunityId: o.opportunity_id,
          };
        });
      }
    } catch (e) {
      console.log("issue_dates table not found or empty, continuing without overrides");
    }

    // 2. Fetch issues from Linear with pagination
    let filterClause = "";
    if (projectId) {
      filterClause = `filter: { project: { id: { eq: "${projectId}" } } }`;
    } else if (teamId) {
      filterClause = `filter: { team: { id: { eq: "${teamId}" } } }`;
    }

    let allIssues = [];
    let hasNextPage = true;
    let afterCursor = null;

    while (hasNextPage && allIssues.length < 500) {
      const afterClause = afterCursor ? `after: "${afterCursor}"` : "";

      const query = `
        query {
          issues(first: 100 ${afterClause} ${filterClause}) {
            pageInfo { hasNextPage endCursor }
            nodes {
              id
              identifier
              title
              description
              priority { value name }
              state { name type }
              assignee { id name email displayName avatarUrl }
              project { id name color }
              team { id name key }
              labels { nodes { name color } }
              parent { id identifier title }
              children { nodes { id identifier } }
              startedAt
              completedAt
              dueDate
              createdAt
              updatedAt
              estimate
            }
          }
        }
      `;

      const response = await fetch("https://api.linear.app/graphql", {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
          Authorization: linearApiKey,
          "apollo-require-preflight": "true",
        },
        body: JSON.stringify({ query }),
      });

      const data = await response.json();

      if (data.errors) {
        return res.status(400).json({ error: "Failed to fetch from Linear", details: data.errors });
      }

      const nodes = data.data?.issues?.nodes || [];
      allIssues = allIssues.concat(nodes);
      hasNextPage = data.data?.issues?.pageInfo?.hasNextPage || false;
      afterCursor = data.data?.issues?.pageInfo?.endCursor || null;
    }

    // 3. Build issue map for hierarchy lookups
    const issueMap = {};
    allIssues.forEach((issue) => { issueMap[issue.id] = issue; });

    const mapStatus = (state) => {
      if (!state) return "not_started";
      const type = (state.type || "").toLowerCase();
      const name = (state.name || "").toLowerCase();
      if (type === "completed" || name === "done") return "done";
      if (type === "started" || name === "in progress" || name === "in review") return "in_progress";
      if (type === "cancelled") return "done";
      if (name === "blocked") return "blocked";
      return "not_started";
    };

    // 4. Transform issues, merging Pulseboard date overrides
    const transformed = allIssues.map((issue) => {
      const hasChildren = issue.children?.nodes?.length > 0;
      const isChild = !!issue.parent;
      const override = dateOverrides[issue.identifier];

      // Date resolution priority:
      // 1. Pulseboard override (user-set dates)
      // 2. Linear startedAt / dueDate
      // 3. Linear createdAt (start only, as fallback)
      const startDate = override?.startDate
        || (issue.startedAt ? issue.startedAt.split("T")[0] : null)
        || (issue.createdAt ? issue.createdAt.split("T")[0] : null);

      const endDate = override?.endDate
        || issue.dueDate
        || (issue.completedAt ? issue.completedAt.split("T")[0] : null);

      // Track the source of dates for UI display
      const dateSource = {
        start: override?.startDate ? "pulseboard" : (issue.startedAt ? "linear" : "created"),
        end: override?.endDate ? "pulseboard" : (issue.dueDate ? "linear" : (issue.completedAt ? "linear" : null)),
      };

      // Progress calculation
      let progress = 0;
      if (hasChildren) {
        const childIds = issue.children.nodes.map((c) => c.id);
        const children = childIds.map((id) => issueMap[id]).filter(Boolean);
        const doneCount = children.filter((c) => mapStatus(c.state) === "done").length;
        progress = children.length > 0 ? Math.round((doneCount / children.length) * 100) : 0;
      } else {
        const status = mapStatus(issue.state);
        progress = status === "done" ? 100 : status === "in_progress" ? 50 : 0;
      }

      return {
        id: issue.id,
        identifier: issue.identifier,
        title: issue.title,
        status: mapStatus(issue.state),
        stateName: issue.state?.name || "Unknown",
        priority: issue.priority?.value || 4,
        priorityName: issue.priority?.name || "None",
        assignee: issue.assignee ? {
          id: issue.assignee.id,
          name: issue.assignee.displayName || issue.assignee.name,
          email: issue.assignee.email,
          avatar: issue.assignee.avatarUrl,
        } : null,
        project: issue.project ? {
          id: issue.project.id,
          name: issue.project.name,
          color: issue.project.color,
        } : null,
        team: issue.team ? { id: issue.team.id, name: issue.team.name, key: issue.team.key } : null,
        labels: (issue.labels?.nodes || []).map((l) => ({ name: l.name, color: l.color })),
        parentId: issue.parent?.id || null,
        parentIdentifier: issue.parent?.identifier || null,
        childIds: (issue.children?.nodes || []).map((c) => c.id),
        childIdentifiers: (issue.children?.nodes || []).map((c) => c.identifier),
        hasChildren,
        isChild,
        startDate,
        endDate,
        dateSource,
        hasPulseboardDates: !!override,
        dueDate: issue.dueDate,
        createdAt: issue.createdAt,
        completedAt: issue.completedAt,
        startedAt: issue.startedAt,
        estimate: issue.estimate,
        progress,
        url: `https://linear.app/palazzo-ai/issue/${issue.identifier}`,
      };
    });

    // 5. Build response
    const projects = [];
    const seenProjects = new Set();
    transformed.forEach((issue) => {
      if (issue.project && !seenProjects.has(issue.project.id)) {
        seenProjects.add(issue.project.id);
        projects.push(issue.project);
      }
    });

    const assignees = [];
    const seenAssignees = new Set();
    transformed.forEach((issue) => {
      if (issue.assignee && !seenAssignees.has(issue.assignee.id)) {
        seenAssignees.add(issue.assignee.id);
        assignees.push(issue.assignee);
      }
    });

    const parentIssues = transformed.filter((i) => !i.isChild).sort((a, b) => a.priority - b.priority);
    const subIssues = transformed.filter((i) => i.isChild);

    // Stats
    const withDates = transformed.filter((i) => i.startDate && i.endDate).length;
    const withoutEndDate = transformed.filter((i) => i.startDate && !i.endDate).length;
    const pulseboardDated = transformed.filter((i) => i.hasPulseboardDates).length;

    return res.json({
      issues: transformed,
      parentIssues,
      subIssues,
      projects: projects.sort((a, b) => a.name.localeCompare(b.name)),
      assignees: assignees.sort((a, b) => a.name.localeCompare(b.name)),
      totalCount: transformed.length,
      parentCount: parentIssues.length,
      subIssueCount: subIssues.length,
      withDates,
      withoutEndDate,
      pulseboardDated,
      timestamp: new Date().toISOString(),
    });
  } catch (error) {
    console.error("Gantt Linear fetch error:", error);
    return res.status(500).json({ error: "Internal server error", message: error.message });
  }
}
