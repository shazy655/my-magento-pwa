import React from 'react';
import { BrowserRouter as Router, Route, Switch } from 'react-router-dom';
import { CartProvider } from './contexts/CartContext';
import ProductList from './components/ProductList';
import ProductDetailPage from './components/ProductDetailPage';
import './App.css';

function App() {
  return (
    <CartProvider>
      <Router>
        <div className="App">
          <header className="App-header">
            <h1>Magento 2 Product Catalog</h1>
            <p>
              Browse products from your Magento 2 store at localhost:8080
            </p>
          </header>
          <main className="App-main">
            <Switch>
              <Route exact path="/" component={ProductList} />
              <Route path="/product/:sku" component={ProductDetailPage} />
            </Switch>
          </main>
        </div>
      </Router>
    </CartProvider>
  );
}

export default App;