import { BrowserRouter, Routes, Route } from 'react-router-dom'

import WellMap from './components/WellMap'
import Explore from './pages/Explore/Explore'
import MonitorAlerts from './pages/MonitorAlerts/MonitorAlerts'
import GetStarted from './pages/GetStarted/GetStarted'
import Auth from './pages/Auth/Auth'
import MainWorkspace from './pages/MainWorkspace/MainWorkspace'
import Investigate from './pages/Investigate/Investigate'
import WellDetails from './pages/WellDetails/WellDetails'

function App() {
  return (
    
    <BrowserRouter>
      <Routes>
  <Route path="/" element={<GetStarted />} />
  <Route path="/auth" element={<Auth />} />
  <Route path="/workspace" element={<MainWorkspace />} />
  <Route path="/explore" element={<MainWorkspace />} />
  <Route path="/monitor" element={<MonitorAlerts />} />
  <Route path="/investigate" element={<Investigate />} />
  <Route path="/wells/:wellId" element={<WellDetails />} />
 
  </Routes>
    </BrowserRouter>
  )
}

export default App