/* MEDIAVERSE THEME BRIDGE — light/dark only, no theme button */
(function(){
  const KEYS=['mediaverse_theme','mediaverse_theme_mode','theme','mv_theme','MEDIAVERSE_THEME'];
  const normalize=v=>String(v||'').trim().toLowerCase()==='light'||String(v||'').trim().toLowerCase()==='white'||String(v||'').trim().toLowerCase()==='white-mode'?'light':'dark';
  function apply(mode){
    const theme=normalize(mode);
    document.documentElement.dataset.mvTheme=theme;
    if(document.body) document.body.dataset.mvTheme=theme;
    document.documentElement.style.colorScheme=theme;
    const meta=document.querySelector('meta[name="theme-color"]');
    if(meta) meta.content=theme==='light'?'#f5f7fb':'#0b0c18';
    window.dispatchEvent(new CustomEvent('mediaverse:themechange',{detail:{theme}}));
    return theme;
  }
  function read(){
    let v=window.MEDIAVERSE_THEME;
    if(!v && window.MEDIAVERSE_USER_SETTINGS) v=window.MEDIAVERSE_USER_SETTINGS.theme||window.MEDIAVERSE_USER_SETTINGS.mode;
    if(!v && document.documentElement.dataset.mvTheme) v=document.documentElement.dataset.mvTheme;
    if(!v && document.body?.dataset.mvTheme) v=document.body.dataset.mvTheme;
    if(!v) for(const k of KEYS){try{const x=localStorage.getItem(k);if(x){v=x;break;}}catch(e){}}
    return v||'dark';
  }
  window.setMediaverseTheme=apply;
  window.getMediaverseTheme=()=>document.documentElement.dataset.mvTheme||'dark';
  window.addEventListener('storage',e=>{if(KEYS.includes(e.key)) apply(e.newValue);});
  window.addEventListener('mediaverse:themeupdate',e=>apply(e.detail?.theme));
  function init(){apply(read());}
  if(document.readyState==='loading') document.addEventListener('DOMContentLoaded',init,{once:true}); else init();
})();
