/*
  App
  The whole unmute main page ("Your block"), assembled. Holds the shared state and passes it down:
    items     – everything extracted from the groups
    groups    – connected WhatsApp groups
    addedIds  – what the student added to their week
    interests – the student's interests (for the network carousels)
    selected  – the item whose item card is open (or null)
    plans / activePlanId – saved AI plans and which tab is showing
    timetable – the class timetable PDF the student imported (or null)

  Props:
    data:     { groups, items, addedIds, interests } from "Loading your city" (lib/data.js).
              Falls back to the mock data so App still works on its own.
    arriving: true when the page mounts under the loader's exit: the panels
              settle in (week first) and focus moves to the hero title.

  Motion follows the motion spec §4: calm by default, and only reacting to
  things that really happened.
*/
import { useEffect, useRef, useState } from "react"
import { format } from "date-fns"
import { toast } from "sonner"
import { Toaster } from "@/components/ui/sonner"
import { AroundCampus } from "@/components/AroundCampus"
import { ClosingSoonStrip } from "@/components/ClosingSoonStrip"
import { DeadlinesPanel } from "@/components/DeadlinesPanel"
import { Footer } from "@/components/Footer"
import { Greeting } from "@/components/Greeting"
import { GroupsPanel } from "@/components/GroupsPanel"
import { InterestCarousels } from "@/components/InterestCarousels"
import { ItemDetail } from "@/components/ItemDetail"
import { Navbar } from "@/components/Navbar"
import { UrgentBanner } from "@/components/UrgentBanner"
import { YourWeek } from "@/components/YourWeek"
import { mockGroups, mockItems, myInterests } from "@/lib/mockData"
import { flyChip, prefersReducedMotion } from "@/lib/motion"
import { pillarStyle } from "@/lib/pillars"
import { PLAN_KINDS, generatePlan } from "@/lib/plans"
import { itemDate } from "@/lib/time"

const MOCK_DATA = { groups: mockGroups, items: mockItems, addedIds: ["2", "6", "4"], interests: myInterests }
const letterFor = (kind) => String.fromCharCode(65 + Object.keys(PLAN_KINDS).indexOf(kind)) // balanced=A, career=B

// Ids in one list but not the other: what a new plan changed
const changedIds = (before, after) => [
  ...after.filter((id) => !before.includes(id)),
  ...before.filter((id) => !after.includes(id)),
]

// Arrival stagger: class + start time (ms after this page mounts, ~200 ms into the loader's exit)
const arrive = (on, kind, ms) => (on ? { className: kind === "up" ? "arrive-up" : "arrive-fade", style: { "--arrive": `${ms}ms` } } : {})

