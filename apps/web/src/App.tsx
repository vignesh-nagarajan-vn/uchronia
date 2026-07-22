import { Route, Routes } from 'react-router'
import { ArtifactReader } from './views/ArtifactReader.js'
import { Atlas } from './views/Atlas.js'
import { CompareView } from './views/CompareView.js'
import { DeltaView } from './views/DeltaView.js'
import { Dossier } from './views/Dossier.js'
import { EventDetail } from './views/EventDetail.js'
import { SettingsView } from './views/SettingsView.js'
import { TimelineView } from './views/TimelineView.js'

export function App() {
  return (
    <Routes>
      <Route path="/" element={<Atlas />} />
      <Route path="/settings" element={<SettingsView />} />
      <Route path="/t/:timelineId/compare" element={<CompareView />} />
      <Route path="/t/:timelineId/b/:branchId" element={<TimelineView />} />
      <Route path="/t/:timelineId/b/:branchId/delta" element={<DeltaView />} />
      <Route path="/t/:timelineId/b/:branchId/e/:eventId" element={<EventDetail />} />
      <Route path="/t/:timelineId/b/:branchId/entity/:entityId" element={<Dossier />} />
      <Route path="/t/:timelineId/b/:branchId/artifact/:artifactId" element={<ArtifactReader />} />
    </Routes>
  )
}
