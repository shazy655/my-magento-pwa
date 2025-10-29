import React from 'react';
import ProductList from './components/ProductList';
import './App.css';

function App() {
  return (
    <div className="App">
      <header className="App-header">
        <h1>Magento 2 Product Catalog</h1>
        <p>
          Browse products from your Magento 2 store at localhost:8080
        </p>
      </header>
      <main className="App-main">
        <ProductList />
      </main>
    </div>
  );
}

export default App;