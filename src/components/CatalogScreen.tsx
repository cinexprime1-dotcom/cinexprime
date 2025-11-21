import React, { useEffect, useState } from 'react';
import { projectId, publicAnonKey } from '../utils/supabase/info';
import { Tabs, TabsContent, TabsList, TabsTrigger } from './ui/tabs';
import { Star, Grid, Film, Tv } from 'lucide-react';

interface CatalogScreenProps {
  onSelectContent: (id: string, type: 'movie' | 'series', genre?: string) => void;
}

export function CatalogScreen({ onSelectContent }: CatalogScreenProps) {
  const [movies, setMovies] = useState<any[]>([]);
  const [series, setSeries] = useState<any[]>([]);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    loadData();
  }, []);

  async function loadData() {
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

      const [moviesRes, seriesRes] = await Promise.all([
        fetchWithTimeout(`https://${projectId}.supabase.co/functions/v1/make-server-7c0425fe/movies`, {
          headers: { 'Authorization': `Bearer ${publicAnonKey}` }
        }).catch(() => null),
        fetchWithTimeout(`https://${projectId}.supabase.co/functions/v1/make-server-7c0425fe/series`, {
          headers: { 'Authorization': `Bearer ${publicAnonKey}` }
        }).catch(() => null),
      ]);

      const moviesData = moviesRes ? await moviesRes.json().catch(() => []) : [];
      const seriesData = seriesRes ? await seriesRes.json().catch(() => []) : [];

      setMovies(Array.isArray(moviesData) ? moviesData : []);
      setSeries(Array.isArray(seriesData) ? seriesData : []);
    } catch (error) {
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
          <p className="text-gray-400">Carregando catálogo...</p>
        </div>
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-[#0f1117] pb-24 w-full">
      <div className="p-6 space-y-6 w-full max-w-screen-xl mx-auto">
        {/* Header */}
        <div className="space-y-2">
          <h1 className="text-white text-3xl tracking-tight">Catálogo</h1>
          <p className="text-gray-400">Explore toda nossa coleção de conteúdo</p>
        </div>
        
        <Tabs defaultValue="movies" className="w-full">
          <TabsList className="w-full grid grid-cols-2 mb-6 bg-zinc-900 border border-zinc-800 rounded-lg p-1 h-auto">
            <TabsTrigger 
              value="movies"
              className="rounded-lg py-3 text-gray-400 data-[state=active]:bg-blue-500 data-[state=active]:text-white transition-colors"
            >
              <Film className="w-4 h-4 mr-2" />
              Filmes ({movies.length})
            </TabsTrigger>
            <TabsTrigger 
              value="series"
              className="rounded-lg py-3 text-gray-400 data-[state=active]:bg-blue-500 data-[state=active]:text-white transition-colors"
            >
              <Tv className="w-4 h-4 mr-2" />
              Séries ({series.length})
            </TabsTrigger>
          </TabsList>

          <TabsContent value="movies" className="mt-0">
            {movies.length === 0 ? (
              <div className="flex flex-col items-center justify-center py-20 text-center">
                <div className="w-20 h-20 rounded-full bg-zinc-900/50 border border-zinc-800/50 flex items-center justify-center mb-4">
                  <Film className="w-10 h-10 text-gray-600" />
                </div>
                <h3 className="text-white text-lg mb-2">Nenhum filme disponível</h3>
                <p className="text-gray-500 text-sm max-w-sm">Os filmes aparecerão aqui quando forem adicionados</p>
              </div>
            ) : (
              <div className="grid grid-cols-3 gap-3">
                {movies.map((movie) => (
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
            )}
          </TabsContent>

          <TabsContent value="series" className="mt-0">
            {series.length === 0 ? (
              <div className="flex flex-col items-center justify-center py-20 text-center">
                <div className="w-20 h-20 rounded-full bg-zinc-900/50 border border-zinc-800/50 flex items-center justify-center mb-4">
                  <Tv className="w-10 h-10 text-gray-600" />
                </div>
                <h3 className="text-white text-lg mb-2">Nenhuma série disponível</h3>
                <p className="text-gray-500 text-sm max-w-sm">As séries aparecerão aqui quando forem adicionadas</p>
              </div>
            ) : (
              <div className="grid grid-cols-3 gap-3">
                {series.map((s) => (
                  <button
                    key={s.id}
                    onClick={() => onSelectContent(s.id, 'series')}
                    className="group w-full"
                  >
                    <div className="relative rounded-xl overflow-hidden bg-[#141419] border border-zinc-800/50 transition-all duration-300 group-hover:border-blue-500/50 group-hover:shadow-lg group-hover:shadow-blue-500/10 group-hover:-translate-y-1">
                      <div className="aspect-[2/3] relative overflow-hidden">
                        <img
                          src={s.posterUrl}
                          alt={s.title}
                          className="w-full h-full object-cover transition-transform duration-500 group-hover:scale-110"
                        />
                        {s.rating && typeof s.rating === 'number' && (
                          <div className="absolute top-2 right-2 bg-black/80 backdrop-blur-sm rounded-lg px-2 py-1 flex items-center gap-1">
                            <Star className="w-3 h-3 text-yellow-500 fill-yellow-500" />
                            <span className="text-white text-xs">{s.rating.toFixed(1)}</span>
                          </div>
                        )}
                      </div>
                    </div>
                    <h3 className="mt-2 text-white text-sm truncate px-1">{s.title}</h3>
                  </button>
                ))}
              </div>
            )}
          </TabsContent>
        </Tabs>
      </div>
    </div>
  );
}