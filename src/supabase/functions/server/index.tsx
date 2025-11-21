import { Hono } from 'npm:hono';
import { cors } from 'npm:hono/cors';
import { logger } from 'npm:hono/logger';
import { createClient } from 'npm:@supabase/supabase-js@2';
import * as kv from './kv_store.tsx';

const app = new Hono();

app.use('*', cors());
app.use('*', logger(console.log));

const supabase = createClient(
  Deno.env.get('SUPABASE_URL') ?? '',
  Deno.env.get('SUPABASE_SERVICE_ROLE_KEY') ?? '',
);

// Helper function to check if user is admin
async function isAdmin(accessToken: string | undefined): Promise<boolean> {
  if (!accessToken) return false;
  const { data: { user } } = await supabase.auth.getUser(accessToken);
  if (!user) return false;
  // Check if user is main admin or has admin permission in metadata
  return user.email === 'feckzindev@gmail.com' || user.user_metadata?.isAdmin === true;
}

// Helper function to get authenticated user
async function getAuthUser(accessToken: string | undefined) {
  if (!accessToken) return null;
  const { data: { user }, error } = await supabase.auth.getUser(accessToken);
  if (error || !user) return null;
  return user;
}

// Create storage buckets on startup
async function initStorage() {
  const bucketName = 'make-7c0425fe-slider';
  const { data: buckets } = await supabase.storage.listBuckets();
  const bucketExists = buckets?.some(bucket => bucket.name === bucketName);
  if (!bucketExists) {
    await supabase.storage.createBucket(bucketName, { public: false });
  }
}

initStorage().catch(console.error);

// Helper function to map TMDB genres to app categories
function mapGenreToCategory(genres: any[], type: 'movie' | 'series'): string {
  const prefix = type === 'movie' ? 'Filme ~ ' : 'Séries ~ ';
  
  if (!genres || genres.length === 0) {
    return prefix + 'Sem categoria';
  }
  
  // Map genre names to our categories
  const genreName = genres[0]?.name?.toLowerCase() || '';
  
  const genreMap: { [key: string]: string } = {
    'ação': 'Ação',
    'action': 'Ação',
    'terror': 'Terror',
    'horror': 'Terror',
    'crime': 'Crime',
    'drama': 'Drama',
    'thriller': 'Crime',
    'mistério': 'Crime',
    'mystery': 'Crime'
  };
  
  for (const [key, value] of Object.entries(genreMap)) {
    if (genreName.includes(key)) {
      return prefix + value;
    }
  }
  
  // If no match, use the first genre or "Sem categoria"
  return prefix + (genres[0]?.name || 'Sem categoria');
}

// Helper function to check if content is a release (within 1 month)
function isRecentRelease(releaseDate: string): boolean {
  if (!releaseDate) return false;
  
  const release = new Date(releaseDate);
  const now = new Date();
  const oneMonthAgo = new Date();
  oneMonthAgo.setMonth(oneMonthAgo.getMonth() - 1);
  
  return release >= oneMonthAgo && release <= now;
}

// Helper function to manage home display limit (max 10 per category)
async function manageHomeDisplayLimit(category: string, type: 'movie' | 'series') {
  const prefix = type === 'movie' ? 'movie:' : 'series:';
  const allContent = await kv.getByPrefix(prefix);
  
  // Filter content in this category that's shown in home
  const categoryContent = allContent
    .filter((item: any) => item.categories?.includes(category) && item.showInHome !== false)
    .sort((a: any, b: any) => (b.addedAt || 0) - (a.addedAt || 0));
  
  // If more than 10, hide older ones from home
  if (categoryContent.length > 10) {
    for (let i = 10; i < categoryContent.length; i++) {
      const item = categoryContent[i];
      await kv.set(`${prefix}${item.id}`, { ...item, showInHome: false });
    }
  }
}

