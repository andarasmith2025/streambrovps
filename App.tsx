
import React from 'react';
import { HashRouter, Route, Routes, Navigate } from 'react-router-dom';
import { AppProvider, useAppContext } from './context/AppContext';
import Streams from './pages/Streams';
import Gallery from './pages/Gallery';
import Settings from './pages/Settings';
import Landing from './pages/Landing';
import Login from './pages/Login';
import Register from './pages/Register';
import ProtectedRoute from './components/ProtectedRoute';
import { Loader2 } from 'lucide-react';

const App: React.FC = () => {
  return (
    <AppProvider>
      <AppContent />
    </AppProvider>
  );
};

// We need a sub-component to access the context
const AppContent: React.FC = () => {
  const { isLoading } = useAppContext();

  if (isLoading) {
    return (
      <div className="bg-yt-dark text-yt-text-primary min-h-screen flex flex-col justify-center items-center">
        <Loader2 className="w-12 h-12 text-yt-red animate-spin" />
        <p className="mt-4 text-lg">Loading StreamBro...</p>
      </div>
    );
  }

  return (
    <HashRouter>
      <Routes>
        <Route path="/landing" element={<Landing />} />
        <Route path="/login" element={<Login />} />
        <Route path="/register" element={<Register />} />
        
        <Route element={<ProtectedRoute />}>
          <Route path="/streams" element={<Streams />} />
          <Route path="/gallery" element={<Gallery />} />
          <Route path="/settings" element={<Settings />} />
          {/* Default protected route */}
          <Route path="/" element={<Navigate to="/streams" replace />} />
        </Route>
        
        {/* Redirect any other path to landing or streams based on auth */}
        <Route path="*" element={<RootRedirect />} /> 
      </Routes>
    </HashRouter>
  );
}

const RootRedirect = () => {
    const { isAuthenticated } = useAppContext();
    return <Navigate to={isAuthenticated ? "/streams" : "/landing"} replace />;
}

export default App;