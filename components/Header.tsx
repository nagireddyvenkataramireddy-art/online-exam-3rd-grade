import React from 'react';
import { Menu, Bell, Search, User } from 'lucide-react';

interface HeaderProps {
  title?: string;
  showBack?: boolean;
  onBack?: () => void;
}

const Header: React.FC<HeaderProps> = ({ title = "Examo AI", showBack, onBack }) => {
  return (
    <header className="sticky top-0 z-50 bg-blue-600 text-white shadow-md">
      <div className="flex items-center justify-between px-4 h-14">
        <div className="flex items-center gap-4">
          {showBack ? (
            <button onClick={onBack} className="p-1 rounded-full hover:bg-blue-700 active:bg-blue-800 transition-colors">
              <svg xmlns="http://www.w3.org/2000/svg" width="24" height="24" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"><path d="m15 18-6-6 6-6"/></svg>
            </button>
          ) : (
            <button className="p-1 rounded-full hover:bg-blue-700 active:bg-blue-800 transition-colors">
              <Menu size={24} />
            </button>
          )}
          <h1 className="text-xl font-medium tracking-wide truncate max-w-[200px]">{title}</h1>
        </div>
        <div className="flex items-center gap-4">
          <button className="p-1 rounded-full hover:bg-blue-700 active:bg-blue-800 transition-colors">
            <Search size={22} />
          </button>
          <button className="p-1 rounded-full hover:bg-blue-700 active:bg-blue-800 transition-colors relative">
            <Bell size={22} />
            <span className="absolute top-1 right-1 w-2 h-2 bg-red-400 rounded-full"></span>
          </button>
          <button className="w-8 h-8 bg-blue-800 rounded-full flex items-center justify-center text-sm font-bold border-2 border-blue-400">
            JD
          </button>
        </div>
      </div>
    </header>
  );
};

export default Header;