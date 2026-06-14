/**
 * @license
 * SPDX-License-Identifier: Apache-2.0
 */

import React, { lazy, Suspense } from 'react';
import { BrowserRouter as Router, Routes, Route } from 'react-router-dom';
import Header from './components/Header';
import Footer from './components/Footer';
import AuthGuard from './components/AuthGuard';
import NotificationListener from './components/NotificationListener';
import { Loader2 } from 'lucide-react';

import UserAuthGuard from './components/UserAuthGuard';

import { useSettings } from './lib/SettingsContext';
const MaintenancePage = lazy(() => import('./pages/MaintenancePage'));

// Page Imports - Lazy Loaded
const HomePage = lazy(() => import('./pages/HomePage'));
const OrderPage = lazy(() => import('./pages/OrderPage'));
const ConfirmationPage = lazy(() => import('./pages/ConfirmationPage'));
const OrderHistoryPage = lazy(() => import('./pages/OrderHistoryPage'));
const ProfilePage = lazy(() => import('./pages/ProfilePage'));
const ServicePage = lazy(() => import('./pages/ServicePage'));
const ServiceTemplatesPage = lazy(() => import('./pages/ServiceTemplatesPage'));
const ServiceCheckoutPage = lazy(() => import('./pages/ServiceCheckoutPage'));
const AccountsPage = lazy(() => import('./pages/AccountsPage'));
const AccountDetailPage = lazy(() => import('./pages/AccountDetailPage'));
const TermsPage = lazy(() => import('./pages/TermsPage'));
const DiamondStoreGenerator = lazy(() => import('./pages/DiamondStoreGenerator'));
const MembershipPostGenerator = lazy(() => import('./pages/MembershipPostGenerator'));
const FFProfileDPGenerator = lazy(() => import('./pages/FFProfileDPGenerator'));
const FreeFireAccountInfo = lazy(() => import('./pages/FreeFireAccountInfo'));
const PaymentDetailsPage = lazy(() => import('./pages/PaymentDetailsPage'));
const WalletPage = lazy(() => import('./pages/WalletPage'));
const LeaderboardPage = lazy(() => import('./pages/LeaderboardPage'));

// Admin Page Imports - Lazy Loaded
const AdminLogin = lazy(() => import('./pages/admin/AdminLogin'));
const AdminDashboard = lazy(() => import('./pages/admin/AdminDashboard'));
const AdminPackages = lazy(() => import('./pages/admin/AdminPackages'));
const AdminOrders = lazy(() => import('./pages/admin/AdminOrders'));
const AdminSettings = lazy(() => import('./pages/admin/AdminSettings'));
const AdminBanners = lazy(() => import('./pages/admin/AdminBanners'));
const AdminServices = lazy(() => import('./pages/admin/AdminServices'));
const AdminEvents = lazy(() => import('./pages/admin/AdminEvents'));
const AdminServiceTemplates = lazy(() => import('./pages/admin/AdminServiceTemplates'));
const AdminAccounts = lazy(() => import('./pages/admin/AdminAccounts'));
const AdminAccountOrders = lazy(() => import('./pages/admin/AdminAccountOrders'));
const AdminServiceOrders = lazy(() => import('./pages/admin/AdminServiceOrders'));
const AdminGames = lazy(() => import('./pages/admin/AdminGames'));



function PageLoader() {
  return (
    <div className="min-h-[60vh] flex items-center justify-center">
      <Loader2 className="h-10 w-10 text-blue-600 animate-spin" />
    </div>
  );
}

