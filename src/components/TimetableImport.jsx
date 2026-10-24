/*
  TimetableImport
  "Import class timetable" button for the header of Your week. Opens a file
  picker for a PDF; once one is chosen, shows its name with a ✕ to remove it.

  Props:
    file:     the imported File, or null
    onImport: function(file), called with the chosen PDF
    onRemove: function(), called when ✕ is clicked

  Reading the classes out of the PDF is the backend's job. Pass its upload call
  in onImport when it's ready.

  Needs: shadcn button
*/
import { useRef } from "react"
import { FileText, Upload, X } from "lucide-react"
import { Button } from "@/components/ui/button"

export function TimetableImport({ file, onImport, onRemove }) {
  const inputRef = useRef(null)

  function handleChange(e) {
    const chosen = e.target.files?.[0]
    e.target.value = "" // so picking the same file again still fires onChange
    if (!chosen) return
    if (chosen.type !== "application/pdf") return
    onImport(chosen)
  }

  if (file) {
    return (
      <div className="flex h-[34px] max-w-[240px] items-center gap-2 rounded-lg border border-line-2 pr-1 pl-3 text-[13px]">
        <FileText className="size-4 shrink-0 text-muted-foreground" />
        <span className="truncate" title={file.name}>{file.name}</span>
        <Button variant="ghost" size="icon-xs" aria-label="Remove timetable" onClick={onRemove}>
          <X />
        </Button>
      </div>
    )
  }

  return (
    <>
      <input ref={inputRef} type="file" accept="application/pdf" className="hidden" onChange={handleChange} />
      <Button variant="outline" size="sm" onClick={() => inputRef.current?.click()}>
        <Upload className="size-4" /> Import class timetable
      </Button>
    </>
  )
}
