/*
  data.js
  The main page's first requests, as named steps. "Loading your city" runs them
  in parallel and lights its windows as each one really finishes.
  Each load() returns the mock data for now: swap the body for the Supabase
  query when the backend is ready (same return shape). Throw to show the
  loader's "Couldn't load …" + Retry.

  A step marked optional can be skipped ("Continue without it") if it keeps
  failing; the main page then shows that section's empty / error state.
*/
import { mockGroups, mockItems, myInterests } from "./mockData"

// Items the student had already added (stand-in for plan_entries)
const START_ADDED = ["2", "6", "4"]

export const LOAD_STEPS = [
  {
    key: "groups",
    label: "Reading your buildings…",
    thing: "your groups",
    load: async () => mockGroups, // connected groups + unread counts
  },
  {
    key: "deadlines",
    label: "Finding signals…",
    thing: "your deadlines",
    load: async () => mockItems, // items, including open deadlines
  },
  {
    key: "week",
    label: "Laying out your week…",
    thing: "your week",
    load: async () => START_ADDED, // plan_entries for the visible week
  },
  {
    key: "network",
    label: "Mapping your network…",
    thing: "your network",
    optional: true,
    load: async () => myInterests, // the student's interests, for the network carousels
  },
]

// Turns the finished steps into the props App starts from (a skipped step falls back to empty)
export function toAppData(results) {
  return {
    groups: results.groups ?? [],
    items: results.deadlines ?? [],
    addedIds: results.week ?? [],
    interests: results.network ?? [],
  }
}
