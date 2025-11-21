import React, { useEffect, useState } from 'react';
import { projectId, publicAnonKey } from '../utils/supabase/info';
import { Input } from './ui/input';
import { Search, Star, Film, Tv } from 'lucide-react';

interface SearchScreenProps {
  onSelectContent: (id: string, type: 'movie' | 'series', genre?: string) => void;
}

export function SearchScreen({ onSelectContent }: SearchScreenProps) {
  const [query, setQuery] = useState('');
  const [movies, setMovies] = useState<any[]>([]);
  const [series, setSeries] = useState<any[]>([]);
  const [filteredMovies, setFilteredMovies] = useState<any[]>([]);
  const [filteredSeries, setFilteredSeries] = useState<any[]>([]);

  useEffect(() => {
    loadData();
  }, []);

  useEffect(() => {
    if (query.trim()) {
      const lowerQuery = query.toLowerCase();
      setFilteredMovies(movies.filter(m => 
        m.title?.toLowerCase().includes(lowerQuery)
      ));
      setFilteredSeries(series.filter(s => 
        s.title?.toLowerCase().includes(lowerQuery)
      ));
    } else {
      setFilteredMovies([]);
      setFilteredSeries([]);
    }
  }, [query, movies, series]);

  async function loadData() {
    try {
      const [moviesRes, seriesRes] = await Promise.all([
        fetch(`https://${projectId}.supabase.co/functions/v1/make-server-7c0425fe/movies`, {
          headers: { 'Authorization': `Bearer ${publicAnonKey}` }
        }),
        fetch(`https://${projectId}.supabase.co/functions/v1/make-server-7c0425fe/series`, {
          headers: { 'Authorization': `Bearer ${publicAnonKey}` }
        }),
      ]);

      const moviesData = await moviesRes.json();
      const seriesData = await seriesRes.json();

      setMovies(moviesData);
      setSeries(seriesData);
    } catch (error) {
    }
  }

  return (
    <div className="min-h-screen bg-[#0f1117] pb-24 w-full">
      <div className="p-6 space-y-6 w-full max-w-screen-xl mx-auto">
        {/* Header */}
        <div className="space-y-2">
          <h1 className="text-white text-3xl tracking-tight">Pesquisa</h1>
          <p className="text-gray-400">Encontre seus filmes e séries favoritos</p>
        </div>
        
        {/* Search Bar */}
        <div className="relative">
          <Search className="absolute left-4 top-1/2 -translate-y-1/2 w-5 h-5 text-gray-500 pointer-events-none z-10" />
          <Input
            type="text"
            placeholder="Digite o nome do filme ou série..."
            value={query}
            onChange={(e) => setQuery(e.target.value)}
            className="pl-12 pr-4 h-12 bg-zinc-900 border-zinc-800 text-white placeholder:text-gray-600 rounded-lg focus:border-blue-500 transition-colors"
          />
        </div>

        {query.trim() && (
          <div className="space-y-8 pt-2">
            {filteredMovies.length > 0 && (
              <div className="space-y-4">
                <div className="flex items-center gap-3">
                  <Film className="w-5 h-5 text-blue-500" />
                  <h2 className="text-white text-xl">Filmes</h2>
                  <span className="text-gray-500 text-sm">({filteredMovies.length})</span>
                </div>
                <div className="grid grid-cols-3 gap-3">
                  {filteredMovies.map((movie) => (
                    <button
                      key={movie.id}
                      onClick={() => onSelectContent(movie.id, 'movie')}
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
                        </div>
                      </div>
                      <h3 className="mt-2 text-white text-sm truncate px-1">{movie.title}</h3>
                    </button>
                  ))}
                </div>
              </div>
            )}

            {filteredSeries.length > 0 && (
              <div className="space-y-4">
                <div className="flex items-center gap-3">
                  <Tv className="w-5 h-5 text-blue-500" />
                  <h2 className="text-white text-xl">Séries</h2>
                  <span className="text-gray-500 text-sm">({filteredSeries.length})</span>
                </div>
                <div className="grid grid-cols-3 gap-3">
                  {filteredSeries.map((series) => (
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
                        </div>
                      </div>
                      <h3 className="mt-2 text-white text-sm truncate px-1">{series.title}</h3>
                    </button>
                  ))}
                </div>
              </div>
            )}

            {filteredMovies.length === 0 && filteredSeries.length === 0 && (
              <div className="flex flex-col items-center justify-center py-20 text-center">
                <div className="w-20 h-20 rounded-full bg-zinc-900/50 border border-zinc-800/50 flex items-center justify-center mb-4">
                  <Search className="w-10 h-10 text-gray-600" />
                </div>
                <h3 className="text-white text-lg mb-2">Nenhum resultado encontrado</h3>
                <p className="text-gray-500 text-sm max-w-sm">Tente buscar por outro título ou verifique a ortografia</p>
              </div>
            )}
          </div>
        )}

        {!query.trim() && (
          <div className="flex flex-col items-center justify-center py-20 text-center">
            <div className="w-20 h-20 rounded-full bg-zinc-900/50 border border-zinc-800/50 flex items-center justify-center mb-4">
              <Search className="w-10 h-10 text-gray-600" />
            </div>
            <h3 className="text-white text-lg mb-2">Comece a pesquisar</h3>
            <p className="text-gray-500 text-sm max-w-sm">Digite o nome de um filme ou série para encontrar seu conteúdo favorito</p>
          </div>
        )}
      </div>
    </div>
  );
}