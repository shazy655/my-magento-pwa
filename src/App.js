import React from 'react';
import { BrowserRouter, Routes, Route } from 'react-router-dom';
import ProductList from './components/ProductList';
import ProductDetail from './components/ProductDetail';
import './App.css';

function App() {
  return (
    <BrowserRouter>
      <div className="App">
        <header className="App-header">
          <h1>Magento 2 Product Catalog</h1>
          <p>
            Browse products from your Magento 2 store at localhost:8080
          </p>
        </header>
        <main className="App-main">
          <Routes>
            <Route path="/" element={<ProductList />} />
            <Route path="/product/:sku" element={<ProductDetail />} />
          </Routes>
        </main>
      </div>
    </BrowserRouter>
  );
}

export default App;