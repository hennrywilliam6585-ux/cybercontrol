
import React from 'react';
import ReactDOM from 'react-dom/client';
import ClientApp from './ClientApp';

const rootElement = document.getElementById('root');
if (rootElement) {
  const root = ReactDOM.createRoot(rootElement);
  root.render(
    <React.StrictMode>
      <ClientApp />
    </React.StrictMode>
  );
}
