import * as Tooltip from '@radix-ui/react-tooltip';
import { StrictMode } from 'react';
import { createRoot } from 'react-dom/client';
import { BrowserRouter, Navigate, Route, Routes } from 'react-router-dom';
import { EMAIL_CSS } from '@/email/emailCss';
import { EditorPage } from '@/editor/EditorPage';
import { HomePage } from '@/home/HomePage';
import { Toast } from '@/ui/Toast';
import '@/styles/app.css';

// CSS письма нужен и в интерфейсе — для миниатюр в библиотеке и инспекторе
const style = document.createElement('style');
style.textContent = EMAIL_CSS;
document.head.appendChild(style);

createRoot(document.getElementById('root')!).render(
  <StrictMode>
    <Tooltip.Provider delayDuration={350}>
      <BrowserRouter>
        <Routes>
          <Route path="/" element={<HomePage />} />
          <Route path="/email/:id" element={<EditorPage />} />
          <Route path="*" element={<Navigate to="/" replace />} />
        </Routes>
      </BrowserRouter>
      <Toast />
    </Tooltip.Provider>
  </StrictMode>,
);
