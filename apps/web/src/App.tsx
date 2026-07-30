import { lazy, Suspense } from 'react'
import { Link, Route, Routes } from 'react-router'
import { CommandPalette } from './components/CommandPalette.js'
import { EmptyState, Shell } from './components/Shell.js'

// Every view splits into its own chunk: the Atlas paints without dragging in
// d3 (Delta), the artifact templates, or the compare machinery.
const Atlas = lazy(() => import('./views/Atlas.js').then((m) => ({ default: m.Atlas })))
const SettingsView = lazy(() =>
  import('./views/SettingsView.js').then((m) => ({ default: m.SettingsView })),
)
const CompareView = lazy(() =>
  import('./views/CompareView.js').then((m) => ({ default: m.CompareView })),
)
const TimelineView = lazy(() =>
  import('./views/TimelineView.js').then((m) => ({ default: m.TimelineView })),
)
const DeltaView = lazy(() => import('./views/DeltaView.js').then((m) => ({ default: m.DeltaView })))
const EventDetail = lazy(() =>
  import('./views/EventDetail.js').then((m) => ({ default: m.EventDetail })),
)
const Dossier = lazy(() => import('./views/Dossier.js').then((m) => ({ default: m.Dossier })))
const ArtifactReader = lazy(() =>
  import('./views/ArtifactReader.js').then((m) => ({ default: m.ArtifactReader })),
)
const EngineRoomView = lazy(() =>
  import('./views/EngineRoomView.js').then((m) => ({ default: m.EngineRoomView })),
)
const MapView = lazy(() => import('./views/MapView.js').then((m) => ({ default: m.MapView })))
const RecordView = lazy(() =>
  import('./views/RecordView.js').then((m) => ({ default: m.RecordView })),
)

function NotFound() {
  return (
    <Shell>
      <EmptyState title="No such page in this chronicle.">
        <Link to="/" className="underline underline-offset-4">
          Back to the atlas
        </Link>
      </EmptyState>
    </Shell>
  )
}

export function App() {
  return (
    <Suspense fallback={<div className="min-h-screen bg-paper" aria-busy="true" />}>
      {/* Mounted once, above the routes: the palette reads the branch out of
          the URL, so Ctrl+K works on an event or a dossier, not just a
          ledger (v2/M22). */}
      <CommandPalette />
      <Routes>
        <Route path="/" element={<Atlas />} />
        <Route path="/settings" element={<SettingsView />} />
        <Route path="/record" element={<RecordView />} />
        <Route path="/t/:timelineId/compare" element={<CompareView />} />
        <Route path="/t/:timelineId/b/:branchId" element={<TimelineView />} />
        <Route path="/t/:timelineId/b/:branchId/delta" element={<DeltaView />} />
        <Route path="/t/:timelineId/b/:branchId/engine" element={<EngineRoomView />} />
        <Route path="/t/:timelineId/b/:branchId/map" element={<MapView />} />
        <Route path="/t/:timelineId/b/:branchId/e/:eventId" element={<EventDetail />} />
        <Route path="/t/:timelineId/b/:branchId/entity/:entityId" element={<Dossier />} />
        <Route
          path="/t/:timelineId/b/:branchId/artifact/:artifactId"
          element={<ArtifactReader />}
        />
        <Route path="*" element={<NotFound />} />
      </Routes>
    </Suspense>
  )
}
