/*
  Root
  The app flow (motion spec §1):
    landing / sign-in  →  sign-in succeeds  →  "Loading your city"  →  main page (App)

  "Loading your city" runs the main page's first requests (lib/data.js) and
  hands the results to App ~200 ms into its exit, so the main page settles in
  underneath while the skyline sinks away.

  When real sessions exist: start a signed-in visitor at "loading", and render
  App directly (no loader) if their data is cached and ready within 300 ms.
*/
import { useCallback, useState } from "react"
import App from "./App.jsx"
import { LandingPage } from "@/components/LandingPage"
import { LoadingCity } from "@/components/LoadingCity"
import { signIn } from "@/lib/auth"
import { LOAD_STEPS, toAppData } from "@/lib/data"

export default function Root() {
  const [stage, setStage] = useState("landing") // "landing" | "loading" | "main"
  const [data, setData] = useState(null)
  const [loaderShown, setLoaderShown] = useState(false)

  const handleReady = useCallback((results) => {
    setData(toAppData(results))
    setStage("main")
  }, [])
  const handleExited = useCallback(() => setLoaderShown(false), [])

  if (stage === "landing") {
    return (
      <LandingPage
        onSignIn={signIn}
        onSignedIn={() => {
          setStage("loading")
          setLoaderShown(true)
        }}
      />
    )
  }

  return (
    <>
      {data && <App data={data} arriving />}
      {loaderShown && <LoadingCity steps={LOAD_STEPS} onReady={handleReady} onExited={handleExited} />}
    </>
  )
}
