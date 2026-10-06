/* ============================================================
   MEDIAVERSE MUSIC v6.0 — FULL SONG EDITION
   
   Sources (in priority order):
   ✅ JioSaavn  — FULL songs, 320kbps, phonk/brazilian/remix সব
   ✅ iTunes    — 30s previews, 100% reliable backup
   ✅ Audius    — full songs, decentralized
   ✅ Jamendo   — full songs, CC licensed
   
   Features:
   ✓ Full song playback (no 30s trim)
   ✓ Auto-fallback if a source fails
   ✓ Deduplication across sources
   ✓ 10-min cache
   ✓ Bad-track blacklist
   ============================================================ */
(function(){
'use strict';
if(window.MVMusic && window.MVMusic.__loaded && window.MVMusic.__version === 'v6.0') return;

/* ============ CONFIG ============ */
const CFG = {
  saavn: {
    // Multiple mirrors for reliability
    mirrors: [
      'https://jiosavan-api2.vercel.app/api',
      'https://saavn.dev/api',
      'https://jiosaavn-api-ts.vercel.app/api'
    ]
  },
  itunes: {
    base: 'https://itunes.apple.com'
  },
  audius: {
    base: 'https://discoveryprovider.audius.co/v1',
    app: 'MediaverseMoments'
  },
  jamendo: {
    clientId: '10f59fe8',
    base: 'https://api.jamendo.com/v3.0'
  }
};

const TIMEOUT = 9000;
const CACHE_TTL = 10 * 60 * 1000;

/* ============ CACHE ============ */
function cacheGet(k){
  try{
    const r = localStorage.getItem('mv_music_cache_' + k);
    if(!r) return null;
    const d = JSON.parse(r);
    if(Date.now() - d.ts > CACHE_TTL){
      localStorage.removeItem('mv_music_cache_' + k);
      return null;
    }
    return d.data;
  }catch(e){ return null; }
}
function cacheSet(k, d){
  try{
    localStorage.setItem('mv_music_cache_' + k, JSON.stringify({ ts: Date.now(), data: d }));
  }catch(e){}
}

/* ============ BAD TRACK BLACKLIST ============ */
function getBadList(){
  try{ return JSON.parse(localStorage.getItem('mv_music_bad_v1') || '[]'); }
  catch(e){ return []; }
}
function isUnplayable(id){
  if(!id) return false;
  return getBadList().includes(id);
}
function markUnplayable(id){
  if(!id) return;
  try{
    const bad = getBadList();
    if(!bad.includes(id)) bad.push(id);
    localStorage.setItem('mv_music_bad_v1', JSON.stringify(bad.slice(-200)));
  }catch(e){}
}

/* ============ UTILS ============ */
function fmtTime(s){
  s = Math.max(0, Math.floor(s || 0));
  const m = Math.floor(s / 60), x = s % 60;
  return m + ':' + (x < 10 ? '0' : '') + x;
}
function fetchT(url, opts = {}, ms = TIMEOUT){
  const c = new AbortController();
  const t = setTimeout(() => c.abort(), ms);
  return fetch(url, { ...opts, signal: c.signal })
    .finally(() => clearTimeout(t));
}
function normKey(t){
  return (String(t.title || '') + '|' + String(t.artist || ''))
    .toLowerCase()
    .replace(/[^a-z0-9\u0980-\u09FF\u0900-\u097F]/g, '')
    .slice(0, 60);
}
function dedupe(list){
  const seen = new Set();
  return list.filter(t => {
    if(!t || !t.url) return false;
    if(isUnplayable(t.id)) return false;
    const k = normKey(t);
    if(seen.has(k)) return false;
    seen.add(k);
    return true;
  });
}
function decodeHtml(str){
  if(!str) return '';
  return String(str)
    .replace(/&quot;/g, '"')
    .replace(/&#039;/g, "'")
    .replace(/&apos;/g, "'")
    .replace(/&amp;/g, '&')
    .replace(/&lt;/g, '<')
    .replace(/&gt;/g, '>');
}

/* ============================================================
   SAAVN — PRIMARY (FULL SONGS)
   ============================================================ */
async function fetchSaavnSearch(query, limit = 25){
  const out = [];
  for(const base of CFG.saavn.mirrors){
    try{
      const url = `${base}/search/songs?query=${encodeURIComponent(query)}&limit=${limit}`;
      const r = await fetchT(url);
      if(!r.ok) continue;
      const d = await r.json();

      // Different API shapes across mirrors
      const items =
        (d && d.data && d.data.results) ||
        (d && d.results) ||
        (d && d.data && Array.isArray(d.data) ? d.data : null) ||
        [];

      if(!Array.isArray(items) || !items.length) continue;

      for(const x of items){
        // Pick best quality URL
        let bestUrl = null;
        const urls = x.downloadUrl || x.download_url || [];
        if(Array.isArray(urls) && urls.length){
          const sorted = [...urls].sort((a, b) => {
            const qa = parseInt(String(a.quality || '').replace(/\D/g,'')) || 0;
            const qb = parseInt(String(b.quality || '').replace(/\D/g,'')) || 0;
            return qb - qa;
          });
          bestUrl = sorted[0].url || sorted[0].link || null;
        }
        // Fallback: media_url or direct url
        if(!bestUrl) bestUrl = x.media_url || x.url || null;
        if(!bestUrl) continue;

        // Artist names
        let artist = 'Unknown';
        if(x.artists && Array.isArray(x.artists.primary) && x.artists.primary.length){
          artist = x.artists.primary.map(a => a.name).filter(Boolean).join(', ');
        } else if(typeof x.primaryArtists === 'string' && x.primaryArtists){
          artist = x.primaryArtists;
        } else if(x.primary_artists){
          artist = x.primary_artists;
        } else if(x.singers){
          artist = x.singers;
        }
        artist = decodeHtml(artist);

        // Cover
        let cover = null;
        if(Array.isArray(x.image) && x.image.length){
          const last = x.image[x.image.length - 1];
          cover = last.url || last.link || null;
        } else if(typeof x.image === 'string'){
          cover = x.image;
        }

        const t = {
          id: 'sv_' + (x.id || Math.random().toString(36).slice(2)),
          title: decodeHtml(x.name || x.title || 'Unknown'),
          artist,
          duration: Number(x.duration || 0) || 0,
          url: bestUrl,
          cover,
          emoji: '🎧',
          hue: '#5de8ff',
          source: 'Saavn',
          fullTrack: true,
          previewOnly: false
        };
        out.push(t);
      }

      if(out.length){
        console.log(`[MVMusic] Saavn ✓ ${out.length} tracks via ${base}`);
        return out;
      }
    }catch(e){
      console.warn('[MVMusic] Saavn mirror failed:', base, e.message);
    }
  }
  return out;
}

/* ============================================================
   iTUNES — BACKUP (30s previews, 100% reliable)
   ============================================================ */
async function fetchItunesSearch(query, limit = 20){
  const out = [];
  try{
    const url = `${CFG.itunes.base}/search?term=${encodeURIComponent(query)}&media=music&limit=${limit}&country=US`;
    const r = await fetchT(url);
    if(!r.ok) return out;
    const d = await r.json();
    (d.results || []).forEach(x => {
      if(!x.previewUrl) return;
      out.push({
        id: 'it_' + x.trackId,
        title: decodeHtml(x.trackName || 'Unknown'),
        artist: decodeHtml(x.artistName || 'Unknown'),
        duration: Math.floor((x.trackTimeMillis || 30000) / 1000),
        url: x.previewUrl,
        cover: (x.artworkUrl100 || '').replace('100x100', '500x500') || null,
        emoji: '🎵',
        hue: '#ff4ecd',
        source: 'iTunes',
        fullTrack: false,
        previewOnly: true
      });
    });
  }catch(e){
    console.warn('[MVMusic] iTunes failed:', e.message);
  }
  return out;
}

/* ============================================================
   AUDIUS — FALLBACK (full songs)
   ============================================================ */
function normAudius(r){
  const art = r.artwork || {};
  return {
    id: 'audius_' + r.id,
    title: decodeHtml(r.title || 'Unknown'),
    artist: decodeHtml((r.user && r.user.name) || 'Unknown'),
    duration: r.duration || 0,
    url: `${CFG.audius.base}/tracks/${r.id}/stream?app_name=${CFG.audius.app}`,
    cover: art['480x480'] || art['150x150'] || null,
    emoji: '🎵',
    hue: '#35e69a',
    source: 'Audius',
    fullTrack: true,
    previewOnly: false
  };
}
async function fetchAudiusSearch(query, limit = 15){
  const out = [];
  try{
    const url = `${CFG.audius.base}/tracks/search?query=${encodeURIComponent(query)}&app_name=${CFG.audius.app}&limit=${limit}`;
    const r = await fetchT(url);
    if(!r.ok) return out;
    const d = await r.json();
    (d.data || []).forEach(x => {
      const t = normAudius(x);
      if(t && t.url) out.push(t);
    });
  }catch(e){
    console.warn('[MVMusic] Audius failed:', e.message);
  }
  return out;
}

/* ============================================================
   JAMENDO — FALLBACK (full songs)
   ============================================================ */
function normJamendo(r){
  return {
    id: 'jamendo_' + r.id,
    title: decodeHtml(r.name || 'Unknown'),
    artist: decodeHtml(r.artist_name || 'Unknown'),
    duration: Math.floor(r.duration) || 0,
    url: (r.audiodownload_allowed && r.audiodownload) ? r.audiodownload : r.audio,
    cover: r.image || null,
    emoji: '🎵',
    hue: '#a855f7',
    source: 'Jamendo',
    fullTrack: true,
    previewOnly: false
  };
}
async function fetchJamendoSearch(query, limit = 10){
  const out = [];
  try{
    const url = `${CFG.jamendo.base}/tracks/?client_id=${CFG.jamendo.clientId}&format=json&limit=${limit}&search=${encodeURIComponent(query)}&include=musicinfo&audioformat=mp32`;
    const r = await fetchT(url);
    if(!r.ok) return out;
    const d = await r.json();
    (d.results || []).forEach(x => {
      const t = normJamendo(x);
      if(t && t.url) out.push(t);
    });
  }catch(e){
    console.warn('[MVMusic] Jamendo failed:', e.message);
  }
  return out;
}

/* ============================================================
   AGGREGATORS
   ============================================================ */
async function aggregateSearch(query, limit = 40){
  const ck = 's60_' + query.toLowerCase().trim().slice(0, 60);
  const cached = cacheGet(ck);
  if(cached && cached.length) return cached;

  console.log('[MVMusic] 🔍 Searching:', query);

  const settled = await Promise.allSettled([
    fetchSaavnSearch(query, 25),
    fetchItunesSearch(query, 15),
    fetchAudiusSearch(query, 10),
    fetchJamendoSearch(query, 10)
  ]);

  const flat = [];
  settled.forEach((s, i) => {
    const names = ['Saavn', 'iTunes', 'Audius', 'Jamendo'];
    if(s.status === 'fulfilled'){
      console.log(`[MVMusic] ${names[i]} → ${s.value.length} tracks`);
      flat.push(...s.value);
    } else {
      console.warn(`[MVMusic] ${names[i]} rejected:`, s.reason?.message);
    }
  });

  let merged = dedupe(flat);

  // Sort: Saavn first, then iTunes, then others
  const order = { Saavn: 1, iTunes: 2, Audius: 3, Jamendo: 4 };
  merged.sort((a, b) => (order[a.source] || 9) - (order[b.source] || 9));

  merged = merged.slice(0, limit);
  if(merged.length) cacheSet(ck, merged);

  console.log(`[MVMusic] ✅ Total: ${merged.length} unique tracks`);
  return merged;
}

async function aggregatePopular(limit = 40){
  const cached = cacheGet('popular_v60');
  if(cached && cached.length) return cached;

  // Diverse popular queries — covers phonk, brazilian, remix, viral
  const queries = [
    'phonk',
    'brazilian funk',
    'slowed reverb',
    'remix 2024',
    'tiktok viral',
    'trending music'
  ];

  const settled = await Promise.allSettled(
    queries.map(q => aggregateSearch(q, 12))
  );

  const flat = [];
  settled.forEach(s => { if(s.status === 'fulfilled') flat.push(...s.value); });

  let merged = dedupe(flat);

  // Shuffle a bit so it's not all grouped by source
  for(let i = merged.length - 1; i > 0; i--){
    const j = Math.floor(Math.random() * (i + 1));
    [merged[i], merged[j]] = [merged[j], merged[i]];
  }

  const final = merged.slice(0, limit);
  if(final.length) cacheSet('popular_v60', final);
  return final;
}

/* ============================================================
   FALLBACK LOCAL LIBRARY
   ============================================================ */
const FALLBACK = [
  { id:'fb1', title:'Neon Dreams',    artist:'Aurora Waves',  duration:220, url:'https://www.soundhelix.com/examples/mp3/SoundHelix-Song-1.mp3', emoji:'🎧', hue:'#5de8ff', source:'Fallback', fullTrack:true, previewOnly:false },
  { id:'fb2', title:'Midnight Drive', artist:'Synth Riders',  duration:245, url:'https://www.soundhelix.com/examples/mp3/SoundHelix-Song-2.mp3', emoji:'🌙', hue:'#a855f7', source:'Fallback', fullTrack:true, previewOnly:false },
  { id:'fb3', title:'Ocean Breeze',   artist:'Chill Vibes',   duration:180, url:'https://www.soundhelix.com/examples/mp3/SoundHelix-Song-3.mp3', emoji:'🌊', hue:'#35e69a', source:'Fallback', fullTrack:true, previewOnly:false }
];

/* ============================================================
   FAVOURITES
   ============================================================ */
const FAV_KEY = 'mv_music_favourites_v1';
let favourites = (() => {
  try{
    const r = localStorage.getItem(FAV_KEY);
    return r ? JSON.parse(r) : [];
  }catch(e){ return []; }
})();
function saveFavs(){
  try{ localStorage.setItem(FAV_KEY, JSON.stringify(favourites)); }catch(e){}
}
function getFavourites(){ return favourites.slice(); }
function isFavourite(id){ return favourites.some(x => x.id === id); }
function addFavourite(t){
  if(!t || !t.id || isFavourite(t.id)) return false;
  favourites.push({ ...t });
  saveFavs();
  return true;
}
function removeFavourite(id){
  const i = favourites.findIndex(x => x.id === id);
  if(i < 0) return false;
  favourites.splice(i, 1);
  saveFavs();
  return true;
}
function toggleFavourite(t){
  if(isFavourite(t.id)){ removeFavourite(t.id); return false; }
  addFavourite(t);
  return true;
}

/* ============================================================
   EXPORT PUBLIC API
   ============================================================ */
window.MVMusic = {
  __loaded: true,
  __version: 'v6.0',
  library: FALLBACK,
  fmtTime,

  loadPopular: async (n = 40) => {
    try{
      const r = await aggregatePopular(n);
      return r.length ? r : FALLBACK;
    }catch(e){
      console.warn('[MVMusic] loadPopular failed:', e);
      return FALLBACK;
    }
  },

  search: async (q, n = 40) => {
    try{
      const r = await aggregateSearch(q, n);
      return r || [];
    }catch(e){
      console.warn('[MVMusic] search failed:', e);
      return [];
    }
  },

  getFavourites,
  isFavourite,
  addFavourite,
  removeFavourite,
  toggleFavourite,

  clearCache: () => {
    try{
      Object.keys(localStorage)
        .filter(k => k.startsWith('mv_music_cache_'))
        .forEach(k => localStorage.removeItem(k));
      console.log('[MVMusic] Cache cleared');
    }catch(e){}
  },

  clearBadTracks: () => {
    try{ localStorage.removeItem('mv_music_bad_v1'); }
    catch(e){}
  },

  markUnplayable,
  isUnplayable,

  sources: ['Saavn', 'iTunes', 'Audius', 'Jamendo']
};

console.log('%c[MVMusic v6.0] ✅ FULL SONG ENGINE', 'color:#5de8ff;font-weight:bold;font-size:12px');
console.log('[MVMusic v6.0] 🎧 Sources:', window.MVMusic.sources.join(', '));
console.log('[MVMusic v6.0] 🎯 Primary: Saavn (full songs) · Backup: iTunes (previews)');

})();