import { StrictMode } from 'react';
import { createRoot } from 'react-dom/client';
import { RouterProvider } from '@tanstack/react-router';
import { getRouter } from './router';
import './styles.css';

const restored = sessionStorage.getItem('4545-pages-route');
if (restored) {
  sessionStorage.removeItem('4545-pages-route');
  const url = new URL(restored, location.origin);
  if (url.origin === location.origin && url.pathname.startsWith(import.meta.env.BASE_URL)) history.replaceState(null, '', url.href);
}
createRoot(document.getElementById('root')!).render(<StrictMode><RouterProvider router={getRouter()} /></StrictMode>);
