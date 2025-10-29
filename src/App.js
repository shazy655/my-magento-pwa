import React from 'react';
import { BrowserRouter as Router, Routes, Route } from 'react-router-dom';
import ProductList from './components/ProductList';
import ProductDetail from './components/ProductDetail';
import CartIndicator from './components/CartIndicator';
import './App.css';

function App() {
  return (
    <Router>
      <div className="App">
        <header className="App-header">
          <div className="header-content">
            <div className="header-text">
              <h1>Magento 2 Product Catalog</h1>
              <p>
                Browse products from your Magento 2 store at localhost:8080
              </p>
            </div>
            <CartIndicator />
          </div>
        </header>
        <main className="App-main">
          <Routes>
            <Route path="/" element={<ProductList />} />
            <Route path="/product/:sku" element={<ProductDetail />} />
          </Routes>
        </main>
      </div>
    </Router>
  );
}

export default App;