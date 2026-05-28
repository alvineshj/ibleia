import { IdeaCategory } from "@prisma/client"

export const CRITERIA_WEIGHTS: Record<string, Record<IdeaCategory, number>> = {
  "1": { CX: 5, BI: 5, OE: 5 },
  "2": { CX: 0, BI: 0, OE: 0 }, // Tie-break bonus, not in regular score
  "3": { CX: 5, BI: 5, OE: 5 },
  "4": { CX: 10, BI: 15, OE: 10 },
  "5": { CX: 30, BI: 20, OE: 15 },
  "6": { CX: 15, BI: 20, OE: 30 },
  "7": { CX: 20, BI: 20, OE: 20 },
  "8": { CX: 7.5, BI: 7.5, OE: 7.5 },
  "9": { CX: 7.5, BI: 7.5, OE: 7.5 },
}

export const TIEBREAK_BONUS_PCT = 5

export const SCORING_CRITERIA = [
  {
    number: 1,
    name: "Organisational Readiness (Leadership Support)",
    description: "Level of organisational sponsorship and readiness to proceed",
    isTiebreakerBonus: false,
    anchors: {
      0: "No owner or sponsor identified",
      1: "Informal interest only",
      2: "Owner identified but weak commitment",
      3: "Sponsor identified with partial commitment",
      4: "Strong sponsor and clear ownership",
      5: "Full sponsorship, resourcing, and readiness to proceed",
    },
  },
  {
    number: 2,
    name: "Impact on Business Model",
    description: "Degree of new business model impact (tie-break bonus criterion)",
    isTiebreakerBonus: true,
    anchors: {
      0: "No new business model impact identified",
      1: "Minor enhancement to existing model",
      2: "New revenue idea but highly dependent on core business",
      3: "Distinct model with new revenue streams, partially independent",
      4: "Strong new model with clear revenue potential and operational independence",
      5: "Transformational model creating significant new growth, largely independent from core",
    },
  },
  {
    number: 3,
    name: "Impact on ESG",
    description: "Environmental, Social & Governance impact",
    isTiebreakerBonus: false,
    anchors: {
      0: "No ESG impact identified",
      1: "ESG mentioned but weak or incidental",
      2: "Some positive ESG impact, limited in scope",
      3: "Clear and meaningful ESG impact in at least one dimension",
      4: "Strong ESG impact with measurable outcomes",
      5: "Significant, measurable, and scalable ESG impact embedded in the solution",
    },
  },
  {
    number: 4,
    name: "Creativity & Innovation (Originality)",
    description: "Level of originality and innovation",
    isTiebreakerBonus: false,
    anchors: {
      0: "No innovation element presented",
      1: "Purely incremental improvement",
      2: "Minor novelty; limited differentiation",
      3: "Some new elements or creative recombination",
      4: "Clearly innovative with distinct differentiation",
      5: "Highly original, disruptive, or reframes the problem in a novel way",
    },
  },
  {
    number: 5,
    name: "Desirability (User & Stakeholder Value)",
    description: "Evidence of customer/stakeholder need and demand",
    isTiebreakerBonus: false,
    anchors: {
      0: "No customer need identified; no evidence",
      1: "Assumed need, no direct input",
      2: "Limited evidence (informal/anecdotal)",
      3: "Clear need with some structured evidence (interviews, small survey)",
      4: "Strong validation using multiple evidence sources",
      5: "Compelling, well-documented validation with strong demand and clear value",
    },
  },
  {
    number: 6,
    name: "Viability (Profit, Cost Savings & Efficiency Gains)",
    description: "Financial value and economic sustainability",
    isTiebreakerBonus: false,
    anchors: {
      0: "No financial value identified",
      1: "Financial value claimed but unsupported",
      2: "Value estimated via assumptions/extrapolation only",
      3: "Early financial evidence from MVPs or pilots",
      4: "Actual, recurring profit/savings evidenced over several months",
      5: "Strong, sustained financial value with growth trajectory and scalability",
    },
  },
  {
    number: 7,
    name: "Feasibility (Execution & Delivery)",
    description: "Degree of implementation progress and delivery capability",
    isTiebreakerBonus: false,
    anchors: {
      0: "No execution activity; idea only",
      1: "Concept defined, no tangible execution started",
      2: "Initial execution started (planning, design, early pilot)",
      3: "Pilot or partial implementation completed",
      4: "Implemented and in use, not yet fully rolled out",
      5: "Fully implemented and operational across the intended scope",
    },
  },
  {
    number: 8,
    name: "Presentation — Slides Design & Content Quality",
    description: "Quality of presentation slides",
    isTiebreakerBonus: false,
    anchors: {
      0: "Slides missing or mandatory content not covered",
      1: "Poor formatting, cluttered, hard to read",
      2: "Acceptable design but inconsistent or overloaded",
      3: "Clean, readable slides with all mandatory content",
      4: "Visually strong, consistent design supporting key messages",
      5: "Highly professional, polished slides that reinforce the story",
    },
  },
  {
    number: 9,
    name: "Presentation — Storytelling & Team Delivery",
    description: "Quality of storytelling and team delivery",
    isTiebreakerBonus: false,
    anchors: {
      0: "No clear story, no effective team participation",
      1: "Disjointed narrative, minimal contribution from most members",
      2: "Basic structure but weak flow and uneven participation",
      3: "Clear and logical story with all members contributing meaningfully",
      4: "Engaging narrative with smooth transitions and well-balanced delivery",
      5: "Compelling story with strong hook, seamless transitions, confident handovers, and balanced contribution from all members",
    },
  },
]

export function calculateWeightedScore(
  scores: { criterionNumber: number; rawScore: number }[],
  category: IdeaCategory
): number {
  let total = 0
  for (const s of scores) {
    const weight = CRITERIA_WEIGHTS[String(s.criterionNumber)]?.[category] ?? 0
    total += (s.rawScore / 5) * weight
  }
  return Math.round(total * 100) / 100
}

export function calculateStandardDeviation(values: number[]): number {
  if (values.length < 2) return 0
  const mean = values.reduce((a, b) => a + b, 0) / values.length
  const variance = values.reduce((sum, v) => sum + Math.pow(v - mean, 2), 0) / values.length
  return Math.sqrt(variance)
}
