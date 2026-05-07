import ReactDOM from 'react-dom/client'
import { App } from './App'
import './styles/global.css'

// StrictMode removed — it double-invokes effects which breaks our
// imperative simulation loops (intervals, rAF, audio contexts).
// The simulation engine manages its own lifecycle via useEffect cleanup.
ReactDOM.createRoot(document.getElementById('root')!).render(<App />)
