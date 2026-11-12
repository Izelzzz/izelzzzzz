import { useEffect, useState } from 'react'

function currentTheme() {
  const stored = document.documentElement.getAttribute('data-theme')
  if (stored === 'light' || stored === 'dark') return stored
  return window.matchMedia('(prefers-color-scheme: dark)').matches ? 'dark' : 'light'
}

/**
 * 日出 = light, 日落 = dark. The knob position is drawn by CSS from the active
 * theme, so server and client markup match; React only tracks aria state.
 */
export default function ThemeToggle() {
  const [theme, setTheme] = useState(null)

  useEffect(() => {
    const sync = () => setTheme(currentTheme())
    sync()
    const media = window.matchMedia('(prefers-color-scheme: dark)')
    media.addEventListener('change', sync)
    return () => media.removeEventListener('change', sync)
  }, [])

  const toggle = () => {
    const root = document.documentElement
    const next = currentTheme() === 'dark' ? 'light' : 'dark'
    root.classList.add('theme-switching')
    root.setAttribute('data-theme', next)
    try {
      localStorage.setItem('theme', next)
    } catch {
      // Private mode: the choice simply lasts for this page view.
    }
    setTheme(next)
    window.setTimeout(() => root.classList.remove('theme-switching'), 1700)
  }

  return (
    <button
      type="button"
      className="theme-toggle"
      role="switch"
      aria-checked={theme === 'dark'}
      aria-label="日落模式（暗色）"
      title={theme === 'dark' ? '等一次日出' : '看一场日落'}
      onClick={toggle}
    >
      <span className="theme-toggle-word theme-toggle-day">日出</span>
      <span className="theme-toggle-track" aria-hidden="true">
        <span className="theme-toggle-sun" />
        <span className="theme-toggle-sea" />
      </span>
      <span className="theme-toggle-word theme-toggle-night">日落</span>
    </button>
  )
}
