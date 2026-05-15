import CanvasScene from './components/CanvasScene'
import './App.css'

function App() {
  return (
    <main className="app-shell">
      <a className="home-link" href="/" aria-label="Return to homepage">
        <svg
          viewBox="0 0 24 24"
          aria-hidden="true"
          focusable="false"
          className="home-link-icon"
        >
          <path d="M10 19l-7-7 7-7" />
          <path d="M4 12h16" />
        </svg>
        <span>Home</span>
      </a>
      <CanvasScene />
    </main>
  )
}

export default App
