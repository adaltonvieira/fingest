import { Navigate, Route, Routes } from 'react-router-dom';
import { useAuthStore } from './store/auth-store';
import Login from './pages/Login';
import Register from './pages/Register';
import Dashboard from './pages/Dashboard';
import Transactions from './pages/Transactions';
import Accounts from './pages/Accounts';
import Categories from './pages/Categories';
import CreditCards from './pages/CreditCards';
import Automations from './pages/Automations';
import Goals from './pages/Goals';
import Reports from './pages/Reports';
import ImportExport from './pages/ImportExport';
import Security from './pages/Security';
import Help from './pages/Help';
import AppLayout from './components/AppLayout';

function PrivateRoute({ children }: { children: JSX.Element }) {
  const accessToken = useAuthStore((s) => s.accessToken);
  if (!accessToken) return <Navigate to="/login" replace />;
  return children;
}

export default function App() {
  return (
    <Routes>
      <Route path="/login" element={<Login />} />
      <Route path="/register" element={<Register />} />
      <Route
        path="/"
        element={
          <PrivateRoute>
            <AppLayout />
          </PrivateRoute>
        }
      >
        <Route index element={<Dashboard />} />
        <Route path="transactions" element={<Transactions />} />
        <Route path="accounts" element={<Accounts />} />
        <Route path="credit-cards" element={<CreditCards />} />
        <Route path="goals" element={<Goals />} />
        <Route path="reports" element={<Reports />} />
        <Route path="import-export" element={<ImportExport />} />
        <Route path="security" element={<Security />} />
        <Route path="automations" element={<Automations />} />
        <Route path="categories" element={<Categories />} />
        <Route path="help" element={<Help />} />
      </Route>
    </Routes>
  );
}
