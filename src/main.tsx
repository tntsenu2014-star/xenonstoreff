import {StrictMode} from 'react';
import {createRoot} from 'react-dom/client';
import App from './App.tsx';
import './index.css';
import { ThemeProvider } from './lib/ThemeContext';
import { UserProvider } from './lib/UserContext';
import { SettingsProvider } from './lib/SettingsContext';
import { prewarmCache } from './services/db';

// Pre-fetch critical data as soon as script runs
prewarmCache();

// Disable right-click context menu
document.addEventListener('contextmenu', (e) => {
  e.preventDefault();
});

// Disable shortcut keys associated with viewing page source / inspecting
document.addEventListener('keydown', (e) => {
  // Disable F12 Key
  if (e.key === 'F12') {
    e.preventDefault();
    return;
  }

  const isCmdOrCtrl = e.ctrlKey || e.metaKey;
  const isShift = e.shiftKey;

  if (isCmdOrCtrl) {
    // Ctrl+U or Cmd+U (View Page Source)
    if (e.key?.toLowerCase() === 'u') {
      e.preventDefault();
      return;
    }

    // Ctrl+Shift+I, J, C or Cmd+Shift+I, J, C (Inspect Element, Console, etc.)
    if (isShift && (e.key?.toLowerCase() === 'i' || e.key?.toLowerCase() === 'j' || e.key?.toLowerCase() === 'c')) {
      e.preventDefault();
      return;
    }

    // Cmd+Alt+I, J, C (macOS dev shortcuts)
    if (e.altKey && (e.key?.toLowerCase() === 'i' || e.key?.toLowerCase() === 'j' || e.key?.toLowerCase() === 'c')) {
      e.preventDefault();
      return;
    }
  }
});

createRoot(document.getElementById('root')!).render(
  <StrictMode>
    <ThemeProvider>
      <SettingsProvider>
        <UserProvider>
          <App />
        </UserProvider>
      </SettingsProvider>
    </ThemeProvider>
  </StrictMode>,
);

// Unregister service workers to avoid route interception cache issues in dev/preview
if ('serviceWorker' in navigator) {
  navigator.serviceWorker.getRegistrations().then((registrations) => {
    for (const registration of registrations) {
      registration.unregister();
    }
  });
}
