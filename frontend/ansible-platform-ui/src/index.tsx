import React from 'react';
import ReactDOM from 'react-dom/client';
import './index.css'; // You might want a global stylesheet
import App from './App';

const root = ReactDOM.createRoot(
  document.getElementById('root') as HTMLElement
);
root.render(
  // <React.StrictMode> // Temporarily commented out, can be re-enabled
    <App />
  // </React.StrictMode>
);