// Helper function to update release categories based on date
async function updateReleaseCategories() {
  const movies = await kv.getByPrefix('movie:');
  const series = await kv.getByPrefix('series:');
  
  for (const movie of movies) {
    const isRelease = isRecentRelease(movie.releaseDate);
    const hasReleaseCategory = movie.categories?.includes('Filme ~ Lançamentos');
    
    if (isRelease && !hasReleaseCategory) {
      // Add to releases
      const categories = movie.categories || [];
      categories.unshift('Filme ~ Lançamentos');
      await kv.set(`movie:${movie.id}`, { ...movie, categories });
    } else if (!isRelease && hasReleaseCategory) {
      // Remove from releases
      const categories = movie.categories.filter((c: string) => c !== 'Filme ~ Lançamentos');
      await kv.set(`movie:${movie.id}`, { ...movie, categories });
    }
  }
  
  for (const show of series) {
    const isRelease = isRecentRelease(show.releaseDate);
    const hasReleaseCategory = show.categories?.includes('Séries ~ Lançamentos');
    
    if (isRelease && !hasReleaseCategory) {
      // Add to releases
      const categories = show.categories || [];
      categories.unshift('Séries ~ Lançamentos');
      await kv.set(`series:${show.id}`, { ...show, categories });
    } else if (!isRelease && hasReleaseCategory) {
      // Remove from releases
      const categories = show.categories.filter((c: string) => c !== 'Séries ~ Lançamentos');
      await kv.set(`series:${show.id}`, { ...show, categories });
    }
  }
}

// Auth routes
app.post('/make-server-7c0425fe/signup', async (c) => {
  try {
    const { email, password, name } = await c.req.json();
    
    const { data, error } = await supabase.auth.admin.createUser({
      email,
      password,
      user_metadata: { name },
      email_confirm: true // Automatically confirm email since email server hasn't been configured
    });

    if (error) {
      console.log('Signup error:', error);
      return c.json({ error: error.message }, 400);
    }

    return c.json({ success: true, user: data.user });
  } catch (error) {
    console.log('Signup exception:', error);
    return c.json({ error: String(error) }, 500);
  }
});

app.post('/make-server-7c0425fe/update-password', async (c) => {
  try {
    const accessToken = c.req.header('Authorization')?.split(' ')[1];
    const user = await getAuthUser(accessToken);
    if (!user) {
      return c.json({ error: 'Unauthorized' }, 401);
    }

    const { newPassword } = await c.req.json();
    
    const { error } = await supabase.auth.admin.updateUserById(user.id, {
      password: newPassword
    });

    if (error) {
      console.log('Update password error:', error);
      return c.json({ error: error.message }, 400);
    }

    return c.json({ success: true });
  } catch (error) {
    console.log('Update password exception:', error);
    return c.json({ error: String(error) }, 500);
  }
});

// TMDB API routes
app.get('/make-server-7c0425fe/tmdb/search/movie', async (c) => {
  try {
    const accessToken = c.req.header('Authorization')?.split(' ')[1];
    if (!await isAdmin(accessToken)) {
      return c.json({ error: 'Admin access required' }, 403);
    }

    const query = c.req.query('query');
    const apiKey = Deno.env.get('TMDB_API_KEY');
    
    const response = await fetch(
      `https://api.themoviedb.org/3/search/movie?api_key=${apiKey}&query=${encodeURIComponent(query ?? '')}&language=pt-BR`
    );
    const data = await response.json();
    
    return c.json(data);
  } catch (error) {
    console.log('TMDB search movie error:', error);
    return c.json({ error: String(error) }, 500);
  }
});

app.get('/make-server-7c0425fe/tmdb/search/tv', async (c) => {
  try {
    const accessToken = c.req.header('Authorization')?.split(' ')[1];
    if (!await isAdmin(accessToken)) {
      return c.json({ error: 'Admin access required' }, 403);
    }

    const query = c.req.query('query');
    const apiKey = Deno.env.get('TMDB_API_KEY');
    
    const response = await fetch(
      `https://api.themoviedb.org/3/search/tv?api_key=${apiKey}&query=${encodeURIComponent(query ?? '')}&language=pt-BR`
    );
    const data = await response.json();
    
    return c.json(data);
  } catch (error) {
    console.log('TMDB search TV error:', error);
    return c.json({ error: String(error) }, 500);
  }
});

