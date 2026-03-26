import React, { useEffect, useMemo, useState } from "react";
import { Navigation } from "./components/navigation";
import { Header } from "./components/header";
import { About } from "./components/about";
import { ProductsPage } from "./components/productsPage";
import { CheckoutPage } from "./components/checkoutPage";
import { ChatWidget } from "./components/chatWidget";
import JsonData from "./data/data.json";
import { bakeryProducts } from "./data/products";
import "./App.css";

const getPageFromHash = () => {
  const route = window.location.hash.replace(/^#/, "");

  if (route.startsWith("/checkout")) {
    return "checkout";
  }

  if (route.startsWith("/products")) {
    return "products";
  }

  return "home";
};

// Parse product-id=quantity pairs out of the hash query string, e.g.
// #/checkout?BD-001=2&CK-006=1&BR-009=3
const parseCartFromHash = () => {
  const hash = window.location.hash.replace(/^#/, "");
  const queryIndex = hash.indexOf("?");
  if (queryIndex === -1) return null;
  const params = new URLSearchParams(hash.slice(queryIndex + 1));
  const updates = {};
  let hasUpdates = false;
  for (const [key, value] of params.entries()) {
    const qty = Number.parseInt(value, 10);
    if (!Number.isNaN(qty) && qty > 0) {
      updates[key] = qty;
      hasUpdates = true;
    }
  }
  return hasUpdates ? updates : null;
};

const normalizeQuantity = (value) => {
  const parsedValue = Number.parseInt(value, 10);

  if (Number.isNaN(parsedValue) || parsedValue < 0) {
    return 0;
  }

  return parsedValue;
};

const App = () => {
  const [landingPageData, setLandingPageData] = useState({});
  const [currentPage, setCurrentPage] = useState(getPageFromHash);
  const [cart, setCart] = useState(() => {
    try {
      const savedCart = window.localStorage.getItem("frankiesbakery-demo-cart");
      return savedCart ? JSON.parse(savedCart) : {};
    } catch (error) {
      return {};
    }
  });
  const [confirmationMessage, setConfirmationMessage] = useState("");

  useEffect(() => {
    setLandingPageData(JsonData);
  }, []);

  useEffect(() => {
    // On initial mount, apply any cart params already in the URL.
    // This is what fires when an Azure AI agent sends the user a link like:
    // http://localhost:3000/#/checkout?BD-001=2&CK-006=1
    const initialUpdates = parseCartFromHash();
    if (initialUpdates) {
      setCart((currentCart) => ({ ...currentCart, ...initialUpdates }));
    }

    const handleHashChange = () => {
      setCurrentPage(getPageFromHash());
      // Also apply any cart params embedded in the new URL after navigation.
      const updates = parseCartFromHash();
      if (updates) {
        setCart((currentCart) => ({ ...currentCart, ...updates }));
      }
    };

    window.addEventListener("hashchange", handleHashChange);

    return () => {
      window.removeEventListener("hashchange", handleHashChange);
    };
  }, []);

  useEffect(() => {
    window.localStorage.setItem(
      "frankiesbakery-demo-cart",
      JSON.stringify(cart)
    );
  }, [cart]);

  const products = useMemo(
    () =>
      bakeryProducts
        .slice()
        .sort((left, right) => left.category.localeCompare(right.category)),
    []
  );

  const cartItems = useMemo(
    () =>
      products
        .filter((product) => cart[product.product_id] > 0)
        .map((product) => ({
          ...product,
          quantity: cart[product.product_id],
          lineTotal: product.price * cart[product.product_id],
        })),
    [cart, products]
  );

  const cartItemCount = cartItems.reduce(
    (total, item) => total + item.quantity,
    0
  );
  const cartSubtotal = cartItems.reduce(
    (total, item) => total + item.lineTotal,
    0
  );

  const navigateTo = (pageName) => {
    window.location.hash = pageName === "home" ? "/" : `/${pageName}`;

    if (pageName !== "checkout") {
      setConfirmationMessage("");
    }
  };

  const updateCartQuantity = (productId, nextQuantity) => {
    const normalizedQuantity = normalizeQuantity(nextQuantity);

    setConfirmationMessage("");
    setCart((currentCart) => {
      const nextCart = { ...currentCart };

      if (normalizedQuantity === 0) {
        delete nextCart[productId];
      } else {
        nextCart[productId] = normalizedQuantity;
      }

      return nextCart;
    });
  };

  const placeDemoOrder = () => {
    if (!cartItemCount) {
      return;
    }

    setConfirmationMessage(
      `Demo order placed for ${cartItemCount} item(s) totaling $${cartSubtotal.toFixed(
        2
      )}.`
    );
  };

  const clearCart = () => {
    setCart({});
    setConfirmationMessage("");
  };

  return (
    <div className="app-shell">
      <Navigation currentPage={currentPage} cartItemCount={cartItemCount} />

      {currentPage === "products" ? (
        <ProductsPage
          products={products}
          cart={cart}
          cartItemCount={cartItemCount}
          cartSubtotal={cartSubtotal}
          onUpdateQuantity={updateCartQuantity}
          onNavigateToCheckout={() => navigateTo("checkout")}
        />
      ) : null}

      {currentPage === "checkout" ? (
        <CheckoutPage
          products={products}
          cart={cart}
          cartItems={cartItems}
          cartItemCount={cartItemCount}
          cartSubtotal={cartSubtotal}
          confirmationMessage={confirmationMessage}
          onUpdateQuantity={updateCartQuantity}
          onNavigateToProducts={() => navigateTo("products")}
          onPlaceOrder={placeDemoOrder}
          onClearCart={clearCart}
        />
      ) : null}

      {currentPage === "home" ? (
        <>
          <Header data={landingPageData.Header} />
          <About data={landingPageData.About} />
        </>
      ) : null}

      <ChatWidget />
    </div>
  );
};

export default App;
