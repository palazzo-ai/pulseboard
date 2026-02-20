import Anthropic from "@anthropic-ai/sdk";

export default async function handler(req, res) {
  res.setHeader("Access-Control-Allow-Origin", "*");
  res.setHeader("Access-Control-Allow-Methods", "POST, OPTIONS");
  res.setHeader("Access-Control-Allow-Headers", "Content-Type");

  if (req.method === "OPTIONS") return res.status(200).end();
  if (req.method !== "POST")
    return res.status(405).json({ error: "Method not allowed" });

  const { messages, roadmapState } = req.body;

  if (!messages || !Array.isArray(messages)) {
    return res.status(400).json({ error: "messages array is required" });
  }
  if (!roadmapState) {
    return res.status(400).json({ error: "roadmapState is required" });
  }

  const systemPrompt = `You are the Pulseboard AI Assistant for Palazzo's product roadmap. You help Raffi (product leader) manage the roadmap by reading, analyzing, and modifying opportunities and milestones.

You have access to the current roadmap state and tools to modify it. When the user asks you to make changes, use the appropriate tools. When they ask questions, analyze the data and respond conversationally.

CURRENT ROADMAP STATE:
${JSON.stringify(roadmapState, null, 2)}

CONTEXT:
- Palazzo is an AI-powered visual commerce platform for furniture retailers and real estate
- Products: Visualizer (AI staging), Spaces (real estate), Showcase (retail), Studio (content creation), Vinci (conversational AI), Platform (embed infrastructure)
- Areas map to product teams. Initiatives are strategic themes that cut across areas.
- Each opportunity has: id, title, area, initiative, month, status, startDate, endDate, milestoneId, issues (Linear IDs), blocks/blockedBy (dependency IDs), impactScore, effortScore, atRisk, atRiskReason
- Months use IDs like "jan26", "feb26", "mar26" etc.
- Statuses: not_started, in_progress, done, blocked

Be concise and action-oriented. When proposing changes, be specific about what you'll change and why. Reference opportunities and milestones by name. For bulk operations, summarize what you'll do before doing it.`;

  const tools = [
    {
      name: "set_opportunity_dates",
      description:
        "Set or update the start and end dates for one or more opportunities. Use when the user asks to schedule work, set timelines, or assign dates. Returns the proposed changes for user confirmation.",
      input_schema: {
        type: "object",
        properties: {
          updates: {
            type: "array",
            items: {
              type: "object",
              properties: {
                id: { type: "number", description: "Opportunity ID" },
                title: {
                  type: "string",
                  description: "Opportunity title (for display)",
                },
                startDate: {
                  type: "string",
                  description: "Start date YYYY-MM-DD",
                },
                endDate: {
                  type: "string",
                  description: "End date YYYY-MM-DD",
                },
              },
              required: ["id", "title", "startDate", "endDate"],
            },
          },
        },
        required: ["updates"],
      },
    },
    {
      name: "update_opportunity_status",
      description:
        "Update the status and/or at-risk flag for one or more opportunities. Statuses: not_started, in_progress, done, blocked.",
      input_schema: {
        type: "object",
        properties: {
          updates: {
            type: "array",
            items: {
              type: "object",
              properties: {
                id: { type: "number", description: "Opportunity ID" },
                title: {
                  type: "string",
                  description: "Opportunity title (for display)",
                },
                status: {
                  type: "string",
                  enum: ["not_started", "in_progress", "done", "blocked"],
                },
                atRisk: { type: "boolean" },
                atRiskReason: { type: "string" },
              },
              required: ["id", "title"],
            },
          },
        },
        required: ["updates"],
      },
    },
    {
      name: "create_opportunity",
      description: "Create a new opportunity on the roadmap.",
      input_schema: {
        type: "object",
        properties: {
          title: { type: "string" },
          area: {
            type: "string",
            enum: [
              "visualizer",
              "vinci",
              "spaces",
              "showcase",
              "studio",
              "platform",
              "admin",
            ],
          },
          initiative: {
            type: "string",
            enum: [
              "launch",
              "selfserve",
              "embed",
              "ai",
              "commerce",
              "enterprise",
            ],
          },
          month: {
            type: "string",
            description: "Month ID like 'feb26'",
          },
          description: { type: "string" },
          milestoneId: {
            type: "string",
            description: "Optional milestone ID to link to",
          },
          startDate: {
            type: "string",
            description: "Optional start date YYYY-MM-DD",
          },
          endDate: {
            type: "string",
            description: "Optional end date YYYY-MM-DD",
          },
          issues: {
            type: "array",
            items: { type: "string" },
            description: "Optional Linear issue IDs like ['PAL-123']",
          },
        },
        required: ["title", "area", "initiative", "month"],
      },
    },
    {
      name: "move_opportunity",
      description:
        "Move one or more opportunities to a different month and/or area.",
      input_schema: {
        type: "object",
        properties: {
          moves: {
            type: "array",
            items: {
              type: "object",
              properties: {
                id: { type: "number" },
                title: { type: "string" },
                month: {
                  type: "string",
                  description: "New month ID",
                },
                area: {
                  type: "string",
                  description: "New area ID",
                },
              },
              required: ["id", "title"],
            },
          },
        },
        required: ["moves"],
      },
    },
    {
      name: "bulk_assign_dates",
      description:
        "Analyze all opportunities that lack start/end dates and propose dates based on their month field, milestone deadlines, and dependency ordering. Call this when the user wants to populate the Gantt chart or schedule undated items.",
      input_schema: {
        type: "object",
        properties: {
          scope: {
            type: "string",
            enum: ["all", "area", "initiative", "milestone"],
            description: "Which dateless items to target",
          },
          scopeId: {
            type: "string",
            description:
              "Area, initiative, or milestone ID when scope is not 'all'",
          },
        },
        required: ["scope"],
      },
    },
    {
      name: "analyze_dependencies",
      description:
        "Analyze the dependency graph between opportunities. Identify critical paths, bottlenecks, circular dependencies, and suggest ordering improvements.",
      input_schema: {
        type: "object",
        properties: {
          focusArea: {
            type: "string",
            description: "Optional area ID to focus on",
          },
          focusMilestone: {
            type: "string",
            description:
              "Optional milestone ID to trace dependencies for",
          },
        },
      },
    },
    {
      name: "generate_summary",
      description:
        "Generate a stakeholder-ready summary of the roadmap. Returns markdown text the user can copy and share.",
      input_schema: {
        type: "object",
        properties: {
          format: {
            type: "string",
            enum: [
              "executive",
              "team_update",
              "milestone_status",
              "risk_report",
            ],
            description: "Summary format",
          },
          timeRange: {
            type: "string",
            description:
              "e.g. 'this quarter', 'next 90 days', 'Q1 2026'",
          },
          area: {
            type: "string",
            description: "Optional area filter",
          },
          initiative: {
            type: "string",
            description: "Optional initiative filter",
          },
        },
        required: ["format"],
      },
    },
    {
      name: "sync_linear",
      description:
        "Fetch the latest issue statuses from Linear and recommend status updates for opportunities with linked issues. Requires the user's Linear API key. Returns recommendations for user approval.",
      input_schema: {
        type: "object",
        properties: {
          linearApiKey: {
            type: "string",
            description: "The user's Linear API key",
          },
          action: {
            type: "string",
            enum: ["check", "apply_all"],
            description:
              "'check' to see recommendations, 'apply_all' to auto-apply all",
          },
        },
        required: ["action"],
      },
    },
  ];

  // Process a tool call and return result
  function processToolCall(name, input, state) {
    switch (name) {
      case "set_opportunity_dates":
        return { type: "mutation", action: "set_opportunity_dates", data: input };

      case "update_opportunity_status":
        return { type: "mutation", action: "update_opportunity_status", data: input };

      case "create_opportunity":
        return { type: "mutation", action: "create_opportunity", data: input };

      case "move_opportunity":
        return { type: "mutation", action: "move_opportunity", data: input };

      case "bulk_assign_dates": {
        // Find dateless opportunities matching the scope
        const opps = state.opportunities || [];
        let targets = opps.filter((o) => !o.startDate || !o.endDate);

        if (input.scope === "area" && input.scopeId) {
          targets = targets.filter((o) => o.area === input.scopeId);
        } else if (input.scope === "initiative" && input.scopeId) {
          targets = targets.filter((o) => o.initiative === input.scopeId);
        } else if (input.scope === "milestone" && input.scopeId) {
          targets = targets.filter((o) => o.milestoneId === input.scopeId);
        }

        return {
          type: "mutation",
          action: "bulk_assign_dates",
          data: {
            scope: input.scope,
            scopeId: input.scopeId,
            targets: targets.map((o) => ({
              id: o.id,
              title: o.title,
              area: o.area,
              month: o.month,
              milestoneId: o.milestoneId,
              blocks: o.blocks,
              blockedBy: o.blockedBy,
            })),
          },
        };
      }

      case "analyze_dependencies":
        return {
          type: "analysis",
          action: "analyze_dependencies",
          data: {
            focusArea: input.focusArea,
            focusMilestone: input.focusMilestone,
            analyzed: true,
          },
        };

      case "generate_summary":
        return {
          type: "analysis",
          action: "generate_summary",
          data: { format: input.format, generated: true },
        };

      case "sync_linear":
        // sync_linear is handled inline below (needs async fetch)
        return { type: "pending_sync", action: "sync_linear" };

      default:
        return { type: "error", message: `Unknown tool: ${name}` };
    }
  }

  // Fetch Linear issues for sync_linear tool
  async function fetchLinearIssues(linearApiKey, opportunities) {
    const linkedIssueIds = new Set();
    opportunities.forEach((opp) => {
      (opp.issues || []).forEach((id) => linkedIssueIds.add(id));
    });

    if (linkedIssueIds.size === 0) {
      return { issues: [], linkedCount: 0 };
    }

    const response = await fetch("https://api.linear.app/graphql", {
      method: "POST",
      headers: {
        "Content-Type": "application/json",
        Authorization: linearApiKey,
        "apollo-require-preflight": "true",
      },
      body: JSON.stringify({
        query: `query {
          issues(first: 250, filter: { state: { type: { nin: ["canceled"] } } }) {
            nodes {
              id identifier title
              state { name type }
              priority dueDate
              project { name }
              team { name key }
              labels { nodes { name } }
            }
          }
        }`,
      }),
    });

    const data = await response.json();
    if (data.errors) {
      throw new Error(
        `Linear API error: ${data.errors.map((e) => e.message).join(", ")}`
      );
    }

    const allIssues = data.data?.issues?.nodes || [];
    const linked = allIssues.filter((i) => linkedIssueIds.has(i.identifier));

    return {
      issues: linked.map((i) => ({
        identifier: i.identifier,
        title: i.title,
        state: i.state?.name,
        stateType: i.state?.type,
        priority: i.priority,
        team: i.team?.name,
      })),
      linkedCount: linked.length,
      totalFetched: allIssues.length,
    };
  }

  try {
    const anthropic = new Anthropic();
    let conversationMessages = [...messages];
    let allToolCalls = [];

    // Tool use loop
    let iterations = 0;
    const MAX_ITERATIONS = 10;

    while (iterations < MAX_ITERATIONS) {
      iterations++;

      const response = await anthropic.messages.create({
        model: "claude-sonnet-4-20250514",
        max_tokens: 4096,
        system: systemPrompt,
        tools,
        messages: conversationMessages,
      });

      if (response.stop_reason === "tool_use") {
        const toolUseBlocks = response.content.filter(
          (b) => b.type === "tool_use"
        );
        const toolResults = [];

        for (const toolUse of toolUseBlocks) {
          let result;

          // Handle sync_linear specially (needs async fetch)
          if (toolUse.name === "sync_linear") {
            const linearApiKey = toolUse.input.linearApiKey;
            if (!linearApiKey) {
              result = {
                type: "error",
                message:
                  "No Linear API key provided. Ask the user to configure their Linear API key first.",
              };
            } else {
              try {
                const linearData = await fetchLinearIssues(
                  linearApiKey,
                  roadmapState.opportunities || []
                );
                result = {
                  type: "sync_data",
                  action: "sync_linear",
                  data: linearData,
                };
              } catch (err) {
                result = {
                  type: "error",
                  message: `Failed to fetch from Linear: ${err.message}`,
                };
              }
            }
          } else {
            result = processToolCall(
              toolUse.name,
              toolUse.input,
              roadmapState
            );
          }

          allToolCalls.push({
            name: toolUse.name,
            input: toolUse.input,
            result,
          });
          toolResults.push({
            type: "tool_result",
            tool_use_id: toolUse.id,
            content: JSON.stringify(result),
          });
        }

        conversationMessages.push({
          role: "assistant",
          content: response.content,
        });
        conversationMessages.push({ role: "user", content: toolResults });
      } else {
        // Final text response
        const textContent = response.content.find((b) => b.type === "text");
        return res.json({
          message: textContent?.text || "",
          toolCalls: allToolCalls,
        });
      }
    }

    // If we hit max iterations, return what we have
    return res.json({
      message:
        "I've processed multiple steps. Here are the results so far.",
      toolCalls: allToolCalls,
    });
  } catch (error) {
    console.error("Assistant error:", error);
    return res.status(500).json({
      error: "Assistant error",
      message: error.message,
    });
  }
}
