import React from 'react';
import { BrowserRouter as Router, Route, Switch, Link } from 'react-router-dom';
import ProductList from './components/ProductList';
import ProductDetailPage from './components/ProductDetailPage';
import Cart from './components/Cart';
import Checkout from './components/Checkout';
import Minicart from './components/Minicart';
import './App.css';

function App() {
  return (
    <Router>
      <div className="App">
        <header className="App-header">
          <div className="App-header-content">
            <div className="App-header-text">
              <Link to="/" className="App-header-title">
                <h1>Magento 2 Product Catalog</h1>
              </Link>
              <p>
                Browse products from your Magento 2 store at localhost:8080
              </p>
            </div>
            <div className="App-header-actions">
              <Minicart />
            </div>
          </div>
        </header>
        <main className="App-main">
          <Switch>
            <Route exact path="/" component={ProductList} />
            <Route path="/product/:sku" component={ProductDetailPage} />
            <Route path="/cart" component={Cart} />
            <Route path="/checkout" component={Checkout} />
          </Switch>
        </main>
      </div>
    </Router>
  );
}

export default App;