import React, { useEffect, useState } from 'react';
import { projectId } from '../../utils/supabase/info';
import { useAuth } from '../../contexts/AuthContext';
import { Button } from '../ui/button';
import { Input } from '../ui/input';
import { Checkbox } from '../ui/checkbox';
import { Plus, Search, Edit, Trash2, Save, X, Film, Loader2, Star } from 'lucide-react';
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogTrigger } from '../ui/dialog';
import { toast } from 'sonner';

export function MoviesAdmin() {
  const [movies, setMovies] = useState<any[]>([]);
  const [loading, setLoading] = useState(true);
  const [editingMovie, setEditingMovie] = useState<any>(null);
  const [searchQuery, setSearchQuery] = useState('');
  const [filterQuery, setFilterQuery] = useState('');
  const [tmdbResults, setTmdbResults] = useState<any[]>([]);
  const [searchingTmdb, setSearchingTmdb] = useState(false);
  const [isDialogOpen, setIsDialogOpen] = useState(false);
  const { accessToken } = useAuth();

  const categories = ['Filme ~ Lançamentos', 'Filme ~ Ação', 'Filme ~ Terror', 'Filme ~ Crime', 'Filme ~ Drama'];

  // Helper function to map TMDB genres to app categories
  function mapGenreToCategory(genres: any[]): string[] {
    const availableCategories = ['Filme ~ Ação', 'Filme ~ Terror', 'Filme ~ Crime', 'Filme ~ Drama'];
    
    if (!genres || genres.length === 0) {
      return ['Filme ~ Sem categoria'];
    }
    
    // Map genre names to our categories
    const genreMap: { [key: string]: string } = {
      'ação': 'Filme ~ Ação',
      'action': 'Filme ~ Ação',
      'terror': 'Filme ~ Terror',
      'horror': 'Filme ~ Terror',
      'crime': 'Filme ~ Crime',
      'thriller': 'Filme ~ Crime',
      'mistério': 'Filme ~ Crime',
      'mystery': 'Filme ~ Crime',
      'drama': 'Filme ~ Drama'
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
    return ['Filme ~ Sem categoria'];
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
    loadMovies();
  }, []);

  async function loadMovies() {
    try {
      const response = await fetch(
        `https://${projectId}.supabase.co/functions/v1/make-server-7c0425fe/movies`,
        {
          headers: { 'Authorization': `Bearer ${accessToken}` }
        }
      );
      const data = await response.json();
      setMovies(data);
    } catch (error) {
      console.error('Error loading movies:', error);
    } finally {
      setLoading(false);
    }
  }

  async function searchTmdb() {
    if (!searchQuery.trim()) return;

    setSearchingTmdb(true);
    try {
      const response = await fetch(
        `https://${projectId}.supabase.co/functions/v1/make-server-7c0425fe/tmdb/search/movie?query=${encodeURIComponent(searchQuery)}`,
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

  async function selectTmdbMovie(tmdbMovie: any) {
    try {
      const response = await fetch(
        `https://${projectId}.supabase.co/functions/v1/make-server-7c0425fe/tmdb/movie/${tmdbMovie.id}`,
        {
          headers: { 'Authorization': `Bearer ${accessToken}` }
        }
      );
      const details = await response.json();

      // Auto-categorize based on genres
      const autoCategories = mapGenreToCategory(details.genres);
      
      // Add to releases if within 1 month
      if (isRecentRelease(details.release_date)) {
        if (!autoCategories.includes('Filme ~ Lançamentos')) {
          autoCategories.unshift('Filme ~ Lançamentos');
        }
      }

      setEditingMovie({
        tmdbId: details.id,
        title: details.title,
        description: details.overview,
        posterUrl: `https://image.tmdb.org/t/p/w500${details.poster_path}`,
        bannerUrl: `https://image.tmdb.org/t/p/original${details.backdrop_path}`,
        year: details.release_date?.split('-')[0],
        duration: details.runtime,
        rating: details.vote_average?.toFixed(1),
        genre: details.genres?.map((g: any) => g.name).join(', '),
        releaseDate: details.release_date,
        tmdbGenres: details.genres,
        videoUrl: '',
        categories: autoCategories,
        inSlider: false,
      });
      setTmdbResults([]);
      setSearchQuery('');
      setIsDialogOpen(false);
    } catch (error) {
      console.error('Error loading movie details:', error);
    }
  }

  async function saveMovie() {
    try {
      if (editingMovie.id) {
        await fetch(
          `https://${projectId}.supabase.co/functions/v1/make-server-7c0425fe/movies/${editingMovie.id}`,
          {
            method: 'PUT',
            headers: {
              'Content-Type': 'application/json',
              'Authorization': `Bearer ${accessToken}`
            },
            body: JSON.stringify(editingMovie)
          }
        );
      } else {
        await fetch(
          `https://${projectId}.supabase.co/functions/v1/make-server-7c0425fe/movies`,
          {
            method: 'POST',
            headers: {
              'Content-Type': 'application/json',
              'Authorization': `Bearer ${accessToken}`
            },
            body: JSON.stringify(editingMovie)
          }
        );
      }
      setEditingMovie(null);
      loadMovies();
      toast.success('Filme salvo com sucesso!');
    } catch (error) {
      console.error('Error saving movie:', error);
      toast.error('Erro ao salvar o filme.');
    }
  }

  async function deleteMovie(id: string) {
    if (!confirm('Deseja excluir este filme?')) return;

    try {
      await fetch(
        `https://${projectId}.supabase.co/functions/v1/make-server-7c0425fe/movies/${id}`,
        {
          method: 'DELETE',
          headers: { 'Authorization': `Bearer ${accessToken}` }
        }
      );
      loadMovies();
      toast.success('Filme excluído com sucesso!');
    } catch (error) {
      console.error('Error deleting movie:', error);
      toast.error('Erro ao excluir o filme.');
    }
  }

  const filteredMovies = movies.filter(movie =>
    movie.title.toLowerCase().includes(filterQuery.toLowerCase())
  );

  if (loading) {
    return (
      <div className="flex items-center justify-center py-20">
        <div className="flex items-center gap-3 text-gray-400">
          <Loader2 className="w-5 h-5 animate-spin" />
          <span>Carregando filmes...</span>
        </div>
      </div>
    );
  }

  return (
    <div className="space-y-6 w-full">
      {/* Header */}
      <div className="flex items-start justify-between gap-4 flex-wrap">
        <div className="flex-1 min-w-0">
          <h2 className="text-2xl text-white mb-1.5">Filmes</h2>
          <p className="text-sm text-gray-500">Gerencie todo o catálogo de filmes do Cinexprime</p>
        </div>
        <Dialog open={isDialogOpen} onOpenChange={setIsDialogOpen}>
          <DialogTrigger asChild>
            <Button className="bg-blue-500 hover:bg-blue-600 text-white rounded-lg h-10 px-5 gap-2 shadow-lg shadow-blue-500/20 transition-all duration-300 hover:shadow-blue-500/30 flex-shrink-0">
              <Plus className="w-4 h-4" />
              Novo Filme
            </Button>
          </DialogTrigger>
          <DialogContent className="max-w-2xl max-h-[85vh] bg-zinc-900 border-zinc-800 rounded-xl overflow-hidden">
            <DialogHeader>
              <DialogTitle className="text-xl text-white">Buscar no TMDB</DialogTitle>
              <p className="text-sm text-gray-500 mt-1">Encontre e adicione filmes automaticamente</p>
            </DialogHeader>
            <div className="space-y-4 overflow-y-auto max-h-[65vh] pr-1">
              <div className="flex gap-2">
                <div className="relative flex-1">
                  <Search className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-gray-500 pointer-events-none" />
                  <Input
                    placeholder="Digite o nome do filme..."
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
                  <p className="text-sm">Buscando filmes...</p>
                </div>
              )}

              <div className="space-y-2">
                {tmdbResults.map((movie) => (
                  <button
                    key={movie.id}
                    onClick={() => selectTmdbMovie(movie)}
                    className="w-full flex items-center gap-3 p-3 bg-zinc-800/50 border border-zinc-700/50 rounded-lg hover:bg-zinc-800 hover:border-zinc-600 transition-all duration-200 group"
                  >
                    {movie.poster_path && (
                      <div className="w-12 h-16 rounded overflow-hidden bg-zinc-900 flex-shrink-0">
                        <img
                          src={`https://image.tmdb.org/t/p/w92${movie.poster_path}`}
                          alt={movie.title}
                          className="w-full h-full object-cover"
                        />
                      </div>
                    )}
                    <div className="flex-1 text-left min-w-0">
                      <div className="text-white text-sm group-hover:text-blue-400 transition-colors truncate">{movie.title}</div>
                      <div className="text-xs text-gray-500 mt-0.5">
                        {movie.release_date?.split('-')[0]}
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
      {movies.length > 0 && (
        <div className="relative">
          <Search className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-gray-500 pointer-events-none" />
          <Input
            placeholder="Filtrar filmes cadastrados..."
            value={filterQuery}
            onChange={(e) => setFilterQuery(e.target.value)}
            className="pl-10 bg-zinc-900/50 border-zinc-800 text-white h-10 rounded-lg hover:border-zinc-700 focus:border-blue-500 transition-colors"
          />
        </div>
      )}

      {/* Editing Form */}
      {editingMovie && (
        <div className="bg-zinc-900/50 border border-zinc-800 rounded-xl p-6 backdrop-blur-sm w-full">
          <div className="flex items-center justify-between mb-6">
            <div className="flex-1 min-w-0">
              <h3 className="text-lg text-white">
                {editingMovie.id ? 'Editar Filme' : 'Novo Filme'}
              </h3>
              <p className="text-sm text-gray-500 mt-1">Personalize as informações e disponibilidade</p>
            </div>
            <button 
              onClick={() => setEditingMovie(null)} 
              className="text-gray-500 hover:text-white transition-colors p-2 hover:bg-zinc-800 rounded-lg flex-shrink-0"
            >
              <X className="w-5 h-5" />
            </button>
          </div>

          <div className="space-y-5">
            {/* Banner Preview */}
            {editingMovie.bannerUrl && (
              <div className="w-full aspect-video rounded-lg overflow-hidden bg-zinc-800 ring-1 ring-zinc-700/50">
                <img
                  src={editingMovie.bannerUrl}
                  alt="Banner"
                  className="w-full h-full object-cover"
                />
              </div>
            )}

            {/* Nome */}
            <div className="space-y-2">
              <label className="block text-xs text-gray-400 uppercase tracking-wider">Nome do Filme</label>
              <Input
                value={editingMovie.title || ''}
                disabled
                className="bg-zinc-800/50 border-zinc-700/50 text-gray-400 h-10 rounded-lg"
              />
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
                      checked={editingMovie.categories?.includes(category)}
                      onCheckedChange={(checked) => {
                        const cats = editingMovie.categories || [];
                        if (checked) {
                          setEditingMovie({
                            ...editingMovie,
                            categories: [...cats, category]
                          });
                        } else {
                          setEditingMovie({
                            ...editingMovie,
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
                  <div className="text-xs text-gray-500">Exibir este filme em destaque na tela inicial</div>
                </div>
                <Checkbox
                  checked={editingMovie.inSlider || false}
                  onCheckedChange={(checked) => setEditingMovie({ ...editingMovie, inSlider: checked })}
                />
              </label>
            </div>

            {/* URL do Vídeo */}
            <div className="space-y-2">
              <label className="block text-xs text-gray-400 uppercase tracking-wider">URL do Vídeo</label>
              <Input
                value={editingMovie.videoUrl || ''}
                onChange={(e) => setEditingMovie({ ...editingMovie, videoUrl: e.target.value })}
                placeholder="https://exemplo.com/video.mp4"
                className="bg-zinc-800/50 border-zinc-700/50 text-white h-10 rounded-lg"
              />
            </div>

            {/* Botão Salvar */}
            <Button 
              onClick={saveMovie} 
              className="w-full bg-blue-500 hover:bg-blue-600 text-white h-11 rounded-lg gap-2 shadow-lg shadow-blue-500/20 transition-all duration-300 hover:shadow-blue-500/30"
            >
              <Save className="w-4 h-4" />
              Salvar Filme
            </Button>
          </div>
        </div>
      )}

      {/* Movies Grid */}
      <div className="grid grid-cols-3 gap-4 w-full">
        {filteredMovies.map((movie) => (
          <div 
            key={movie.id} 
            className="w-full group"
          >
            <div className="relative rounded-lg overflow-hidden bg-zinc-900">
              {/* Slider Badge */}
              {movie.inSlider && (
                <div className="absolute top-2 left-2 z-10 bg-blue-500 px-2 py-1 rounded">
                  <span className="text-xs text-white">Slider</span>
                </div>
              )}
              
              <img
                src={movie.posterUrl}
                alt={movie.title}
                className="w-full aspect-[2/3] object-cover"
              />

              {/* Hover Actions */}
              <div className="absolute inset-0 bg-black/70 opacity-0 group-hover:opacity-100 transition-opacity duration-200 flex items-center justify-center gap-2">
                <Button
                  onClick={() => setEditingMovie(movie)}
                  variant="outline"
                  size="sm"
                  className="border-zinc-700 bg-zinc-900/80 hover:bg-zinc-800 hover:border-zinc-600 h-8 w-8 p-0 rounded-lg"
                >
                  <Edit className="w-3.5 h-3.5 text-white" />
                </Button>
                <Button
                  onClick={() => deleteMovie(movie.id)}
                  variant="outline"
                  size="sm"
                  className="border-zinc-700 bg-zinc-900/80 hover:bg-red-500/20 hover:border-red-500/50 h-8 w-8 p-0 rounded-lg"
                >
                  <Trash2 className="w-3.5 h-3.5 text-red-400" />
                </Button>
              </div>
            </div>
            
            {/* Title */}
            <h3 className="mt-2 text-xs text-gray-300 truncate">{movie.title}</h3>
          </div>
        ))}
      </div>

      {filteredMovies.length === 0 && movies.length > 0 && (
        <div className="text-center text-gray-500 py-16 bg-zinc-900/20 border border-zinc-800/50 rounded-lg">
          <Search className="w-12 h-12 mx-auto mb-3 opacity-20" />
          <p className="mb-1">Nenhum filme encontrado</p>
          <p className="text-sm text-gray-600">Tente buscar com outro termo</p>
        </div>
      )}

      {movies.length === 0 && (
        <div className="text-center text-gray-500 py-16 bg-zinc-900/20 border border-zinc-800/50 rounded-lg">
          <Film className="w-12 h-12 mx-auto mb-3 opacity-20" />
          <p className="mb-1">Nenhum filme cadastrado</p>
          <p className="text-sm text-gray-600">Adicione seu primeiro filme usando o botão acima</p>
        </div>
      )}
    </div>
  );
}