app.get('/make-server-7c0425fe/tmdb/movie/:id', async (c) => {
  try {
    const accessToken = c.req.header('Authorization')?.split(' ')[1];
    if (!await isAdmin(accessToken)) {
      return c.json({ error: 'Admin access required' }, 403);
    }

    const id = c.req.param('id');
    const apiKey = Deno.env.get('TMDB_API_KEY');
    
    const response = await fetch(
      `https://api.themoviedb.org/3/movie/${id}?api_key=${apiKey}&language=pt-BR`
    );
    const data = await response.json();
    
    return c.json(data);
  } catch (error) {
    console.log('TMDB get movie error:', error);
    return c.json({ error: String(error) }, 500);
  }
});

app.get('/make-server-7c0425fe/tmdb/tv/:id', async (c) => {
  try {
    const accessToken = c.req.header('Authorization')?.split(' ')[1];
    if (!await isAdmin(accessToken)) {
      return c.json({ error: 'Admin access required' }, 403);
    }

    const id = c.req.param('id');
    const apiKey = Deno.env.get('TMDB_API_KEY');
    
    const response = await fetch(
      `https://api.themoviedb.org/3/tv/${id}?api_key=${apiKey}&language=pt-BR`
    );
    const data = await response.json();
    
    return c.json(data);
  } catch (error) {
    console.log('TMDB get TV error:', error);
    return c.json({ error: String(error) }, 500);
  }
});

app.get('/make-server-7c0425fe/tmdb/tv/:id/season/:season', async (c) => {
  try {
    const accessToken = c.req.header('Authorization')?.split(' ')[1];
    if (!await isAdmin(accessToken)) {
      return c.json({ error: 'Admin access required' }, 403);
    }

    const id = c.req.param('id');
    const season = c.req.param('season');
    const apiKey = Deno.env.get('TMDB_API_KEY');
    
    const response = await fetch(
      `https://api.themoviedb.org/3/tv/${id}/season/${season}?api_key=${apiKey}&language=pt-BR`
    );
    const data = await response.json();
    
    return c.json(data);
  } catch (error) {
    console.log('TMDB get season error:', error);
    return c.json({ error: String(error) }, 500);
  }
});

// Movies routes
app.get('/make-server-7c0425fe/movies', async (c) => {
  try {
    const movies = await kv.getByPrefix('movie:');
    return c.json(movies);
  } catch (error) {
    console.log('Get movies error:', error);
    return c.json({ error: String(error) }, 500);
  }
});

app.get('/make-server-7c0425fe/movies/:id', async (c) => {
  try {
    const id = c.req.param('id');
    const movie = await kv.get(`movie:${id}`);
    if (!movie) {
      return c.json({ error: 'Movie not found' }, 404);
    }
    return c.json(movie);
  } catch (error) {
    console.log('Get movie error:', error);
    return c.json({ error: String(error) }, 500);
  }
});

app.post('/make-server-7c0425fe/movies', async (c) => {
  try {
    const accessToken = c.req.header('Authorization')?.split(' ')[1];
    if (!await isAdmin(accessToken)) {
      return c.json({ error: 'Admin access required' }, 403);
    }

    const movie = await c.req.json();
    const id = movie.id || `${Date.now()}`;
    const now = Date.now();
    
    // Auto-categorize if not manually set
    let categories = movie.categories || [];
    if (categories.length === 0) {
      const primaryCategory = mapGenreToCategory(movie.tmdbGenres || [], 'movie');
      categories.push(primaryCategory);
    }
    
    // Add to releases if within 1 month
    if (isRecentRelease(movie.releaseDate)) {
      if (!categories.includes('Filme ~ Lançamentos')) {
        categories.unshift('Filme ~ Lançamentos');
      }
    }
    
    const movieData = {
      ...movie,
      id,
      categories,
      addedAt: now,
      showInHome: true
    };
    
    await kv.set(`movie:${id}`, movieData);
    
    // Manage home display limit for each category
    for (const category of categories) {
      await manageHomeDisplayLimit(category, 'movie');
    }
    
    // Handle slider
    if (movie.inSlider && movie.bannerUrl) {
      const sliderItems = await kv.get('slider') || [];
      const existingIndex = sliderItems.findIndex((item: any) => item.contentId === id && item.type === 'movie');
      
      if (existingIndex === -1) {
        sliderItems.push({
          url: movie.bannerUrl,
          contentId: id,
          type: 'movie',
          createdAt: now
        });
        await kv.set('slider', sliderItems);
      }
    }
    
    return c.json({ success: true, id });
  } catch (error) {
    console.log('Create movie error:', error);
    return c.json({ error: String(error) }, 500);
  }
});

