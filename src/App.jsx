import React, { useState } from 'react';
import { BrowserRouter as Router, Routes, Route } from 'react-router-dom';
import { QueryClient, QueryClientProvider } from '@tanstack/react-query';
import { ReactQueryDevtools } from '@tanstack/react-query-devtools';
import Sidebar from './components/Sidebar';
import './Global.css';
import Home from './pages/Home';
import CImain from './pages/ChargeInvoicesMain';
import Accounts from './pages/Accounts';
import ChargeInvoiceDetails from './pages/ChargeInvoiceDetails';
import CollectionReceiptsMain from './pages/CollectionReceiptsMain';
import DeliveryReceiptsMain from './pages/DeliveryReceiptsMain';
import SalesInvoicesMain from './pages/SalesInvoicesMain';
import CollectionReceiptsDetails from './pages/CollectionReceiptsDetails';
import DeliveryReceiptsDetails from './pages/DeliveryReceiptsDetails';
import SalesInvoicesDetails from './pages/SalesInvoicesDetails';
import AccountDetails from './pages/AccountsDetails';

// Configure TanStack Query Cache
const queryClient = new QueryClient({
  defaultOptions: {
    queries: {
      staleTime: 1000 * 60 * 5,       // Data stays fresh for 5 minutes (no refetching or loading spinners)
      gcTime: 1000 * 60 * 30,          // Keep unused cache in memory for 30 minutes
      refetchOnWindowFocus: false,    // Prevent fetching on window/tab refocus
      retry: 1,
    },
  },
});

function App() {
  const [isSidebarCollapsed, setIsSidebarCollapsed] = useState(false);

  const toggleSidebar = () => {
    setIsSidebarCollapsed((prev) => !prev);
  };

  return (
    <QueryClientProvider client={queryClient}>
      <Router>
        <div className="app-layout scrollbar-none">
          <Sidebar
            isCollapsed={isSidebarCollapsed}
            toggleSidebar={toggleSidebar}
          />
          <main className="page-content">
            <Routes>
              <Route path="/" element={<Home />} />
              <Route path="/accounts" element={<Accounts />} />
              <Route path="/accounts-details" element={<AccountDetails />} />
              <Route path="/charge-invoices" element={<CImain />} />
              <Route path="/charge-invoice-details" element={<ChargeInvoiceDetails />} />
              <Route path="/charge-invoice-details/:id" element={<ChargeInvoiceDetails />} />
              <Route path="/collection-receipts" element={<CollectionReceiptsMain />} />
              <Route path="/collection-receipts-details" element={<CollectionReceiptsDetails />} />
              <Route path="/delivery-receipts" element={<DeliveryReceiptsMain />} />
              <Route path="/delivery-receipts-details" element={<DeliveryReceiptsDetails />} />
              <Route path="/sales-invoices" element={<SalesInvoicesMain />} />
              <Route path="/sales-invoices-details" element={<SalesInvoicesDetails />} />
            </Routes>
          </main>
        </div>
      </Router>
      <ReactQueryDevtools initialIsOpen={false} />
    </QueryClientProvider>
  );
}

export default App;