export default function App({ data = MOCK_DATA, arriving = false }) {
  const [items] = useState(data.items)
  const [interests] = useState(data.interests)
  const [groups, setGroups] = useState(data.groups)
  const [addedIds, setAddedIds] = useState(data.addedIds)
  const [selected, setSelected] = useState(null)
  const [plans, setPlans] = useState(() =>
    Object.keys(PLAN_KINDS).map((kind) => generatePlan(kind, data.items, data.addedIds, data.interests, letterFor(kind))),
  )
  const [activePlanId, setActivePlanId] = useState("plan-balanced")
  const [generating, setGenerating] = useState(false)
  const [planStatus, setPlanStatus] = useState(null) // the status line under the week header
  const [agentProgress, setAgentProgress] = useState(null) // 0–1 along the transit line, or null
  const [ringIds, setRingIds] = useState([]) // calendar items getting a one-time sage ring
  const [timetable, setTimetable] = useState(null)
  const [deadlinesOpen, setDeadlinesOpen] = useState(false) // the nav's deadlines dropdown
  const ringTimer = useRef(null)

  // After the loader: focus the hero title once everything has settled (≤ 700 ms)
  useEffect(() => {
    if (!arriving) return
    const timer = setTimeout(() => document.getElementById("hero-title")?.focus({ preventScroll: true }), 500)
    return () => clearTimeout(timer)
  }, [arriving])

  // A sage ring fades over 900 ms (a static outline for 2 s under reduced motion)
  function ring(ids) {
    clearTimeout(ringTimer.current)
    setRingIds(ids)
    ringTimer.current = setTimeout(() => setRingIds([]), prefersReducedMotion() ? 2000 : 900)
  }

  function toggleWeek(id, buttonEl) {
    if (addedIds.includes(id)) {
      // Already added: take it back out of the week and every saved plan
      setAddedIds((prev) => prev.filter((x) => x !== id))
      setPlans((prev) => prev.map((p) => ({ ...p, itemIds: p.itemIds.filter((x) => x !== id) })))
      toast("Removed from your week")
      return
    }
    setAddedIds((prev) => [...prev, id])
    // Add it to every saved plan too, so plans never lose what the student chose
    setPlans((prev) =>
      prev.map((p) => ({
        ...p,
        itemIds: p.itemIds.includes(id) ? p.itemIds : [...p.itemIds, id],
        suggestedIds: p.suggestedIds.filter((x) => x !== id),
      })),
    )
    toast("Added to your week")

    // Confirmed: fly a chip to its day column (if that day is on screen) and ring the new calendar item
    const item = items.find((i) => i.id === id)
    const day = item && itemDate(item)
    const column = day && document.querySelector(`[data-day="${format(new Date(day), "yyyy-MM-dd")}"]`)
    if (item && column) {
      const style = pillarStyle[item.pillar] ?? pillarStyle.announcement
      flyChip(buttonEl, column, { title: item.title, letter: style.letter, roundelClass: style.dot })
      ring([id])
    }
  }

  function addGroup(link) {
    const id = `g${Date.now()}`
    setGroups((prev) => [...prev, { id, name: "New group", status: "joining", newCount: 0, link }])
    toast("Bot is joining the group…")
    // Demo only: pretend the bot joined after 3 seconds. The backend will do this for real.
    setTimeout(() => {
      setGroups((prev) => prev.map((g) => (g.id === id ? { ...g, status: "listening" } : g)))
    }, 3000)
  }

  function handleGenerate(kind) {
    const before = { plans, activePlanId }
    setGenerating(true)
    setPlanStatus({ state: "working", text: "Building your plan…" })
    setAgentProgress(0)
    // Demo only: a short delay so it feels like the AI is thinking. The real agent
    // will report steps here; set agentProgress to (finished steps ÷ total) as each arrives.
    setTimeout(() => {
      const plan = generatePlan(kind, items, addedIds, interests, letterFor(kind))
      const old = plans.find((p) => p.id === plan.id)
      const changed = old ? changedIds(old.itemIds, plan.itemIds) : plan.itemIds
      setPlans((prev) => (prev.some((p) => p.id === plan.id) ? prev.map((p) => (p.id === plan.id ? plan : p)) : [...prev, plan]))
      setActivePlanId(plan.id)
      setGenerating(false)
      setAgentProgress(1)
      setTimeout(() => setAgentProgress(null), 500) // the overlay settles
      ring(changed)
      setPlanStatus({
        state: "ready",
        text: `Plan ready: ${changed.length} ${changed.length === 1 ? "change" : "changes"}`,
        onReview: () => {
          document.getElementById("week")?.scrollIntoView({ behavior: prefersReducedMotion() ? "auto" : "smooth", block: "start" })
          ring(changed)
        },
        onUndo: () => {
          setPlans(before.plans)
          setActivePlanId(before.activePlanId)
          setPlanStatus({ state: "info", text: "Plan undone." })
        },
      })
    }, 900)
  }

  function importTimetable(file) {
    // Demo only: keeps the file here. The backend will read the classes out of it.
    setTimetable(file)
    toast("Class timetable imported")
  }

  // The calendar shows the active plan (or just the added items if there are no plans)
  const activePlan = plans.find((p) => p.id === activePlanId)
  const calendarIds = activePlan ? activePlan.itemIds : addedIds
  const calendarItems = items.filter((i) => calendarIds.includes(i.id))
  const listening = groups.filter((g) => g.status === "listening").length

  return (
    <div className="min-h-svh text-foreground">
      <Toaster theme="dark" position="bottom-right" />
      <Navbar
        items={items}
        onOpen={setSelected}
        deadlinesOpen={deadlinesOpen}
        onDeadlinesOpenChange={setDeadlinesOpen}
      />
      <div {...arrive(arriving, "fade", 180)}>
        <UrgentBanner items={items} onOpen={setSelected} maxHours={24} />
      </div>

      <main id="block" className="mx-auto max-w-[1440px] px-5 sm:px-10">
        <div {...arrive(arriving, "fade", 180)}>
          <Greeting weekCount={calendarItems.length} items={items} listeningCount={listening} />
        </div>

        <div {...arrive(arriving, "fade", 180)}>
          <ClosingSoonStrip items={items} onOpen={setSelected} onSeeAll={() => setDeadlinesOpen(true)} />
        </div>

        {/* Main row, as in the mockup: buildings | week | signals (from 1024px).
            Tablet: week on top, buildings and signals side by side under it.
            Phone: signals, week, buildings. */}
        <div className="mt-5 grid grid-cols-1 items-stretch gap-4 md:grid-cols-2 lg:grid-cols-[240px_minmax(0,1fr)_280px] min-[1440px]:grid-cols-[264px_minmax(0,1fr)_304px]">
          <div className="order-3 md:order-2 lg:order-1">
            <div className={`h-full ${arriving ? "arrive-up" : ""}`} style={arriving ? { "--arrive": "100ms" } : undefined}>
              <GroupsPanel groups={groups} onAddGroup={addGroup} />
            </div>
          </div>
          <div className="order-2 min-w-0 md:order-1 md:col-span-2 lg:order-2 lg:col-span-1">
            <div className={`h-full ${arriving ? "arrive-up" : ""}`} style={arriving ? { "--arrive": "20ms" } : undefined}>
              <YourWeek
                items={items}
                calendarItems={calendarItems}
                suggestedIds={activePlan?.suggestedIds ?? []}
                plans={plans}
                activePlanId={activePlanId}
                onSelectPlan={setActivePlanId}
                onGenerate={handleGenerate}
                generating={generating}
                onOpen={setSelected}
                timetable={timetable}
                onImportTimetable={importTimetable}
                onRemoveTimetable={() => setTimetable(null)}
                ringIds={ringIds}
                agentProgress={agentProgress}
                planStatus={planStatus}
              />
            </div>
          </div>
          <div className="order-1 md:order-3">
            <div className={`h-full ${arriving ? "arrive-up" : ""}`} style={arriving ? { "--arrive": "160ms" } : undefined}>
              <DeadlinesPanel items={items} onOpen={setSelected} onViewAll={() => setDeadlinesOpen(true)} />
            </div>
          </div>
        </div>

        {/* Your network */}
        <div {...arrive(arriving, "fade", 260)}>
          <InterestCarousels
            items={items}
            interests={interests}
            addedIds={addedIds}
            onToggle={toggleWeek}
            onOpen={setSelected}
          />
        </div>

        {/* New on the block */}
        <div {...arrive(arriving, "fade", 260)}>
          <AroundCampus
            items={items}
            interests={interests}
            addedIds={addedIds}
            onToggle={toggleWeek}
            onOpen={setSelected}
          />
        </div>
      </main>

      <Footer />

      {/* Item card, opens from anywhere */}
      <ItemDetail
        item={selected}
        isAdded={selected ? addedIds.includes(selected.id) : false}
        onToggle={toggleWeek}
        onClose={() => setSelected(null)}
        interests={interests}
      />
    </div>
  )
}
