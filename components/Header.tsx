import React from 'react';
import { NavLink } from 'react-router-dom';
import { Clapperboard, Film, User, Youtube, LogOut } from 'lucide-react';
import { useAppContext } from '../context/AppContext';

const Header: React.FC = () => {
  const { logout } = useAppContext();

  const navLinkClass = ({ isActive }: { isActive: boolean }): string =>
    `flex items-center gap-2 px-3 py-2 rounded-lg transition-colors text-sm font-medium ${
      isActive ? 'bg-yt-dark-secondary text-yt-text-primary' : 'text-yt-text-secondary hover:bg-yt-dark-tertiary hover:text-yt-text-primary'
    }`;
  
  const buttonClass = `flex items-center gap-2 px-3 py-2 rounded-lg transition-colors text-sm font-medium text-yt-text-secondary hover:bg-yt-dark-tertiary hover:text-yt-text-primary`;

  return (
    <header className="bg-yt-dark sticky top-0 z-10 border-b border-yt-dark-secondary">
      <div className="container mx-auto flex h-16 items-center justify-between px-4 sm:px-6 lg:px-8">
        <div className="flex items-center gap-4">
          <NavLink to="/" className="flex items-center gap-2 text-lg font-bold">
            <Youtube className="h-7 w-7 text-yt-red" />
            <span className="hidden sm:inline">StreamBro</span>
          </NavLink>
        </div>
        <nav className="flex items-center gap-1 sm:gap-2">
          <NavLink to="/streams" className={navLinkClass}>
            <Clapperboard className="h-5 w-5" />
            <span className="hidden sm:inline">Streams</span>
          </NavLink>
          <NavLink to="/gallery" className={navLinkClass}>
            <Film className="h-5 w-5" />
            <span className="hidden sm:inline">Gallery</span>
          </NavLink>
          <NavLink to="/settings" className={navLinkClass}>
            <User className="h-5 w-5" />
            <span className="hidden sm:inline">Profile</span>
          </NavLink>
           <button onClick={logout} className={buttonClass}>
              <LogOut className="h-5 w-5" />
              <span className="hidden sm:inline">Logout</span>
            </button>
        </nav>
      </div>
    </header>
  );
};

export default Header;