app.put('/make-server-7c0425fe/movies/:id', async (c) => {
  try {
    const accessToken = c.req.header('Authorization')?.split(' ')[1];
    if (!await isAdmin(accessToken)) {
      return c.json({ error: 'Admin access required' }, 403);
    }

    const id = c.req.param('id');
    const movie = await c.req.json();
    await kv.set(`movie:${id}`, { ...movie, id });
    
    // Handle slider
    const sliderItems = await kv.get('slider') || [];
    const existingIndex = sliderItems.findIndex((item: any) => item.contentId === id && item.type === 'movie');
    
    if (movie.inSlider && movie.bannerUrl) {
      if (existingIndex === -1) {
        sliderItems.push({
          url: movie.bannerUrl,
          contentId: id,
          type: 'movie',
          createdAt: Date.now()
        });
        await kv.set('slider', sliderItems);
      } else {
        sliderItems[existingIndex].url = movie.bannerUrl;
        await kv.set('slider', sliderItems);
      }
    } else if (!movie.inSlider && existingIndex !== -1) {
      sliderItems.splice(existingIndex, 1);
      await kv.set('slider', sliderItems);
    }
    
    return c.json({ success: true });
  } catch (error) {
    console.log('Update movie error:', error);
    return c.json({ error: String(error) }, 500);
  }
});

app.delete('/make-server-7c0425fe/movies/:id', async (c) => {
  try {
    const accessToken = c.req.header('Authorization')?.split(' ')[1];
    if (!await isAdmin(accessToken)) {
      return c.json({ error: 'Admin access required' }, 403);
    }

    const id = c.req.param('id');
    
    // Remove from movies
    await kv.del(`movie:${id}`);
    
    // Remove from slider if present
    const sliderItems = await kv.get('slider') || [];
    const filteredSlider = sliderItems.filter((item: any) => !(item.contentId === id && item.type === 'movie'));
    if (filteredSlider.length !== sliderItems.length) {
      await kv.set('slider', filteredSlider);
    }
    
    // Remove from all users' favorites
    const allKeys = await kv.getAllKeys();
    const favoriteKeys = allKeys.filter(key => key.startsWith('favorites:'));
    
    for (const key of favoriteKeys) {
      const favorites = await kv.get(key) || [];
      const filteredFavorites = favorites.filter((fav: any) => fav.contentId !== id);
      if (filteredFavorites.length !== favorites.length) {
        await kv.set(key, filteredFavorites);
      }
    }
    
    return c.json({ success: true });
  } catch (error) {
    console.log('Delete movie error:', error);
    return c.json({ error: String(error) }, 500);
  }
});

// Series routes
app.get('/make-server-7c0425fe/series', async (c) => {
  try {
    const series = await kv.getByPrefix('series:');
    return c.json(series);
  } catch (error) {
    console.log('Get series error:', error);
    return c.json({ error: String(error) }, 500);
  }
});

app.get('/make-server-7c0425fe/series/:id', async (c) => {
  try {
    const id = c.req.param('id');
    const series = await kv.get(`series:${id}`);
    if (!series) {
      return c.json({ error: 'Series not found' }, 404);
    }
    return c.json(series);
  } catch (error) {
    console.log('Get series error:', error);
    return c.json({ error: String(error) }, 500);
  }
});

