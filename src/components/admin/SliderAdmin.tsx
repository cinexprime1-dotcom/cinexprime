import React, { useEffect, useState } from 'react';
import { projectId } from '../../utils/supabase/info';
import { useAuth } from '../../contexts/AuthContext';
import { Button } from '../ui/button';
import { Trash2, Image as ImageIcon, Info, Loader2, Film, Tv2, XCircle, AlertTriangle } from 'lucide-react';
import { toast } from 'sonner@2.0.3';

export function SliderAdmin() {
  const [sliderItems, setSliderItems] = useState<any[]>([]);
  const [movies, setMovies] = useState<any[]>([]);
  const [series, setSeries] = useState<any[]>([]);
  const [loading, setLoading] = useState(true);
  const { accessToken } = useAuth();

  useEffect(() => {
    loadData();
  }, []);

  async function loadData() {
    try {
      const [sliderRes, moviesRes, seriesRes] = await Promise.all([
        fetch(`https://${projectId}.supabase.co/functions/v1/make-server-7c0425fe/slider`, {
          headers: { 'Authorization': `Bearer ${accessToken}` }
        }),
        fetch(`https://${projectId}.supabase.co/functions/v1/make-server-7c0425fe/movies`, {
          headers: { 'Authorization': `Bearer ${accessToken}` }
        }),
        fetch(`https://${projectId}.supabase.co/functions/v1/make-server-7c0425fe/series`, {
          headers: { 'Authorization': `Bearer ${accessToken}` }
        }),
      ]);
      
      const sliderData = await sliderRes.json();
      const moviesData = await moviesRes.json();
      const seriesData = await seriesRes.json();
      
      setSliderItems(sliderData);
      setMovies(moviesData);
      setSeries(seriesData);
    } catch (error) {
      console.error('Error loading data:', error);
    } finally {
      setLoading(false);
    }
  }

  async function removeFromSlider(index: number) {
    if (!confirm('Deseja remover este item do slider?')) return;

    try {
      await fetch(
        `https://${projectId}.supabase.co/functions/v1/make-server-7c0425fe/slider/${index}`,
        {
          method: 'DELETE',
          headers: { 'Authorization': `Bearer ${accessToken}` }
        }
      );
      toast.success('Item removido do slider');
      loadData();
    } catch (error) {
      console.error('Error removing from slider:', error);
      toast.error('Erro ao remover do slider');
    }
  }

  async function deleteContent(item: any, index: number) {
    const contentName = getContentInfo(item);
    const contentType = item.type === 'movie' ? 'filme' : 'série';
    
    if (!confirm(`Tem certeza que deseja EXCLUIR COMPLETAMENTE ${contentType} "${contentName}" do sistema?\n\nEsta ação irá:\n- Remover do slider\n- Excluir o conteúdo do banco de dados\n- Remover dos favoritos de todos os usuários\n\nEsta ação não pode ser desfeita!`)) {
      return;
    }

    try {
      // Remove do slider primeiro
      await fetch(
        `https://${projectId}.supabase.co/functions/v1/make-server-7c0425fe/slider/${index}`,
        {
          method: 'DELETE',
          headers: { 'Authorization': `Bearer ${accessToken}` }
        }
      );

      // Exclui o conteúdo do banco de dados
      const endpoint = item.type === 'movie' ? 'movies' : 'series';
      await fetch(
        `https://${projectId}.supabase.co/functions/v1/make-server-7c0425fe/${endpoint}/${item.contentId}`,
        {
          method: 'DELETE',
          headers: { 'Authorization': `Bearer ${accessToken}` }
        }
      );

      toast.success(`${contentType.charAt(0).toUpperCase() + contentType.slice(1)} excluído(a) completamente do sistema`);
      loadData();
    } catch (error) {
      console.error('Error deleting content:', error);
      toast.error('Erro ao excluir conteúdo');
    }
  }

  async function deleteInvalidContent(item: any, index: number) {
    const contentType = item.type === 'movie' ? 'filme' : 'série';
    
    if (!confirm(`Deseja remover este ${contentType} não encontrado do slider?`)) {
      return;
    }

    try {
      // Remove apenas do slider já que o conteúdo não existe mais
      await fetch(
        `https://${projectId}.supabase.co/functions/v1/make-server-7c0425fe/slider/${index}`,
        {
          method: 'DELETE',
          headers: { 'Authorization': `Bearer ${accessToken}` }
        }
      );

      toast.success('Conteúdo inválido removido do slider');
      loadData();
    } catch (error) {
      console.error('Error deleting invalid content:', error);
      toast.error('Erro ao remover conteúdo inválido');
    }
  }

  function getContentInfo(item: any) {
    if (item.type === 'movie') {
      const movie = movies.find(m => m.id === item.contentId);
      return movie?.title || 'Filme não encontrado';
    } else {
      const s = series.find(s => s.id === item.contentId);
      return s?.title || 'Série não encontrada';
    }
  }

  if (loading) {
    return (
      <div className="flex items-center justify-center py-20">
        <div className="flex items-center gap-3 text-gray-400">
          <Loader2 className="w-5 h-5 animate-spin" />
          <span>Carregando slider...</span>
        </div>
      </div>
    );
  }

  return (
    <div className="space-y-6 w-full">
      {/* Header */}
      <div>
        <h2 className="text-2xl text-white mb-1.5">Slider</h2>
        <p className="text-sm text-gray-500">Gerencie o conteúdo em destaque na tela inicial</p>
      </div>

      {/* Info Banner */}
      <div className="bg-blue-500/5 border border-blue-500/20 rounded-lg p-5">
        <div className="flex gap-3">
          <div className="w-9 h-9 rounded-lg bg-blue-500/10 flex items-center justify-center flex-shrink-0">
            <Info className="w-4 h-4 text-blue-400" />
          </div>
          <div className="flex-1 min-w-0">
            <div className="text-sm text-white mb-1.5">Como adicionar itens ao slider</div>
            <div className="text-xs text-gray-500 leading-relaxed">
              Para adicionar conteúdo ao slider, edite um filme ou série e marque a opção 
              <span className="text-blue-400 mx-1">"Adicionar ao Slider"</span>. 
              O banner será exibido automaticamente na tela inicial do aplicativo.
            </div>
          </div>
        </div>
      </div>

      {/* Lista de Itens */}
      <div className="space-y-4 w-full">
        {sliderItems.map((item, index) => {
          const content = item.type === 'movie' 
            ? movies.find(m => m.id === item.contentId)
            : series.find(s => s.id === item.contentId);
          
          const contentNotFound = !content;
          
          return (
            <div 
              key={index} 
              className={`bg-zinc-900/30 border rounded-xl overflow-hidden hover:bg-zinc-900/50 transition-all duration-200 group w-full ${
                contentNotFound 
                  ? 'border-red-500/30 hover:border-red-500/50' 
                  : 'border-zinc-800/50 hover:border-zinc-700/50'
              }`}
            >
              {/* Conteúdo não encontrado */}
              {contentNotFound && (
                <div className="p-5">
                  <div className="flex items-start gap-4">
                    <div className="w-12 h-12 rounded-lg bg-red-500/10 flex items-center justify-center flex-shrink-0">
                      <AlertTriangle className="w-6 h-6 text-red-400" />
                    </div>
                    <div className="flex-1 min-w-0">
                      <div className="flex items-center gap-2 mb-2">
                        <h3 className="text-sm text-white">{getContentInfo(item)}</h3>
                        <span className={`inline-flex items-center gap-1 text-xs px-2 py-1 rounded ${
                          item.type === 'movie' 
                            ? 'bg-purple-500/10 text-purple-400' 
                            : 'bg-green-500/10 text-green-400'
                        }`}>
                          {item.type === 'movie' ? (
                            <>
                              <Film className="w-3 h-3" />
                              <span>Filme</span>
                            </>
                          ) : (
                            <>
                              <Tv2 className="w-3 h-3" />
                              <span>Série</span>
                            </>
                          )}
                        </span>
                      </div>
                      <p className="text-xs text-red-400 mb-4">
                        Este conteúdo não foi encontrado no banco de dados. Clique no botão abaixo para remover do slider.
                      </p>
                      <Button
                        onClick={() => deleteInvalidContent(item, index)}
                        variant="outline"
                        size="sm"
                        className="border-red-500/50 bg-red-500/10 hover:bg-red-500/20 hover:border-red-500 text-red-400 h-9 px-4 rounded-lg transition-all duration-200"
                      >
                        <XCircle className="w-4 h-4 mr-2" />
                        Excluir conteúdo não encontrado
                      </Button>
                    </div>
                  </div>
                </div>
              )}

              {/* Conteúdo encontrado - Layout normal com banner */}
              {!contentNotFound && content?.bannerUrl && (
                <div className="relative aspect-video w-full">
                  <img
                    src={content.bannerUrl}
                    alt={getContentInfo(item)}
                    className="w-full h-full object-cover"
                  />
                  <div className="absolute top-4 right-4 flex gap-2">
                    <Button
                      onClick={() => removeFromSlider(index)}
                      variant="outline"
                      size="sm"
                      className="border-zinc-700 bg-zinc-900/90 hover:bg-yellow-500/20 hover:border-yellow-500/50 h-9 px-3 rounded-lg transition-all duration-200"
                      title="Remover apenas do slider"
                    >
                      <Trash2 className="w-4 h-4 text-gray-400" />
                      <span className="ml-2 text-sm text-gray-300">Remover</span>
                    </Button>
                    <Button
                      onClick={() => deleteContent(item, index)}
                      variant="outline"
                      size="sm"
                      className="border-zinc-700 bg-zinc-900/90 hover:bg-red-500/20 hover:border-red-500/50 h-9 px-3 rounded-lg transition-all duration-200"
                      title="Excluir conteúdo completamente do sistema"
                    >
                      <XCircle className="w-4 h-4 text-red-400" />
                      <span className="ml-2 text-sm text-red-400">Excluir</span>
                    </Button>
                  </div>
                </div>
              )}
              
              {/* Info do conteúdo encontrado */}
              {!contentNotFound && (
                <div className="p-4">
                  <div className="flex items-center gap-3 flex-wrap">
                    <h3 className="text-sm text-white flex-1 min-w-0 truncate">{getContentInfo(item)}</h3>
                    <span className={`inline-flex items-center gap-1 text-xs px-2 py-1 rounded ${
                      item.type === 'movie' 
                        ? 'bg-purple-500/10 text-purple-400' 
                        : 'bg-green-500/10 text-green-400'
                    }`}>
                      {item.type === 'movie' ? (
                        <>
                          <Film className="w-3 h-3" />
                          <span>Filme</span>
                        </>
                      ) : (
                        <>
                          <Tv2 className="w-3 h-3" />
                          <span>Série</span>
                        </>
                      )}
                    </span>
                    <span className="text-xs text-gray-600">
                      {new Date(item.createdAt).toLocaleDateString('pt-BR')}
                    </span>
                  </div>
                </div>
              )}
            </div>
          );
        })}

        {sliderItems.length === 0 && (
          <div className="text-center text-gray-500 py-16 bg-zinc-900/20 border border-zinc-800/50 rounded-lg">
            <ImageIcon className="w-12 h-12 mx-auto mb-3 opacity-20" />
            <p className="mb-1">Nenhum item no slider</p>
            <p className="text-sm text-gray-600 max-w-md mx-auto mt-1.5 px-4">
              Adicione filmes ou séries ao slider editando-os e marcando a opção 
              <span className="text-blue-400 mx-1">"Adicionar ao Slider"</span>
            </p>
          </div>
        )}
      </div>
    </div>
  );
}