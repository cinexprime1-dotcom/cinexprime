import React, { useEffect, useState } from 'react';
import { projectId } from '../utils/supabase/info';
import { useAuth } from '../contexts/AuthContext';
import { Heart, Star, Film, Tv } from 'lucide-react';

interface FavoritesScreenProps {
  onSelectContent: (id: string, type: 'movie' | 'series', genre?: string) => void;
}

export function FavoritesScreen({ onSelectContent }: FavoritesScreenProps) {
  const [favorites, setFavorites] = useState<any[]>([]);
  const [movies, setMovies] = useState<any[]>([]);
  const [series, setSeries] = useState<any[]>([]);
  const [loading, setLoading] = useState(true);
  const [filter, setFilter] = useState<'all' | 'movies' | 'series'>('all');
  const { accessToken } = useAuth();

  useEffect(() => {
    loadFavorites();
  }, [accessToken]);

  async function loadFavorites() {
    if (!accessToken) {
      setLoading(false);
      return;
    }

    try {
      // Helper function to fetch with timeout
      const fetchWithTimeout = (url: string, options: any, timeout = 5000) => {
        return Promise.race([
          fetch(url, options),
          new Promise<Response>((_, reject) => 
            setTimeout(() => reject(new Error('Timeout')), timeout)
          )
        ]);
      };

      const [favRes, moviesRes, seriesRes] = await Promise.all([
        fetchWithTimeout(`https://${projectId}.supabase.co/functions/v1/make-server-7c0425fe/favorites`, {
          headers: { 'Authorization': `Bearer ${accessToken}` }
        }).catch(() => null),
        fetchWithTimeout(`https://${projectId}.supabase.co/functions/v1/make-server-7c0425fe/movies`, {
          headers: { 'Authorization': `Bearer ${accessToken}` }
        }).catch(() => null),
        fetchWithTimeout(`https://${projectId}.supabase.co/functions/v1/make-server-7c0425fe/series`, {
          headers: { 'Authorization': `Bearer ${accessToken}` }
        }).catch(() => null),
      ]);

      const favData = favRes ? await favRes.json().catch(() => []) : [];
      const moviesData = moviesRes ? await moviesRes.json().catch(() => []) : [];
      const seriesData = seriesRes ? await seriesRes.json().catch(() => []) : [];

      setFavorites(Array.isArray(favData) ? favData : []);
      setMovies(Array.isArray(moviesData) ? moviesData : []);
      setSeries(Array.isArray(seriesData) ? seriesData : []);
    } catch (error) {
      setFavorites([]);
      setMovies([]);
      setSeries([]);
    } finally {
      setLoading(false);
    }
  }

  if (loading) {
    return (
      <div className="min-h-screen bg-[#0f1117] flex items-center justify-center pb-24">
        <div className="flex flex-col items-center gap-3">
          <div className="w-12 h-12 border-4 border-blue-500/30 border-t-blue-500 rounded-full animate-spin" />
          <p className="text-gray-400">Carregando favoritos...</p>
        </div>
      </div>
    );
  }

  const favoriteMovies = favorites
    .filter(f => f.type === 'movie')
    .map(f => movies.find(m => m.id === f.contentId))
    .filter(Boolean);

  const favoriteSeries = favorites
    .filter(f => f.type === 'series')
    .map(f => series.find(s => s.id === f.contentId))
    .filter(Boolean);

  const displayMovies = filter === 'all' || filter === 'movies' ? favoriteMovies : [];
  const displaySeries = filter === 'all' || filter === 'series' ? favoriteSeries : [];
  const hasContent = displayMovies.length > 0 || displaySeries.length > 0;

  return (
    <div className="min-h-screen bg-[#0f1117] pb-24 w-full">
      <div className="p-6 space-y-6 w-full max-w-screen-xl mx-auto">
        {/* Header */}
        <div className="space-y-2">
          <h1 className="text-white text-3xl tracking-tight">Favoritos</h1>
          <p className="text-gray-400">
            {favorites.length === 0 
              ? 'Nenhum favorito adicionado ainda' 
              : `${favorites.length} ${favorites.length === 1 ? 'item' : 'itens'} na sua lista`
            }
          </p>
        </div>
        
        {favorites.length === 0 ? (
          <div className="flex flex-col items-center justify-center py-20 text-center">
            <div className="w-20 h-20 rounded-full bg-zinc-900/50 border border-zinc-800/50 flex items-center justify-center mb-4">
              <Heart className="w-10 h-10 text-gray-600" />
            </div>
            <h3 className="text-white text-lg mb-2">Sua lista está vazia</h3>
            <p className="text-gray-500 text-sm max-w-sm">Explore filmes e séries e adicione seus favoritos para assistir depois</p>
          </div>
        ) : (
          <div className="space-y-6">
            {/* Filter Buttons */}
            <div className="flex gap-2">
              <button
                onClick={() => setFilter('movies')}
                className={`flex-1 h-11 rounded-xl transition-all duration-300 flex items-center justify-center gap-2 ${
                  filter === 'movies'
                    ? 'bg-blue-600 text-white shadow-lg shadow-blue-600/20'
                    : 'bg-[#141419] border border-zinc-800/50 text-gray-400 hover:border-blue-500/30'
                }`}
              >
                <Film className="w-4 h-4" />
                <span>Apenas Filmes</span>
              </button>
              <button
                onClick={() => setFilter('series')}
                className={`flex-1 h-11 rounded-xl transition-all duration-300 flex items-center justify-center gap-2 ${
                  filter === 'series'
                    ? 'bg-blue-600 text-white shadow-lg shadow-blue-600/20'
                    : 'bg-[#141419] border border-zinc-800/50 text-gray-400 hover:border-blue-500/30'
                }`}
              >
                <Tv className="w-4 h-4" />
                <span>Apenas Séries</span>
              </button>
            </div>

            {!hasContent ? (
              <div className="flex flex-col items-center justify-center py-20 text-center">
                <div className="w-20 h-20 rounded-full bg-zinc-900/50 border border-zinc-800/50 flex items-center justify-center mb-4">
                  {filter === 'movies' ? <Film className="w-10 h-10 text-gray-600" /> : <Tv className="w-10 h-10 text-gray-600" />}
                </div>
                <h3 className="text-white text-lg mb-2">Nenhum {filter === 'movies' ? 'filme' : 'série'} favorito</h3>
                <p className="text-gray-500 text-sm max-w-sm">
                  Adicione {filter === 'movies' ? 'filmes' : 'séries'} aos favoritos para vê-los aqui
                </p>
              </div>
            ) : (
              <div className="space-y-8">
                {displayMovies.length > 0 && (
                  <div className="space-y-4">
                    <div className="flex items-center gap-3">
                      <Film className="w-5 h-5 text-blue-500" />
                      <h2 className="text-white text-xl">Filmes</h2>
                      <span className="text-gray-500 text-sm">({displayMovies.length})</span>
                    </div>
                    <div className="grid grid-cols-3 gap-3">
                      {displayMovies.map((movie: any) => (
                        <button
                          key={movie.id}
                          onClick={() => onSelectContent(movie.id, 'movie', movie.genre)}
                          className="group w-full"
                        >
                          <div className="relative rounded-xl overflow-hidden bg-[#141419] border border-zinc-800/50 transition-all duration-300 group-hover:border-blue-500/50 group-hover:shadow-lg group-hover:shadow-blue-500/10 group-hover:-translate-y-1">
                            <div className="aspect-[2/3] relative overflow-hidden">
                              <img
                                src={movie.posterUrl}
                                alt={movie.title}
                                className="w-full h-full object-cover transition-transform duration-500 group-hover:scale-110"
                              />
                              {movie.rating && typeof movie.rating === 'number' && (
                                <div className="absolute top-2 right-2 bg-black/80 backdrop-blur-sm rounded-lg px-2 py-1 flex items-center gap-1">
                                  <Star className="w-3 h-3 text-yellow-500 fill-yellow-500" />
                                  <span className="text-white text-xs">{movie.rating.toFixed(1)}</span>
                                </div>
                              )}
                              <div className="absolute top-2 left-2 bg-red-500/90 backdrop-blur-sm rounded-lg p-1.5">
                                <Heart className="w-3.5 h-3.5 text-white fill-white" />
                              </div>
                            </div>
                          </div>
                          <h3 className="mt-2 text-white text-sm truncate px-1">{movie.title}</h3>
                        </button>
                      ))}
                    </div>
                  </div>
                )}

                {displaySeries.length > 0 && (
                  <div className="space-y-4">
                    <div className="flex items-center gap-3">
                      <Tv className="w-5 h-5 text-blue-500" />
                      <h2 className="text-white text-xl">Séries</h2>
                      <span className="text-gray-500 text-sm">({displaySeries.length})</span>
                    </div>
                    <div className="grid grid-cols-3 gap-3">
                      {displaySeries.map((series: any) => (
                        <button
                          key={series.id}
                          onClick={() => onSelectContent(series.id, 'series')}
                          className="group w-full"
                        >
                          <div className="relative rounded-xl overflow-hidden bg-[#141419] border border-zinc-800/50 transition-all duration-300 group-hover:border-blue-500/50 group-hover:shadow-lg group-hover:shadow-blue-500/10 group-hover:-translate-y-1">
                            <div className="aspect-[2/3] relative overflow-hidden">
                              <img
                                src={series.posterUrl}
                                alt={series.title}
                                className="w-full h-full object-cover transition-transform duration-500 group-hover:scale-110"
                              />
                              {series.rating && typeof series.rating === 'number' && (
                                <div className="absolute top-2 right-2 bg-black/80 backdrop-blur-sm rounded-lg px-2 py-1 flex items-center gap-1">
                                  <Star className="w-3 h-3 text-yellow-500 fill-yellow-500" />
                                  <span className="text-white text-xs">{series.rating.toFixed(1)}</span>
                                </div>
                              )}
                              <div className="absolute top-2 left-2 bg-red-500/90 backdrop-blur-sm rounded-lg p-1.5">
                                <Heart className="w-3.5 h-3.5 text-white fill-white" />
                              </div>
                            </div>
                          </div>
                          <h3 className="mt-2 text-white text-sm truncate px-1">{series.title}</h3>
                        </button>
                      ))}
                    </div>
                  </div>
                )}
              </div>
            )}
          </div>
        )}
      </div>
    </div>
  );
}