import { HashRouter, Routes, Route } from 'react-router-dom'
import SettingsPage from './pages/SettingsPage'
import TimerPage from './pages/TimerPage'
import VideoPage from './pages/VideoPage'

export default function App(): React.ReactElement {
  return (
    <HashRouter>
      <Routes>
        <Route path="/settings" element={<SettingsPage />} />
        <Route path="/timer" element={<TimerPage />} />
        <Route path="/video" element={<VideoPage />} />
      </Routes>
    </HashRouter>
  )
}
