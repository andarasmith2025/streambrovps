
import React from 'react';
import { Navigate, Outlet } from 'react-router-dom';
import { useAppContext } from '../context/AppContext';
import Header from './Header';

const ProtectedRoute: React.FC = () => {
  const { isAuthenticated } = useAppContext();

  if (!isAuthenticated) {
    // Redirect them to the /login page, but save the current location they were
    // trying to go to. This allows us to send them along to that page after they login.
    return <Navigate to="/login" replace />;
  }

  return (
    <div className="min-h-screen bg-yt-dark font-sans">
      <Header />
      <main className="p-4 sm:p-6 lg:p-8">
        <Outlet /> {/* Renders the child route's element */}
      </main>
    </div>
  );
};

export default ProtectedRoute;
