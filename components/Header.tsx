"use client"

import { useEffect, useState } from 'react'

export default function Header() {
  const [isLight, setIsLight] = useState(false)

  useEffect(() => {
    const isLightStored = localStorage.getItem('theme') === 'light'
    setIsLight(isLightStored)
    if (isLightStored) document.documentElement.classList.add('light-theme')
  }, [])

  const toggleTheme = () => {
    const nextLight = !isLight
    setIsLight(nextLight)
    if (nextLight) {
      document.documentElement.classList.add('light-theme')
      localStorage.setItem('theme', 'light')
    } else {
      document.documentElement.classList.remove('light-theme')
      localStorage.setItem('theme', 'dark')
    }
  }

  return (
    <div style={{
      height: '56px',
      background: 'transparent',
      borderBottom: '1px solid var(--border)',
      display: 'flex',
      alignItems: 'center',
      justifyContent: 'space-between',
      padding: '0 32px',
      flexShrink: 0,
      backdropFilter: 'blur(12px)',
      WebkitBackdropFilter: 'blur(12px)',
      position: 'relative',
      zIndex: 10
    }}>
      {/* Logo Area */}
      <div style={{ display: 'flex', alignItems: 'center', gap: '16px' }}>
        <div style={{
          width: '24px',
          height: '24px',
          background: 'var(--text-1)',
          display: 'flex',
          alignItems: 'center',
          justifyContent: 'center',
          flexShrink: 0,
          borderRadius: '2px' // Sharper, brutalist aesthetic
        }}>
          <svg width="12" height="12" viewBox="0 0 16 16" fill="none">
            <path d="M2 4h12M2 8h8M2 12h12" stroke="var(--bg)" strokeWidth="2" strokeLinecap="square"/>
          </svg>
        </div>
        <div style={{ display: 'flex', alignItems: 'baseline', gap: '8px' }}>
          <span style={{
            fontFamily: 'var(--font-sans)',
            fontWeight: 600,
            fontSize: '15px',
            color: 'var(--text-1)',
            letterSpacing: '-0.02em'
          }}>D-PE.ai</span>
          <span className="label-mono" style={{ color: 'var(--accent)' }}>
            [BETA]
          </span>
        </div>
      </div>

      {/* Right side */}
      <div style={{ display: 'flex', alignItems: 'center', gap: '24px' }}>
        {/* Theme Toggle */}
        <button 
          onClick={toggleTheme}
          style={{
            background: 'none',
            border: 'none',
            color: 'var(--text-2)',
            cursor: 'pointer',
            display: 'flex',
            alignItems: 'center',
            justifyContent: 'center',
            width: '24px',
            height: '24px',
            transition: 'color 0.2s'
          }}
          title={`Switch to ${isLight ? 'Dark' : 'Light'} Mode`}
        >
          {isLight ? (
             <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
               <path d="M21 12.79A9 9 0 1 1 11.21 3 7 7 0 0 0 21 12.79z"></path>
             </svg>
          ) : (
            <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
              <circle cx="12" cy="12" r="5"></circle>
              <line x1="12" y1="1" x2="12" y2="3"></line>
              <line x1="12" y1="21" x2="12" y2="23"></line>
              <line x1="4.22" y1="4.22" x2="5.64" y2="5.64"></line>
              <line x1="18.36" y1="18.36" x2="19.78" y2="19.78"></line>
              <line x1="1" y1="12" x2="3" y2="12"></line>
              <line x1="21" y1="12" x2="23" y2="12"></line>
              <line x1="4.22" y1="19.78" x2="5.64" y2="18.36"></line>
              <line x1="18.36" y1="5.64" x2="19.78" y2="4.22"></line>
            </svg>
          )}
        </button>

        <div style={{ display: 'flex', alignItems: 'center', gap: '8px' }}>
          <div style={{
            width: '6px', height: '6px',
            background: 'var(--green)',
            boxShadow: '0 0 8px var(--green)'
          }} />
          <span className="label-mono" style={{ color: 'var(--text-3)' }}>
            LLAMA-3.3-70B
          </span>
        </div>
      </div>
    </div>
  )
}
