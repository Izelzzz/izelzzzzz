import { useEffect, useState } from 'react'

function currentTheme() {
  const stored = document.documentElement.getAttribute('data-theme')
  if (stored === 'light' || stored === 'dark') return stored
  return window.matchMedia('(prefers-color-scheme: dark)').matches ? 'dark' : 'light'
}

/**
 * 日出 = light, 日落 = dark. Returns the active theme (null until mounted) and a
 * function that flips it, stores the choice and lets the page ease across.
 */
export function useThemeSwitch() {
  const [theme, setTheme] = useState(null)

  useEffect(() => {
    const sync = () => setTheme(currentTheme())
    sync()
    const media = window.matchMedia('(prefers-color-scheme: dark)')
    media.addEventListener('change', sync)
    // Several switches can be on one page; keep them in step.
    const observer = new MutationObserver(sync)
    observer.observe(document.documentElement, { attributes: true, attributeFilter: ['data-theme'] })
    return () => {
      media.removeEventListener('change', sync)
      observer.disconnect()
    }
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

  return { theme, toggle }
}

/** A sun over a horizon line. CSS places the sun from the active theme. */
export function SunIcon() {
  return (
    <span className="sun-icon" aria-hidden="true">
      <span className="sun-icon-disc" />
    </span>
  )
}

/** Icon-only switch for the header. */
export default function ThemeToggle() {
  const { theme, toggle } = useThemeSwitch()
  return (
    <button
      type="button"
      className="theme-toggle"
      role="switch"
      aria-checked={theme === 'dark'}
      aria-label="日落模式（暗色）"
      title={theme === 'dark' ? '看一场日出' : '看一场日落'}
      onClick={toggle}
    >
      <SunIcon />
    </button>
  )
}

/** The same switch as an invitation, for the hero. */
export function SkyButton() {
  const { toggle } = useThemeSwitch()
  return (
    <button type="button" className="button button-sky" onClick={toggle}>
      <SunIcon />
      <span className="button-sky-label">
        <span className="only-day">看一场日落</span>
        <span className="only-night">看一场日出</span>
      </span>
    </button>
  )
}