app.post('/make-server-7c0425fe/series', async (c) => {
  try {
    const accessToken = c.req.header('Authorization')?.split(' ')[1];
    if (!await isAdmin(accessToken)) {
      return c.json({ error: 'Admin access required' }, 403);
    }

    const series = await c.req.json();
    const id = series.id || `${Date.now()}`;
    const now = Date.now();
    
    // Auto-categorize if not manually set
    let categories = series.categories || [];
    if (categories.length === 0) {
      const primaryCategory = mapGenreToCategory(series.tmdbGenres || [], 'series');
      categories.push(primaryCategory);
    }
    
    // Add to releases if within 1 month
    if (isRecentRelease(series.releaseDate)) {
      if (!categories.includes('Séries ~ Lançamentos')) {
        categories.unshift('Séries ~ Lançamentos');
      }
    }
    
    const seriesData = {
      ...series,
      id,
      categories,
      addedAt: now,
      showInHome: true
    };
    
    await kv.set(`series:${id}`, seriesData);
    
    // Manage home display limit for each category
    for (const category of categories) {
      await manageHomeDisplayLimit(category, 'series');
    }
    
    // Handle slider
    if (series.inSlider && series.bannerUrl) {
      const sliderItems = await kv.get('slider') || [];
      const existingIndex = sliderItems.findIndex((item: any) => item.contentId === id && item.type === 'series');
      
      if (existingIndex === -1) {
        sliderItems.push({
          url: series.bannerUrl,
          contentId: id,
          type: 'series',
          createdAt: now
        });
        await kv.set('slider', sliderItems);
      }
    }
    
    return c.json({ success: true, id });
  } catch (error) {
    console.log('Create series error:', error);
    return c.json({ error: String(error) }, 500);
  }
});

app.put('/make-server-7c0425fe/series/:id', async (c) => {
  try {
    const accessToken = c.req.header('Authorization')?.split(' ')[1];
    if (!await isAdmin(accessToken)) {
      return c.json({ error: 'Admin access required' }, 403);
    }

    const id = c.req.param('id');
    const series = await c.req.json();
    await kv.set(`series:${id}`, { ...series, id });
    
    // Handle slider
    const sliderItems = await kv.get('slider') || [];
    const existingIndex = sliderItems.findIndex((item: any) => item.contentId === id && item.type === 'series');
    
    if (series.inSlider && series.bannerUrl) {
      if (existingIndex === -1) {
        sliderItems.push({
          url: series.bannerUrl,
          contentId: id,
          type: 'series',
          createdAt: Date.now()
        });
        await kv.set('slider', sliderItems);
      } else {
        sliderItems[existingIndex].url = series.bannerUrl;
        await kv.set('slider', sliderItems);
      }
    } else if (!series.inSlider && existingIndex !== -1) {
      sliderItems.splice(existingIndex, 1);
      await kv.set('slider', sliderItems);
    }
    
    return c.json({ success: true });
  } catch (error) {
    console.log('Update series error:', error);
    return c.json({ error: String(error) }, 500);
  }
});

app.delete('/make-server-7c0425fe/series/:id', async (c) => {
  try {
    const accessToken = c.req.header('Authorization')?.split(' ')[1];
    if (!await isAdmin(accessToken)) {
      return c.json({ error: 'Admin access required' }, 403);
    }

    const id = c.req.param('id');
    
    // Remove from series
    await kv.del(`series:${id}`);
    
    // Remove from slider if present
    const sliderItems = await kv.get('slider') || [];
    const filteredSlider = sliderItems.filter((item: any) => !(item.contentId === id && item.type === 'series'));
    if (filteredSlider.length !== sliderItems.length) {
      await kv.set('slider', filteredSlider);
    }
    
    // Remove from all users' favorites
    const allKeys = await kv.getAllKeys();
    const favoriteKeys = allKeys.filter(key => key.startsWith('favorites:'));
    
    for (const key of favoriteKeys) {
      const favorites = await kv.get(key) || [];
      const filteredFavorites = favorites.filter((fav: any) => fav.contentId !== id);
      if (filteredFavorites.length !== favorites.length) {
        await kv.set(key, filteredFavorites);
      }
    }
    
    return c.json({ success: true });
  } catch (error) {
    console.log('Delete series error:', error);
    return c.json({ error: String(error) }, 500);
  }
});

