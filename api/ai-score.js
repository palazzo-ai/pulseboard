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

  if (!process.env.ANTHROPIC_API_KEY) {
    return res.status(500).json({ 
      error: "Server configuration error", 
      message: "ANTHROPIC_API_KEY environment variable is not set" 
    });
  }

  try {
    const anthropic = new Anthropic();

    // Limit to reasonable batch size to avoid token limits
    const oppsToScore = opportunities.slice(0, 30);

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

**Opportunities to analyze (${oppsToScore.length} items):**
${JSON.stringify(oppsToScore, null, 2)}

**Upcoming milestones for context:**
${JSON.stringify(milestones || [], null, 2)}

IMPORTANT: Respond with ONLY a valid JSON array. No markdown code blocks, no explanation text before or after. Just the raw JSON array starting with [ and ending with ]

Example format:
[{"id": 1, "impactScore": 75, "effortScore": 45, "reasoning": "Critical for HomeZone launch milestone."}, {"id": 2, "impactScore": 60, "effortScore": 30, "reasoning": "Supports AI model improvements."}]

Now provide scores for all ${oppsToScore.length} opportunities:`;

    console.log(`Analyzing ${oppsToScore.length} opportunities...`);

    const message = await anthropic.messages.create({
      model: "claude-sonnet-4-20250514",
      max_tokens: 8192,
      messages: [
        {
          role: "user",
          content: prompt,
        },
      ],
    });

    const responseText = message.content[0].type === "text" ? message.content[0].text : "";
    
    console.log("Claude response length:", responseText.length);
    console.log("Claude response preview:", responseText.substring(0, 500));

    // Parse the JSON response
    let scores = [];
    try {
      // Try direct parse first (if Claude returned clean JSON)
      const trimmed = responseText.trim();
      if (trimmed.startsWith('[')) {
        scores = JSON.parse(trimmed);
      } else {
        // Try to extract JSON array from response
        const jsonMatch = responseText.match(/\[[\s\S]*\]/);
        if (jsonMatch) {
          scores = JSON.parse(jsonMatch[0]);
        } else {
          console.error("No JSON array found in response");
          return res.status(500).json({
            error: "Failed to parse scores - no JSON array found",
            responsePreview: responseText.substring(0, 1000),
          });
        }
      }
    } catch (parseError) {
      console.error("Failed to parse Claude response:", parseError);
      console.error("Response was:", responseText.substring(0, 1000));
      return res.status(500).json({
        error: "Failed to parse scores - JSON parse error",
        parseError: parseError.message,
        responsePreview: responseText.substring(0, 1000),
      });
    }

    console.log(`Successfully parsed ${scores.length} scores`);

    return res.json({
      scores,
      analyzedCount: oppsToScore.length,
      totalOpportunities: opportunities.length,
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
