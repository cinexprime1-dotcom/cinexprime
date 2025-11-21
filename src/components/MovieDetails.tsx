import React, { useEffect, useState } from 'react';
import { projectId, publicAnonKey } from '../utils/supabase/info';
import { useAuth } from '../contexts/AuthContext';
import { Heart, ArrowLeft, Star, Clock, Calendar, Play } from 'lucide-react';
import { Button } from './ui/button';
import { VideoPlayerProxy } from './VideoPlayerProxy';

interface MovieDetailsProps {
  movieId: string;
  onBack: () => void;
  genre?: string;
}

export function MovieDetails({ movieId, onBack, genre }: MovieDetailsProps) {
  const [movie, setMovie] = useState<any>(null);
  const [isFavorite, setIsFavorite] = useState(false);
  const [loading, setLoading] = useState(true);
  const [isWatching, setIsWatching] = useState(false);
  const { accessToken } = useAuth();

  useEffect(() => {
    loadMovie();
    checkFavorite();
  }, [movieId]);

  async function loadMovie() {
    try {
      const response = await fetch(
        `https://${projectId}.supabase.co/functions/v1/make-server-7c0425fe/movies/${movieId}`,
        {
          headers: { 'Authorization': `Bearer ${publicAnonKey}` }
        }
      );
      const data = await response.json();
      setMovie(data);
    } catch (error) {
    } finally {
      setLoading(false);
    }
  }

  async function checkFavorite() {
    if (!accessToken) return;
    
    try {
      const response = await fetch(
        `https://${projectId}.supabase.co/functions/v1/make-server-7c0425fe/favorites`,
        {
          headers: { 'Authorization': `Bearer ${accessToken}` }
        }
      );
      const favorites = await response.json();
      setIsFavorite(favorites.some((f: any) => f.contentId === movieId));
    } catch (error) {
    }
  }

  async function toggleFavorite() {
    if (!accessToken) return;

    try {
      if (isFavorite) {
        await fetch(
          `https://${projectId}.supabase.co/functions/v1/make-server-7c0425fe/favorites/${movieId}`,
          {
            method: 'DELETE',
            headers: { 'Authorization': `Bearer ${accessToken}` }
          }
        );
      } else {
        await fetch(
          `https://${projectId}.supabase.co/functions/v1/make-server-7c0425fe/favorites`,
          {
            method: 'POST',
            headers: {
              'Content-Type': 'application/json',
              'Authorization': `Bearer ${accessToken}`
            },
            body: JSON.stringify({ contentId: movieId, type: 'movie' })
          }
        );
      }
      setIsFavorite(!isFavorite);
    } catch (error) {
    }
  }

  if (isWatching && movie?.videoUrl) {
    return (
      <VideoPlayerProxy
        videoUrl={movie.videoUrl}
        title={movie.title}
        onClose={() => setIsWatching(false)}
      />
    );
  }

  if (loading) {
    return (
      <div className="min-h-screen bg-[#0f1117] flex items-center justify-center">
        <div className="text-gray-400">Carregando...</div>
      </div>
    );
  }

  if (!movie) {
    return (
      <div className="min-h-screen bg-[#0f1117] flex items-center justify-center">
        <div className="text-gray-400">Filme não encontrado</div>
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-[#0f1117] pb-20">
      {/* Banner */}
      <div className="p-3 pt-3">
        <div className="relative rounded-xl overflow-hidden border-2 border-zinc-800/60">
          <div className="aspect-video relative">
            <img
              src={movie.bannerUrl}
              alt={movie.title}
              className="w-full h-full object-cover"
            />
          </div>
        </div>
        <button
          onClick={onBack}
          className="absolute top-6 left-6 bg-zinc-900/90 backdrop-blur-sm p-2.5 rounded-full text-white transition-all duration-300 hover:scale-110"
        >
          <ArrowLeft className="w-5 h-5" />
        </button>
      </div>

      <div className="p-3 space-y-4">
        {/* Título com destaque */}
        <div className="bg-zinc-900/40 border border-zinc-800/60 rounded-xl p-4">
          <h1 className="text-2xl text-white">{movie.title}</h1>
        </div>
        
        {/* Informações em linha única */}
        <div className="bg-zinc-900/40 border border-zinc-800/60 rounded-xl p-4">
          <div className="grid grid-cols-4 gap-3">
            <div className="flex flex-col items-center justify-center gap-2">
              <div className="bg-yellow-500/10 p-2 rounded-lg">
                <Star className="w-4 h-4 fill-yellow-500 text-yellow-500" />
              </div>
              <span className="text-sm text-white">{movie.rating}</span>
              <span className="text-xs text-gray-500">Avaliação</span>
            </div>
            
            <div className="flex flex-col items-center justify-center gap-2">
              <div className="bg-purple-500/10 p-2 rounded-lg">
                <Calendar className="w-4 h-4 text-purple-500" />
              </div>
              <span className="text-sm text-white">{movie.year}</span>
              <span className="text-xs text-gray-500">Ano</span>
            </div>
            
            <div className="flex flex-col items-center justify-center gap-2">
              <div className="bg-blue-500/10 p-2 rounded-lg">
                <Clock className="w-4 h-4 text-blue-500" />
              </div>
              <span className="text-sm text-white">{movie.duration}</span>
              <span className="text-xs text-gray-500">Minutos</span>
            </div>
            
            {(genre || movie.genre) && (
              <div className="flex flex-col items-center justify-center gap-2">
                <div className="bg-green-500/10 p-2 rounded-lg">
                  <Play className="w-4 h-4 text-green-500" />
                </div>
                <span className="text-sm text-white truncate w-full text-center">{genre || movie.genre.split(',')[0].trim()}</span>
                <span className="text-xs text-gray-500">Gênero</span>
              </div>
            )}
          </div>
        </div>

        {/* Descrição */}
        <div className="bg-zinc-900/40 border border-zinc-800/60 rounded-xl p-4">
          <h3 className="text-xs text-gray-400 mb-2">Sinopse</h3>
          <p className="text-sm text-gray-200 leading-relaxed">{movie.description}</p>
        </div>

        {/* Botões de ação */}
        <div className="flex gap-3">
          <button
            onClick={toggleFavorite}
            className="p-3 bg-zinc-900/40 border border-zinc-800/60 rounded-xl transition-all duration-300 hover:scale-105 hover:bg-zinc-900/60"
          >
            <Heart
              className={`w-6 h-6 transition-colors duration-300 ${
                isFavorite ? 'fill-red-600 text-red-600' : 'text-gray-400'
              }`}
            />
          </button>
          
          {movie.videoUrl && (
            <Button
              onClick={() => setIsWatching(true)}
              className="flex-1 bg-blue-600 hover:bg-blue-700 text-white rounded-xl h-11 transition-all duration-300 hover:scale-[1.02] shadow-lg shadow-blue-600/20"
            >
              <Play className="w-4 h-4 mr-2" />
              Assistir Agora
            </Button>
          )}
        </div>
      </div>
    </div>
  );
}