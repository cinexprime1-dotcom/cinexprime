import React, { useState } from 'react';
import { ArrowLeft, Film, Tv, Users, Image, LayoutDashboard, Menu, X } from 'lucide-react';
import { MoviesAdmin } from './MoviesAdmin';
import { SeriesAdmin } from './SeriesAdmin';
import { UsersAdmin } from './UsersAdmin';
import { SliderAdmin } from './SliderAdmin';
import { BulkEditMovies } from './BulkEditMovies';
import { BulkEditSeries } from './BulkEditSeries';
import { useAuth } from '../../contexts/AuthContext';

interface AdminPanelProps {
  onBack: () => void;
}

export function AdminPanel({ onBack }: AdminPanelProps) {
  const [activeTab, setActiveTab] = useState<'movies' | 'series' | 'users' | 'slider'>('movies');
  const [mobileMenuOpen, setMobileMenuOpen] = useState(false);
  const [showBulkEditMovies, setShowBulkEditMovies] = useState(false);
  const [showBulkEditSeries, setShowBulkEditSeries] = useState(false);
  const { accessToken } = useAuth();

  const tabs = [
    { id: 'movies' as const, label: 'Filmes', icon: Film },
    { id: 'series' as const, label: 'Séries', icon: Tv },
    { id: 'users' as const, label: 'Usuários', icon: Users },
    { id: 'slider' as const, label: 'Slider', icon: Image },
  ];

  // Show bulk edit screens
  if (showBulkEditMovies && accessToken) {
    return <BulkEditMovies onClose={() => setShowBulkEditMovies(false)} accessToken={accessToken} />;
  }

  if (showBulkEditSeries && accessToken) {
    return <BulkEditSeries onClose={() => setShowBulkEditSeries(false)} accessToken={accessToken} />;
  }

  return (
    <div className="min-h-screen bg-[#0f1117]">
      {/* Top Bar - Mobile */}
      <div className="lg:hidden fixed top-0 left-0 right-0 z-30 bg-[#0f1117] border-b border-zinc-800/50">
        <div className="flex items-center justify-between px-4 h-16">
          <div className="flex items-center gap-3">
            <div className="w-8 h-8 rounded-lg bg-blue-500/10 flex items-center justify-center">
              <LayoutDashboard className="w-4 h-4 text-blue-500" />
            </div>
            <h1 className="text-lg text-white">
              Painel Admin
            </h1>
          </div>
          <button
            onClick={() => setMobileMenuOpen(!mobileMenuOpen)}
            className="w-9 h-9 flex items-center justify-center text-gray-400 hover:text-white transition-colors rounded-lg hover:bg-zinc-900"
          >
            {mobileMenuOpen ? <X className="w-5 h-5" /> : <Menu className="w-5 h-5" />}
          </button>
        </div>
      </div>

      {/* Mobile Menu Overlay */}
      {mobileMenuOpen && (
        <div
          className="lg:hidden fixed inset-0 bg-black/50 z-20 pt-16"
          onClick={() => setMobileMenuOpen(false)}
        >
          <div className="bg-[#0f1117] border-r border-zinc-800/50 w-64 h-full p-4 space-y-2">
            <button 
              onClick={onBack} 
              className="flex items-center gap-2 text-gray-500 hover:text-white transition-colors mb-4 px-3 py-2 rounded-lg hover:bg-zinc-900 w-full"
            >
              <ArrowLeft className="w-4 h-4" />
              <span className="text-sm">Voltar</span>
            </button>
            
            {tabs.map(tab => {
              const Icon = tab.icon;
              const isActive = activeTab === tab.id;
              return (
                <button
                  key={tab.id}
                  onClick={() => {
                    setActiveTab(tab.id);
                    setMobileMenuOpen(false);
                  }}
                  className={`
                    w-full flex items-center gap-3 px-3 py-2.5 rounded-lg 
                    transition-all duration-200 text-left
                    ${isActive
                      ? 'bg-blue-500 text-white'
                      : 'text-gray-400 hover:text-white hover:bg-zinc-900'
                    }
                  `}
                >
                  <Icon className="w-4 h-4" />
                  <span className="text-sm">{tab.label}</span>
                </button>
              );
            })}
          </div>
        </div>
      )}

      <div className="flex">
        {/* Sidebar - Desktop */}
        <aside className="hidden lg:flex w-60 border-r border-zinc-800/50 bg-[#0f1117] fixed left-0 top-0 bottom-0 z-10">
          <div className="flex flex-col w-full p-5">
            {/* Header */}
            <div className="mb-8">
              <button 
                onClick={onBack} 
                className="flex items-center gap-2 text-gray-500 hover:text-white transition-colors mb-5 group px-3 py-2 -mx-3 rounded-lg hover:bg-zinc-900"
              >
                <ArrowLeft className="w-4 h-4 group-hover:-translate-x-0.5 transition-transform" />
                <span className="text-xs uppercase tracking-wider">Voltar</span>
              </button>
              
              <div className="flex items-center gap-3 mb-2">
                <div className="w-9 h-9 rounded-lg bg-blue-500/10 flex items-center justify-center">
                  <LayoutDashboard className="w-4 h-4 text-blue-500" />
                </div>
                <h1 className="text-xl text-white">
                  Painel Admin
                </h1>
              </div>
            </div>

            {/* Navigation */}
            <nav className="flex-1 space-y-1">
              {tabs.map(tab => {
                const Icon = tab.icon;
                const isActive = activeTab === tab.id;
                return (
                  <button
                    key={tab.id}
                    onClick={() => setActiveTab(tab.id)}
                    className={`
                      w-full flex items-center gap-3 px-3 py-2.5 rounded-lg 
                      transition-all duration-200 text-left relative
                      ${isActive
                        ? 'bg-blue-500 text-white shadow-lg shadow-blue-500/20'
                        : 'text-gray-400 hover:text-white hover:bg-zinc-900'
                      }
                    `}
                  >
                    <Icon className="w-4 h-4" />
                    <span className="text-sm">{tab.label}</span>
                    {isActive && (
                      <div className="absolute left-0 top-1/2 -translate-y-1/2 w-0.5 h-8 bg-white/30 rounded-r" />
                    )}
                  </button>
                );
              })}
            </nav>

            {/* Footer */}
            <div className="pt-4 border-t border-zinc-800/50">
              <div className="text-xs text-gray-600 space-y-1">
                <div>Versão 1.0.0</div>
                <div>© 2025 Cinexprime</div>
              </div>
            </div>
          </div>
        </aside>

        {/* Main Content */}
        <main className="flex-1 lg:ml-60 pt-16 lg:pt-0">
          <div className="w-full min-h-screen">
            {/* Header Bar */}
            <div className="hidden lg:block sticky top-0 z-10 bg-[#0f1117]/80 backdrop-blur-xl border-b border-zinc-800/50">
              <div className="px-8 py-5 flex items-center justify-between">
                <h2 className="text-xl text-white">
                  {tabs.find(t => t.id === activeTab)?.label}
                </h2>
                
                {/* Bulk Edit Buttons */}
                <div className="flex items-center gap-3">
                  {activeTab === 'movies' && (
                    <button
                      onClick={() => setShowBulkEditMovies(true)}
                      className="flex items-center gap-2 px-4 py-2 bg-blue-600/10 border border-blue-600/20 text-blue-500 rounded-lg hover:bg-blue-600/20 transition-colors"
                    >
                      <Film className="w-4 h-4" />
                      Editar em Massa
                    </button>
                  )}
                  {activeTab === 'series' && (
                    <button
                      onClick={() => setShowBulkEditSeries(true)}
                      className="flex items-center gap-2 px-4 py-2 bg-blue-600/10 border border-blue-600/20 text-blue-500 rounded-lg hover:bg-blue-600/20 transition-colors"
                    >
                      <Tv className="w-4 h-4" />
                      Editar em Massa
                    </button>
                  )}
                </div>
              </div>
            </div>

            {/* Content */}
            <div className="px-4 lg:px-8 py-6 lg:py-8">
              <div className="max-w-5xl mx-auto">
                {activeTab === 'movies' && <MoviesAdmin />}
                {activeTab === 'series' && <SeriesAdmin />}
                {activeTab === 'users' && <UsersAdmin />}
                {activeTab === 'slider' && <SliderAdmin />}
              </div>
            </div>
          </div>
        </main>
      </div>
    </div>
  );
}