
import React from 'react';
import ClientApp from './ClientApp';

// This file acts as a redirect. 
// If the build system defaults to importing App.tsx, we serve ClientApp.
const App: React.FC = () => {
  return <ClientApp />;
};

export default App;
