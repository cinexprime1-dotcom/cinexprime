import React, { useEffect, useState } from 'react';
import { projectId, publicAnonKey } from '../utils/supabase/info';
import { motion, AnimatePresence } from 'framer-motion';

interface HomeScreenProps {
  onSelectContent: (id: string, type: 'movie' | 'series', genre?: string) => void;
}

export function HomeScreen({ onSelectContent }: HomeScreenProps) {
  const [sliderImages, setSliderImages] = useState<any[]>([]);
  const [currentSlide, setCurrentSlide] = useState(0);
  const [direction, setDirection] = useState(0);
  const [loading, setLoading] = useState(true);
  const [movies, setMovies] = useState<any[]>([]);
  const [series, setSeries] = useState<any[]>([]);

  const movieCategories = ['Filme ~ Lançamentos', 'Filme ~ Ação', 'Filme ~ Terror', 'Filme ~ Crime', 'Filme ~ Drama'];
  const seriesCategories = ['Séries ~ Lançamentos', 'Séries ~ Ação', 'Séries ~ Terror', 'Séries ~ Crime', 'Séries ~ Drama'];

  useEffect(() => {
    loadData();
  }, []);

  useEffect(() => {
    if (sliderImages.length > 0) {
      const interval = setInterval(() => {
        setDirection(1);
        setCurrentSlide(prev => (prev + 1) % sliderImages.length);
      }, 5000);
      return () => clearInterval(interval);
    }
  }, [sliderImages.length]);

  async function loadData() {
    try {
      const fetchWithTimeout = (url: string, options: any, timeout = 5000) => {
        return Promise.race([
          fetch(url, options),
          new Promise<Response>((_, reject) => 
            setTimeout(() => reject(new Error('Timeout')), timeout)
          )
        ]);
      };

      const [sliderRes, moviesRes, seriesRes] = await Promise.all([
        fetchWithTimeout(`https://${projectId}.supabase.co/functions/v1/make-server-7c0425fe/slider`, {
          headers: { 'Authorization': `Bearer ${publicAnonKey}` }
        }).catch(() => null),
        fetchWithTimeout(`https://${projectId}.supabase.co/functions/v1/make-server-7c0425fe/movies`, {
          headers: { 'Authorization': `Bearer ${publicAnonKey}` }
        }).catch(() => null),
        fetchWithTimeout(`https://${projectId}.supabase.co/functions/v1/make-server-7c0425fe/series`, {
          headers: { 'Authorization': `Bearer ${publicAnonKey}` }
        }).catch(() => null),
      ]);

      const sliderData = sliderRes ? await sliderRes.json().catch(() => []) : [];
      const moviesData = moviesRes ? await moviesRes.json().catch(() => []) : [];
      const seriesData = seriesRes ? await seriesRes.json().catch(() => []) : [];

      setSliderImages(Array.isArray(sliderData) ? sliderData : []);
      setMovies(Array.isArray(moviesData) ? moviesData : []);
      setSeries(Array.isArray(seriesData) ? seriesData : []);
    } catch (error) {
      setSliderImages([]);
      setMovies([]);
      setSeries([]);
    } finally {
      setLoading(false);
    }
  }

  function getContentByCategory(category: string) {
    if (category.startsWith('Filme ~')) {
      return movies
        .filter(m => m.categories?.includes(category) && m.showInHome !== false)
        .sort((a, b) => (b.addedAt || 0) - (a.addedAt || 0))
        .slice(0, 10);
    }
    if (category.startsWith('Séries ~')) {
      return series
        .filter(s => s.categories?.includes(category) && s.showInHome !== false)
        .sort((a, b) => (b.addedAt || 0) - (a.addedAt || 0))
        .slice(0, 10);
    }
    const moviesInCategory = movies
      .filter(m => m.categories?.includes(category) && m.showInHome !== false);
    const seriesInCategory = series
      .filter(s => s.categories?.includes(category) && s.showInHome !== false);
    return [...moviesInCategory, ...seriesInCategory]
      .sort((a, b) => (b.addedAt || 0) - (a.addedAt || 0))
      .slice(0, 10);
  }

  function getGenreFromCategory(category: string): string {
    const genre = category.split('~')[1]?.trim() || '';
    return genre === 'Lançamentos' ? 'Lançamento' : genre;
  }

  function handleSliderClick() {
    const currentItem = sliderImages[currentSlide];
    if (currentItem?.contentId && currentItem?.type) {
      onSelectContent(currentItem.contentId, currentItem.type);
    }
  }

  if (loading) {
    return (
      <div className="min-h-screen bg-[#0f1117] flex items-center justify-center">
        <div className="text-gray-400">Carregando...</div>
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-[#0f1117] pb-20 w-full max-w-screen-xl mx-auto">
      <div className="p-4 space-y-8 w-full">
        {sliderImages.length > 0 && (
          <div className="relative rounded-2xl overflow-hidden border-2 border-zinc-800/60 w-full">
            <div className="aspect-video relative w-full">
              <AnimatePresence initial={false} custom={direction} mode="wait">
                <motion.div
                  key={currentSlide}
                  custom={direction}
                  initial={{ x: direction > 0 ? '100%' : '-100%', opacity: 0 }}
                  animate={{ x: 0, opacity: 1 }}
                  exit={{ x: direction > 0 ? '-100%' : '100%', opacity: 0 }}
                  transition={{
                    x: { type: "spring", stiffness: 300, damping: 30 },
                    opacity: { duration: 0.3 }
                  }}
                  className="absolute inset-0 cursor-pointer"
                  onClick={handleSliderClick}
                >
                  <img
                    src={sliderImages[currentSlide]?.url}
                    alt="Slider"
                    className="w-full h-full object-cover"
                  />
                </motion.div>
              </AnimatePresence>
            </div>
          </div>
        )}

        {movieCategories.map((category) => {
          const content = getContentByCategory(category);
          
          if (content.length === 0) return null;

          const genre = getGenreFromCategory(category);

          return (
            <div key={category} className="space-y-3">
              <h2 className="text-xl text-white font-semibold">{category}</h2>
              <div className="flex gap-3 overflow-x-auto pb-2 scrollbar-hide">
                {content.map((item) => (
                  <button
                    key={item.id}
                    onClick={() => onSelectContent(item.id, item.seasons ? 'series' : 'movie', genre)}
                    className="flex-shrink-0 w-[110px] transition-transform duration-300 hover:scale-105"
                  >
                    <div className="rounded-lg overflow-hidden border-2 border-zinc-800/60">
                      <img
                        src={item.posterUrl}
                        alt={item.title}
                        className="w-full aspect-[2/3] object-cover"
                      />
                    </div>
                    <h3 className="mt-2 text-xs text-gray-300 truncate font-medium">{item.title}</h3>
                  </button>
                ))}
              </div>
            </div>
          );
        })}
        {seriesCategories.map((category) => {
          const content = getContentByCategory(category);
          
          if (content.length === 0) return null;

          const genre = getGenreFromCategory(category);

          return (
            <div key={category} className="space-y-3">
              <h2 className="text-xl text-white font-semibold">{category}</h2>
              <div className="flex gap-3 overflow-x-auto pb-2 scrollbar-hide">
                {content.map((item) => (
                  <button
                    key={item.id}
                    onClick={() => onSelectContent(item.id, item.seasons ? 'series' : 'movie', genre)}
                    className="flex-shrink-0 w-[110px] transition-transform duration-300 hover:scale-105"
                  >
                    <div className="rounded-lg overflow-hidden border-2 border-zinc-800/60">
                      <img
                        src={item.posterUrl}
                        alt={item.title}
                        className="w-full aspect-[2/3] object-cover"
                      />
                    </div>
                    <h3 className="mt-2 text-xs text-gray-300 truncate font-medium">{item.title}</h3>
                  </button>
                ))}
              </div>
            </div>
          );
        })}
      </div>
    </div>
  );
}