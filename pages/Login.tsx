import React, { useState } from 'react';
import { Link, useNavigate } from 'react-router-dom';
import { Youtube, LogIn } from 'lucide-react';
import { useAppContext } from '../context/AppContext';

const Login: React.FC = () => {
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [isLoading, setIsLoading] = useState(false);
  const { login } = useAppContext();
  const navigate = useNavigate();

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setIsLoading(true);
    try {
      await login(email, password);
      navigate('/streams');
    } catch (error) {
      console.error('Login failed', error);
      // Here you would show an error message to the user
      setIsLoading(false);
    }
  };

  return (
    <div className="min-h-screen bg-yt-dark flex flex-col justify-center items-center p-4">
      <Link to="/landing" className="flex items-center gap-2 text-2xl font-bold mb-8">
        <Youtube className="h-9 w-9 text-yt-red" />
        <span>StreamBro</span>
      </Link>
      <div className="w-full max-w-sm bg-yt-dark-secondary rounded-xl shadow-lg p-8">
        <h1 className="text-2xl font-bold text-center text-yt-text-primary mb-6">Welcome Back</h1>
        <form onSubmit={handleSubmit} className="space-y-4">
          <div>
            <label className="block text-sm font-medium text-yt-text-secondary mb-1">Email</label>
            <input 
              type="email" 
              value={email}
              onChange={e => setEmail(e.target.value)}
              className="w-full bg-yt-dark-tertiary border-yt-dark-tertiary rounded-lg p-2 focus:ring-2 focus:ring-yt-red outline-none" 
              required 
            />
          </div>
          <div>
            <label className="block text-sm font-medium text-yt-text-secondary mb-1">Password</label>
            <input 
              type="password" 
              value={password}
              onChange={e => setPassword(e.target.value)}
              className="w-full bg-yt-dark-tertiary border-yt-dark-tertiary rounded-lg p-2 focus:ring-2 focus:ring-yt-red outline-none" 
              required 
            />
          </div>
          <button 
            type="submit" 
            disabled={isLoading}
            className="w-full flex justify-center items-center gap-2 mt-4 py-2 px-4 bg-yt-red hover:bg-red-700 text-white font-semibold rounded-lg transition-colors disabled:bg-red-800 disabled:cursor-not-allowed"
          >
            {isLoading ? 'Logging in...' : 'Login'}
            {!isLoading && <LogIn className="w-5 h-5"/>}
          </button>
        </form>
        <p className="text-center text-sm text-yt-text-secondary mt-6">
          Don't have an account?{' '}
          <Link to="/register" className="font-medium text-yt-red hover:underline">
            Sign Up
          </Link>
        </p>
      </div>
    </div>
  );
};

export default Login;