export default function App() {
  const [isMobile, setIsMobile] = React.useState(false);

  React.useEffect(() => {
    const checkMobile = () => {
      setIsMobile(window.innerWidth < 768);
    };
    checkMobile();
    window.addEventListener('resize', checkMobile);
    return () => window.removeEventListener('resize', checkMobile);
  }, []);

  const settingsContext = useSettings();
  const settings = settingsContext?.settings;
  const isMaintenanceActive = settings?.isMaintenanceMode && !window.location.pathname.startsWith('/secure-portal');

  if (isMaintenanceActive) {
    return (
      <Router>

        <Suspense fallback={
          <div className="min-h-screen bg-slate-950 flex items-center justify-center">
            <Loader2 className="h-10 w-10 text-blue-600 animate-spin" />
          </div>
        }>
          <MaintenancePage />
        </Suspense>
      </Router>
    );
  }

  return (
    <Router>
      <NotificationListener />
      <div className="min-h-screen flex flex-col bg-white dark:bg-[#070708] transition-colors duration-300">
        <Header />
        <main className="flex-grow">
          <Suspense fallback={<PageLoader />}>
            <Routes>
              <Route path="/" element={<UserAuthGuard><HomePage /></UserAuthGuard>} />
              <Route path="/history" element={<UserAuthGuard><OrderHistoryPage /></UserAuthGuard>} />
              <Route path="/profile" element={<ProfilePage />} />
              <Route path="/service/:serviceId" element={<UserAuthGuard><ServicePage /></UserAuthGuard>} />
              <Route path="/service-templates/:serviceId" element={<UserAuthGuard><ServiceTemplatesPage /></UserAuthGuard>} />
              <Route path="/service-checkout/:serviceId/:templateId" element={<UserAuthGuard><ServiceCheckoutPage /></UserAuthGuard>} />
              <Route path="/order/:packageId?" element={<UserAuthGuard><OrderPage /></UserAuthGuard>} />
              <Route path="/confirmation/:orderId" element={<UserAuthGuard><ConfirmationPage /></UserAuthGuard>} />
              <Route path="/accounts" element={<UserAuthGuard><AccountsPage /></UserAuthGuard>} />
              <Route path="/account/:accountId" element={<UserAuthGuard><AccountDetailPage /></UserAuthGuard>} />
              <Route path="/post-designs/diamond-store-generator" element={<UserAuthGuard><DiamondStoreGenerator /></UserAuthGuard>} />
              <Route path="/post-designs/membership-post-generator" element={<UserAuthGuard><MembershipPostGenerator /></UserAuthGuard>} />
              <Route path="/post-designs/ff-profile-dp-generator" element={<UserAuthGuard><FFProfileDPGenerator /></UserAuthGuard>} />
              <Route path="/free-fire-info" element={<UserAuthGuard><FreeFireAccountInfo /></UserAuthGuard>} />
              <Route path="/payment-details" element={<UserAuthGuard><PaymentDetailsPage /></UserAuthGuard>} />
              <Route path="/wallet" element={<UserAuthGuard><WalletPage /></UserAuthGuard>} />
              <Route path="/leaderboard" element={<UserAuthGuard><LeaderboardPage /></UserAuthGuard>} />
              <Route path="/terms" element={<TermsPage />} />
              
              <Route path="/secure-portal/login" element={<AdminLogin />} />
              
              {/* Guarded Admin Routes */}
              <Route path="/secure-portal" element={<AuthGuard><AdminDashboard /></AuthGuard>} />
              <Route path="/secure-portal/packages" element={<AuthGuard><AdminPackages /></AuthGuard>} />
              <Route path="/secure-portal/orders" element={<AuthGuard><AdminOrders /></AuthGuard>} />
              <Route path="/secure-portal/settings" element={<AuthGuard><AdminSettings /></AuthGuard>} />
              <Route path="/secure-portal/banners" element={<AuthGuard><AdminBanners /></AuthGuard>} />
              <Route path="/secure-portal/services" element={<AuthGuard><AdminServices /></AuthGuard>} />
              <Route path="/secure-portal/templates" element={<AuthGuard><AdminServiceTemplates /></AuthGuard>} />
              <Route path="/secure-portal/events" element={<AuthGuard><AdminEvents /></AuthGuard>} />
              <Route path="/secure-portal/accounts" element={<AuthGuard><AdminAccounts /></AuthGuard>} />
              <Route path="/secure-portal/account-orders" element={<AuthGuard><AdminAccountOrders /></AuthGuard>} />
              <Route path="/secure-portal/service-orders" element={<AuthGuard><AdminServiceOrders /></AuthGuard>} />
              <Route path="/secure-portal/games" element={<AuthGuard><AdminGames /></AuthGuard>} />
            </Routes>
          </Suspense>
        </main>
        <Footer />
      </div>
    </Router>
  );
}
