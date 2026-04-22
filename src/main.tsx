import React from 'react';
import ReactDOM from 'react-dom/client';
import App from './App.tsx';
import './index.css';
import { AuthProvider } from './store/AuthContext.tsx';
import { ColorModeProvider } from './store/ThemeContext.tsx';
import 'react-big-calendar/lib/css/react-big-calendar.css';
import './styles/animations.css';
import './styles/AuthPages.css';
import './styles/AuthTypography.css'

if ('serviceWorker' in navigator) {
  window.addEventListener('load', () => {
    void navigator.serviceWorker
      .getRegistrations()
      .then((registrations) => Promise.all(registrations.map((registration) => registration.unregister())))
      .catch(() => undefined);
  });
}


ReactDOM.createRoot(document.getElementById('root')!).render(
  <React.StrictMode>
    <AuthProvider>
      <ColorModeProvider>
        <App />
      </ColorModeProvider>
    </AuthProvider>
  </React.StrictMode>,
);