// Favorites routes
app.get('/make-server-7c0425fe/favorites', async (c) => {
  try {
    const accessToken = c.req.header('Authorization')?.split(' ')[1];
    const user = await getAuthUser(accessToken);
    if (!user) {
      return c.json({ error: 'Unauthorized' }, 401);
    }

    const favorites = await kv.get(`favorites:${user.id}`) || [];
    return c.json(favorites);
  } catch (error) {
    console.log('Get favorites error:', error);
    return c.json({ error: String(error) }, 500);
  }
});

app.post('/make-server-7c0425fe/favorites', async (c) => {
  try {
    const accessToken = c.req.header('Authorization')?.split(' ')[1];
    const user = await getAuthUser(accessToken);
    if (!user) {
      return c.json({ error: 'Unauthorized' }, 401);
    }

    const { contentId, type } = await c.req.json();
    const favorites = await kv.get(`favorites:${user.id}`) || [];
    
    const existing = favorites.find((f: any) => f.contentId === contentId);
    if (!existing) {
      favorites.push({ contentId, type });
      await kv.set(`favorites:${user.id}`, favorites);
    }
    
    return c.json({ success: true });
  } catch (error) {
    console.log('Add favorite error:', error);
    return c.json({ error: String(error) }, 500);
  }
});

app.delete('/make-server-7c0425fe/favorites/:contentId', async (c) => {
  try {
    const accessToken = c.req.header('Authorization')?.split(' ')[1];
    const user = await getAuthUser(accessToken);
    if (!user) {
      return c.json({ error: 'Unauthorized' }, 401);
    }

    const contentId = c.req.param('contentId');
    const favorites = await kv.get(`favorites:${user.id}`) || [];
    
    const updated = favorites.filter((f: any) => f.contentId !== contentId);
    await kv.set(`favorites:${user.id}`, updated);
    
    return c.json({ success: true });
  } catch (error) {
    console.log('Remove favorite error:', error);
    return c.json({ error: String(error) }, 500);
  }
});

// Slider routes
app.get('/make-server-7c0425fe/slider', async (c) => {
  try {
    const sliderItems = await kv.get('slider') || [];
    return c.json(sliderItems);
  } catch (error) {
    console.log('Get slider error:', error);
    return c.json({ error: String(error) }, 500);
  }
});

app.post('/make-server-7c0425fe/slider/upload', async (c) => {
  try {
    const accessToken = c.req.header('Authorization')?.split(' ')[1];
    if (!await isAdmin(accessToken)) {
      return c.json({ error: 'Admin access required' }, 403);
    }

    const formData = await c.req.formData();
    const file = formData.get('file') as File;
    const contentId = formData.get('contentId') as string;
    const type = formData.get('type') as string;
    
    if (!file) {
      return c.json({ error: 'No file provided' }, 400);
    }

    const fileName = `${Date.now()}-${file.name}`;
    const arrayBuffer = await file.arrayBuffer();
    const buffer = new Uint8Array(arrayBuffer);
    
    const { data, error } = await supabase.storage
      .from('make-7c0425fe-slider')
      .upload(fileName, buffer, {
        contentType: file.type,
      });

    if (error) {
      console.log('Storage upload error:', error);
      return c.json({ error: error.message }, 500);
    }

    const { data: urlData } = await supabase.storage
      .from('make-7c0425fe-slider')
      .createSignedUrl(fileName, 31536000); // 1 year

    const sliderItems = await kv.get('slider') || [];
    sliderItems.push({
      url: urlData?.signedUrl,
      fileName,
      contentId,
      type,
      createdAt: Date.now()
    });
    await kv.set('slider', sliderItems);

    return c.json({ success: true, url: urlData?.signedUrl });
  } catch (error) {
    console.log('Upload slider error:', error);
    return c.json({ error: String(error) }, 500);
  }
});

