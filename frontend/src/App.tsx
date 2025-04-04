import React from 'react';
import './App.css';
import { useEffect } from 'react';
import { checkHealth } from './services/api';

function App() {
  useEffect(() => {
    checkHealth()
      .then(status => console.log('API Status:', status))
      .catch(console.error);
  }, []);
  
  return (
    <div className="App">
      <header className="App-header">
        <h1>Family Tree App</h1>
        <p>
          A simple application to manage your family tree.
        </p>
      </header>
    </div>
  );
}

export default App;
