import { Component, StrictMode, type ErrorInfo, type ReactNode } from 'react';
import { createRoot } from 'react-dom/client';
import { BrowserRouter } from 'react-router-dom';
import App from './app/App';
import './styles.css';

class AppErrorBoundary extends Component<{ children: ReactNode }, { error: Error | null }> {
  state: { error: Error | null } = { error: null };

  static getDerivedStateFromError(error: Error) {
    return { error };
  }

  componentDidCatch(error: Error, info: ErrorInfo) {
    console.error('SmartSchedule application error', error, info);
  }

  render() {
    if (this.state.error) {
      return <main className="fatal-error"><div className="fatal-error-card"><span className="brand-mark">S</span><p className="eyebrow">Application error</p><h1>SmartSchedule could not load</h1><p>The app hit a browser runtime error instead of showing a blank screen. Reload the workspace or reset local demo data if the problem continues.</p><pre>{this.state.error.message}</pre><div className="drawer-actions"><button className="primary-button" onClick={() => window.location.reload()}>Reload workspace</button><button className="secondary-button" onClick={() => { localStorage.removeItem('smartschedule-demo-state'); window.location.reload(); }}>Reset local demo data</button></div></div></main>;
    }
    return this.props.children;
  }
}

window.addEventListener('error', (event) => {
  console.error('SmartSchedule window error', event.error ?? event.message);
});
window.addEventListener('unhandledrejection', (event) => {
  console.error('SmartSchedule unhandled rejection', event.reason);
});

const root = document.getElementById('root');
if (!root) throw new Error('SmartSchedule root element is missing.');

createRoot(root).render(
  <StrictMode>
    <BrowserRouter>
      <AppErrorBoundary>
        <App />
      </AppErrorBoundary>
    </BrowserRouter>
  </StrictMode>,
);
