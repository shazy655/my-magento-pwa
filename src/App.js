import React from 'react';
import { BrowserRouter as Router, Route, Switch, Link } from 'react-router-dom';
import ProductList from './components/ProductList';
import ProductDetailPage from './components/ProductDetailPage';
import CartDemo from './components/CartDemo';
import './App.css';

function App() {
  return (
    <Router>
      <div className="App">
        <header className="App-header">
          <h1>Magento 2 Product Catalog</h1>
          <p>
            Browse products from your Magento 2 store at localhost:8080
          </p>
          <nav className="App-nav">
            <Link to="/" className="nav-link">Products</Link>
            <Link to="/cart-demo" className="nav-link">Cart Demo</Link>
          </nav>
        </header>
        <main className="App-main">
          <Switch>
            <Route exact path="/" component={ProductList} />
            <Route path="/product/:sku" component={ProductDetailPage} />
            <Route path="/cart-demo" component={CartDemo} />
          </Switch>
        </main>
      </div>
    </Router>
  );
}

export default App;