import React, { useEffect, useState } from 'react';
import { projectId, publicAnonKey } from '../utils/supabase/info';
import { useAuth } from '../contexts/AuthContext';
import { Heart, ArrowLeft, Star, Calendar, Play } from 'lucide-react';
import { Button } from './ui/button';
import { VideoPlayerProxy } from './VideoPlayerProxy';

interface SeriesDetailsProps {
  seriesId: string;
  onBack: () => void;
  genre?: string;
}

export function SeriesDetails({ seriesId, onBack, genre }: SeriesDetailsProps) {
  const [series, setSeries] = useState<any>(null);
  const [selectedSeason, setSelectedSeason] = useState<number>(1);
  const [isFavorite, setIsFavorite] = useState(false);
  const [loading, setLoading] = useState(true);
  const [showAllEpisodes, setShowAllEpisodes] = useState(false);
  const [watchingVideo, setWatchingVideo] = useState<{ url: string; title: string } | null>(null);
  const { accessToken } = useAuth();

  useEffect(() => {
    loadSeries();
    checkIfFavorite();
  }, [seriesId]);

  async function loadSeries() {
    try {
      const response = await fetch(
        `https://${projectId}.supabase.co/functions/v1/make-server-7c0425fe/series/${seriesId}`,
        {
          headers: { 'Authorization': `Bearer ${publicAnonKey}` }
        }
      );
      const data = await response.json();
      setSeries(data);
      if (data.seasons && data.seasons.length > 0) {
        setSelectedSeason(data.seasons[0].seasonNumber);
      }
    } catch (error) {
    } finally {
      setLoading(false);
    }
  }

  async function checkIfFavorite() {
    if (!accessToken) return;

    try {
      const response = await fetch(
        `https://${projectId}.supabase.co/functions/v1/make-server-7c0425fe/favorites`,
        {
          headers: { 'Authorization': `Bearer ${accessToken}` }
        }
      );
      const favorites = await response.json();
      setIsFavorite(favorites.some((f: any) => f.contentId === seriesId));
    } catch (error) {
    }
  }

  async function toggleFavorite() {
    if (!accessToken) return;

    try {
      if (isFavorite) {
        await fetch(
          `https://${projectId}.supabase.co/functions/v1/make-server-7c0425fe/favorites/${seriesId}`,
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
            body: JSON.stringify({ contentId: seriesId, type: 'series' })
          }
        );
      }
      setIsFavorite(!isFavorite);
    } catch (error) {
    }
  }

  if (watchingVideo) {
    return (
      <VideoPlayerProxy
        videoUrl={watchingVideo.url}
        title={watchingVideo.title}
        onClose={() => setWatchingVideo(null)}
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

  if (!series) {
    return (
      <div className="min-h-screen bg-[#0f1117] flex items-center justify-center">
        <div className="text-gray-400">Série não encontrada</div>
      </div>
    );
  }

  const currentSeason = series.seasons?.find((s: any) => s.seasonNumber === selectedSeason);

  if (showAllEpisodes && currentSeason) {
    return (
      <div className="min-h-screen bg-[#0f1117] pb-20">
        <div className="p-3 space-y-4">
          {/* Header */}
          <div className="flex items-center gap-3">
            <button
              onClick={() => setShowAllEpisodes(false)}
              className="bg-zinc-900/90 backdrop-blur-sm p-2.5 rounded-full text-white transition-all duration-300 hover:scale-110"
            >
              <ArrowLeft className="w-5 h-5" />
            </button>
            <div>
              <h2 className="text-xl text-white">{series.title}</h2>
              <p className="text-sm text-gray-400">Temporada {selectedSeason}</p>
            </div>
          </div>

          {/* Grid de episódios */}
          <div className="grid grid-cols-3 gap-3">
            {currentSeason.episodes.map((episode: any) => (
              <button
                key={episode.episodeNumber}
                onClick={() => episode.videoUrl && setWatchingVideo({ url: episode.videoUrl, title: `Episódio ${episode.episodeNumber} - ${series.title}` })}
                className="aspect-square bg-zinc-900/60 border-2 border-zinc-700 rounded-xl flex items-center justify-center transition-all duration-300 hover:border-blue-500 hover:scale-105 hover:bg-zinc-800/60 hover:shadow-lg hover:shadow-blue-500/20"
              >
                <span className="text-2xl text-white">{episode.episodeNumber}</span>
              </button>
            ))}
          </div>
        </div>
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
              src={series.bannerUrl}
              alt={series.title}
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
          <h1 className="text-2xl text-white">{series.title}</h1>
        </div>
        
        {/* Informações em linha única */}
        <div className="bg-zinc-900/40 border border-zinc-800/60 rounded-xl p-4">
          <div className="flex items-center justify-between gap-3">
            {/* Avaliação */}
            <div className="flex flex-col items-center justify-center gap-1.5 flex-1">
              <div className="bg-yellow-500/10 p-2 rounded-lg">
                <Star className="w-4 h-4 fill-yellow-500 text-yellow-500" />
              </div>
              <span className="text-sm text-white">{series.rating}</span>
              <span className="text-xs text-gray-500">Avaliação</span>
            </div>

            {/* Divisor */}
            <div className="w-px h-16 bg-zinc-800" />
            
            {/* Temporadas */}
            <div className="flex flex-col items-center justify-center gap-1.5 flex-1">
              <div className="bg-blue-500/10 p-2 rounded-lg">
                <Play className="w-4 h-4 text-blue-500" />
              </div>
              <span className="text-sm text-white">{series.seasons?.length || 0}</span>
              <span className="text-xs text-gray-500">Temporadas</span>
            </div>

            {/* Divisor */}
            <div className="w-px h-16 bg-zinc-800" />
            
            {/* Ano */}
            <div className="flex flex-col items-center justify-center gap-1.5 flex-1">
              <div className="bg-purple-500/10 p-2 rounded-lg">
                <Calendar className="w-4 h-4 text-purple-500" />
              </div>
              <span className="text-sm text-white">{series.year}</span>
              <span className="text-xs text-gray-500">Ano</span>
            </div>

            {/* Divisor */}
            {(genre || series.genre) && <div className="w-px h-16 bg-zinc-800" />}
            
            {/* Gênero */}
            {(genre || series.genre) && (
              <div className="flex flex-col items-center justify-center gap-1.5 flex-1">
                <div className="bg-green-500/10 p-2 rounded-lg">
                  <Play className="w-4 h-4 text-green-500" />
                </div>
                <span className="text-sm text-white truncate max-w-full px-1">{genre || series.genre.split(',')[0].trim()}</span>
                <span className="text-xs text-gray-500">Gênero</span>
              </div>
            )}
          </div>
        </div>

        {/* Descrição */}
        <div className="bg-zinc-900/40 border border-zinc-800/60 rounded-xl p-4">
          <h3 className="text-xs text-gray-400 mb-2">Sinopse</h3>
          <p className="text-sm text-gray-200 leading-relaxed">{series.description}</p>
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
          
          {series.videoUrl && (
            <Button
              onClick={() => setWatchingVideo({ url: series.videoUrl, title: series.title })}
              className="flex-1 bg-blue-600 hover:bg-blue-700 text-white rounded-xl h-11 transition-all duration-300 hover:scale-[1.02] shadow-lg shadow-blue-600/20"
            >
              <Play className="w-4 h-4 mr-2" />
              Assistir Agora
            </Button>
          )}
        </div>

        {series.seasons && series.seasons.length > 0 && (
          <div className="bg-zinc-900/40 border border-zinc-800/60 rounded-xl p-3">
            <select
              value={selectedSeason}
              onChange={(e) => setSelectedSeason(parseInt(e.target.value))}
              className="w-full bg-transparent text-white outline-none cursor-pointer"
            >
              {series.seasons.map((season: any) => (
                <option
                  key={season.seasonNumber}
                  value={season.seasonNumber}
                  className="bg-zinc-900 text-white"
                >
                  Temporada {season.seasonNumber}
                </option>
              ))}
            </select>
          </div>
        )}

        {currentSeason && currentSeason.episodes && (
          <div className="space-y-3">
            <div className="flex items-center justify-between">
              <h3 className="text-lg text-white">Episódios</h3>
              <button
                onClick={() => setShowAllEpisodes(true)}
                className="text-sm text-blue-500 hover:text-blue-400 transition-colors"
              >
                Ver tudo
              </button>
            </div>
            
            {/* Carrossel horizontal de episódios */}
            <div className="flex gap-3 overflow-x-auto pb-2 scrollbar-hide">
              {currentSeason.episodes.map((episode: any) => (
                <button
                  key={episode.episodeNumber}
                  onClick={() => episode.videoUrl && setWatchingVideo({ url: episode.videoUrl, title: `Episódio ${episode.episodeNumber} - ${series.title}` })}
                  className="flex-shrink-0 w-20 h-20 bg-zinc-900/60 border-2 border-zinc-700 rounded-xl flex items-center justify-center transition-all duration-300 hover:border-blue-500 hover:scale-105 hover:bg-zinc-800/60 hover:shadow-lg hover:shadow-blue-500/20"
                >
                  <span className="text-2xl text-white">{episode.episodeNumber}</span>
                </button>
              ))}
            </div>
          </div>
        )}
      </div>
    </div>
  );
}