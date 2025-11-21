import React, { useEffect, useState } from 'react';
import { projectId } from '../../utils/supabase/info';
import { useAuth } from '../../contexts/AuthContext';
import { Button } from '../ui/button';
import { Input } from '../ui/input';
import { Checkbox } from '../ui/checkbox';
import { Plus, Search, Edit, Trash2, Save, X, ChevronDown, Tv, Loader2, Star } from 'lucide-react';
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogTrigger } from '../ui/dialog';
import { toast } from 'sonner';

export function SeriesAdmin() {
  const [series, setSeries] = useState<any[]>([]);
  const [loading, setLoading] = useState(true);
  const [editingSeries, setEditingSeries] = useState<any>(null);
  const [searchQuery, setSearchQuery] = useState('');
  const [filterQuery, setFilterQuery] = useState('');
  const [tmdbResults, setTmdbResults] = useState<any[]>([]);
  const [searchingTmdb, setSearchingTmdb] = useState(false);
  const [isDialogOpen, setIsDialogOpen] = useState(false);
  const [expandedSeasons, setExpandedSeasons] = useState<number[]>([]);
  const { accessToken } = useAuth();

  const categories = ['Séries ~ Lançamentos', 'Séries ~ Ação', 'Séries ~ Terror', 'Séries ~ Crime', 'Séries ~ Drama'];

  // Helper function to map TMDB genres to app categories
  function mapGenreToCategory(genres: any[]): string[] {
    const availableCategories = ['Séries ~ Ação', 'Séries ~ Terror', 'Séries ~ Crime', 'Séries ~ Drama'];
    
    if (!genres || genres.length === 0) {
      return ['Séries ~ Sem categoria'];
    }
    
    // Map genre names to our categories
    const genreMap: { [key: string]: string } = {
      'ação': 'Séries ~ Ação',
      'action': 'Séries ~ Ação',
      'terror': 'Séries ~ Terror',
      'horror': 'Séries ~ Terror',
      'crime': 'Séries ~ Crime',
      'thriller': 'Séries ~ Crime',
      'mistério': 'Séries ~ Crime',
      'mystery': 'Séries ~ Crime',
      'drama': 'Séries ~ Drama'
    };
    
    // Try to find the first genre that matches an available category
    for (const genre of genres) {
      const genreName = genre.name?.toLowerCase() || '';
      
      for (const [key, value] of Object.entries(genreMap)) {
        if (genreName.includes(key) && availableCategories.includes(value)) {
          return [value]; // Return only the first matching category
        }
      }
    }
    
    // If no match found, use "Sem categoria"
    return ['Séries ~ Sem categoria'];
  }

  // Helper function to check if content is a recent release (within 1 month)
  function isRecentRelease(releaseDate: string): boolean {
    if (!releaseDate) return false;
    
    const release = new Date(releaseDate);
    const now = new Date();
    const oneMonthAgo = new Date();
    oneMonthAgo.setMonth(oneMonthAgo.getMonth() - 1);
    
    return release >= oneMonthAgo && release <= now;
  }

  useEffect(() => {
    loadSeries();
  }, []);

  async function loadSeries() {
    try {
      const response = await fetch(
        `https://${projectId}.supabase.co/functions/v1/make-server-7c0425fe/series`,
        {
          headers: { 'Authorization': `Bearer ${accessToken}` }
        }
      );
      const data = await response.json();
      setSeries(data);
    } catch (error) {
      console.error('Error loading series:', error);
    } finally {
      setLoading(false);
    }
  }

  async function searchTmdb() {
    if (!searchQuery.trim()) return;

    setSearchingTmdb(true);
    try {
      const response = await fetch(
        `https://${projectId}.supabase.co/functions/v1/make-server-7c0425fe/tmdb/search/tv?query=${encodeURIComponent(searchQuery)}`,
        {
          headers: { 'Authorization': `Bearer ${accessToken}` }
        }
      );
      const data = await response.json();
      setTmdbResults(data.results || []);
    } catch (error) {
      console.error('Error searching TMDB:', error);
    } finally {
      setSearchingTmdb(false);
    }
  }

  async function selectTmdbSeries(tmdbSeries: any) {
    try {
      const response = await fetch(
        `https://${projectId}.supabase.co/functions/v1/make-server-7c0425fe/tmdb/tv/${tmdbSeries.id}`,
        {
          headers: { 'Authorization': `Bearer ${accessToken}` }
        }
      );
      const details = await response.json();

      // Auto-categorize based on genres
      const autoCategories = mapGenreToCategory(details.genres);
      
      // Add to releases if within 1 month
      if (isRecentRelease(details.first_air_date)) {
        if (!autoCategories.includes('Séries ~ Lançamentos')) {
          autoCategories.unshift('Séries ~ Lançamentos');
        }
      }

      setEditingSeries({
        tmdbId: details.id,
        title: details.name,
        description: details.overview,
        posterUrl: `https://image.tmdb.org/t/p/w500${details.poster_path}`,
        bannerUrl: `https://image.tmdb.org/t/p/original${details.backdrop_path}`,
        year: details.first_air_date?.split('-')[0],
        rating: details.vote_average?.toFixed(1),
        genre: details.genres?.map((g: any) => g.name).join(', '),
        releaseDate: details.first_air_date,
        tmdbGenres: details.genres,
        categories: autoCategories,
        inSlider: false,
        seasons: details.seasons
          ?.filter((s: any) => s.season_number > 0)
          .map((s: any) => ({
            seasonNumber: s.season_number,
            name: s.name,
            enabled: false,
            episodes: []
          })) || []
      });
      setTmdbResults([]);
      setSearchQuery('');
      setIsDialogOpen(false);
      setExpandedSeasons([]);
    } catch (error) {
      console.error('Error loading series details:', error);
    }
  }

  async function toggleSeason(seasonNumber: number) {
    const season = editingSeries.seasons.find((s: any) => s.seasonNumber === seasonNumber);
    
    if (!season.enabled) {
      try {
        const response = await fetch(
          `https://${projectId}.supabase.co/functions/v1/make-server-7c0425fe/tmdb/tv/${editingSeries.tmdbId}/season/${seasonNumber}`,
          {
            headers: { 'Authorization': `Bearer ${accessToken}` }
          }
        );
        const seasonDetails = await response.json();

        setEditingSeries({
          ...editingSeries,
          seasons: editingSeries.seasons.map((s: any) =>
            s.seasonNumber === seasonNumber
              ? {
                  ...s,
                  enabled: true,
                  episodes: seasonDetails.episodes?.map((ep: any) => ({
                    episodeNumber: ep.episode_number,
                    name: ep.name,
                    overview: ep.overview,
                    videoUrl: ''
                  })) || []
                }
              : s
          )
        });
      } catch (error) {
        console.error('Error loading season:', error);
      }
    } else {
      setEditingSeries({
        ...editingSeries,
        seasons: editingSeries.seasons.map((s: any) =>
          s.seasonNumber === seasonNumber
            ? { ...s, enabled: false, episodes: [] }
            : s
        )
      });
    }
  }

  function updateEpisodeUrl(seasonNumber: number, episodeNumber: number, url: string) {
    setEditingSeries({
      ...editingSeries,
      seasons: editingSeries.seasons.map((s: any) =>
        s.seasonNumber === seasonNumber
          ? {
              ...s,
              episodes: s.episodes.map((ep: any) =>
                ep.episodeNumber === episodeNumber
                  ? { ...ep, videoUrl: url }
                  : ep
              )
            }
          : s
      )
    });
  }

  function toggleSeasonExpand(seasonNumber: number) {
    setExpandedSeasons(prev =>
      prev.includes(seasonNumber)
        ? prev.filter(s => s !== seasonNumber)
        : [...prev, seasonNumber]
    );
  }

  async function saveSeries() {
    try {
      const dataToSave = {
        ...editingSeries,
        seasons: editingSeries.seasons.filter((s: any) => s.enabled)
      };

      if (editingSeries.id) {
        await fetch(
          `https://${projectId}.supabase.co/functions/v1/make-server-7c0425fe/series/${editingSeries.id}`,
          {
            method: 'PUT',
            headers: {
              'Content-Type': 'application/json',
              'Authorization': `Bearer ${accessToken}`
            },
            body: JSON.stringify(dataToSave)
          }
        );
      } else {
        await fetch(
          `https://${projectId}.supabase.co/functions/v1/make-server-7c0425fe/series`,
          {
            method: 'POST',
            headers: {
              'Content-Type': 'application/json',
              'Authorization': `Bearer ${accessToken}`
            },
            body: JSON.stringify(dataToSave)
          }
        );
      }
      setEditingSeries(null);
      loadSeries();
      toast.success('Série salva com sucesso!');
    } catch (error) {
      console.error('Error saving series:', error);
      toast.error('Erro ao salvar a série.');
    }
  }

  async function deleteSeries(id: string) {
    if (!confirm('Deseja excluir esta série?')) return;

    try {
      await fetch(
        `https://${projectId}.supabase.co/functions/v1/make-server-7c0425fe/series/${id}`,
        {
          method: 'DELETE',
          headers: { 'Authorization': `Bearer ${accessToken}` }
        }
      );
      loadSeries();
      toast.success('Série excluída com sucesso!');
    } catch (error) {
      console.error('Error deleting series:', error);
      toast.error('Erro ao excluir a série.');
    }
  }

  const filteredSeries = series.filter(s =>
    s.title.toLowerCase().includes(filterQuery.toLowerCase())
  );

  if (loading) {
    return (
      <div className="flex items-center justify-center py-20">
        <div className="flex items-center gap-3 text-gray-400">
          <Loader2 className="w-5 h-5 animate-spin" />
          <span>Carregando séries...</span>
        </div>
      </div>
    );
  }

  return (
    <div className="space-y-6 w-full">
      {/* Header */}
      <div className="flex items-start justify-between gap-4 flex-wrap">
        <div className="flex-1 min-w-0">
          <h2 className="text-2xl text-white mb-1.5">Séries</h2>
          <p className="text-sm text-gray-500">Gerencie todo o catálogo de séries do Cinexprime</p>
        </div>
        <Dialog open={isDialogOpen} onOpenChange={setIsDialogOpen}>
          <DialogTrigger asChild>
            <Button className="bg-blue-500 hover:bg-blue-600 text-white rounded-lg h-10 px-5 gap-2 shadow-lg shadow-blue-500/20 transition-all duration-300 hover:shadow-blue-500/30 flex-shrink-0">
              <Plus className="w-4 h-4" />
              Nova Série
            </Button>
          </DialogTrigger>
          <DialogContent className="max-w-2xl max-h-[85vh] bg-zinc-900 border-zinc-800 rounded-xl overflow-hidden">
            <DialogHeader>
              <DialogTitle className="text-xl text-white">Buscar no TMDB</DialogTitle>
              <p className="text-sm text-gray-500 mt-1">Encontre e adicione séries automaticamente</p>
            </DialogHeader>
            <div className="space-y-4 overflow-y-auto max-h-[65vh] pr-1">
              <div className="flex gap-2">
                <div className="relative flex-1">
                  <Search className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-gray-500 pointer-events-none" />
                  <Input
                    placeholder="Digite o nome da série..."
                    value={searchQuery}
                    onChange={(e) => setSearchQuery(e.target.value)}
                    onKeyDown={(e) => e.key === 'Enter' && searchTmdb()}
                    className="pl-10 bg-zinc-800 border-zinc-700 text-white h-10 rounded-lg"
                  />
                </div>
                <Button 
                  onClick={searchTmdb} 
                  disabled={searchingTmdb}
                  className="bg-blue-500 hover:bg-blue-600 h-10 px-4 rounded-lg flex-shrink-0"
                >
                  {searchingTmdb ? (
                    <Loader2 className="w-4 h-4 animate-spin" />
                  ) : (
                    <Search className="w-4 h-4" />
                  )}
                </Button>
              </div>

              {searchingTmdb && (
                <div className="text-center py-12 text-gray-400">
                  <Loader2 className="w-6 h-6 animate-spin mx-auto mb-2" />
                  <p className="text-sm">Buscando séries...</p>
                </div>
              )}

              <div className="space-y-2">
                {tmdbResults.map((tv) => (
                  <button
                    key={tv.id}
                    onClick={() => selectTmdbSeries(tv)}
                    className="w-full flex items-center gap-3 p-3 bg-zinc-800/50 border border-zinc-700/50 rounded-lg hover:bg-zinc-800 hover:border-zinc-600 transition-all duration-200 group"
                  >
                    {tv.poster_path && (
                      <div className="w-12 h-16 rounded overflow-hidden bg-zinc-900 flex-shrink-0">
                        <img
                          src={`https://image.tmdb.org/t/p/w92${tv.poster_path}`}
                          alt={tv.name}
                          className="w-full h-full object-cover"
                        />
                      </div>
                    )}
                    <div className="flex-1 text-left min-w-0">
                      <div className="text-white text-sm group-hover:text-blue-400 transition-colors truncate">{tv.name}</div>
                      <div className="text-xs text-gray-500 mt-0.5">
                        {tv.first_air_date?.split('-')[0]}
                      </div>
                    </div>
                  </button>
                ))}
              </div>
            </div>
          </DialogContent>
        </Dialog>
      </div>

      {/* Filter Search Bar */}
      {series.length > 0 && (
        <div className="relative">
          <Search className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-gray-500 pointer-events-none" />
          <Input
            placeholder="Filtrar séries cadastradas..."
            value={filterQuery}
            onChange={(e) => setFilterQuery(e.target.value)}
            className="pl-10 bg-zinc-900/50 border-zinc-800 text-white h-10 rounded-lg hover:border-zinc-700 focus:border-blue-500 transition-colors"
          />
        </div>
      )}

      {/* Editing Form */}
      {editingSeries && (
        <div className="bg-zinc-900/50 border border-zinc-800 rounded-xl p-6 backdrop-blur-sm w-full">
          <div className="flex items-center justify-between mb-6">
            <div className="flex-1 min-w-0">
              <h3 className="text-lg text-white">
                {editingSeries.id ? 'Editar Série' : 'Nova Série'}
              </h3>
              <p className="text-sm text-gray-500 mt-1">Personalize as informações e episódios</p>
            </div>
            <button 
              onClick={() => setEditingSeries(null)} 
              className="text-gray-500 hover:text-white transition-colors p-2 hover:bg-zinc-800 rounded-lg flex-shrink-0"
            >
              <X className="w-5 h-5" />
            </button>
          </div>

          <div className="space-y-5">
            {/* Banner Preview */}
            {editingSeries.bannerUrl && (
              <div className="w-full aspect-video rounded-lg overflow-hidden bg-zinc-800 ring-1 ring-zinc-700/50">
                <img
                  src={editingSeries.bannerUrl}
                  alt="Banner"
                  className="w-full h-full object-cover"
                />
              </div>
            )}

            {/* Nome */}
            <div className="space-y-2">
              <label className="block text-xs text-gray-400 uppercase tracking-wider">Nome da Série</label>
              <Input
                value={editingSeries.title || ''}
                disabled
                className="bg-zinc-800/50 border-zinc-700/50 text-gray-400 h-10 rounded-lg"
              />
            </div>

            {/* Temporadas e Episódios */}
            <div className="space-y-3">
              <label className="block text-xs text-gray-400 uppercase tracking-wider">Temporadas e Episódios</label>
              <div className="space-y-2">
                {editingSeries.seasons?.map((season: any) => (
                  <div key={season.seasonNumber} className="bg-zinc-800/30 border border-zinc-800 rounded-lg overflow-hidden">
                    {/* Season Header */}
                    <div className="flex items-center justify-between p-4">
                      <label className="flex items-center gap-2.5 flex-1 cursor-pointer">
                        <Checkbox
                          checked={season.enabled}
                          onCheckedChange={() => toggleSeason(season.seasonNumber)}
                        />
                        <div className="flex-1 min-w-0">
                          <div className="text-sm text-white">Temporada {season.seasonNumber}</div>
                          {season.enabled && (
                            <div className="text-xs text-gray-500 mt-0.5">{season.episodes?.length || 0} episódios</div>
                          )}
                        </div>
                      </label>
                      {season.enabled && season.episodes?.length > 0 && (
                        <button
                          onClick={() => toggleSeasonExpand(season.seasonNumber)}
                          className="text-gray-500 hover:text-white transition-colors p-1.5 hover:bg-zinc-800 rounded flex-shrink-0"
                        >
                          <ChevronDown 
                            className={`w-4 h-4 transition-transform duration-200 ${ 
                              expandedSeasons.includes(season.seasonNumber) ? 'rotate-180' : ''
                            }`} 
                          />
                        </button>
                      )}
                    </div>

                    {/* Episodes */}
                    {season.enabled && expandedSeasons.includes(season.seasonNumber) && season.episodes?.length > 0 && (
                      <div className="border-t border-zinc-700/50 p-4 space-y-2 bg-zinc-900/30">
                        {season.episodes.map((episode: any) => (
                          <div key={episode.episodeNumber} className="bg-zinc-800/50 rounded-lg p-3 space-y-2">
                            <div className="text-xs text-gray-400">
                              Episódio {episode.episodeNumber}: {episode.name}
                            </div>
                            <Input
                              placeholder="URL do vídeo"
                              value={episode.videoUrl || ''}
                              onChange={(e) => updateEpisodeUrl(
                                season.seasonNumber,
                                episode.episodeNumber,
                                e.target.value
                              )}
                              className="bg-zinc-800 border-zinc-700 text-white text-sm h-9 rounded-lg"
                            />
                          </div>
                        ))}
                      </div>
                    )}
                  </div>
                ))}
              </div>
            </div>

            {/* Categorias */}
            <div className="space-y-3">
              <label className="block text-xs text-gray-400 uppercase tracking-wider">Categorias</label>
              <div className="grid grid-cols-2 gap-2">
                {categories.map((category) => (
                  <label 
                    key={category} 
                    className="flex items-center gap-2.5 bg-zinc-800/30 p-3 rounded-lg cursor-pointer hover:bg-zinc-800/50 transition-all duration-200 border border-zinc-800 hover:border-zinc-700"
                  >
                    <Checkbox
                      checked={editingSeries.categories?.includes(category)}
                      onCheckedChange={(checked) => {
                        const cats = editingSeries.categories || [];
                        if (checked) {
                          setEditingSeries({
                            ...editingSeries,
                            categories: [...cats, category]
                          });
                        } else {
                          setEditingSeries({
                            ...editingSeries,
                            categories: cats.filter((c: string) => c !== category)
                          });
                        }
                      }}
                    />
                    <span className="text-sm text-gray-300">{category}</span>
                  </label>
                ))}
              </div>
            </div>

            {/* Slider */}
            <div className="bg-blue-500/5 border border-blue-500/20 p-4 rounded-lg">
              <label className="flex items-center justify-between cursor-pointer gap-4">
                <div className="flex-1 min-w-0">
                  <div className="text-sm text-white mb-0.5">Adicionar ao Slider</div>
                  <div className="text-xs text-gray-500">Exibir esta série em destaque na tela inicial</div>
                </div>
                <Checkbox
                  checked={editingSeries.inSlider || false}
                  onCheckedChange={(checked) => setEditingSeries({ ...editingSeries, inSlider: checked })}
                />
              </label>
            </div>

            {/* Botão Salvar */}
            <Button 
              onClick={saveSeries} 
              className="w-full bg-blue-500 hover:bg-blue-600 text-white h-11 rounded-lg gap-2 shadow-lg shadow-blue-500/20 transition-all duration-300 hover:shadow-blue-500/30"
            >
              <Save className="w-4 h-4" />
              Salvar Série
            </Button>
          </div>
        </div>
      )}

      {/* Lista de Séries */}
      <div className="grid grid-cols-3 gap-4 w-full">
        {filteredSeries.map((s) => (
          <div 
            key={s.id} 
            className="w-full group"
          >
            <div className="relative rounded-lg overflow-hidden bg-zinc-900">
              {/* Slider Badge */}
              {s.inSlider && (
                <div className="absolute top-2 left-2 z-10 bg-blue-500 px-2 py-1 rounded">
                  <span className="text-xs text-white">Slider</span>
                </div>
              )}
              
              <img
                src={s.posterUrl}
                alt={s.title}
                className="w-full aspect-[2/3] object-cover"
              />

              {/* Hover Actions */}
              <div className="absolute inset-0 bg-black/70 opacity-0 group-hover:opacity-100 transition-opacity duration-200 flex items-center justify-center gap-2">
                <Button
                  onClick={() => setEditingSeries(s)}
                  variant="outline"
                  size="sm"
                  className="border-zinc-700 bg-zinc-900/80 hover:bg-zinc-800 hover:border-zinc-600 h-8 w-8 p-0 rounded-lg"
                >
                  <Edit className="w-3.5 h-3.5 text-white" />
                </Button>
                <Button
                  onClick={() => deleteSeries(s.id)}
                  variant="outline"
                  size="sm"
                  className="border-zinc-700 bg-zinc-900/80 hover:bg-red-500/20 hover:border-red-500/50 h-8 w-8 p-0 rounded-lg"
                >
                  <Trash2 className="w-3.5 h-3.5 text-red-400" />
                </Button>
              </div>
            </div>
            
            {/* Title */}
            <h3 className="mt-2 text-xs text-gray-300 truncate">{s.title}</h3>
          </div>
        ))}
      </div>

      {filteredSeries.length === 0 && series.length > 0 && (
        <div className="text-center text-gray-500 py-16 bg-zinc-900/20 border border-zinc-800/50 rounded-lg">
          <Search className="w-12 h-12 mx-auto mb-3 opacity-20" />
          <p className="mb-1">Nenhuma série encontrada</p>
          <p className="text-sm text-gray-600">Tente buscar com outro termo</p>
        </div>
      )}

      {series.length === 0 && (
        <div className="text-center text-gray-500 py-16 bg-zinc-900/20 border border-zinc-800/50 rounded-lg">
          <Tv className="w-12 h-12 mx-auto mb-3 opacity-20" />
          <p className="mb-1">Nenhuma série cadastrada</p>
          <p className="text-sm text-gray-600">Adicione sua primeira série usando o botão acima</p>
        </div>
      )}
    </div>
  );
}