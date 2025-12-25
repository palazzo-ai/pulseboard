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

  const { opportunities, milestones, teamMembers, assignments, analysisType } = req.body;

  if (!process.env.ANTHROPIC_API_KEY) {
    return res.status(500).json({ 
      error: "Server configuration error", 
      message: "ANTHROPIC_API_KEY environment variable is not set" 
    });
  }

  try {
    const anthropic = new Anthropic();

    // Build context about current state
    const currentDate = new Date().toISOString().split('T')[0];
    
    const context = `
# Palazzo Roadmap Context

**Company**: Palazzo is an AI-powered visual commerce platform for furniture retailers and real estate.
**Products**: 
- Visualizer: AI room staging engine
- Vinci: Conversational AI assistant  
- Spaces: Real estate staging platform
- Showcase: Retail customer experience
- Studio: Brand content creation
- Platform: Embed infrastructure
- Admin: Back-office tools

**Current Date**: ${currentDate}

## Milestones (${milestones.length} total)
${milestones.map(m => `- **${m.title}** (${m.month}) - ${m.area}: ${m.description || 'No description'}`).join('\n')}

## Opportunities (${opportunities.length} total)
${opportunities.map(o => {
  const milestone = o.milestoneId ? milestones.find(m => m.id === o.milestoneId)?.title : 'None';
  const assigneeCount = assignments[o.id]?.length || 0;
  const points = assignments[o.id]?.reduce((sum, a) => sum + (a.points || 0), 0) || 0;
  return `- [${o.status.toUpperCase()}${o.atRisk ? ' ⚠️AT RISK' : ''}] **${o.title}** (${o.area}/${o.month})
    Initiative: ${o.initiative}, Milestone: ${milestone}
    Team: ${assigneeCount} assigned, ${points} points
    ${o.description ? `Description: ${o.description}` : ''}`;
}).join('\n')}

## Team Capacity (${teamMembers.length} members)
${teamMembers.map(tm => {
  const assigned = Object.entries(assignments).reduce((sum, [oppId, assignList]) => {
    const memberAssign = assignList.find(a => a.team_member_id === tm.id);
    return sum + (memberAssign?.points || 0);
  }, 0);
  return `- ${tm.name} (${tm.role}): ${assigned}/${tm.capacity_points_per_sprint || 18} points allocated`;
}).join('\n')}

## Summary Stats
- Not Started: ${opportunities.filter(o => o.status === 'not_started').length}
- In Progress: ${opportunities.filter(o => o.status === 'in_progress').length}
- Done: ${opportunities.filter(o => o.status === 'done').length}
- Blocked: ${opportunities.filter(o => o.status === 'blocked').length}
- At Risk: ${opportunities.filter(o => o.atRisk).length}
- Unassigned: ${opportunities.filter(o => !assignments[o.id] || assignments[o.id].length === 0).length}
`;

    let prompt = '';
    let systemPrompt = `You are a strategic product advisor for Palazzo, analyzing their product roadmap. Be specific, actionable, and reference actual opportunities and milestones by name. Format your response with clear sections and bullet points.`;

    switch (analysisType) {
      case 'prioritization':
        prompt = `${context}

Analyze this roadmap and provide prioritization recommendations:

1. **Critical Path Analysis**: Which opportunities are most critical to upcoming milestones? Are they properly prioritized (assigned, in progress)?

2. **Quick Wins**: Which not-started opportunities could be completed quickly to build momentum?

3. **Deprioritization Candidates**: Which opportunities could be pushed back without affecting key milestones?

4. **Resource Conflicts**: Are there areas with too many opportunities in the same month? Suggest rebalancing.

5. **Sequencing Issues**: Are there opportunities that should logically come before/after others?

Provide specific, actionable recommendations with opportunity names.`;
        break;

      case 'gaps':
        prompt = `${context}

Analyze this roadmap for gaps and missing opportunities:

1. **Milestone Coverage**: Which milestones have weak coverage (few opportunities feeding in)? What's missing?

2. **Initiative Gaps**: Are any strategic initiatives underrepresented? What opportunities should be added?

3. **Technical Debt**: Based on the roadmap, what foundational/infrastructure work might be missing?

4. **User Journey Gaps**: Looking at the product areas, what user-facing features seem to be missing?

5. **Integration Opportunities**: What cross-product integration opportunities are missing?

For each gap, suggest a specific opportunity with title, area, initiative, and recommended month.`;
        break;

      case 'risks':
        prompt = `${context}

Analyze this roadmap for risks and concerns:

1. **At-Risk Analysis**: Review the items marked at-risk. Are there others that should be flagged?

2. **Milestone Risks**: Which milestones are at risk of slipping? Why?

3. **Dependency Risks**: What implicit dependencies exist that could cause cascading delays?

4. **Resource Risks**: Are there team members who are overloaded or single points of failure?

5. **Timeline Risks**: Which months look overloaded? What should be moved?

6. **Missing Prerequisites**: What foundational work is missing that could block later opportunities?

Be specific about which opportunities and milestones are at risk and why.`;
        break;

      case 'milestones':
        prompt = `${context}

Analyze milestones and suggest improvements:

1. **Milestone Health Check**: For each milestone, assess:
   - Coverage: How many opportunities feed into it?
   - Progress: What % is done/in-progress?
   - Risk: Is it on track?

2. **Missing Milestones**: What external commitments or product launches are missing?

3. **Milestone Timing**: Are any milestones scheduled too close together? Too far apart?

4. **Success Criteria**: What would make each milestone truly "done"? Are we missing anything?

5. **Suggested New Milestones**: Recommend 2-3 new milestones that would help structure the roadmap better, with:
   - Title
   - Target month
   - Area
   - Description
   - Which opportunities should feed into it`;
        break;

      case 'full':
      default:
        prompt = `${context}

Provide a comprehensive roadmap analysis:

## Executive Summary
Brief 2-3 sentence assessment of roadmap health.

## Top 5 Priorities
What should the team focus on right now?

## Key Risks
What are the biggest threats to the roadmap?

## Gaps & Missing Opportunities
What's missing from the roadmap?

## Resource Recommendations
How should the team be allocated?

## Timeline Recommendations
What should be moved or reprioritized?

Be specific and actionable. Reference actual opportunities and milestones by name.`;
    }

    const message = await anthropic.messages.create({
      model: "claude-sonnet-4-20250514",
      max_tokens: 4096,
      system: systemPrompt,
      messages: [{ role: "user", content: prompt }],
    });

    const responseText = message.content[0].type === "text" ? message.content[0].text : "";

    return res.json({
      analysis: responseText,
      analysisType,
      timestamp: new Date().toISOString(),
      stats: {
        opportunities: opportunities.length,
        milestones: milestones.length,
        teamMembers: teamMembers.length,
        atRisk: opportunities.filter(o => o.atRisk).length,
        unassigned: opportunities.filter(o => !assignments[o.id] || assignments[o.id].length === 0).length,
      }
    });
  } catch (error) {
    console.error("Analysis error:", error);
    return res.status(500).json({
      error: "Analysis failed",
      message: error.message,
    });
  }
}
