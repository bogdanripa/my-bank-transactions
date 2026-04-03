import { BrowserRouter, Routes, Route, Link, Navigate } from 'react-router-dom';
import { AuthProvider, useAuth } from './AuthContext';
import Login from './pages/Login';
import Register from './pages/Register';
import BankAccounts from './pages/BankAccounts';
import Callback from './pages/Callback';
import Transactions from './pages/Transactions';
import TopTransactions from './pages/TopTransactions';
import ThirdParties from './pages/ThirdParties';

function Layout({ children }) {
  const { user, logout } = useAuth();

  return (
    <div className="min-h-screen bg-gray-50">
      <nav className="bg-white border-b">
        <div className="max-w-6xl mx-auto px-4 flex items-center justify-between h-14">
          <div className="flex items-center gap-6">
            <Link to="/" className="font-bold text-lg text-gray-900">
              BankLens
            </Link>
            <Link
              to="/accounts"
              className="text-sm text-gray-600 hover:text-gray-900"
            >
              Accounts
            </Link>
            <Link
              to="/transactions"
              className="text-sm text-gray-600 hover:text-gray-900"
            >
              Transactions
            </Link>
            <Link
              to="/top"
              className="text-sm text-gray-600 hover:text-gray-900"
            >
              Top
            </Link>
            <Link
              to="/third-parties"
              className="text-sm text-gray-600 hover:text-gray-900"
            >
              Third Parties
            </Link>
          </div>
          <div className="flex items-center gap-3">
            <span className="text-sm text-gray-500">{user?.email}</span>
            <button
              onClick={logout}
              className="text-sm text-red-600 hover:text-red-700"
            >
              Logout
            </button>
          </div>
        </div>
      </nav>
      <main className="max-w-6xl mx-auto px-4 py-6">{children}</main>
    </div>
  );
}

function ProtectedRoute({ children }) {
  const { user } = useAuth();
  if (!user) return <Navigate to="/login" />;
  return <Layout>{children}</Layout>;
}

function App() {
  return (
    <BrowserRouter>
      <AuthProvider>
        <Routes>
          <Route path="/login" element={<Login />} />
          <Route path="/register" element={<Register />} />
          <Route path="/callback" element={<Callback />} />
          <Route
            path="/"
            element={
              <ProtectedRoute>
                <Navigate to="/transactions" />
              </ProtectedRoute>
            }
          />
          <Route
            path="/accounts"
            element={
              <ProtectedRoute>
                <BankAccounts />
              </ProtectedRoute>
            }
          />
          <Route
            path="/transactions"
            element={
              <ProtectedRoute>
                <Transactions />
              </ProtectedRoute>
            }
          />
          <Route
            path="/top"
            element={
              <ProtectedRoute>
                <TopTransactions />
              </ProtectedRoute>
            }
          />
          <Route
            path="/third-parties"
            element={
              <ProtectedRoute>
                <ThirdParties />
              </ProtectedRoute>
            }
          />
        </Routes>
      </AuthProvider>
    </BrowserRouter>
  );
}

export default App;
