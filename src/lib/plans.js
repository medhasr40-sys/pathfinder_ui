/*
  plans.js
  Demo plan generator, so "Generate plan" works before the backend AI exists.
  Every plan always KEEPS what the student added themselves, then suggests more.
  Swap generatePlan for the backend's AI call when it's ready (same return shape).

  A plan looks like: { id, name, kind, itemIds: [...], suggestedIds: [...] }
*/
import { addDays, startOfDay } from "date-fns"
import { itemDate } from "./time"

export const PLAN_KINDS = {
  balanced: "Balanced",
  career: "Career focus",
}

// letter: "A", "B"… used in the tab name ("Plan A · Balanced")
export function generatePlan(kind, items, addedIds, interests, letter) {
  const end = addDays(startOfDay(new Date()), 7)
  const inWeek = (i) => {
    const d = itemDate(i) && new Date(itemDate(i))
    return d && d >= new Date() && d < end
  }

  const candidates = items.filter((i) => inWeek(i) && !addedIds.includes(i.id))

  let picks
  if (kind === "career") {
    picks = candidates.filter(
      (i) => i.interests.includes("Placements") || i.pillar === "opportunity" || i.pillar === "deadline",
    )
  } else {
    // Balanced: things matching any interest, at most 2 per day so the week isn't packed
    const perDay = {}
    picks = candidates.filter((i) => {
      if (!i.interests.some((x) => interests.includes(x))) return false
      const key = startOfDay(new Date(itemDate(i))).toISOString()
      perDay[key] = (perDay[key] ?? 0) + 1
      return perDay[key] <= 2
    })
  }

  const suggestedIds = picks.slice(0, 6).map((i) => i.id)

  return {
    id: `plan-${kind}`,
    name: `Plan ${letter} · ${PLAN_KINDS[kind]}`,
    kind,
    itemIds: [...addedIds, ...suggestedIds],
    suggestedIds,
  }
}
