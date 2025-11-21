import React, { useState, useEffect } from 'react';
import { AuthProvider, useAuth } from './contexts/AuthContext';
import { LoadingScreen } from './components/LoadingScreen';
import { AuthScreen } from './components/AuthScreen';
import { HomeScreen } from './components/HomeScreen';
import { SearchScreen } from './components/SearchScreen';
import { FavoritesScreen } from './components/FavoritesScreen';
import { CatalogScreen } from './components/CatalogScreen';
import { ProfileScreen } from './components/ProfileScreen';
import { MovieDetails } from './components/MovieDetails';
import { SeriesDetails } from './components/SeriesDetails';
import { AdminPanel } from './components/admin/AdminPanel';
import { BottomNav } from './components/BottomNav';

type Page = 'home' | 'search' | 'favorites' | 'catalog' | 'profile' | 'admin';
type ContentView = { type: 'movie' | 'series'; id: string; genre?: string } | null;

function AppContent() {
  const [showLoading, setShowLoading] = useState(true);
  const [currentPage, setCurrentPage] = useState<Page>('home');
  const [contentView, setContentView] = useState<ContentView>(null);
  const { user, loading: authLoading } = useAuth();

  useEffect(() => {
    const meta = document.createElement('meta');
    meta.name = 'viewport';
    meta.content = 'width=device-width, initial-scale=1, maximum-scale=1, user-scalable=no, viewport-fit=cover';
    document.head.appendChild(meta);

    const themeColor = document.createElement('meta');
    themeColor.name = 'theme-color';
    themeColor.content = '#0f1117';
    document.head.appendChild(themeColor);

    const appleMobile = document.createElement('meta');
    appleMobile.name = 'apple-mobile-web-app-capable';
    appleMobile.content = 'yes';
    document.head.appendChild(appleMobile);

    const appleStatus = document.createElement('meta');
    appleStatus.name = 'apple-mobile-web-app-status-bar-style';
    appleStatus.content = 'black-translucent';
    document.head.appendChild(appleStatus);

    const mobileCapable = document.createElement('meta');
    mobileCapable.name = 'mobile-web-app-capable';
    mobileCapable.content = 'yes';
    document.head.appendChild(mobileCapable);

    const handleContextMenu = (e: MouseEvent) => {
      e.preventDefault();
      return false;
    };

    const handleKeyDown = (e: KeyboardEvent) => {
      if (
        (e.ctrlKey || e.metaKey) && 
        (e.key === 'c' || e.key === 's' || e.key === 'u' || e.key === 'p')
      ) {
        e.preventDefault();
        return false;
      }
      if (e.key === 'PrintScreen') {
        e.preventDefault();
        return false;
      }
    };

    document.addEventListener('contextmenu', handleContextMenu);
    document.addEventListener('keydown', handleKeyDown);

    const timer = setTimeout(() => {
      setShowLoading(false);
    }, 5000);

    return () => {
      clearTimeout(timer);
      document.removeEventListener('contextmenu', handleContextMenu);
      document.removeEventListener('keydown', handleKeyDown);
    };
  }, []);

  function handleSelectContent(id: string, type: 'movie' | 'series', genre?: string) {
    setContentView({ id, type, genre });
  }

  function handleBackFromContent() {
    setContentView(null);
  }

  function handleNavigate(page: Page) {
    setCurrentPage(page);
    setContentView(null);
  }

  function handleLoadingComplete() {
    setShowLoading(false);
  }

  if (showLoading) {
    return <LoadingScreen onComplete={handleLoadingComplete} />;
  }

  if (authLoading) {
    return (
      <div className="min-h-screen bg-[#0f1117] flex items-center justify-center">
        <div className="text-gray-400">Carregando...</div>
      </div>
    );
  }

  if (!user) {
    return <AuthScreen />;
  }

  if (contentView) {
    if (contentView.type === 'movie') {
      return <MovieDetails movieId={contentView.id} onBack={handleBackFromContent} genre={contentView.genre} />;
    } else {
      return <SeriesDetails seriesId={contentView.id} onBack={handleBackFromContent} genre={contentView.genre} />;
    }
  }

  if (currentPage === 'admin') {
    return <AdminPanel onBack={() => handleNavigate('profile')} />;
  }

  return (
    <div className="min-h-screen bg-[#0f1117]">
      {currentPage === 'home' && (
        <HomeScreen onSelectContent={handleSelectContent} />
      )}
      {currentPage === 'search' && (
        <SearchScreen onSelectContent={handleSelectContent} />
      )}
      {currentPage === 'favorites' && (
        <FavoritesScreen onSelectContent={handleSelectContent} />
      )}
      {currentPage === 'catalog' && (
        <CatalogScreen onSelectContent={handleSelectContent} />
      )}
      {currentPage === 'profile' && (
        <ProfileScreen onNavigateToAdmin={() => handleNavigate('admin')} />
      )}

      <BottomNav active={currentPage} onNavigate={(page) => handleNavigate(page as Page)} />
    </div>
  );
}

export default function App() {
  return (
    <AuthProvider>
      <AppContent />
    </AuthProvider>
  );
}