import React, { useState, useEffect } from 'react';
import { ArrowLeft, Trash2, Edit3, CheckSquare, Square, Search, X, Film } from 'lucide-react';
import { projectId, publicAnonKey } from '../../utils/supabase/info';

interface BulkEditMoviesProps {
  onClose: () => void;
  accessToken: string;
}

interface Movie {
  id: string;
  title: string;
  posterUrl: string;
  year: number;
  rating: number;
  genre: string;
}

export function BulkEditMovies({ onClose, accessToken }: BulkEditMoviesProps) {
  const [movies, setMovies] = useState<Movie[]>([]);
  const [selectedIds, setSelectedIds] = useState<Set<string>>(new Set());
  const [searchQuery, setSearchQuery] = useState('');
  const [loading, setLoading] = useState(true);
  const [showDeleteConfirm, setShowDeleteConfirm] = useState(false);

  useEffect(() => {
    loadMovies();
  }, []);

  async function loadMovies() {
    try {
      const response = await fetch(
        `https://${projectId}.supabase.co/functions/v1/make-server-7c0425fe/movies`,
        {
          headers: { 'Authorization': `Bearer ${publicAnonKey}` }
        }
      );
      const data = await response.json();
      setMovies(data);
    } catch (error) {
    } finally {
      setLoading(false);
    }
  }

  const filteredMovies = movies.filter(movie =>
    movie.title.toLowerCase().includes(searchQuery.toLowerCase()) ||
    movie.genre?.toLowerCase().includes(searchQuery.toLowerCase())
  );

  const toggleSelection = (id: string) => {
    const newSelected = new Set(selectedIds);
    if (newSelected.has(id)) {
      newSelected.delete(id);
    } else {
      newSelected.add(id);
    }
    setSelectedIds(newSelected);
  };

  const toggleSelectAll = () => {
    if (selectedIds.size === filteredMovies.length) {
      setSelectedIds(new Set());
    } else {
      setSelectedIds(new Set(filteredMovies.map(m => m.id)));
    }
  };

  const handleBulkDelete = async () => {
    try {
      for (const id of Array.from(selectedIds)) {
        await fetch(
          `https://${projectId}.supabase.co/functions/v1/make-server-7c0425fe/movies/${id}`,
          {
            method: 'DELETE',
            headers: { 'Authorization': `Bearer ${accessToken}` }
          }
        );
      }
      
      setMovies(movies.filter(m => !selectedIds.has(m.id)));
      setSelectedIds(new Set());
      setShowDeleteConfirm(false);
    } catch (error) {
    }
  };

  const allSelected = filteredMovies.length > 0 && selectedIds.size === filteredMovies.length;
  const someSelected = selectedIds.size > 0 && selectedIds.size < filteredMovies.length;

  return (
    <div className="fixed inset-0 z-50 bg-[#0f1117] overflow-hidden flex flex-col">
      <div className="bg-[#1a1d29] border-b border-zinc-800/60 px-6 py-4">
        <div className="flex items-center justify-between mb-4">
          <div className="flex items-center gap-4">
            <button
              onClick={onClose}
              className="p-2 hover:bg-white/5 rounded-lg transition-colors"
            >
              <ArrowLeft className="w-5 h-5 text-white" />
            </button>
            <div>
              <h1 className="text-2xl text-white">Edição em Massa - Filmes</h1>
              <p className="text-sm text-gray-400 mt-1">
                {selectedIds.size > 0 
                  ? `${selectedIds.size} ${selectedIds.size === 1 ? 'filme selecionado' : 'filmes selecionados'}`
                  : `${movies.length} ${movies.length === 1 ? 'filme disponível' : 'filmes disponíveis'}`
                }
              </p>
            </div>
          </div>

          {selectedIds.size > 0 && (
            <div className="flex items-center gap-3">
              <button
                onClick={() => setShowDeleteConfirm(true)}
                className="flex items-center gap-2 px-4 py-2 bg-red-600/10 border border-red-600/20 text-red-500 rounded-lg hover:bg-red-600/20 transition-colors"
              >
                <Trash2 className="w-4 h-4" />
                Deletar Selecionados
              </button>
            </div>
          )}
        </div>

        <div className="relative">
          <Search className="absolute left-3 top-1/2 -translate-y-1/2 w-5 h-5 text-gray-400" />
          <input
            type="text"
            placeholder="Buscar por título ou gênero..."
            value={searchQuery}
            onChange={(e) => setSearchQuery(e.target.value)}
            className="w-full bg-zinc-900/60 border border-zinc-800/60 rounded-lg pl-10 pr-10 py-3 text-white placeholder-gray-500 focus:outline-none focus:border-blue-600/50"
          />
          {searchQuery && (
            <button
              onClick={() => setSearchQuery('')}
              className="absolute right-3 top-1/2 -translate-y-1/2 p-1 hover:bg-white/5 rounded transition-colors"
            >
              <X className="w-4 h-4 text-gray-400" />
            </button>
          )}
        </div>
      </div>

      {filteredMovies.length > 0 && (
        <div className="bg-[#1a1d29]/50 border-b border-zinc-800/60 px-6 py-3">
          <button
            onClick={toggleSelectAll}
            className="flex items-center gap-3 text-sm hover:bg-white/5 px-3 py-2 rounded-lg transition-colors w-full"
          >
            {allSelected ? (
              <CheckSquare className="w-5 h-5 text-blue-600" />
            ) : someSelected ? (
              <div className="w-5 h-5 border-2 border-blue-600 rounded bg-blue-600/30" />
            ) : (
              <Square className="w-5 h-5 text-gray-400" />
            )}
            <span className="text-white">
              {allSelected ? 'Desselecionar Todos' : 'Selecionar Todos'}
            </span>
            <span className="text-gray-400">
              ({filteredMovies.length} {filteredMovies.length === 1 ? 'filme' : 'filmes'})
            </span>
          </button>
        </div>
      )}

      <div className="flex-1 overflow-y-auto p-6">
        {loading ? (
          <div className="flex items-center justify-center h-full">
            <div className="text-gray-400">Carregando filmes...</div>
          </div>
        ) : filteredMovies.length === 0 ? (
          <div className="flex flex-col items-center justify-center h-full text-center">
            <Film className="w-16 h-16 text-gray-600 mb-4" />
            <h3 className="text-xl text-white mb-2">
              {searchQuery ? 'Nenhum filme encontrado' : 'Nenhum filme cadastrado'}
            </h3>
            <p className="text-gray-400">
              {searchQuery 
                ? 'Tente buscar com outros termos'
                : 'Adicione filmes para começar a gerenciar'
              }
            </p>
          </div>
        ) : (
          <div className="grid grid-cols-2 sm:grid-cols-3 md:grid-cols-4 lg:grid-cols-5 xl:grid-cols-6 gap-4">
            {filteredMovies.map((movie) => (
              <div
                key={movie.id}
                onClick={() => toggleSelection(movie.id)}
                className={`relative cursor-pointer group rounded-xl overflow-hidden transition-all duration-300 ${
                  selectedIds.has(movie.id)
                    ? 'ring-4 ring-blue-600 scale-95'
                    : 'hover:scale-105'
                }`}
              >
                <div className="absolute top-2 left-2 z-10">
                  <div
                    className={`w-6 h-6 rounded-md flex items-center justify-center transition-all duration-200 ${
                      selectedIds.has(movie.id)
                        ? 'bg-blue-600 border-2 border-blue-600'
                        : 'bg-black/60 border-2 border-white/30 backdrop-blur-sm'
                    }`}
                  >
                    {selectedIds.has(movie.id) && (
                      <CheckSquare className="w-4 h-4 text-white" />
                    )}
                  </div>
                </div>

                <div className="aspect-[2/3] relative">
                  <img
                    src={movie.posterUrl}
                    alt={movie.title}
                    className="w-full h-full object-cover"
                  />
                  
                  <div className="absolute inset-0 bg-gradient-to-t from-black/90 via-black/40 to-transparent opacity-0 group-hover:opacity-100 transition-opacity duration-300" />
                  
                  <div className="absolute bottom-0 left-0 right-0 p-3 text-white opacity-0 group-hover:opacity-100 transition-opacity duration-300">
                    <h3 className="text-sm font-semibold mb-1 line-clamp-2">
                      {movie.title}
                    </h3>
                    <div className="flex items-center gap-2 text-xs text-gray-300">
                      <span>{movie.year}</span>
                      <span>•</span>
                      <span>⭐ {movie.rating}</span>
                    </div>
                  </div>
                </div>

                {selectedIds.has(movie.id) && (
                  <div className="absolute inset-0 bg-blue-600/20 border-4 border-blue-600 pointer-events-none" />
                )}
              </div>
            ))}
          </div>
        )}
      </div>

      {showDeleteConfirm && (
        <div className="fixed inset-0 z-[60] flex items-center justify-center p-4 bg-black/80">
          <div className="bg-[#1a1d29] rounded-2xl max-w-md w-full p-6">
            <div className="flex items-center justify-center w-16 h-16 bg-red-600/10 rounded-full mx-auto mb-4">
              <Trash2 className="w-8 h-8 text-red-600" />
            </div>
            
            <h3 className="text-xl text-white text-center mb-2">
              Confirmar Exclusão
            </h3>
            
            <p className="text-sm text-gray-400 text-center mb-6">
              Tem certeza que deseja deletar {selectedIds.size} {selectedIds.size === 1 ? 'filme' : 'filmes'}?
              <br />
              <span className="text-red-500">Esta ação não pode ser desfeita.</span>
            </p>

            <div className="flex gap-3">
              <button
                onClick={() => setShowDeleteConfirm(false)}
                className="flex-1 bg-zinc-800 hover:bg-zinc-700 text-white py-3 rounded-lg transition-colors"
              >
                Cancelar
              </button>
              <button
                onClick={handleBulkDelete}
                className="flex-1 bg-red-600 hover:bg-red-700 text-white py-3 rounded-lg transition-colors"
              >
                Deletar
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}