import React from 'react';
import { Home, Search, Heart, Grid, User } from 'lucide-react';

interface BottomNavProps {
  active: string;
  onNavigate: (page: string) => void;
}

export function BottomNav({ active, onNavigate }: BottomNavProps) {
  const items = [
    { id: 'home', label: 'Home', icon: Home },
    { id: 'search', label: 'Pesquisa', icon: Search },
    { id: 'favorites', label: 'Favoritos', icon: Heart },
    { id: 'catalog', label: 'Catálogo', icon: Grid },
    { id: 'profile', label: 'Perfil', icon: User },
  ];

  return (
    <div className="fixed bottom-0 left-0 right-0 bg-zinc-900/95 backdrop-blur-md border-t border-zinc-800/50 safe-area-bottom">
      <div className="flex justify-around items-center h-16 px-2 max-w-screen-xl mx-auto">
        {items.map((item) => {
          const Icon = item.icon;
          const isActive = active === item.id;
          
          return (
            <button
              key={item.id}
              onClick={() => onNavigate(item.id)}
              className="relative flex flex-col items-center justify-center flex-1 h-full group"
            >
              {/* Active indicator */}
              {isActive && (
                <div className="absolute top-0 left-1/2 -translate-x-1/2 w-12 h-1 bg-blue-500 rounded-b-full transition-all duration-300" />
              )}
              
              <Icon 
                className={`w-6 h-6 transition-all duration-300 ${
                  isActive 
                    ? 'text-blue-500 scale-110' 
                    : 'text-gray-400 group-hover:text-gray-300 group-hover:scale-105'
                }`}
              />
              <span className={`text-xs mt-1 transition-all duration-300 font-medium ${
                isActive 
                  ? 'text-blue-500' 
                  : 'text-gray-400 group-hover:text-gray-300'
              }`}>
                {item.label}
              </span>
            </button>
          );
        })}
      </div>
    </div>
  );
}