import { BrowserRouter, Route, Routes } from 'react-router'
import { WelcomePage } from './pages/WelcomePage'

export default function App() {
  return (
    <BrowserRouter>
      <Routes>
        <Route path="/" element={<WelcomePage />} />
        <Route path="*" element={<WelcomePage />} />
      </Routes>
    </BrowserRouter>
  )
}
