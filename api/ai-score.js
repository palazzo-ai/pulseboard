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

  const { opportunities, milestones } = req.body;

  if (!opportunities || !Array.isArray(opportunities)) {
    return res.status(400).json({ error: "Opportunities array is required" });
  }

  try {
    const anthropic = new Anthropic();

    const prompt = `You are helping prioritize a product roadmap. Analyze these opportunities and suggest Impact (0-100) and Effort (0-100) scores.

**Scoring Guidelines:**
- **Impact (0-100):** Business value, user benefit, strategic importance, milestone criticality
  - 80-100: Critical for major milestones, high revenue/user impact, strategic differentiator
  - 60-79: Important feature, meaningful user benefit, supports key initiatives  
  - 40-59: Nice to have, incremental improvement, indirect benefit
  - 0-39: Low priority, minimal impact, could be cut

- **Effort (0-100):** Engineering complexity, time required, dependencies, risk
  - 80-100: Multi-month, multiple teams, high technical risk, many dependencies
  - 60-79: Several weeks, significant complexity, some dependencies
  - 40-59: 1-2 weeks, moderate complexity, few dependencies
  - 0-39: Days, straightforward, minimal risk

**Context to consider:**
- Items linked to near-term milestones should have higher impact
- More Linear issues often indicates higher effort
- More assignees may indicate higher effort/complexity
- "At risk" items may need recalibration
- Platform/infrastructure work often has high effort but enables other work

**Opportunities to analyze:**
${JSON.stringify(opportunities, null, 2)}

**Upcoming milestones for context:**
${JSON.stringify(milestones || [], null, 2)}

**Respond with a JSON array only (no markdown, no explanation outside the array):**
[
  {
    "id": <opportunity_id>,
    "impactScore": <0-100>,
    "effortScore": <0-100>,
    "reasoning": "<1-2 sentence explanation>"
  },
  ...
]`;

    const message = await anthropic.messages.create({
      model: "claude-sonnet-4-20250514",
      max_tokens: 4096,
      messages: [
        {
          role: "user",
          content: prompt,
        },
      ],
    });

    const responseText = message.content[0].type === "text" ? message.content[0].text : "";

    // Parse the JSON response
    let scores = [];
    try {
      const jsonMatch = responseText.match(/\[[\s\S]*\]/);
      if (jsonMatch) {
        scores = JSON.parse(jsonMatch[0]);
      }
    } catch (parseError) {
      console.error("Failed to parse Claude response:", parseError);
      return res.status(500).json({
        error: "Failed to parse scores",
        rawResponse: responseText,
      });
    }

    return res.json({
      scores,
      analyzedCount: opportunities.length,
      timestamp: new Date().toISOString(),
    });
  } catch (error) {
    console.error("AI Scoring error:", error);
    return res.status(500).json({
      error: "Internal server error",
      message: error.message,
    });
  }
}
