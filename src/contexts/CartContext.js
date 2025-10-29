import React, { createContext, useContext, useState, useEffect } from 'react';
import magentoApi from '../services/magentoApi';

const CartContext = createContext();

export const useCart = () => {
  const context = useContext(CartContext);
  if (!context) {
    throw new Error('useCart must be used within a CartProvider');
  }
  return context;
};

export const CartProvider = ({ children }) => {
  const [cartId, setCartId] = useState(null);
  const [cartItems, setCartItems] = useState([]);
  const [isLoading, setIsLoading] = useState(false);
  const [error, setError] = useState(null);

  // Initialize cart on component mount
  useEffect(() => {
    initializeCart();
  }, []);

  const initializeCart = async () => {
    try {
      setIsLoading(true);
      setError(null);
      
      // Try to get existing cart ID from localStorage first
      const existingCartId = localStorage.getItem('guest_cart_id');
      if (existingCartId) {
        setCartId(existingCartId);
        // Verify cart still exists by fetching items
        try {
          const items = await magentoApi.getGuestCartItems();
          setCartItems(items);
        } catch (error) {
          // Cart might be invalid, create a new one
          await createNewCart();
        }
      } else {
        await createNewCart();
      }
    } catch (error) {
      console.error('Error initializing cart:', error);
      setError(error.message);
    } finally {
      setIsLoading(false);
    }
  };

  const createNewCart = async () => {
    try {
      const newCartId = await magentoApi.createEmptyCart();
      setCartId(newCartId);
      setCartItems([]);
      setError(null);
      return newCartId;
    } catch (error) {
      console.error('Error creating new cart:', error);
      setError(error.message);
      throw error;
    }
  };

  const createEmptyCart = async () => {
    try {
      setIsLoading(true);
      setError(null);
      const newCartId = await magentoApi.createEmptyCart();
      setCartId(newCartId);
      setCartItems([]);
      return newCartId;
    } catch (error) {
      console.error('Error creating empty cart:', error);
      setError(error.message);
      throw error;
    } finally {
      setIsLoading(false);
    }
  };

  const addToCart = async (sku, quantity = 1) => {
    try {
      setIsLoading(true);
      setError(null);
      
      if (!cartId) {
        await createNewCart();
      }
      
      const result = await magentoApi.addToGuestCart(sku, quantity);
      
      // Refresh cart items
      const items = await magentoApi.getGuestCartItems();
      setCartItems(items);
      
      return result;
    } catch (error) {
      console.error('Error adding to cart:', error);
      setError(error.message);
      throw error;
    } finally {
      setIsLoading(false);
    }
  };

  const refreshCart = async () => {
    if (!cartId) return;
    
    try {
      const items = await magentoApi.getGuestCartItems();
      setCartItems(items);
    } catch (error) {
      console.error('Error refreshing cart:', error);
      setError(error.message);
    }
  };

  const clearCart = () => {
    setCartId(null);
    setCartItems([]);
    setError(null);
    localStorage.removeItem('guest_cart_id');
  };

  const getCartItemCount = () => {
    return cartItems.reduce((total, item) => total + (item.qty || 0), 0);
  };

  const getCartTotal = () => {
    return cartItems.reduce((total, item) => {
      const price = item.price || 0;
      const qty = item.qty || 0;
      return total + (price * qty);
    }, 0);
  };

  const value = {
    cartId,
    cartItems,
    isLoading,
    error,
    createEmptyCart,
    addToCart,
    refreshCart,
    clearCart,
    getCartItemCount,
    getCartTotal,
  };

  return (
    <CartContext.Provider value={value}>
      {children}
    </CartContext.Provider>
  );
};