app.delete('/make-server-7c0425fe/slider/:index', async (c) => {
  try {
    const accessToken = c.req.header('Authorization')?.split(' ')[1];
    if (!await isAdmin(accessToken)) {
      return c.json({ error: 'Admin access required' }, 403);
    }

    const index = parseInt(c.req.param('index'));
    const sliderItems = await kv.get('slider') || [];
    
    if (index >= 0 && index < sliderItems.length) {
      const item = sliderItems[index];
      
      // Delete from storage
      if (item.fileName) {
        await supabase.storage
          .from('make-7c0425fe-slider')
          .remove([item.fileName]);
      }
      
      sliderItems.splice(index, 1);
      await kv.set('slider', sliderItems);
    }

    return c.json({ success: true });
  } catch (error) {
    console.log('Delete slider error:', error);
    return c.json({ error: String(error) }, 500);
  }
});

// Users routes
app.get('/make-server-7c0425fe/users', async (c) => {
  try {
    const accessToken = c.req.header('Authorization')?.split(' ')[1];
    if (!await isAdmin(accessToken)) {
      return c.json({ error: 'Admin access required' }, 403);
    }

    const { data: { users }, error } = await supabase.auth.admin.listUsers();
    
    if (error) {
      console.log('List users error:', error);
      return c.json({ error: error.message }, 500);
    }

    return c.json(users);
  } catch (error) {
    console.log('Get users error:', error);
    return c.json({ error: String(error) }, 500);
  }
});

app.post('/make-server-7c0425fe/users', async (c) => {
  try {
    const accessToken = c.req.header('Authorization')?.split(' ')[1];
    if (!await isAdmin(accessToken)) {
      return c.json({ error: 'Admin access required' }, 403);
    }

    const { email, password, name } = await c.req.json();
    
    const { data, error } = await supabase.auth.admin.createUser({
      email,
      password,
      user_metadata: { name },
      email_confirm: true
    });

    if (error) {
      console.log('Create user error:', error);
      return c.json({ error: error.message }, 400);
    }

    return c.json({ success: true, user: data.user });
  } catch (error) {
    console.log('Create user exception:', error);
    return c.json({ error: String(error) }, 500);
  }
});

app.delete('/make-server-7c0425fe/users/:id', async (c) => {
  try {
    const accessToken = c.req.header('Authorization')?.split(' ')[1];
    if (!await isAdmin(accessToken)) {
      return c.json({ error: 'Admin access required' }, 403);
    }

    const id = c.req.param('id');
    const { error } = await supabase.auth.admin.deleteUser(id);
    
    if (error) {
      console.log('Delete user error:', error);
      return c.json({ error: error.message }, 500);
    }

    return c.json({ success: true });
  } catch (error) {
    console.log('Delete user exception:', error);
    return c.json({ error: String(error) }, 500);
  }
});

app.put('/make-server-7c0425fe/users/:userId/admin', async (c) => {
  try {
    const accessToken = c.req.header('Authorization')?.split(' ')[1];
    if (!await isAdmin(accessToken)) {
      return c.json({ error: 'Admin access required' }, 403);
    }

    const userId = c.req.param('userId');
    const { isAdmin: makeAdmin } = await c.req.json();
    
    // Get current user to preserve other metadata
    const { data: currentUser } = await supabase.auth.admin.getUserById(userId);
    
    if (!currentUser?.user) {
      return c.json({ error: 'User not found' }, 404);
    }
    
    // Merge existing metadata with new isAdmin value
    const updatedMetadata = {
      ...currentUser.user.user_metadata,
      isAdmin: makeAdmin
    };
    
    const { error } = await supabase.auth.admin.updateUserById(userId, {
      user_metadata: updatedMetadata
    });
    
    if (error) {
      console.log('Toggle admin error:', error);
      return c.json({ error: error.message }, 500);
    }

    return c.json({ success: true });
  } catch (error) {
    console.log('Toggle admin exception:', error);
    return c.json({ error: String(error) }, 500);
  }
});

Deno.serve(app.fetch);