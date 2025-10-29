import React, { useState } from 'react';
import ProductList from './components/ProductList';
import ProductComparison from './components/ProductComparison';
import './App.css';

function App() {
  const [viewMode, setViewMode] = useState('graphql'); // 'graphql', 'comparison'

  return (
    <div className="App">
      <header className="App-header">
        <h1>Magento 2 Product Catalog</h1>
        <p>
          Browse products from your Magento 2 store at localhost:8080
        </p>
        <div className="view-toggle">
          <button 
            className={viewMode === 'graphql' ? 'active' : ''}
            onClick={() => setViewMode('graphql')}
          >
            GraphQL View
          </button>
          <button 
            className={viewMode === 'comparison' ? 'active' : ''}
            onClick={() => setViewMode('comparison')}
          >
            API Comparison
          </button>
        </div>
      </header>
      <main className="App-main">
        {viewMode === 'graphql' ? <ProductList /> : <ProductComparison />}
      </main>
    </div>
  );
}

export default App;