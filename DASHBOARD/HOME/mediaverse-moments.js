/* ============================================================
   MEDIAVERSE MOMENTS v16.0.6 — INSTAGRAM MUSIC EDITOR EDITION

   v16.0.6 Fix:
   ✓ FIXED: Duplicate `#mvVideoEndRange` handler (double binding)
   ✓ Start slider → instant seek + auto-play (music-এর মতো)
   ✓ End slider → start auto = end − 1:30
   ✓ Video mute toggle button (trimmer-এ)
   ✓ Trim Apply → panel close → canvas-এ ফিরে আসে
   ✓ Video থাকলে music default = video duration
   ✓ Music-এর নিজের auto-window logic video-aware
   ✓ Timer loop fresh read (seek/timer instant)
   
   v16.0.6.1 HOTFIX:
   ✓ FIXED: Duplicate + unclosed `renderProgress()` → home page load failure
   ✓ FIXED: Orphan top-level `if` block moved inside `selectMusic()`
   ============================================================ */
(function(){
'use strict';
if(window.MVMoments && window.MVMoments.__loaded && window.MVMoments.__version === 'v16.0.6') return;

/* ⭐ DURATION CONSTANTS ⭐ */
const STORY_IMAGE_DURATION = 30000;
const STORY_VIDEO_MAX      = 90;   /* max 1:30 */
const STORY_VIDEO_FILE_LIMIT = 600;
const MUSIC_TRIM_DEFAULT   = 30;

const CSS = `
.moments{position:relative;}
.mv-story{position:relative;flex:0 0 122px;height:158px;border-radius:20px;overflow:hidden;cursor:pointer;border:1px solid rgba(255,255,255,.10);background:linear-gradient(160deg,#0e1020,#131628);transition:transform .25s cubic-bezier(.2,.9,.3,1.4),border-color .25s ease,box-shadow .25s ease;}
.mv-story:hover{transform:translateY(-4px);border-color:rgba(0,229,255,.28);box-shadow:0 14px 36px rgba(0,0,0,.4),0 0 0 1px rgba(0,229,255,.10);}
.mv-story:active{transform:scale(.97);}
.mv-story-cover{position:absolute;inset:0;width:100%;height:100%;object-fit:cover;opacity:.75;transition:opacity .25s ease,transform .35s ease;}
.mv-story:hover .mv-story-cover{opacity:.9;transform:scale(1.05);}
.mv-story::after{content:"";position:absolute;inset:0;background:linear-gradient(to top,rgba(4,6,15,.92) 4%,rgba(4,6,15,.35) 45%,transparent 70%);pointer-events:none;}
.mv-story-ring-wrap{position:absolute;top:10px;left:50%;transform:translateX(-50%);z-index:3;width:56px;height:56px;padding:3px;border-radius:18px;background:linear-gradient(135deg,#00e5ff,#a855f7,#ff4ecd);box-shadow:0 6px 18px rgba(0,0,0,.5),0 0 20px rgba(168,85,247,.35);}
.mv-story-ring-wrap.seen{background:rgba(255,255,255,.22);box-shadow:0 6px 14px rgba(0,0,0,.35);}
.mv-story-ring-wrap.seen img{opacity:.75;}
.mv-story-ring-wrap img{width:100%;height:100%;border-radius:15px;object-fit:cover;border:3px solid #0e1020;display:block;}
.mv-story-ring-add{position:absolute;bottom:-4px;right:-4px;width:22px;height:22px;border-radius:8px;background:linear-gradient(135deg,#5de8ff,#a855f7);color:#fff;font-size:11px;font-weight:800;display:grid;place-items:center;border:2.5px solid #0e1020;box-shadow:0 3px 8px rgba(0,0,0,.5),0 0 12px rgba(93,232,255,.5);cursor:pointer;z-index:6;padding:0;line-height:1;-webkit-tap-highlight-color:transparent;}
.mv-story-ring-add:hover{transform:scale(1.15);}
.mv-story-name{position:absolute;left:8px;right:8px;bottom:10px;z-index:3;font-size:10.5px;font-weight:700;color:#fff;text-align:center;overflow:hidden;text-overflow:ellipsis;white-space:nowrap;text-shadow:0 2px 6px rgba(0,0,0,.8);}
.mv-story-count{position:absolute;top:12px;right:10px;z-index:4;padding:3px 7px;border-radius:9px;font-size:8.5px;font-weight:800;color:#fff;background:rgba(0,0,0,.55);border:1px solid rgba(255,255,255,.16);backdrop-filter:blur(8px);-webkit-backdrop-filter:blur(8px);letter-spacing:.3px;min-width:20px;text-align:center;}

.mv-viewer{position:fixed;inset:0;z-index:8000;display:none;background:#05060d;animation:mvViewerIn .25s ease;overflow:hidden;}
.mv-viewer.show{display:flex;}
@keyframes mvViewerIn{from{opacity:0;}to{opacity:1;}}
.mv-viewer-sidebar{display:none;width:320px;flex-shrink:0;background:linear-gradient(180deg,#0a0d1a,#080914);border-right:1px solid rgba(255,255,255,.08);flex-direction:column;overflow:hidden;}
.mv-viewer-main{flex:1;display:flex;flex-direction:column;position:relative;overflow:hidden;min-width:0;}
.mv-viewer.layout-pc .mv-viewer-sidebar{display:flex;}
.mv-sb-head{padding:18px 18px 12px;border-bottom:1px solid rgba(255,255,255,.06);flex-shrink:0;}
.mv-sb-head h3{font-family:'Space Grotesk',sans-serif;font-size:15px;color:#fff;letter-spacing:.3px;display:flex;align-items:center;gap:8px;}
.mv-sb-head h3 i{color:#5de8ff;font-size:14px;}
.mv-sb-head p{margin-top:5px;color:#8b92a8;font-size:10.5px;}
.mv-sb-list{flex:1;overflow-y:auto;padding:10px 8px;scrollbar-width:thin;}
.mv-sb-list::-webkit-scrollbar{width:6px;}
.mv-sb-list::-webkit-scrollbar-thumb{background:rgba(255,255,255,.10);border-radius:10px;}
.mv-sb-item{position:relative;display:flex;align-items:center;gap:11px;padding:10px 11px;border-radius:14px;cursor:pointer;transition:.2s ease;border:1px solid transparent;}
.mv-sb-item:hover{background:rgba(255,255,255,.045);}
.mv-sb-item.active{background:linear-gradient(135deg,rgba(0,229,255,.10),rgba(168,85,247,.08));border-color:rgba(0,229,255,.22);}
.mv-sb-item.active::before{content:"";position:absolute;left:0;top:8px;bottom:8px;width:3px;border-radius:0 3px 3px 0;background:linear-gradient(180deg,#00e5ff,#a855f7);}
.mv-sb-serial{width:22px;flex-shrink:0;text-align:center;font-size:10px;font-weight:800;color:#6b7490;letter-spacing:.3px;}
.mv-sb-item.active .mv-sb-serial{color:#5de8ff;}
.mv-sb-avatar{position:relative;width:44px;height:44px;flex-shrink:0;border-radius:14px;padding:2.5px;background:linear-gradient(135deg,#00e5ff,#a855f7,#ff4ecd);}

.mv-sb-item.seen .mv-sb-avatar{background:rgba(255,255,255,.18);}
.mv-sb-avatar img{width:100%;height:100%;border-radius:11px;object-fit:cover;border:2px solid #0a0d1a;display:block;}
.mv-sb-item.seen .mv-sb-avatar img{opacity:.7;}
.mv-sb-dot{position:absolute;bottom:2px;right:2px;width:12px;height:12px;border-radius:50%;background:#35e69a;border:2.5px solid #0a0d1a;box-shadow:0 0 8px rgba(53,230,154,.6);display:none;}
.mv-sb-dot.show{display:block;}
.mv-sb-info{flex:1;min-width:0;}
.mv-sb-info b{display:block;font-size:12.5px;font-weight:700;color:#e9ecf7;overflow:hidden;text-overflow:ellipsis;white-space:nowrap;}
.mv-sb-info b .mv-verified{color:#5de8ff;font-size:10px;margin-left:4px;}
.mv-sb-info span{display:block;margin-top:3px;font-size:10px;color:#8b92a8;overflow:hidden;text-overflow:ellipsis;white-space:nowrap;}
.mv-sb-count{flex-shrink:0;min-width:24px;height:22px;padding:0 7px;border-radius:11px;display:grid;place-items:center;font-size:10px;font-weight:800;color:#fff;background:linear-gradient(135deg,rgba(0,229,255,.28),rgba(168,85,247,.24));border:1px solid rgba(0,229,255,.30);letter-spacing:.2px;}
.mv-sb-item.seen .mv-sb-count{background:rgba(255,255,255,.08);border-color:rgba(255,255,255,.12);color:#8b92a8;}

/* =========================================================
   ⭐ STORY PROGRESS BAR v2 — with Play/Pause + Tap-to-Seek
   ========================================================= */
.mv-viewer-progress{
  position:absolute;top:0;left:0;right:0;z-index:12;
  display:flex;align-items:center;gap:8px;
  padding:calc(10px + env(safe-area-inset-top)) 12px 6px;
  pointer-events:none;
}

/* ── Segments container ─────────────────────────────── */
.mv-progress-segs{
  flex:1;min-width:0;
  display:flex;align-items:center;gap:3px;
  pointer-events:auto;
  padding:10px 0;margin:-10px 0;
  touch-action:manipulation;
}

/* ── Each story segment ─────────────────────────────── */
.mv-progress-seg{
  flex:1;
  height:3px;
  border-radius:3px;
  background:rgba(255,255,255,.28);
  cursor:pointer;
  position:relative;
  overflow:visible;              /* ⭐ IMPORTANT — so ::before is not clipped */
  transition:height .18s ease,background .18s ease,box-shadow .18s ease;
  -webkit-tap-highlight-color:transparent;
  touch-action:manipulation;
}
.mv-progress-seg::before{
  content:"";
  position:absolute;
  top:-12px;bottom:-12px;left:-2px;right:-2px;   /* ⭐ tall invisible hit area */
  border-radius:6px;
}
.mv-progress-seg:hover{
  height:5px;
  background:rgba(255,255,255,.50);
  box-shadow:0 0 8px rgba(255,255,255,.35);
}
.mv-progress-seg:active{background:rgba(255,255,255,.70);}
.mv-progress-seg.seen{background:rgba(255,255,255,.28);}
.mv-progress-seg.active{background:rgba(255,255,255,.36);}

/* ── Fill bar inside segment ────────────────────────── */
.mv-progress-fill{
  position:absolute;top:0;left:0;bottom:0;
  width:0%;
  border-radius:3px;
  background:linear-gradient(90deg,#fff,#e0f4ff);
  box-shadow:0 0 8px rgba(255,255,255,.5);
  transition:width .08s linear;
  pointer-events:none;          /* ⭐ clicks pass through to segment */
}
.mv-progress-seg.seen .mv-progress-fill{
  width:100%;
  background:rgba(255,255,255,.85);
}
.mv-progress-seg.active .mv-progress-fill{
  background:linear-gradient(90deg,#5de8ff,#fff);
}
.mv-viewer.paused .mv-progress-seg.active .mv-progress-fill{
  background:linear-gradient(90deg,#ffd43b,#fff);
}



/* ── Mobile tweaks ─────────────────────────────────── */
@media (max-width:768px){
  .mv-progress-playbtn{width:36px;height:36px;font-size:12px;}
  .mv-progress-seg{height:3.5px;}
  .mv-progress-seg::before{top:-14px;bottom:-14px;}
}


.mv-viewer-head{position:absolute;top:0;left:0;right:0;z-index:11;display:flex;align-items:center;gap:10px;padding:calc(30px + env(safe-area-inset-top)) 14px 12px;background:linear-gradient(to bottom,rgba(0,0,0,.62),transparent);pointer-events:none;}
.mv-viewer-head > *{pointer-events:auto;}
.mv-viewer-head img.mv-vh-avatar{width:38px;height:38px;border-radius:12px;object-fit:cover;border:2px solid rgba(255,255,255,.55);flex-shrink:0;}
.mv-viewer-head .mv-vh-info{flex:1;min-width:0;}
.mv-viewer-head .mv-vh-info b{display:flex;align-items:center;gap:5px;font-size:13px;color:#fff;font-weight:700;text-shadow:0 2px 6px rgba(0,0,0,.6);overflow:hidden;text-overflow:ellipsis;white-space:nowrap;}
.mv-viewer-head .mv-vh-info b i{color:#5de8ff;font-size:11px;flex-shrink:0;}
.mv-viewer-head .mv-vh-info span{display:block;margin-top:2px;font-size:10px;color:rgba(255,255,255,.75);text-shadow:0 1px 4px rgba(0,0,0,.6);}
.mv-vh-privacy{display:inline-flex;align-items:center;gap:4px;margin-left:6px;padding:2px 7px;border-radius:8px;font-size:9px;font-weight:800;letter-spacing:.3px;text-transform:uppercase;vertical-align:middle;background:rgba(255,255,255,.14);border:1px solid rgba(255,255,255,.20);color:#e7ecf8;text-shadow:none;}
.mv-vh-privacy i{font-size:9px;}
.mv-vh-privacy.public{background:rgba(0,229,255,.16);border-color:rgba(0,229,255,.32);color:#c8f6ff;}
.mv-vh-privacy.friends{background:rgba(53,230,154,.16);border-color:rgba(53,230,154,.32);color:#c8ffe2;}
.mv-vh-privacy.only{background:rgba(77,124,255,.18);border-color:rgba(77,124,255,.36);color:#c8d8ff;}
.mv-vh-privacy.private{background:rgba(255,159,67,.16);border-color:rgba(255,159,67,.32);color:#ffe0c0;}
.mv-vh-btn{width:36px;height:36px;flex-shrink:0;border:none;cursor:pointer;border-radius:12px;color:#fff;background:rgba(255,255,255,.10);border:1px solid rgba(255,255,255,.16);backdrop-filter:blur(14px);-webkit-backdrop-filter:blur(14px);display:grid;place-items:center;font-size:13px;transition:.2s ease;-webkit-tap-highlight-color:transparent;}
.mv-vh-btn:hover{background:rgba(255,255,255,.22);transform:translateY(-1px);}
.mv-vh-btn:active{transform:scale(.94);}

.mv-viewer.clean-mode .mv-viewer-head > *:not(#mvHeadMore) { display: none !important; }
.mv-viewer.clean-mode .mv-viewer-head { background: transparent !important; pointer-events: none; }
.mv-viewer.clean-mode .mv-viewer-head #mvHeadMore { pointer-events: auto; opacity: 0.5; background: rgba(0,0,0,0.4); border-radius: 50%; width: 44px; height: 44px; }
.mv-viewer.clean-mode .mv-viewer-progress,
.mv-viewer.clean-mode .mv-viewer-reply,
.mv-viewer.clean-mode .mv-music-sticker,
.mv-viewer.clean-mode .mv-viewer-mentioned-bar { display: none !important; }

.mv-viewer-stage{flex:1;position:relative;display:grid;place-items:center;overflow:hidden;background:#05060d;}
.mv-viewer-stage img.mv-vs-img{max-width:100%;max-height:100%;object-fit:contain;display:block;user-select:none;-webkit-user-drag:none;z-index:1;}
.mv-viewer-stage video.mv-vs-vid{max-width:100%;max-height:100%;object-fit:contain;display:block;background:#000;z-index:1;}

.mv-viewer-text{position:absolute;max-width:80%;padding:16px 20px;font-weight:700;line-height:1.35;text-align:center;border-radius:16px;white-space:pre-wrap;word-break:break-word;pointer-events:none;transform-origin:center center;z-index:40;}
.mv-viewer-sticker{position:absolute;pointer-events:none;filter:drop-shadow(0 6px 14px rgba(0,0,0,.55));transform-origin:center center;z-index:50;}
.mv-viewer-sticker img{width:100%;height:100%;display:block;object-fit:contain;}
.mv-viewer-image-item{position:absolute;transform-origin:center center;pointer-events:none;filter:drop-shadow(0 8px 22px rgba(0,0,0,.45));z-index:10;}
.mv-viewer-image-item img{width:100%;height:100%;display:block;object-fit:cover;border-radius:6px;}
.mv-viewer-drawing{position:absolute;inset:0;width:100%;height:100%;object-fit:contain;pointer-events:none;z-index:30;}

.mv-viewer-mention{display:inline-block;padding:1px 8px;margin:0 1px;border-radius:8px;background:linear-gradient(135deg,rgba(0,229,255,.30),rgba(168,85,247,.24));border:1px solid rgba(0,229,255,.50);color:#d8f8ff !important;font-weight:800;-webkit-text-fill-color:#d8f8ff;cursor:pointer;pointer-events:auto;}

.mv-viewer-mentioned-bar{position:absolute;bottom:calc(88px + env(safe-area-inset-bottom));left:50%;transform:translateX(-50%);z-index:11;display:flex;align-items:center;gap:2px;padding:6px 12px 6px 8px;border-radius:24px;background:linear-gradient(135deg,rgba(0,229,255,.20),rgba(168,85,247,.18)),rgba(12,14,26,.90);border:1px solid rgba(0,229,255,.30);backdrop-filter:blur(16px) saturate(150%);-webkit-backdrop-filter:blur(16px) saturate(150%);box-shadow:0 10px 30px rgba(0,0,0,.55),inset 0 1px 0 rgba(255,255,255,.14);max-width:min(88%, 400px);overflow:hidden;cursor:pointer;transition:transform .2s ease, opacity .2s ease;opacity:0;pointer-events:none;}
.mv-viewer-mentioned-bar.show{ opacity:1; pointer-events:auto; }
.mv-viewer-mentioned-bar:hover{ transform:translateX(-50%) scale(1.03); }
.mv-viewer-mentioned-bar .mv-mentioned-avatar{width:26px; height:26px; border-radius:50%;object-fit:cover;border:2px solid #0a0d1a;margin-left:-8px;flex-shrink:0;box-shadow:0 2px 6px rgba(0,0,0,.4);}
.mv-viewer-mentioned-bar .mv-mentioned-avatar:first-child{ margin-left:0; }
.mv-viewer-mentioned-bar .mv-mentioned-label{font-size:11px; color:#d8f8ff; font-weight:800;margin-left:8px;white-space:nowrap;overflow:hidden;text-overflow:ellipsis;text-shadow:0 1px 3px rgba(0,0,0,.5);}
.mv-viewer-mentioned-bar .mv-mentioned-label i{ color:#5de8ff; font-size:10px; margin-right:4px; }

.mv-music-sticker{position:absolute;bottom:95px;left:50%;transform:translateX(-50%);display:flex;align-items:center;gap:8px;padding:6px 14px 6px 8px;background:rgba(0,0,0,.62);backdrop-filter:blur(14px) saturate(150%);-webkit-backdrop-filter:blur(14px) saturate(150%);border-radius:25px;border:1px solid rgba(255,255,255,.15);max-width:85%;z-index:45;pointer-events:none;box-shadow:0 6px 20px rgba(0,0,0,.4);animation:mvStickerPop .4s cubic-bezier(.2,.9,.3,1.4);}
@keyframes mvStickerPop{from{opacity:0;transform:translateX(-50%) scale(.8);}to{opacity:1;transform:translateX(-50%) scale(1);}}

.mv-music-sticker.style-waveform{padding:8px 16px 8px 8px;}
.mv-music-sticker.style-waveform .mv-music-sticker-cover{animation:mvSpinDisc 4s linear infinite;}
.mv-sticker-waveform{display:flex;align-items:center;gap:2px;height:22px;margin-right:6px;}
.mv-sticker-waveform span{display:block;width:2.5px;background:linear-gradient(180deg,#5de8ff,#a855f7);border-radius:2px;animation:mvWave 1.2s ease-in-out infinite;}
.mv-sticker-waveform span:nth-child(1){height:40%;animation-delay:0s;}
.mv-sticker-waveform span:nth-child(2){height:80%;animation-delay:.1s;}
.mv-sticker-waveform span:nth-child(3){height:55%;animation-delay:.2s;}
.mv-sticker-waveform span:nth-child(4){height:95%;animation-delay:.3s;}
.mv-sticker-waveform span:nth-child(5){height:45%;animation-delay:.4s;}
.mv-sticker-waveform span:nth-child(6){height:75%;animation-delay:.5s;}
.mv-sticker-waveform span:nth-child(7){height:60%;animation-delay:.6s;}
@keyframes mvWave{0%,100%{transform:scaleY(.4);}50%{transform:scaleY(1);}}

.mv-music-sticker.style-compact{padding:4px 10px 4px 4px;gap:6px;}
.mv-music-sticker.style-compact .mv-music-sticker-cover{width:20px;height:20px;}
.mv-music-sticker.style-compact .mv-music-sticker-text-wrap{max-width:110px;}
.mv-music-sticker.style-compact .mv-music-sticker-text{font-size:10px;}
.mv-music-sticker-timer{font-size:9.5px;font-weight:800;color:#5de8ff;font-variant-numeric:tabular-nums;padding:2px 7px;border-radius:9px;background:rgba(0,229,255,.12);border:1px solid rgba(0,229,255,.35);flex-shrink:0;letter-spacing:.3px;margin-left:2px;min-width:58px;text-align:center;text-shadow:0 1px 3px rgba(0,0,0,.5);}
.mv-music-sticker.style-compact .mv-music-sticker-timer{font-size:8.5px;padding:1px 5px;min-width:50px;}
.mv-music-sticker-timer{opacity:.9;transition:opacity .2s ease;}
.mv-viewer.paused .mv-music-sticker-timer{opacity:.5;}
.mv-music-sticker.style-audio-only{display:none !important;}

.mv-music-sticker-cover{width:26px;height:26px;border-radius:50%;flex-shrink:0;background:linear-gradient(135deg,#5de8ff,#a855f7);display:grid;place-items:center;overflow:hidden;box-shadow:inset 0 0 0 2px rgba(255,255,255,0.2),0 2px 6px rgba(0,0,0,0.4);animation:mvSpinDisc 4s linear infinite;}
@keyframes mvSpinDisc{from{transform:rotate(0deg);}to{transform:rotate(360deg);}}
.mv-music-sticker-cover img{width:100%;height:100%;object-fit:cover;display:block;}
.mv-music-sticker-cover i{color:#fff;font-size:10px;}
.mv-music-sticker-text-wrap{overflow:hidden;position:relative;max-width:160px;display:flex;white-space:nowrap;mask-image:linear-gradient(to right,transparent,black 10%,black 90%,transparent);-webkit-mask-image:linear-gradient(to right,transparent,black 10%,black 90%,transparent);}
.mv-music-sticker-text{display:inline-block;color:#fff;font-size:11px;font-weight:700;letter-spacing:.3px;white-space:nowrap;flex-shrink:0;}
.mv-music-sticker-text.scroll{animation:mvMarquee 8s linear infinite;}
@keyframes mvMarquee{0%{transform:translateX(0);}100%{transform:translateX(-50%);}}

.mv-music-sticker-wrap{position:absolute;z-index:30;pointer-events:auto;transform-origin:center center;}
.mv-music-sticker-wrap .mv-music-sticker{position:relative;bottom:auto;left:auto;transform:none;pointer-events:auto;box-shadow:0 8px 24px rgba(0,0,0,0.5);}

.mv-viewer-nav{position:absolute;top:12%;bottom:20%;width:34%;z-index:10;background:transparent;cursor:pointer;-webkit-tap-highlight-color:transparent;}
.mv-viewer-nav.left{left:0;}
.mv-viewer-nav.right{right:0;}
.mv-viewer-nav.left:active{background:linear-gradient(to right,rgba(255,255,255,.04),transparent);}
.mv-viewer-nav.right:active{background:linear-gradient(to left,rgba(255,255,255,.04),transparent);}

.mv-viewer-reply{position:relative;z-index:60;display:flex;align-items:flex-end;gap:8px;padding:12px 14px calc(14px + env(safe-area-inset-bottom));background:linear-gradient(to top,rgba(0,0,0,.80),transparent);flex-wrap:wrap;}
.mv-viewer-reply.hidden{display:none !important;}
.mv-vr-input-wrap{flex:1;min-width:0;position:relative;display:flex;align-items:center;gap:6px;background:rgba(255,255,255,.10);border:1px solid rgba(255,255,255,.14);border-radius:22px;padding:0 6px 0 14px;min-height:44px;backdrop-filter:blur(14px);-webkit-backdrop-filter:blur(14px);transition:.2s ease;}
.mv-vr-input-wrap:focus-within{border-color:rgba(0,229,255,.45);background:rgba(255,255,255,.14);}
.mv-vr-input-wrap input.mv-vr-input{flex:1;min-width:0;height:42px;border:none;outline:none;background:transparent;color:#fff;font-family:inherit;font-size:13px;}
.mv-vr-input-wrap input.mv-vr-input::placeholder{color:rgba(255,255,255,.55);}
.mv-vr-emoji-btn,.mv-vr-gallery-btn{width:34px;height:34px;flex-shrink:0;border:none;background:transparent;color:rgba(255,255,255,.75);font-size:15px;cursor:pointer;border-radius:50%;display:grid;place-items:center;transition:.2s ease;-webkit-tap-highlight-color:transparent;}
.mv-vr-emoji-btn:hover,.mv-vr-gallery-btn:hover{color:#fff;background:rgba(255,255,255,.10);}
.mv-vr-send-btn,.mv-vr-heart-btn{width:44px;height:44px;flex-shrink:0;border-radius:50%;cursor:pointer;display:grid;place-items:center;font-size:17px;color:#fff;transition:.22s cubic-bezier(.2,.9,.3,1.5);border:none;position:relative;}
.mv-vr-send-btn{background:linear-gradient(135deg,#5de8ff,#a855f7);box-shadow:0 6px 18px rgba(168,85,247,.4);}
.mv-vr-send-btn:hover{transform:scale(1.08);}
.mv-vr-heart-btn{background:transparent;color:#ff6bcb;font-size:26px;display:none;overflow:visible;}
.mv-vr-heart-btn.show{display:grid;}
.mv-vr-heart-btn:hover{transform:scale(1.12);}
.mv-vr-send-btn.hide{display:none;}

.mv-vr-reaction-pop{position:absolute;bottom:calc(100% + 10px);right:14px;z-index:15;display:none;gap:6px;padding:8px 12px;border-radius:28px;background:linear-gradient(135deg,rgba(255,255,255,.12),rgba(255,255,255,.03)),rgba(18,20,38,.97);border:1px solid rgba(255,255,255,.18);backdrop-filter:blur(24px);-webkit-backdrop-filter:blur(24px);box-shadow:0 18px 44px rgba(0,0,0,.6);max-width:calc(100vw - 28px);overflow-x:auto;overflow-y:hidden;flex-wrap:nowrap;-webkit-overflow-scrolling:touch;scrollbar-width:none;}
.mv-vr-reaction-pop::-webkit-scrollbar{display:none;}
.mv-vr-reaction-pop.show{display:flex;animation:mvPopIn .24s cubic-bezier(.2,.9,.3,1.4);}
@keyframes mvPopIn{from{opacity:0;transform:translateY(8px) scale(.85);}to{opacity:1;transform:translateY(0) scale(1);}}
.mv-vr-reaction-pop button{width:44px;height:44px;flex:0 0 44px;border:none;cursor:pointer;border-radius:50%;background:transparent;padding:0;transition:transform .22s cubic-bezier(.2,.9,.3,1.6);display:grid;place-items:center;overflow:visible;position:relative;}
.mv-vr-reaction-pop button img{width:32px;height:32px;display:block;object-fit:contain;}
.mv-vr-reaction-pop button:hover{transform:translateY(-6px) scale(1.18);}
.mv-vr-reaction-pop button:active{transform:scale(.94);}
.mv-vr-reaction-pop button.selected{background:rgba(0,229,255,.10);box-shadow:0 0 0 2px rgba(0,229,255,.55);}
.mv-vr-reaction-pop button .mv-react-count-badge{position:absolute;top:-4px;right:-4px;min-width:22px;height:22px;padding:0 6px;border-radius:11px;font-size:10px;font-weight:900;color:#fff;background:linear-gradient(135deg,#5de8ff,#a855f7);display:grid;place-items:center;border:2px solid #0a0d1a;box-shadow:0 2px 6px rgba(0,0,0,.5);}

.mv-vr-preview{flex-basis:100%;display:none;align-items:center;gap:8px;padding:6px 8px;border-radius:12px;background:rgba(255,255,255,.06);border:1px solid rgba(255,255,255,.10);margin-bottom:4px;}
.mv-vr-preview.show{display:flex;}
.mv-vr-preview-thumb{width:36px;height:36px;border-radius:9px;overflow:hidden;background:#000;display:grid;place-items:center;font-size:12px;color:#7d84a0;}
.mv-vr-preview-thumb img,.mv-vr-preview-thumb video{width:100%;height:100%;object-fit:cover;display:block;}
.mv-vr-preview-name{flex:1;font-size:11px;color:#c8cde0;white-space:nowrap;overflow:hidden;text-overflow:ellipsis;}
.mv-vr-preview-remove{width:26px;height:26px;border:none;border-radius:8px;background:rgba(255,95,130,.14);color:#ff8a9a;cursor:pointer;display:grid;place-items:center;font-size:11px;}

.mv-emoji-picker{position:absolute;bottom:calc(100% + 10px);left:14px;right:14px;z-index:16;display:none;flex-direction:column;max-height:min(380px,55vh);border-radius:20px;background:linear-gradient(135deg,rgba(255,255,255,.10),rgba(255,255,255,.03)),rgba(18,20,38,.98);border:1px solid rgba(255,255,255,.16);backdrop-filter:blur(24px);-webkit-backdrop-filter:blur(24px);box-shadow:0 18px 44px rgba(0,0,0,.6);overflow:hidden;}
.mv-emoji-picker.show{display:flex;}
.mv-emoji-picker-head{display:flex;align-items:center;justify-content:space-between;padding:10px 14px;border-bottom:1px solid rgba(255,255,255,.08);}
.mv-emoji-picker-head b{font-size:12px;color:#fff;font-weight:700;}
.mv-emoji-picker-head button{width:28px;height:28px;border:none;border-radius:9px;background:rgba(255,255,255,.06);color:#cfd5e8;cursor:pointer;display:grid;place-items:center;font-size:11px;}
.mv-emoji-picker-grid{flex:1;min-height:0;overflow-y:auto;padding:10px 12px 14px;display:grid;grid-template-columns:repeat(auto-fill, minmax(clamp(34px,8vw,44px), 1fr));gap:4px;}
.mv-emoji-picker-grid button{aspect-ratio:1;border:none;background:transparent;cursor:pointer;border-radius:10px;font-size:clamp(20px,5vw,26px);display:grid;place-items:center;transition:.18s ease;padding:0;line-height:1;}
.mv-emoji-picker-grid button:hover{background:rgba(255,255,255,.10);transform:scale(1.15);}

.mv-vh-menu{position:absolute;top:calc(60px + env(safe-area-inset-top));right:14px;z-index:14;min-width:250px;padding:8px;border-radius:18px;display:none;background:linear-gradient(135deg,rgba(255,255,255,.09),rgba(255,255,255,.03)),rgba(16,18,34,.97);border:1px solid rgba(255,255,255,.18);backdrop-filter:blur(28px) saturate(165%);-webkit-backdrop-filter:blur(28px) saturate(165%);box-shadow:0 22px 60px rgba(0,0,0,.6);}
.mv-vh-menu.show{display:block;}
.mv-vh-menu button{width:100%;display:flex;align-items:center;gap:11px;padding:11px 12px;border:none;cursor:pointer;border-radius:12px;color:#cfd3e3;font-family:inherit;font-size:12.5px;font-weight:500;text-align:left;background:transparent;transition:.2s ease;}
.mv-vh-menu button:hover{background:rgba(255,255,255,.08);color:#fff;}
.mv-vh-menu button i{width:20px;text-align:center;font-size:14px;flex-shrink:0;}
.mv-vh-menu .mi-viewers i,.mv-vh-menu .mi-download i{color:#5de8ff;}
.mv-vh-menu .mi-undo-react i{color:#ffd43b;}
.mv-vh-menu .mi-mute i{color:#ff9f43;}
.mv-vh-menu .mi-clean i{color:#35e69a;}
.mv-vh-menu .mi-delete,.mv-vh-menu .mi-report{color:#ff8a9a;}
.mv-vh-menu .mv-vh-divider{height:1px;margin:6px 8px;background:rgba(255,255,255,.08);}

.mv-creator{position:fixed;inset:0;z-index:8200;display:none;flex-direction:column;background:#05060d;animation:mvViewerIn .25s ease;}
.mv-creator.show{display:flex;}
.mv-creator-head{display:flex;align-items:center;justify-content:space-between;gap:10px;padding:calc(12px + env(safe-area-inset-top)) 14px 12px;background:linear-gradient(to bottom,rgba(0,0,0,.55),transparent);flex-shrink:0;z-index:5;}
.mv-creator-head h3{font-family:'Space Grotesk',sans-serif;font-size:15px;letter-spacing:.2px;}
.mv-ch-btn{width:38px;height:38px;border:none;border-radius:12px;color:#e7ebf8;background:rgba(255,255,255,.10);border:1px solid rgba(255,255,255,.14);backdrop-filter:blur(14px);-webkit-backdrop-filter:blur(14px);cursor:pointer;display:grid;place-items:center;font-size:14px;transition:.2s ease;}
.mv-ch-btn:hover{background:rgba(255,255,255,.20);}
.mv-ch-publish{padding:0 16px;height:38px;font-weight:800;font-size:12px;color:#fff;background:linear-gradient(135deg,#5de8ff,#a855f7);border:none;border-radius:12px;cursor:pointer;font-family:inherit;letter-spacing:.3px;box-shadow:0 8px 22px rgba(168,85,247,.32);transition:.2s ease;}
.mv-ch-publish:hover{transform:translateY(-1px);}
.mv-ch-publish:disabled{opacity:.5;cursor:not-allowed;transform:none;box-shadow:none;}

.mv-creator-stage{flex:1;position:relative;display:grid;place-items:center;overflow:hidden;background:#05060d;min-height:0;}
.mv-creator-canvas-wrap{position:relative;width:100%;height:100%;display:grid;place-items:center;overflow:hidden;}
.mv-creator-bg{position:absolute;inset:0;background:#0a0c1a;z-index:0;}
.mv-creator-media-layer{position:absolute;inset:0;pointer-events:none;overflow:hidden;z-index:10;}
.mv-creator-media-item{position:absolute;pointer-events:auto;cursor:move;transform-origin:center center;user-select:none;-webkit-user-drag:none;z-index:1;}
.mv-creator-media-item img,.mv-creator-media-item video{width:100%;height:100%;display:block;object-fit:cover;border-radius:6px;pointer-events:none;box-shadow:0 8px 26px rgba(0,0,0,.4);}
.mv-creator-text-layer{position:absolute;inset:0;pointer-events:none;z-index:20;}
.mv-el-wrap{position:absolute;transform-origin:center center;pointer-events:auto;z-index:1;}
.mv-el-wrap.active{z-index:25;}
.mv-el-drag-handle,.mv-el-rotate-handle,.mv-el-resize-handle,.mv-el-close-handle{position:absolute;width:30px;height:30px;border-radius:50%;display:none;place-items:center;background:linear-gradient(135deg,#5de8ff,#a855f7);color:#fff;font-size:11px;cursor:grab;border:2px solid rgba(255,255,255,.28);box-shadow:0 6px 16px rgba(0,0,0,.45),0 0 14px rgba(0,229,255,.35);touch-action:none;padding:0;z-index:6;}
.mv-el-wrap.show-handles .mv-el-drag-handle,
.mv-el-wrap.show-handles .mv-el-rotate-handle,
.mv-el-wrap.show-handles .mv-el-resize-handle,
.mv-el-wrap.show-handles .mv-el-close-handle{display:grid;}
.mv-el-drag-handle{top:-36px;left:50%;transform:translateX(-50%);}
.mv-el-rotate-handle{top:-36px;right:-36px;}
.mv-el-resize-handle{bottom:-36px;right:-36px;cursor:nwse-resize;background:linear-gradient(135deg,#ffd43b,#ff9f43);}
.mv-el-close-handle{top:-36px;left:-36px;background:linear-gradient(135deg,#ff5875,#b84dff);cursor:pointer;}

.mv-creator-text{padding:10px 14px;font-weight:700;font-size:22px;line-height:1.35;text-align:center;color:#fff;outline:none;white-space:pre-wrap;word-break:break-word;cursor:text;-webkit-user-select:text;user-select:text;border-radius:10px;min-width:60px;}
.mv-creator-text:empty::before{content:attr(data-placeholder);opacity:.55;pointer-events:none;}
.mv-creator-text:focus{box-shadow:0 0 0 2px rgba(0,229,255,.4);}

.mv-creator-mention{
  position:relative;
  display:inline-block;
  padding:1px 8px;
  margin:0 2px;
  border-radius:8px;
  background:linear-gradient(135deg,rgba(0,229,255,.24),rgba(168,85,247,.20));
  border:1px solid rgba(0,229,255,.40);
  color:#7cecff !important;
  font-weight:800;
  font-size:0.94em;
  white-space:nowrap;
  -webkit-text-fill-color:#7cecff;
  box-shadow:0 1px 4px rgba(0,229,255,.20);
  user-select:none;
  -webkit-user-select:none;
}
.mv-creator-mention .mv-mention-name{ pointer-events:none; }
.mv-creator-mention .mv-mention-x{
  position:absolute;
  top:-7px;
  right:-7px;
  width:16px;
  height:16px;
  border-radius:50%;
  background:linear-gradient(135deg,#ff5875,#b84dff);
  color:#fff;
  border:1.5px solid #0a0d1a;
  font-size:9px;
  line-height:1;
  font-weight:900;
  cursor:pointer;
  padding:0;
  z-index:10;
  pointer-events:auto;
  display:none;
  place-items:center;
  user-select:none;
  -webkit-user-select:none;
  box-shadow:0 2px 6px rgba(0,0,0,.45);
  font-family:inherit;
}
.mv-creator-mention:hover .mv-mention-x,
.mv-creator-mention.mv-x-visible .mv-mention-x{ display:grid; }
.mv-creator-mention:hover{ box-shadow:0 0 0 2px rgba(0,229,255,.35),0 1px 4px rgba(0,229,255,.20); }

.mv-creator-sticker-el{display:grid;place-items:center;line-height:0;}
.mv-creator-sticker-el img{width:100%;height:100%;display:block;object-fit:contain;pointer-events:none;}
.mv-creator-draw{position:absolute;inset:0;pointer-events:none;touch-action:none;z-index:15;}
.mv-creator-draw.active{pointer-events:auto;cursor:crosshair;}
.mv-creator-draw canvas{width:100%;height:100%;display:block;}

.mv-creator-tools{flex-shrink:0;padding:10px 10px calc(12px + env(safe-area-inset-bottom));background:linear-gradient(to top,rgba(0,0,0,.85),rgba(0,0,0,.5));z-index:6;display:flex;flex-direction:column;gap:10px;max-height:60vh;overflow-y:auto;scrollbar-width:thin;}
.mv-creator-toolbar{display:grid;grid-template-columns:repeat(4, minmax(0, 1fr));gap:6px;padding:6px;border-radius:16px;background:rgba(255,255,255,.06);border:1px solid rgba(255,255,255,.09);}
.mv-ct-tool{min-width:0;height:56px;border:none;cursor:pointer;border-radius:12px;background:rgba(255,255,255,.035);color:#c8cee0;font-family:inherit;font-size:9.5px;font-weight:700;display:flex;flex-direction:column;align-items:center;justify-content:center;gap:4px;transition:.22s ease;padding:4px 2px;overflow:hidden;}
.mv-ct-tool i{font-size:17px;line-height:1;}
.mv-ct-tool span{line-height:1;white-space:nowrap;overflow:hidden;text-overflow:ellipsis;max-width:100%;}
.mv-ct-tool:hover{background:rgba(255,255,255,.10);color:#fff;}
.mv-ct-tool.active{background:linear-gradient(135deg,rgba(0,229,255,.22),rgba(168,85,247,.18));color:#fff;box-shadow:inset 0 1px 0 rgba(255,255,255,.14),0 0 18px rgba(0,229,255,.12);}
@media (min-width:600px){.mv-creator-toolbar{grid-template-columns:repeat(8, minmax(0, 1fr));}}

.mv-creator-panel{padding:12px;border-radius:14px;background:rgba(255,255,255,.04);border:1px solid rgba(255,255,255,.08);display:none;position:relative;}
.mv-creator-panel.show{display:block;}
.mv-panel-close{position:absolute;top:8px;right:8px;width:26px;height:26px;border:none;border-radius:8px;background:rgba(255,255,255,.06);color:#a8b0c5;cursor:pointer;display:grid;place-items:center;font-size:11px;}
.mv-panel-close:hover{background:rgba(255,95,130,.18);color:#ff8a9a;}
.mv-panel-title{font-size:9.5px;font-weight:800;letter-spacing:1.1px;text-transform:uppercase;color:#7d84a0;margin-bottom:9px;padding-right:28px;}
.mv-panel-row{display:flex;align-items:center;gap:8px;flex-wrap:wrap;}
.mv-panel-label{font-size:9.5px;font-weight:800;letter-spacing:.6px;color:#7d84a0;min-width:44px;text-transform:uppercase;}
.mv-font-btn{padding:7px 12px;border-radius:10px;border:1px solid rgba(255,255,255,.10);background:rgba(255,255,255,.045);color:#d5dae8;font-size:12px;font-weight:600;cursor:pointer;font-family:inherit;}
.mv-font-btn:hover{background:rgba(255,255,255,.10);color:#fff;}
.mv-font-btn.active{background:linear-gradient(135deg,rgba(0,229,255,.20),rgba(168,85,247,.16));border-color:rgba(0,229,255,.35);color:#fff;}

.mv-panel-mention-btn{display:inline-flex;align-items:center;gap:6px;padding:7px 13px;border-radius:10px;border:1px solid rgba(0,229,255,.38);background:linear-gradient(135deg,rgba(0,229,255,.18),rgba(168,85,247,.14));color:#7cecff;font-family:inherit;font-size:11.5px;font-weight:800;cursor:pointer;transition:.2s ease;box-shadow:0 3px 12px rgba(0,229,255,.18), inset 0 1px 0 rgba(255,255,255,.16);}
.mv-panel-mention-btn:hover{background:linear-gradient(135deg,rgba(0,229,255,.32),rgba(168,85,247,.24));color:#fff;border-color:rgba(0,229,255,.65);transform:translateY(-1px);box-shadow:0 6px 18px rgba(0,229,255,.32);}
.mv-panel-mention-btn i{ font-size:12px; }

.mv-size-ctrl{display:flex;align-items:center;gap:2px;padding:3px;border-radius:11px;background:rgba(255,255,255,.045);border:1px solid rgba(255,255,255,.08);}
.mv-size-ctrl button{width:28px;height:28px;border:none;border-radius:8px;background:transparent;color:#cbd0e0;cursor:pointer;font-size:14px;font-weight:800;line-height:1;}
.mv-size-ctrl button:hover{background:rgba(0,229,255,.15);color:#fff;}
.mv-size-ctrl input{width:38px;height:28px;border:none;background:transparent;color:#fff;text-align:center;font-family:inherit;font-size:12px;font-weight:700;}
.mv-btns{display:flex;gap:4px;}
.mv-toggle{width:34px;height:34px;border:1px solid rgba(255,255,255,.09);border-radius:10px;background:rgba(255,255,255,.045);color:#cbd0e0;cursor:pointer;display:grid;place-items:center;font-size:13px;font-family:inherit;}
.mv-toggle:hover{background:rgba(255,255,255,.10);color:#fff;}
.mv-toggle.active{background:linear-gradient(135deg,rgba(0,229,255,.20),rgba(168,85,247,.16));border-color:rgba(0,229,255,.35);color:#fff;}
.mv-effect-btn{padding:7px 11px;border-radius:10px;border:1px solid rgba(255,255,255,.09);background:rgba(255,255,255,.045);color:#cbd0e0;font-family:inherit;font-size:10.5px;font-weight:700;cursor:pointer;display:inline-flex;align-items:center;gap:5px;}
.mv-effect-btn i{font-size:10px;opacity:.85;}
.mv-effect-btn:hover{background:rgba(255,255,255,.10);color:#fff;}
.mv-effect-btn.active{background:linear-gradient(135deg,rgba(0,229,255,.20),rgba(168,85,247,.16));border-color:rgba(0,229,255,.35);color:#fff;}
.mv-color-picker{position:relative;width:34px;height:34px;border-radius:10px;border:2px solid rgba(255,255,255,.18);cursor:pointer;background:conic-gradient(from 0deg,#ff4ecd,#a855f7,#00e5ff,#35e69a,#ffd43b,#ff9f43,#ff4ecd);overflow:hidden;flex-shrink:0;}
.mv-color-picker input{position:absolute;inset:0;width:200%;height:200%;border:none;padding:0;cursor:pointer;opacity:0;margin:-25% 0 0 -25%;}
.mv-swatches{display:flex;gap:5px;flex-wrap:wrap;}
.mv-swatch{width:26px;height:26px;border-radius:9px;cursor:pointer;border:2px solid rgba(255,255,255,.10);background:var(--c);transition:transform .18s,border-color .18s;}
.mv-swatch:hover{transform:translateY(-2px) scale(1.08);}
.mv-swatch.active{border-color:#fff;box-shadow:0 0 0 2px rgba(0,229,255,.4);}
.mv-bg-grid{display:grid;grid-template-columns:repeat(auto-fill,minmax(52px,1fr));gap:7px;max-height:180px;overflow-y:auto;padding:2px;}
.mv-bg-cell{aspect-ratio:1/1;border-radius:11px;border:2px solid rgba(255,255,255,.10);cursor:pointer;background:var(--bg);transition:transform .18s,border-color .18s;}
.mv-bg-cell:hover{transform:translateY(-2px);border-color:rgba(0,229,255,.4);}
.mv-bg-cell.active{border-color:#fff;box-shadow:0 0 0 2px rgba(0,229,255,.5);}
.mv-emoji-grid{display:grid;grid-template-columns:repeat(auto-fill,minmax(clamp(38px,9vw,48px),1fr));gap:5px;max-height:260px;overflow-y:auto;padding:2px;}
.mv-emoji-btn{aspect-ratio:1;border:1px solid rgba(255,255,255,.06);background:rgba(255,255,255,.03);cursor:pointer;border-radius:12px;padding:4px;display:grid;place-items:center;overflow:hidden;font-size:clamp(20px,5.2vw,26px);line-height:1;}
.mv-emoji-btn:hover{background:rgba(255,255,255,.10);transform:scale(1.1);border-color:rgba(0,229,255,.25);}
.mv-emoji-btn img{width:100%;height:100%;object-fit:contain;display:block;pointer-events:none;}

.mv-privacy-chips{display:flex;flex-wrap:wrap;gap:6px;margin-top:10px;}
.mv-privacy-chip{padding:7px 12px;border-radius:10px;border:1px solid rgba(255,255,255,.10);background:rgba(255,255,255,.04);color:#c8cde0;font-family:inherit;font-size:11px;font-weight:700;cursor:pointer;display:inline-flex;align-items:center;gap:6px;}
.mv-privacy-chip:hover{background:rgba(255,255,255,.10);color:#fff;}
.mv-privacy-chip.active{background:linear-gradient(135deg,rgba(0,229,255,.20),rgba(168,85,247,.16));border-color:rgba(0,229,255,.35);color:#fff;}
.mv-draw-tools{display:flex;align-items:center;gap:8px;flex-wrap:wrap;}
.mv-draw-color{width:32px;height:32px;border-radius:50%;border:2px solid rgba(255,255,255,.18);cursor:pointer;flex-shrink:0;background:transparent;}
.mv-draw-size{flex:1;min-width:80px;max-width:200px;height:6px;-webkit-appearance:none;background:linear-gradient(90deg,#00e5ff,#a855f7);border-radius:20px;outline:none;}
.mv-draw-size::-webkit-slider-thumb{-webkit-appearance:none;width:18px;height:18px;border-radius:50%;background:#fff;cursor:pointer;box-shadow:0 2px 8px rgba(0,0,0,.4);}
.mv-draw-clear{width:34px;height:34px;border:none;border-radius:10px;background:rgba(255,95,130,.14);color:#ff8a9a;cursor:pointer;display:grid;place-items:center;font-size:13px;}
.mv-duration-row{display:flex;align-items:center;gap:10px;flex-wrap:wrap;margin-top:8px;padding:10px 12px;border-radius:12px;background:rgba(255,255,255,.03);border:1px solid rgba(255,255,255,.06);}
.mv-duration-options{display:flex;gap:6px;flex-wrap:wrap;}
.mv-dur-btn{padding:6px 12px;border-radius:10px;border:1px solid rgba(255,255,255,.10);background:rgba(255,255,255,.04);color:#cdd3e6;font-family:inherit;font-size:11px;font-weight:700;cursor:pointer;}
.mv-dur-btn:hover{background:rgba(255,255,255,.10);color:#fff;}
.mv-dur-btn.active{background:linear-gradient(135deg,rgba(0,229,255,.20),rgba(168,85,247,.16));border-color:rgba(0,229,255,.35);color:#fff;}
.mv-img-toolbar{display:flex;gap:6px;flex-wrap:wrap;margin-bottom:8px;}
.mv-img-tool-btn{padding:7px 11px;border-radius:10px;border:1px solid rgba(255,255,255,.10);background:rgba(255,255,255,.045);color:#cdd3e6;font-family:inherit;font-size:10.5px;font-weight:700;cursor:pointer;display:inline-flex;align-items:center;gap:5px;}
.mv-img-tool-btn:hover{background:rgba(255,255,255,.10);color:#fff;}
.mv-img-tool-btn i{font-size:10px;}

.mv-crop-overlay{position:absolute;inset:0;z-index:50;background:rgba(0,0,0,.55);display:none;pointer-events:auto;touch-action:none;}
.mv-crop-overlay.show{display:block;}
.mv-crop-box{position:absolute;border:2px solid #fff;box-shadow:0 0 0 9999px rgba(0,0,0,.55);pointer-events:auto;touch-action:none;cursor:move;}
.mv-crop-grid-line{position:absolute;background:rgba(255,255,255,.35);pointer-events:none;}
.mv-crop-grid-line.h{left:0;right:0;height:1px;}
.mv-crop-grid-line.v{top:0;bottom:0;width:1px;}
.mv-crop-handle{position:absolute;width:22px;height:22px;background:#fff;border-radius:50%;border:2px solid #5de8ff;touch-action:none;pointer-events:auto;}
.mv-crop-handle.tl{top:-11px;left:-11px;cursor:nwse-resize;}
.mv-crop-handle.tr{top:-11px;right:-11px;cursor:nesw-resize;}
.mv-crop-handle.bl{bottom:-11px;left:-11px;cursor:nesw-resize;}
.mv-crop-handle.br{bottom:-11px;right:-11px;cursor:nwse-resize;}
.mv-crop-actions{position:absolute;bottom:-52px;left:50%;transform:translateX(-50%);display:flex;gap:8px;pointer-events:auto;}
.mv-crop-actions button{padding:9px 18px;border-radius:10px;border:none;cursor:pointer;font-family:inherit;font-size:12px;font-weight:800;}
.mv-crop-cancel{background:rgba(255,255,255,.15);color:#fff;}
.mv-crop-apply{background:linear-gradient(135deg,#5de8ff,#a855f7);color:#fff;}

.mv-music-tabs{display:flex;gap:5px;padding:5px;border-radius:13px;background:rgba(255,255,255,.04);border:1px solid rgba(255,255,255,.08);margin-bottom:10px;}
.mv-music-tab{flex:1;padding:8px 10px;border-radius:9px;border:none;background:transparent;color:#c8cee0;font-family:inherit;font-size:11px;font-weight:700;cursor:pointer;display:inline-flex;align-items:center;justify-content:center;gap:5px;}
.mv-music-tab:hover{background:rgba(255,255,255,.06);color:#fff;}
.mv-music-tab.active{background:linear-gradient(135deg,rgba(0,229,255,.20),rgba(168,85,247,.16));color:#fff;}
.mv-music-search{display:flex;align-items:center;gap:8px;padding:0 12px;height:40px;border-radius:11px;background:rgba(255,255,255,.045);border:1px solid rgba(255,255,255,.08);margin-bottom:10px;}
.mv-music-search i{color:#5de8ff;font-size:12px;flex-shrink:0;}
.mv-music-search input{flex:1;min-width:0;border:none;outline:none;background:transparent;color:#fff;font-family:inherit;font-size:12.5px;}
.mv-music-search input::placeholder{color:#7a8099;}
.mv-music-search .mv-music-search-btn{padding:0 12px;height:30px;border-radius:9px;border:none;cursor:pointer;background:linear-gradient(135deg,#5de8ff,#a855f7);color:#fff;font-family:inherit;font-size:11px;font-weight:800;}
.mv-music-list{display:flex;flex-direction:column;gap:5px;max-height:230px;overflow-y:auto;padding:2px;}
.mv-music-row{display:flex;align-items:center;gap:10px;padding:8px 10px;border-radius:11px;background:rgba(255,255,255,.03);border:1px solid transparent;cursor:pointer;text-align:left;color:#e0e5f3;font-family:inherit;width:100%;position:relative;}
.mv-music-row:hover{background:rgba(255,255,255,.07);border-color:rgba(255,255,255,.10);}
.mv-music-row.selected{background:linear-gradient(135deg,rgba(0,229,255,.10),rgba(168,85,247,.10));border-color:rgba(0,229,255,.25);}
.mv-music-row.playing{background:linear-gradient(135deg,rgba(0,229,255,.18),rgba(168,85,247,.16));border-color:rgba(0,229,255,.42);}
.mv-music-cover{width:38px;height:38px;border-radius:10px;flex-shrink:0;display:grid;place-items:center;color:#fff;font-size:15px;background:linear-gradient(135deg,#5de8ff,#a855f7);overflow:hidden;font-weight:800;}
.mv-music-cover img{width:100%;height:100%;object-fit:cover;display:block;}
.mv-music-meta{flex:1;min-width:0;}
.mv-music-meta b{display:block;font-size:11.5px;color:#fff;font-weight:700;overflow:hidden;text-overflow:ellipsis;white-space:nowrap;}
.mv-music-meta span{display:block;font-size:9.5px;color:#8f97af;margin-top:2px;overflow:hidden;text-overflow:ellipsis;white-space:nowrap;}
.mv-music-dur{font-size:9.5px;color:#8f97af;font-variant-numeric:tabular-nums;flex-shrink:0;font-weight:700;}
.mv-music-play,.mv-music-fav{width:30px;height:30px;flex-shrink:0;border:none;border-radius:50%;background:rgba(255,255,255,.08);color:#fff;cursor:pointer;display:grid;place-items:center;font-size:11px;}
.mv-music-play:hover{background:rgba(0,229,255,.20);}
.mv-music-fav{background:transparent;color:rgba(255,255,255,.55);}
.mv-music-fav.on{color:#ffd43b;}
.mv-music-empty,.mv-music-loading{padding:24px 12px;text-align:center;color:#7a8099;font-size:11px;}

.mv-music-trim{margin-top:12px;padding:14px;border-radius:14px;background:linear-gradient(135deg,rgba(0,229,255,.06),rgba(168,85,247,.06));border:1px solid rgba(0,229,255,.20);display:none;}
.mv-music-trim.show{display:block;}
.mv-music-trim-head{display:flex;align-items:center;justify-content:space-between;gap:10px;margin-bottom:12px;}
.mv-music-trim-head b{font-size:11.5px;color:#fff;display:flex;align-items:center;gap:6px;min-width:0;overflow:hidden;flex:1;}
.mv-music-trim-head b span{overflow:hidden;text-overflow:ellipsis;white-space:nowrap;}
.mv-music-trim-head b i{color:#5de8ff;font-size:11px;flex-shrink:0;}
.mv-music-trim-head button{border:none;background:rgba(255,95,130,.14);color:#ff8a9a;font-family:inherit;font-size:10.5px;font-weight:700;padding:5px 10px;border-radius:8px;cursor:pointer;}

.mv-waveform-wrap{position:relative;height:64px;border-radius:14px;background:linear-gradient(135deg,rgba(0,0,0,.35),rgba(0,0,0,.20));border:1px solid rgba(255,255,255,.10);margin-bottom:14px;overflow:hidden;touch-action:none;}
.mv-waveform-canvas{position:absolute;inset:0;width:100%;height:100%;display:block;}
.mv-waveform-selection{position:absolute;top:0;bottom:0;background:rgba(0,229,255,.10);border-left:2px solid #5de8ff;border-right:2px solid #5de8ff;pointer-events:none;box-shadow:inset 0 0 0 1px rgba(0,229,255,.25),0 0 20px rgba(0,229,255,.15);}
.mv-waveform-dim-left,.mv-waveform-dim-right{position:absolute;top:0;bottom:0;background:rgba(0,0,0,.55);pointer-events:none;}
.mv-waveform-handle{position:absolute;top:50%;transform:translate(-50%,-50%);width:14px;height:56px;background:linear-gradient(180deg,#5de8ff,#a855f7);border-radius:8px;cursor:ew-resize;z-index:5;box-shadow:0 0 16px rgba(93,232,255,.55);border:2px solid rgba(255,255,255,.9);touch-action:none;}
.mv-waveform-handle::before{content:"";position:absolute;left:50%;top:50%;transform:translate(-50%,-50%);width:2px;height:20px;background:rgba(255,255,255,.9);border-radius:2px;}
.mv-waveform-playhead{position:absolute;top:0;bottom:0;width:2px;background:#fff;box-shadow:0 0 10px rgba(255,255,255,.9);pointer-events:none;z-index:4;}

.mv-sticker-style-row{display:flex;gap:8px;padding:12px 6px 6px;margin-top:6px;border-top:1px solid rgba(255,255,255,.08);overflow-x:auto;scrollbar-width:none;}
.mv-sticker-style-row::-webkit-scrollbar{display:none;}
.mv-sticker-style-btn{flex:0 0 auto;width:64px;height:78px;border-radius:14px;border:2px solid rgba(255,255,255,.10);background:rgba(255,255,255,.04);cursor:pointer;display:flex;flex-direction:column;align-items:center;justify-content:center;gap:6px;padding:6px;transition:.2s ease;}
.mv-sticker-style-btn:hover{background:rgba(255,255,255,.08);}
.mv-sticker-style-btn.active{border-color:#5de8ff;background:linear-gradient(135deg,rgba(0,229,255,.14),rgba(168,85,247,.10));box-shadow:0 0 0 3px rgba(0,229,255,.15);}
.mv-sticker-style-preview{width:44px;height:32px;border-radius:8px;background:rgba(0,0,0,.55);display:grid;place-items:center;position:relative;overflow:hidden;}
.mv-sticker-style-preview.classic::before{content:"";position:absolute;left:6px;top:50%;transform:translateY(-50%);width:14px;height:14px;border-radius:50%;background:linear-gradient(135deg,#5de8ff,#a855f7);}
.mv-sticker-style-preview.classic::after{content:"";position:absolute;left:24px;top:50%;transform:translateY(-50%);width:16px;height:3px;border-radius:2px;background:rgba(255,255,255,.7);}
.mv-sticker-style-preview.waveform::before{content:"";position:absolute;left:6px;top:50%;transform:translateY(-50%);width:10px;height:10px;border-radius:50%;background:linear-gradient(135deg,#5de8ff,#a855f7);}
.mv-sticker-style-preview.waveform::after{content:"▁▃▅▇▅▃▁";position:absolute;right:6px;top:50%;transform:translateY(-50%);color:#5de8ff;font-size:10px;letter-spacing:-1px;}
.mv-sticker-style-preview.compact::before{content:"";position:absolute;left:14px;top:50%;transform:translateY(-50%);width:16px;height:10px;border-radius:5px;background:rgba(0,0,0,.7);border:1px solid rgba(255,255,255,.3);}
.mv-sticker-style-preview.compact::after{content:"♪";position:absolute;left:18px;top:50%;transform:translateY(-50%);color:#5de8ff;font-size:8px;}
.mv-sticker-style-preview.audio-only::before{content:"🔇";font-size:14px;opacity:.7;}
.mv-sticker-style-label{font-size:9px;color:#c8cee0;font-weight:700;text-align:center;line-height:1.1;}
.mv-sticker-style-btn.active .mv-sticker-style-label{color:#5de8ff;}

.mv-music-bottom-bar{margin-top:10px;display:flex;align-items:center;gap:10px;padding:10px 12px;border-radius:14px;background:rgba(0,0,0,.4);border:1px solid rgba(255,255,255,.10);}
.mv-music-bottom-loop{width:40px;height:40px;flex-shrink:0;border-radius:50%;cursor:pointer;display:grid;place-items:center;font-size:14px;color:#5de8ff;background:linear-gradient(135deg,rgba(0,229,255,.15),rgba(168,85,247,.10));border:1px solid rgba(0,229,255,.30);transition:.2s ease;}
.mv-music-bottom-loop:hover{transform:scale(1.06);}
.mv-music-bottom-loop.on{background:linear-gradient(135deg,#5de8ff,#a855f7);color:#fff;box-shadow:0 0 16px rgba(93,232,255,.5);}
.mv-music-bottom-meta{flex:1;min-width:0;}
.mv-music-bottom-meta b{display:block;font-size:11.5px;color:#fff;font-weight:800;overflow:hidden;text-overflow:ellipsis;white-space:nowrap;}
.mv-music-bottom-meta span{display:block;font-size:10px;color:#8f97af;margin-top:2px;overflow:hidden;text-overflow:ellipsis;white-space:nowrap;}
.mv-music-bottom-change{font-size:9.5px;color:#5de8ff;margin-top:3px;font-weight:700;}
.mv-music-bottom-cover{width:44px;height:44px;flex-shrink:0;border-radius:10px;overflow:hidden;background:linear-gradient(135deg,#5de8ff,#a855f7);display:grid;place-items:center;color:#fff;font-size:16px;position:relative;cursor:pointer;}
.mv-music-bottom-cover img{width:100%;height:100%;object-fit:cover;display:block;}
.mv-music-bottom-play{position:absolute;inset:0;background:rgba(0,0,0,.35);display:grid;place-items:center;color:#fff;font-size:14px;cursor:pointer;opacity:0;transition:opacity .2s;}
.mv-music-bottom-cover:hover .mv-music-bottom-play{opacity:1;}
.mv-music-bottom-play.visible{opacity:1;}

.mv-music-slider-row{display:grid;grid-template-columns:46px 1fr 60px;gap:10px;align-items:center;margin-top:10px;font-size:10.5px;color:#aeb6cb;font-weight:700;}
.mv-music-slider-row input[type="range"]{width:100%;height:5px;-webkit-appearance:none;background:rgba(255,255,255,.12);border-radius:20px;outline:none;}
.mv-music-slider-row input[type="range"]::-webkit-slider-thumb{-webkit-appearance:none;width:16px;height:16px;border-radius:50%;background:#fff;cursor:pointer;}
.mv-music-slider-value{text-align:right;font-variant-numeric:tabular-nums;color:#5de8ff;font-weight:800;font-size:11px;}
.mv-music-duration-badge{display:inline-flex;align-items:center;gap:5px;margin-top:10px;padding:5px 11px;border-radius:20px;background:linear-gradient(135deg,rgba(0,229,255,.14),rgba(168,85,247,.12));border:1px solid rgba(0,229,255,.26);font-size:10.5px;color:#fff;font-weight:800;}
.mv-music-duration-badge i{color:#5de8ff;font-size:10px;}
.mv-music-timeline{margin-top:10px;margin-bottom:12px;height:8px;border-radius:20px;background:rgba(255,255,255,.08);position:relative;}
.mv-music-timeline-selected{position:absolute;top:0;bottom:0;background:linear-gradient(90deg,#5de8ff,#a855f7);border-radius:20px;pointer-events:none;}
.mv-music-playhead{position:absolute;top:-3px;bottom:-3px;width:3px;background:#fff;border-radius:2px;pointer-events:none;}

.mv-video-trim{margin-top:12px;padding:14px;border-radius:14px;background:linear-gradient(135deg,rgba(255,159,67,.06),rgba(255,78,205,.06));border:1px solid rgba(255,159,67,.20);display:none;}
.mv-video-trim.show{display:block;}
.mv-video-trim-head{display:flex;align-items:center;justify-content:space-between;gap:10px;margin-bottom:12px;}
.mv-video-trim-head b{font-size:11.5px;color:#fff;display:flex;align-items:center;gap:6px;flex:1;min-width:0;overflow:hidden;}
.mv-video-trim-head b span{overflow:hidden;text-overflow:ellipsis;white-space:nowrap;}
.mv-video-trim-head b i{color:#ff9f43;font-size:12px;flex-shrink:0;}
.mv-video-trim-head button{border:none;background:rgba(255,95,130,.14);color:#ff8a9a;font-family:inherit;font-size:10.5px;font-weight:700;padding:5px 10px;border-radius:8px;cursor:pointer;}
.mv-video-preview{margin-bottom:12px;border-radius:10px;overflow:hidden;background:#000;max-height:180px;display:flex;align-items:center;justify-content:center;position:relative;}
.mv-video-preview video{width:100%;max-height:180px;display:block;object-fit:contain;background:#000;}
.mv-video-timer{position:absolute;top:8px;right:8px;z-index:5;padding:4px 10px;border-radius:10px;font-size:11.5px;font-weight:800;color:#fff;background:rgba(0,0,0,.68);border:1px solid rgba(255,255,255,.18);backdrop-filter:blur(10px);-webkit-backdrop-filter:blur(10px);font-variant-numeric:tabular-nums;letter-spacing:.3px;pointer-events:none;text-shadow:0 1px 3px rgba(0,0,0,.6);display:flex;align-items:center;gap:2px;}
.mv-video-timer .mv-vt-cur{color:#5de8ff;}
.mv-video-timer .mv-vt-sep{color:rgba(255,255,255,.45);margin:0 2px;}
.mv-video-timer .mv-vt-total{color:rgba(255,255,255,.85);}
.mv-video-play-btn{position:absolute;top:50%;left:50%;transform:translate(-50%,-50%);width:52px;height:52px;border-radius:50%;border:none;cursor:pointer;background:linear-gradient(135deg,#5de8ff,#a855f7);color:#fff;font-size:20px;display:grid;place-items:center;box-shadow:0 8px 22px rgba(0,0,0,.5);}
.mv-video-play-btn:hover{transform:translate(-50%,-50%) scale(1.08);}
.mv-video-play-btn.hide{opacity:0;pointer-events:none;transform:translate(-50%,-50%) scale(.7);}

/* ⭐ v16.0.6 — Video mute button */
.mv-video-mute-btn{position:absolute;top:8px;left:8px;z-index:6;width:38px;height:38px;border-radius:50%;border:1px solid rgba(255,255,255,.20);background:rgba(0,0,0,.65);backdrop-filter:blur(10px);-webkit-backdrop-filter:blur(10px);color:#fff;font-size:14px;display:grid;place-items:center;cursor:pointer;transition:.2s ease;-webkit-tap-highlight-color:transparent;}
.mv-video-mute-btn:hover{background:rgba(0,0,0,.85);transform:scale(1.06);}
.mv-video-mute-btn:active{transform:scale(.94);}
.mv-video-mute-btn.muted{color:#ff8a9a;background:rgba(255,95,130,.28);border-color:rgba(255,95,130,.50);box-shadow:0 0 14px rgba(255,95,130,.30);}

.mv-video-slider-row{display:grid;grid-template-columns:46px 1fr 60px;gap:10px;align-items:center;margin-top:10px;font-size:10.5px;color:#aeb6cb;font-weight:700;}
.mv-video-slider-row input[type="range"]{width:100%;height:5px;-webkit-appearance:none;background:rgba(255,255,255,.12);border-radius:20px;outline:none;}
.mv-video-slider-row input[type="range"]::-webkit-slider-thumb{-webkit-appearance:none;width:16px;height:16px;border-radius:50%;background:#fff;cursor:pointer;}
.mv-video-slider-value{text-align:right;font-variant-numeric:tabular-nums;color:#ff9f43;font-weight:800;font-size:11px;}
.mv-video-timeline{margin-top:10px;height:8px;border-radius:20px;background:rgba(255,255,255,.08);position:relative;overflow:hidden;}
.mv-video-timeline-selected{position:absolute;top:0;bottom:0;background:linear-gradient(90deg,#ff9f43,#ff5875);border-radius:20px;}
.mv-video-duration-badge{display:inline-flex;align-items:center;gap:5px;margin-top:10px;padding:5px 11px;border-radius:20px;background:linear-gradient(135deg,rgba(255,159,67,.16),rgba(255,88,117,.12));border:1px solid rgba(255,159,67,.30);font-size:10.5px;color:#fff;font-weight:800;}
.mv-video-duration-badge i{color:#ff9f43;font-size:10px;}
.mv-video-trim-actions{display:flex;gap:8px;margin-top:12px;}
.mv-video-trim-apply{flex:1;padding:10px;border-radius:11px;border:none;cursor:pointer;background:linear-gradient(135deg,#ff9f43,#ff5875);color:#fff;font-family:inherit;font-size:12px;font-weight:800;box-shadow:0 6px 18px rgba(255,88,117,.35);}
.mv-video-trim-apply:hover{transform:translateY(-1px);}
.mv-video-trim-apply i{margin-right:5px;}
.mv-video-trim-apply.applied{background:linear-gradient(135deg,#35e69a,#00e5ff);box-shadow:0 6px 18px rgba(53,230,154,.35);}

.mv-viewers-modal,.mv-confirm-modal,.mv-fp-modal,.mv-gallery-modal,.mv-creator-mention-overlay{position:fixed;inset:0;z-index:8500;display:none;align-items:center;justify-content:center;padding:16px;background:rgba(4,5,12,.78);backdrop-filter:blur(16px);-webkit-backdrop-filter:blur(16px);}
.mv-viewers-modal.show,.mv-confirm-modal.show,.mv-fp-modal.show,.mv-gallery-modal.show,.mv-creator-mention-overlay.show{display:flex;}
.mv-viewers-shell,.mv-fp-shell,.mv-gallery-shell,.mv-mention-shell{width:min(100%,480px);max-height:88vh;display:flex;flex-direction:column;overflow:hidden;border-radius:24px;background:linear-gradient(135deg,rgba(255,255,255,.075),rgba(255,255,255,.025)),rgba(16,18,32,.97);border:1px solid rgba(255,255,255,.14);box-shadow:0 30px 90px rgba(0,0,0,.65);}
.mv-viewers-head,.mv-fp-head,.mv-gallery-head,.mv-mention-head{display:flex;align-items:center;justify-content:space-between;gap:10px;padding:15px 18px;border-bottom:1px solid rgba(255,255,255,.08);}
.mv-viewers-head h3,.mv-fp-head h3,.mv-gallery-head h3,.mv-mention-head h3{font-family:'Space Grotesk',sans-serif;font-size:15px;}
.mv-vw-stats{display:grid;grid-template-columns:1fr 1fr 1fr;gap:8px;padding:12px 14px;border-bottom:1px solid rgba(255,255,255,.06);}
.mv-vw-stat{padding:10px;border-radius:12px;background:rgba(255,255,255,.04);border:1px solid rgba(255,255,255,.07);text-align:center;}
.mv-vw-stat b{display:block;font-size:16px;color:#fff;font-weight:800;}
.mv-vw-stat span{display:block;margin-top:3px;font-size:9px;color:#8b92a8;letter-spacing:.5px;text-transform:uppercase;font-weight:700;}
.mv-viewers-list{flex:1;min-height:0;overflow-y:auto;padding:10px 14px 16px;}
.mv-viewer-row{display:flex;align-items:center;gap:11px;padding:9px 10px;border-radius:12px;}
.mv-viewer-row:hover{background:rgba(255,255,255,.05);}
.mv-viewer-row img{width:38px;height:38px;border-radius:12px;object-fit:cover;flex-shrink:0;}
.mv-vr-info{flex:1;min-width:0;}
.mv-vr-info b{display:block;font-size:12.5px;color:#fff;font-weight:700;}
.mv-vr-info span{display:block;margin-top:2px;font-size:10px;color:#8f97af;}
.mv-vr-reaction{width:32px;height:32px;flex-shrink:0;display:grid;place-items:center;}
.mv-vr-reaction img{width:26px;height:26px;object-fit:contain;}
.mv-viewers-empty{padding:40px 15px;text-align:center;color:#7d84a0;font-size:11px;}

.mv-confirm-shell{width:min(100%,420px);padding:24px 22px;border-radius:22px;background:linear-gradient(135deg,rgba(255,255,255,.08),rgba(255,255,255,.03)),rgba(18,20,38,.97);border:1px solid rgba(255,255,255,.14);text-align:center;box-shadow:0 30px 90px rgba(0,0,0,.65);}
.mv-confirm-icon{width:60px;height:60px;margin:0 auto 14px;border-radius:50%;display:grid;place-items:center;font-size:26px;color:#fff;background:linear-gradient(135deg,rgba(255,212,59,.22),rgba(255,159,67,.18));border:1px solid rgba(255,212,59,.35);overflow:hidden;}
.mv-confirm-shell h3{font-family:'Space Grotesk',sans-serif;font-size:17px;color:#fff;}
.mv-confirm-shell p{margin-top:8px;color:#a8b0c5;font-size:12px;line-height:1.6;}
.mv-confirm-actions{display:flex;gap:9px;margin-top:18px;}
.mv-confirm-actions button{flex:1;height:44px;border-radius:12px;border:none;cursor:pointer;font-family:inherit;font-weight:700;font-size:12.5px;}
.mv-confirm-cancel{background:rgba(255,255,255,.08);color:#c8cde0;}
.mv-confirm-ok{background:linear-gradient(135deg,#ff5875,#b84dff);color:#fff;}

.mv-fp-search,.mv-mention-search{padding:11px 14px;border-bottom:1px solid rgba(255,255,255,.06);display:flex;align-items:center;gap:9px;}
.mv-fp-search i,.mv-mention-search i{color:#5de8ff;font-size:13px;}
.mv-fp-search input,.mv-mention-search input{flex:1;height:34px;border:none;outline:none;background:transparent;color:#fff;font-family:inherit;font-size:12.5px;}
.mv-fp-list,.mv-mention-list{flex:1;min-height:0;overflow-y:auto;padding:8px 12px 12px;}
.mv-fp-row,.mv-mention-row{display:flex;align-items:center;gap:10px;padding:9px 10px;border:1px solid transparent;border-radius:12px;background:transparent;cursor:pointer;text-align:left;color:#e3e7f4;font-family:inherit;width:100%;}
.mv-fp-row:hover,.mv-mention-row:hover{background:rgba(255,255,255,.06);}
.mv-fp-row.selected,.mv-mention-row.selected{background:linear-gradient(135deg,rgba(0,229,255,.10),rgba(168,85,247,.08));border-color:rgba(0,229,255,.22);}
.mv-fp-row img,.mv-mention-row img{width:38px;height:38px;flex:0 0 38px;border-radius:11px;object-fit:cover;}
.mv-fp-info,.mv-mention-info{flex:1;min-width:0;}
.mv-fp-info b,.mv-mention-info b{display:block;font-size:12px;color:#fff;}
.mv-fp-info span,.mv-mention-info span{display:block;font-size:10px;color:#8f97af;margin-top:2px;}
.mv-fp-check,.mv-mention-check{width:24px;height:24px;flex:0 0 24px;border-radius:8px;display:grid;place-items:center;font-size:11px;color:#fff;background:rgba(255,255,255,.045);border:1px solid rgba(255,255,255,.09);}
.mv-fp-row.selected .mv-fp-check,.mv-mention-row.selected .mv-mention-check{background:linear-gradient(135deg,#a855f7,#00e5ff);border-color:transparent;}
.mv-fp-check i,.mv-mention-check i{opacity:0;}
.mv-fp-row.selected .mv-fp-check i,.mv-mention-row.selected .mv-mention-check i{opacity:1;}
.mv-fp-foot,.mv-mention-foot{display:flex;gap:9px;padding:12px 14px 14px;border-top:1px solid rgba(255,255,255,.07);}
.mv-fp-foot button,.mv-mention-foot button{height:44px;border-radius:12px;border:none;cursor:pointer;font-family:inherit;font-weight:700;font-size:12.5px;}
.mv-fp-cancel,.mv-mention-cancel{padding:0 20px;background:rgba(255,255,255,.08);color:#c8cde0;}
.mv-fp-ok,.mv-mention-ok{flex:1;background:linear-gradient(135deg,#a855f7,#00e5ff);color:#fff;}
.mv-mention-ok i{margin-right:5px;}
.mv-mention-ok:disabled{opacity:.45;cursor:not-allowed;box-shadow:none;}

.mv-gallery-body{flex:1;min-height:0;overflow-y:auto;padding:14px;}
.mv-gallery-grid{display:grid;grid-template-columns:repeat(auto-fill,minmax(120px,1fr));gap:10px;}
.mv-gallery-item{position:relative;aspect-ratio:1;border-radius:14px;overflow:hidden;cursor:pointer;background:#05060d;border:2px solid transparent;}
.mv-gallery-item:hover{border-color:rgba(0,229,255,.5);transform:scale(1.03);}
.mv-gallery-item img{width:100%;height:100%;object-fit:cover;display:block;}
.mv-gallery-item .mv-gallery-badge{position:absolute;top:6px;right:6px;padding:2px 7px;border-radius:8px;font-size:9px;font-weight:800;color:#fff;background:rgba(0,0,0,.65);}
.mv-gallery-item .mv-gallery-label{position:absolute;left:6px;right:6px;bottom:6px;text-align:center;padding:3px 6px;border-radius:8px;font-size:9.5px;font-weight:700;color:#fff;background:rgba(0,0,0,.65);}

.mv-toast{position:fixed;left:50%;bottom:24px;z-index:10000;transform:translate(-50%,120px);opacity:0;pointer-events:none;padding:12px 18px;border-radius:14px;color:#fff;font-size:12px;transition:.35s ease;background:rgba(18,20,37,.92);border:1px solid rgba(255,255,255,.12);backdrop-filter:blur(20px);max-width:90%;text-align:center;font-family:'Inter',sans-serif;}
.mv-toast.show{opacity:1;transform:translate(-50%,0);}

@media (max-width:899px){.mv-viewer-sidebar{display:none !important;}.mv-viewer-main{width:100%;}}
@media (max-width:768px){
  .mv-story{flex:0 0 108px;height:145px;}
  .mv-story-ring-wrap{width:50px;height:50px;border-radius:16px;}
  .mv-story-ring-wrap img{border-radius:13px;}
  .mv-viewer-text{font-size:18px;padding:13px 16px;}
  .mv-creator-text{font-size:20px;}
  .mv-el-drag-handle,.mv-el-rotate-handle,.mv-el-resize-handle,.mv-el-close-handle{width:26px;height:26px;font-size:10px;}
  .mv-el-drag-handle{top:-32px;}
  .mv-el-rotate-handle{top:-32px;right:-32px;}
  .mv-el-resize-handle{bottom:-32px;right:-32px;}
  .mv-el-close-handle{top:-32px;left:-32px;}
  .mv-viewer-mentioned-bar{ bottom: calc(80px + env(safe-area-inset-bottom)); padding:5px 10px 5px 7px; }
  .mv-viewer-mentioned-bar .mv-mentioned-avatar{ width:22px; height:22px; }
  .mv-viewer-mentioned-bar .mv-mentioned-label{ font-size:10px; margin-left:6px; }
  .mv-waveform-wrap{height:56px;}
}
@media (max-width:480px){
  .mv-story{flex:0 0 96px;height:138px;}
  .mv-story-ring-wrap{width:46px;height:46px;padding:2.5px;border-radius:15px;}
  .mv-story-ring-wrap img{border-radius:12px;}
  .mv-story-ring-add{width:19px;height:19px;font-size:10px;border-radius:7px;}
  .mv-story-name{font-size:9.5px;}
  .mv-viewer-head img.mv-vh-avatar{width:34px;height:34px;}
  .mv-viewer-head .mv-vh-info b{font-size:12px;}
  .mv-vh-btn{width:32px;height:32px;}
  .mv-creator-text{font-size:18px;}
  .mv-music-sticker{ bottom: 78px; }
}

.mv-music-preview-row{display:flex;align-items:center;gap:10px;margin-top:12px;padding:10px 12px;border-radius:12px;background:rgba(0,0,0,.35);border:1px solid rgba(0,229,255,.22);}
.mv-music-preview-btn{width:40px;height:40px;flex-shrink:0;border-radius:50%;border:none;cursor:pointer;background:linear-gradient(135deg,#5de8ff,#a855f7);color:#fff;font-size:14px;display:grid;place-items:center;box-shadow:0 4px 14px rgba(93,232,255,.40);transition:.2s ease;-webkit-tap-highlight-color:transparent;}
.mv-music-preview-btn:hover{transform:scale(1.06);}
.mv-music-preview-btn:active{transform:scale(.94);}
.mv-music-preview-info{flex:1;min-width:0;display:flex;flex-direction:column;gap:6px;}
.mv-music-preview-timer{font-size:12px;font-weight:800;color:#5de8ff;font-variant-numeric:tabular-nums;letter-spacing:.4px;}
.mv-music-preview-progress{height:6px;border-radius:20px;background:rgba(255,255,255,.10);overflow:hidden;}
.mv-music-preview-fill{height:100%;width:0%;border-radius:20px;background:linear-gradient(90deg,#5de8ff,#a855f7);transition:width .08s linear;box-shadow:0 0 10px rgba(93,232,255,.5);}
.mv-music-preview-fill{height:100%;width:0%;border-radius:20px;background:linear-gradient(90deg,#5de8ff,#a855f7);transition:width .08s linear;box-shadow:0 0 10px rgba(93,232,255,.5);}

/* ⭐ v16.0.6.2 — Video preloader + sound prompt */
.mv-vs-vid{opacity:0;transition:opacity .28s ease;background:#000;}
.mv-vs-vid.mv-ready{opacity:1;}
.mv-video-loader{position:absolute;inset:0;display:grid;place-items:center;z-index:6;pointer-events:none;background:#05060d;}
.mv-video-spinner{width:46px;height:46px;border-radius:50%;border:3px solid rgba(255,255,255,.14);border-top-color:#5de8ff;border-right-color:#a855f7;animation:mvVidSpin .75s linear infinite;}
@keyframes mvVidSpin{to{transform:rotate(360deg);}}
.mv-video-sound-btn{position:absolute;bottom:130px;left:50%;transform:translateX(-50%);z-index:55;padding:9px 16px;border-radius:22px;border:1px solid rgba(255,255,255,.20);background:rgba(0,0,0,.80);color:#fff;font-family:inherit;font-size:12px;font-weight:700;cursor:pointer;backdrop-filter:blur(14px);-webkit-backdrop-filter:blur(14px);display:flex;align-items:center;gap:7px;box-shadow:0 10px 28px rgba(0,0,0,.55);animation:mvSoundPop .35s cubic-bezier(.2,.9,.3,1.4);-webkit-tap-highlight-color:transparent;}
.mv-video-sound-btn i{color:#ffd43b;font-size:13px;}
.mv-video-sound-btn:hover{background:rgba(0,0,0,.94);transform:translateX(-50%) scale(1.05);}
.mv-video-sound-btn:active{transform:translateX(-50%) scale(.95);}
@keyframes mvSoundPop{from{opacity:0;transform:translateX(-50%) translateY(12px) scale(.85);}to{opacity:1;transform:translateX(-50%) translateY(0) scale(1);}}
@media (max-width:480px){ .mv-video-sound-btn{ bottom:110px; padding:8px 14px; font-size:11px; } }
`;

(function injectCSS(){
  const old = document.getElementById('mv-moments-style');
  if(old) old.remove();
  const s = document.createElement('style');
  s.id = 'mv-moments-style';
  s.textContent = CSS;
  document.head.appendChild(s);
})();

/* ============================================================
   ASSETS
   ============================================================ */
const ASSET_EMOJIS = [
  { id:'like',    src:'reactions/like.webp',    label:'Like' },
  { id:'dislike', src:'reactions/dislike.webp', label:'Dislike' },
  { id:'love',    src:'reactions/love.webp',    label:'Love' },
  { id:'haha',    src:'reactions/haha.webp',    label:'Haha' },
  { id:'wow',     src:'reactions/wow.webp',     label:'Wow' },
  { id:'sad',     src:'reactions/sad.webp',     label:'Sad' },
  { id:'angry',   src:'reactions/angry.webp',   label:'Angry' },
  { id:'fire',    src:'reactions/fire.webp',    label:'Fire' }
];
const STORY_REACTIONS = ['like','dislike','love','haha','wow','sad','angry','fire'];
const MAX_REACTIONS_PER_USER = 8;

const KEYBOARD_EMOJIS = ['😀','😃','😄','😁','😆','😅','🤣','😂','🙂','🙃','😉','😊','😇','🥰','😍','🤩','😘','😗','😚','😙','😋','😛','😜','🤪','😝','🤑','🤗','🤭','🤫','🤔','🤐','🤨','😐','😑','😶','😏','😒','🙄','😬','🤥','😌','😔','😪','🤤','😴','😷','🤒','🤕','🤢','🤮','🤧','🥵','🥶','🥴','😵','🤯','🤠','🥳','😎','🤓','🧐','😕','😟','🙁','😮','😯','😲','😳','🥺','😦','😧','😨','😰','😥','😢','😭','😱','😖','😣','😞','😓','😩','😫','🥱','😤','😡','😠','🤬','😈','👿','💀','💩','🤡','👹','👺','👻','👽','👾','🤖','🎃','❤️','🧡','💛','💚','💙','💜','🖤','🤍','🤎','💔','❣️','💕','💞','💓','💗','💖','💘','💝','💟','♥️','👍','👎','👌','✌️','🤞','🤟','🤘','🤙','👈','👉','👆','👇','☝️','✋','🤚','🖐️','🖖','👋','🤝','🙏','💪','🦾','🦵','🦶','👂','🦻','👃','🧠','🫀','🫁','🦷','🦴','👀','👁️','👅','👄','💋','🩸','🔥','✨','⭐','🌟','💫','⚡','☀️','🌈','☁️','⛅','🌤️','🌦️','🌧️','⛈️','🌩️','🌨️','❄️','☃️','⛄','🌬️','💨','🌪️','🌫️','🌊','🎉','🎊','🎈','🎁','🎀','🎂','🍰','🧁','🍭','🍬','🍫','🍩','🍪','🍯','🍼','🥛','☕','🍵','🍶','🍷','🍸','🍹','🍺','🍻','🥂','🥃','🐶','🐱','🐭','🐹','🐰','🦊','🐻','🐼','🐨','🐯','🦁','🐮','🐷','🐸','🐵','🙈','🙉','🙊','🐔','🐧','🐦','🐤','🦆','🦅','🦉','🦇','🐺','🐗','🐴','🦄','🌸','🌺','🌻','🌹','🌷','💐','🍀','🌿','🌱','🌳','🌴','🌵','🍁','🍂','🍃','🌾','🍇','🍈','🍉','🍊','🍋','🍌','🍍','🥭','🍎','🍏','🍐','🍑','🍒','🍓','🥝','🍅','🥥','🥑','🍆','🥔','🥕','🌽','⚽','🏀','🏈','⚾','🎾','🏐','🏉','🎱','🏓','🏸','🥅','🏒','🏑','🏏','🥊','🥋','⛳','🎿','🎯','🎮','🕹️','🎨','🎬','🎤','🎧','🎼','🎵','🎶','🎷','🎸','🎹','🎺','🎻','🥁','💻','🖥️','🖨️','⌨️','🖱️','💾','💿','📀','📱','☎️','📞','📟','📠','📺','📷','📸','📹','🎥','📽️','🎞️','💰','💴','💵','💶','💷','💸','💳','🧾','💎','⚖️','🔧','🔨','🛠️','🔩','⚙️','🔗','🔒','🔓','🔑'];

const EXTRA_EMOJI_BASE = 'assets/emojis/';
const EXTRA_EMOJIS = [
  { code:'1f602', label:'Tears' },{ code:'1f60d', label:'Heart-eyes' },{ code:'1f60e', label:'Cool' },
  { code:'1f973', label:'Party' },{ code:'1f62d', label:'Crying' },{ code:'1f621', label:'Rage' },
  { code:'1f929', label:'Star-struck' },{ code:'1f917', label:'Hug' },{ code:'1f44d', label:'Thumbs up' },
  { code:'1f44f', label:'Clap' },{ code:'1f64c', label:'Raise' },{ code:'2764', label:'Heart' },
  { code:'1f525', label:'Fire' },{ code:'2728', label:'Sparkles' },{ code:'1f389', label:'Tada' },{ code:'1f4af', label:'100' }
];

function emojiMarkup(item){
  if(!item) return '';
  if(item.src) return `<img src="${esc(item.src)}" alt="">`;
  if(item.code) return `<img src="${EXTRA_EMOJI_BASE}${item.code}.png" alt="">`;
  return '';
}
function fmtTime(sec){ sec = Math.max(0, Math.floor(sec||0)); const m = Math.floor(sec/60); const s = sec % 60; return m + ':' + (s<10?'0':'') + s; }
function musicCoverMarkup(m){
  if(m.cover) return `<span class="mv-music-cover"><img src="${esc(m.cover)}" alt=""></span>`;
  return `<span class="mv-music-cover" style="background:linear-gradient(135deg, ${m.hue||'#5de8ff'}, #a855f7)">${m.emoji||'🎵'}</span>`;
}

/* ============================================================
   STORAGE
   ============================================================ */
const KEYS = { stories:'mv_stories_v5', seen:'mv_stories_seen_v5', muted:'mv_stories_muted_v5', archive:'mv_stories_archive_v5', reactions:'mv_stories_reactions_v5', replies:'mv_stories_replies_v5', notInterested:'mv_stories_notint_v5', lastActive:'mv_users_active_v5' };
const STORY_LIFETIME = 24*60*60*1000;
const ACTIVE_WINDOW = 5*60*1000;

function loadJSON(key, fb){ try{const r=localStorage.getItem(key);return r?JSON.parse(r):fb;}catch(e){return fb;} }
function saveJSON(key, v){ try{localStorage.setItem(key, JSON.stringify(v));}catch(e){} }
function uid(p){ return (p||'id')+'_'+Date.now().toString(36)+Math.random().toString(36).slice(2,7); }
function esc(v){ const d=document.createElement('div'); d.textContent = v==null?'':String(v); return d.innerHTML; }
function now(){ return Date.now(); }

let stories = loadJSON(KEYS.stories, {});
let seenMap = loadJSON(KEYS.seen, {});
let mutedUsers = loadJSON(KEYS.muted, []);
let archive = loadJSON(KEYS.archive, []);
let reactions = loadJSON(KEYS.reactions, {});
let replies = loadJSON(KEYS.replies, {});
let notInterested = loadJSON(KEYS.notInterested, []);
let lastActive = loadJSON(KEYS.lastActive, {});

const CURRENT_USER = { id:'current_user', name:'Mediaverse User', username:'@mediaverseuser', image:'https://i.pravatar.cc/150?img=12', verified:true, isOwn:true };

function getFriends(){
  return (window.FRIEND_LIST || [
    {id:'f1', profileId:'MV-10001', name:'Sorufa Begum', username:'@sorufa', image:'https://i.pravatar.cc/150?img=32'},
    {id:'f2', profileId:'MV-10002', name:'Emma Wilson', username:'@emmawilson', image:'https://i.pravatar.cc/150?img=45'},
    {id:'f3', profileId:'MV-10003', name:'Daniel Lee', username:'@daniellee', image:'https://i.pravatar.cc/150?img=14'},
    {id:'f4', profileId:'MV-10004', name:'Aduri Akter', username:'@aduri', image:'https://i.pravatar.cc/150?img=47'},
    {id:'f5', profileId:'MV-10005', name:'Sohagi Akter', username:'@sohagi', image:'https://i.pravatar.cc/150?img=59'},
    {id:'f6', profileId:'MV-10006', name:'Olivia Chen', username:'@oliviachen', image:'https://i.pravatar.cc/150?img=49'}
  ]);
}

let _toastEl, _toastTimer;
function toast(msg){
  if(typeof window.showToast === 'function'){ window.showToast(msg); return; }
  if(!_toastEl){ _toastEl = document.createElement('div'); _toastEl.className = 'mv-toast'; document.body.appendChild(_toastEl); }
  _toastEl.textContent = msg;
  _toastEl.classList.add('show');
  clearTimeout(_toastTimer);
  _toastTimer = setTimeout(()=>_toastEl.classList.remove('show'), 2600);
}

function isExpired(s){ return s && now() > (s.expiresAt||0); }
function cleanExpired(){
  let changed = false;
  Object.keys(stories).forEach(id=>{
    const s = stories[id]; if(!s) return;
    if(now() > (s.expiresAt||0)){ if(s.isOwn) archive.unshift({...s, archivedAt: now()}); delete stories[id]; changed = true; }
  });
  if(changed){ saveJSON(KEYS.stories, stories); saveJSON(KEYS.archive, archive.slice(0, 100)); }
}
function isUserActive(userId){ if(userId === CURRENT_USER.id) return true; const t = lastActive[userId]; if(!t) return false; return (now() - t) < ACTIVE_WINDOW; }
function canViewerSeeStory(story){
  if(!story) return true;
  if(story.isOwn) return true;
  const p = story.privacy || 'public';
  if(p === 'public' || p === 'friends') return true;
  if(p === 'only'){ const who = story.onlyWho || []; return who.some(f=>f.id === CURRENT_USER.id || f.profileId === CURRENT_USER.id); }
  if(p === 'private') return false;
  return true;
}
function groupStoriesByUser(){
  const groups = {};
  Object.values(stories).forEach(s=>{
    if(isExpired(s)) return;
    if(!s.isOwn && notInterested.includes(s.userId)) return;
    if(!canViewerSeeStory(s)) return;
    const key = s.userId;
    if(!groups[key]){ groups[key] = { userId: s.userId, userName: s.userName, userHandle: s.userHandle || '', avatar: s.avatar, verified: !!s.verified, isOwn: !!s.isOwn, active: isUserActive(s.userId), items: [] }; }
    groups[key].items.push(s);
  });
  Object.values(groups).forEach(g=>g.items.sort((a,b)=>a.createdAt - b.createdAt));
  return Object.values(groups).sort((a,b)=>{
    if(a.isOwn) return -1; if(b.isOwn) return 1;
    const aSeen = a.items.every(it=>seenMap[it.id]);
    const bSeen = b.items.every(it=>seenMap[it.id]);
    if(aSeen !== bSeen) return aSeen ? 1 : -1;
    const aMax = Math.max(...a.items.map(it=>it.createdAt));
    const bMax = Math.max(...b.items.map(it=>it.createdAt));
    return bMax - aMax;
  });
}
function timeAgo(ts){
  const diffMs = now() - ts;
  const totalSec = Math.floor(diffMs / 1000);
  if(totalSec < 5) return 'just now';
  if(totalSec < 60) return totalSec + 's ago';
  if(totalSec < 3600){ const m = Math.floor(totalSec/60); const s = totalSec%60; return s>0?`${m}m ${s}s ago`:`${m}m ago`; }
  if(totalSec < 86400){ const h = Math.floor(totalSec/3600); const m = Math.floor((totalSec%3600)/60); return m>0?`${h}h ${m}m ago`:`${h}h ago`; }
  if(totalSec < 604800){ const d = Math.floor(totalSec/86400); return d+'d ago'; }
  return Math.floor(totalSec/604800)+'w ago';
}
function seedOwnStoryViewers(item){
  if(!item || !item.isOwn) return;
  if(item.viewers && item.viewers.length) return;
  const friends = getFriends();
  const picks = friends.slice(0, Math.floor(Math.random()*3)+2);
  item.viewers = picks.map(f=>({ id:f.id, name:f.name, image:f.image, at: now() - Math.floor(Math.random()*3600000), reaction: Math.random() > 0.6 ? STORY_REACTIONS[Math.floor(Math.random()*STORY_REACTIONS.length)] : null }));
}

function seed(){
  if(Object.keys(stories).length > 0) return;
  const lib = (window.MVMusic && window.MVMusic.library) ? window.MVMusic.library : [];
  const m = (i) => lib[i] ? { id:lib[i].id, title:lib[i].title, artist:lib[i].artist, url:lib[i].url, duration:lib[i].duration, trimStart:0, trimEnd:lib[i].duration||180, emoji:lib[i].emoji, hue:lib[i].hue, style:'classic', x:50, y:85, rotation:0, scale:1, loop:false } : null;

  const samples = [
    { userId:'u_sorufa', userName:'Sorufa Begum', userHandle:'@sorufa', avatar:'https://i.pravatar.cc/150?img=32', verified:true, active:true,
      items:[
        { type:'image', url:'https://images.unsplash.com/photo-1519608487953-e999c86e7455?auto=format&fit=crop&w=900&q=80', duration:STORY_IMAGE_DURATION, music:m(0) },
        { type:'image', url:'https://images.unsplash.com/photo-1531058020387-3be344556be6?auto=format&fit=crop&w=900&q=80', duration:STORY_IMAGE_DURATION, music:m(2) }
      ]
    },
    { userId:'u_aduri', userName:'Aduri Akter', userHandle:'@aduri', avatar:'https://i.pravatar.cc/150?img=47', verified:false, active:false,
      items:[ { type:'image', url:'https://images.unsplash.com/photo-1495567720989-cebdbdd97913?auto=format&fit=crop&w=900&q=80', duration:STORY_IMAGE_DURATION, music:m(4) } ]
    },
    { userId:'u_sohagi', userName:'Sohagi Akter', userHandle:'@sohagi', avatar:'https://i.pravatar.cc/150?img=59', verified:true, active:true,
      items:[
        { type:'image', url:'https://images.unsplash.com/photo-1492619375914-88005aa9e8fb?auto=format&fit=crop&w=900&q=80', duration:STORY_IMAGE_DURATION },
        { type:'image', url:'https://images.unsplash.com/photo-1470071459604-3b5ec3a7fe05?auto=format&fit=crop&w=900&q=80', duration:STORY_IMAGE_DURATION, music:m(6) }
      ]
    },
    { userId:'u_daniel', userName:'Daniel Lee', userHandle:'@daniellee', avatar:'https://i.pravatar.cc/150?img=14', verified:false, active:true,
      items:[ { type:'image', url:'https://images.unsplash.com/photo-1516321318423-f06f85e504b3?auto=format&fit=crop&w=900&q=80', duration:STORY_IMAGE_DURATION } ]
    }
  ];
  const t = now();
  samples.forEach(sample=>{
    const expires = t + STORY_LIFETIME;
    sample.items.forEach((it, i)=>{
      const id = uid('story');
      stories[id] = {
        id, userId:sample.userId, userName:sample.userName, userHandle:sample.userHandle,
        avatar:sample.avatar, verified:sample.verified, isOwn:false,
        type:it.type, url:it.url, images:null, bg:it.bg||null, text:it.text||null, textStyle:it.textStyle||null,
        texts: [], mentions: [], stickers:it.stickers||[], drawing:it.drawing||null, music:it.music,
        duration:it.duration||STORY_IMAGE_DURATION,
        createdAt: t - (sample.items.length - i) * 30*60*1000,
        expiresAt: expires, viewers:[], privacy:'public'
      };
    });
    if(sample.active) lastActive[sample.userId] = t - Math.floor(Math.random()*3)*60*1000;
    else lastActive[sample.userId] = t - (60 + Math.floor(Math.random()*120))*60*1000;
  });
  saveJSON(KEYS.stories, stories);
  saveJSON(KEYS.lastActive, lastActive);
}

/* ============================================================
   GLOBAL — stop all story media
   ============================================================ */
let _mvMediaStopLock = false;
function mvStopAllStoryMedia(){
  if(_mvMediaStopLock) return;
  _mvMediaStopLock = true;
  try {
    try { if(activeAudio){ activeAudio.pause(); } } catch(e){}
    if(activeData && activeData.videoEl){ try{ activeData.videoEl.pause(); }catch(e){} }
    if(activeData && activeData.videoTrimRaf){ cancelAnimationFrame(activeData.videoTrimRaf); activeData.videoTrimRaf = null; }
    try { const cp = creatorEl && creatorEl.querySelector && creatorEl.querySelector('#mvVideoPreviewEl'); if(cp){ try{ cp.pause(); }catch(e){} } } catch(e){}
    try { if(musicPreviewAudio){ musicPreviewAudio.pause(); } } catch(e){}
    try { if(creatorEl && creatorEl.querySelectorAll){ creatorEl.querySelectorAll('video').forEach(v => { try{ v.pause(); }catch(e){} }); } } catch(e){}
    try { if(activeData){ activeData.paused = true; } } catch(e){}
  } finally {
    setTimeout(()=>{ _mvMediaStopLock = false; }, 80);
  }
}
window.mvStopAllStoryMedia = mvStopAllStoryMedia;

document.addEventListener('visibilitychange', () => {
  if(document.hidden) window.mvStopAllMedia();
}, {passive:true});
/* ⭐ v16.0.8 — blur হলে সাথে সাথে stop না করে, শুধু সত্যিই hidden হলে stop */
window.addEventListener('blur', () => {
  setTimeout(() => {
    if(document.hidden) window.mvStopAllMedia();
  }, 150);
}, {passive:true});
window.addEventListener('pagehide', () => window.mvStopAllMedia(), {passive:true});

(function watchOverlays(){
  const tryPause = () => {
    if(!viewerEl.classList.contains('show')) return;
    const conflict = document.querySelector(
      '.overlay.show:not([class*="mv-"]), ' +
      '.comment-flow-overlay.show, ' +
      '#commentFlowOverlay.show, ' +
      '#postOverlay.show, ' +
      '#reportOverlay.show, ' +
      '#reactionViewerOverlay.show, ' +
      '#videoViewer.show, ' +
      '#mediaFlow.show, ' +
      '#imageViewer.show, ' +
      '#editCommentOverlay.show'
    );
    if(conflict){
      try { if(activeData && activeData.videoEl) activeData.videoEl.pause(); }catch(e){}
      try { if(activeAudio) activeAudio.pause(); }catch(e){}
      if(activeData && activeData.videoTrimRaf){ cancelAnimationFrame(activeData.videoTrimRaf); activeData.videoTrimRaf = null; }
      activeData && (activeData.paused = true);
} else {
  /* ⭐ v16.0.7: hidden বা viewer বন্ধ হলে কখনোই resume করবো না */
  if(document.hidden) return;
  if(!viewerEl.classList.contains('show')) return;
  if(activeData && activeData.videoEl && activeData.videoEl.paused && !activeData.paused){ activeData.videoEl.play().catch(()=>{}); }
  if(activeAudio && activeAudio.paused && activeData && !activeData.paused){ activeAudio.play().catch(()=>{}); }
}
  };
  const mo = new MutationObserver(tryPause);
  mo.observe(document.body, { childList: true, subtree: true, attributes: true, attributeFilter: ['class'] });
  setInterval(tryPause, 1200);
})();

/* ============================================================
   STRIP
   ============================================================ */
function renderStrip(){
  cleanExpired();
  
  let strip = document.querySelector('.moments') || document.getElementById('mvMomentsStrip');
  
  if(!strip){
    strip = document.createElement('section');
    strip.className = 'moments';
    strip.id = 'mvMomentsStrip';
    
    const feed = document.querySelector('.feed');
    const hero = feed ? feed.querySelector('.feed-hero') : null;
    const anchor = hero || (feed ? feed.firstElementChild : null);
    
    if(anchor && anchor.parentNode){
      anchor.insertAdjacentElement('afterend', strip);
    } else if(feed){
      feed.insertBefore(strip, feed.firstChild);
    } else {
      return; 
    }
  }
  
strip.classList.add('mv-stories-strip');
strip.classList.remove('mv-loading');           // ⭐ NEW — loader সরায়
strip.removeAttribute('aria-busy');             // ⭐ NEW — accessibility
strip.innerHTML = '';

  const myItems = Object.values(stories).filter(s=>s.isOwn && !isExpired(s));
  const myEl = buildStoryItem({
    userId: CURRENT_USER.id, userName: 'Your Story', avatar: CURRENT_USER.image,
    isOwn: true, hasStories: myItems.length > 0, allSeen: true,
    coverUrl: myItems.length ? (myItems[myItems.length-1].url || (myItems[myItems.length-1].images?.[0]?.url) || null) : null,
    count: myItems.length, active: true
  });
  strip.appendChild(myEl);

  const groups = groupStoriesByUser().filter(g=>!g.isOwn);
  groups.forEach(g=>{
    if(mutedUsers.includes(g.userId)) return;
    const allSeen = g.items.every(it=>seenMap[it.id]);
    const latest = g.items[g.items.length-1];
    const coverUrl = latest.images && latest.images.length ? latest.images[0].url : latest.url;
    const el = buildStoryItem({ userId: g.userId, userName: g.userName, avatar: g.avatar, isOwn: false, allSeen, coverUrl: coverUrl || null, count: g.items.length, active: g.active });
    strip.appendChild(el);
  });
}

function buildStoryItem(opts){
  const el = document.createElement('div');
  el.className = 'mv-story';
  el.dataset.userId = opts.userId;
  el.dataset.isOwn = opts.isOwn ? '1' : '0';
  const ringCls = `mv-story-ring-wrap ${opts.allSeen && !opts.isOwn ? 'seen' : ''} ${opts.isOwn ? 'my' : ''}`;
  const cover = opts.coverUrl ? `<img class="mv-story-cover" src="${esc(opts.coverUrl)}" alt="">` : '';
  const count = (opts.count && opts.count > 1) ? `<span class="mv-story-count">${opts.count}</span>` : '';
  const addBtn = opts.isOwn ? `<button class="mv-story-ring-add" type="button" aria-label="Add new story"><i class="fa-solid fa-plus"></i></button>` : '';
  el.innerHTML = `${cover}<div class="${ringCls}"><img src="${esc(opts.avatar)}" alt="">${addBtn}</div>${count}<div class="mv-story-name">${esc(opts.userName)}</div>`;
  if(opts.isOwn){
    const plusBtn = el.querySelector('.mv-story-ring-add');
    if(plusBtn) plusBtn.addEventListener('click', e=>{ e.stopPropagation(); e.preventDefault(); openCreator(); });
  }
  el.addEventListener('click', e=>{
    e.stopPropagation();
    if(opts.isOwn){ if(opts.hasStories) openViewer(CURRENT_USER.id, 0); else openCreator(); }
    else openViewer(opts.userId, 0);
  });
  return el;
}

/* ============================================================
   VIEWER SHELL
   ============================================================ */
const viewerEl = (()=>{
  const el = document.createElement('div');
  el.className = 'mv-viewer';
  el.innerHTML = `
    <aside class="mv-viewer-sidebar">
      <div class="mv-sb-head">
        <h3><i class="fa-solid fa-circle-play"></i> Stories</h3>
        <p id="mvSidebarSubtitle">— active stories</p>
      </div>
      <div class="mv-sb-list" id="mvSidebarList"></div>
    </aside>
    <div class="mv-viewer-main">
      <div class="mv-viewer-progress" id="mvProgress"></div>
      <div class="mv-viewer-head" id="mvHead">
        <img class="mv-vh-avatar" id="mvHeadAvatar" src="" alt="">
        <div class="mv-vh-info"><b id="mvHeadName">—</b><span id="mvHeadTime">just now</span></div>
        <button class="mv-vh-btn" id="mvHeadMore" type="button"><i class="fa-solid fa-ellipsis"></i></button>
        <button class="mv-vh-btn" id="mvHeadClose" type="button"><i class="fa-solid fa-xmark"></i></button>
      </div>
      <div class="mv-vh-menu" id="mvHeadMenu"></div>
      <div class="mv-viewer-stage" id="mvStage"></div>
      <div class="mv-music-sticker" id="mvStoryMusicSticker" style="display:none;"></div>
      <div class="mv-viewer-mentioned-bar" id="mvMentionedBar"></div>
      <div class="mv-viewer-nav left" id="mvNavPrevZone"></div>
      <div class="mv-viewer-nav right" id="mvNavNextZone"></div>
      <div class="mv-viewer-reply" id="mvReplyBar">
        <input type="file" id="mvReplyMedia" accept="image/*,video/*,.gif" hidden>
        <div class="mv-vr-preview" id="mvReplyPreview">
          <div class="mv-vr-preview-thumb" id="mvReplyThumb"></div>
          <div class="mv-vr-preview-name" id="mvReplyName">Media</div>
          <button class="mv-vr-preview-remove" id="mvReplyRemove" type="button"><i class="fa-solid fa-xmark"></i></button>
        </div>
        <div class="mv-vr-input-wrap">
          <input class="mv-vr-input" id="mvReplyInput" type="text" placeholder="Send message" maxlength="500" autocomplete="off">
          <button class="mv-vr-emoji-btn" id="mvReplyEmojiBtn" type="button" title="Emoji"><i class="fa-regular fa-face-smile"></i></button>
          <button class="mv-vr-gallery-btn" id="mvReplyGalleryBtn" type="button" title="Gallery" style="display:none;"><i class="fa-regular fa-images"></i></button>
        </div>
        <button class="mv-vr-heart-btn show" id="mvReplyHeart" type="button"><i class="fa-regular fa-heart"></i></button>
        <button class="mv-vr-send-btn hide" id="mvReplySend" type="button"><i class="fa-solid fa-paper-plane"></i></button>
        <div class="mv-vr-reaction-pop" id="mvReactionPop"></div>
        <div class="mv-emoji-picker" id="mvEmojiPicker">
          <div class="mv-emoji-picker-head"><b>Emojis</b><button type="button" id="mvEmojiPickerClose"><i class="fa-solid fa-xmark"></i></button></div>
          <div class="mv-emoji-picker-grid" id="mvEmojiPickerGrid"></div>
        </div>
      </div>
    </div>
  `;
  document.body.appendChild(el);
  return el;
})();

const $mv = (sel)=>viewerEl.querySelector(sel);
const mvProgress = $mv('#mvProgress');
const mvStage = $mv('#mvStage');
const mvHeadAvatar = $mv('#mvHeadAvatar');
const mvHeadName = $mv('#mvHeadName');
const mvHeadTime = $mv('#mvHeadTime');
const mvHeadMenu = $mv('#mvHeadMenu');
const mvHeadMore = $mv('#mvHeadMore');
const mvHeadClose = $mv('#mvHeadClose');
const mvReplyInput = $mv('#mvReplyInput');
const mvReplyMedia = $mv('#mvReplyMedia');
const mvReplyEmojiBtn = $mv('#mvReplyEmojiBtn');
const mvReplyGalleryBtn = $mv('#mvReplyGalleryBtn');
const mvReplyHeart = $mv('#mvReplyHeart');
const mvReplySend = $mv('#mvReplySend');
const mvReplyPreview = $mv('#mvReplyPreview');
const mvReplyThumb = $mv('#mvReplyThumb');
const mvReplyName = $mv('#mvReplyName');
const mvReplyRemove = $mv('#mvReplyRemove');
const mvReactionPop = $mv('#mvReactionPop');
const mvNavPrevZone = $mv('#mvNavPrevZone');
const mvNavNextZone = $mv('#mvNavNextZone');
const mvSidebarList = $mv('#mvSidebarList');
const mvSidebarSubtitle = $mv('#mvSidebarSubtitle');
const mvMusicSticker = $mv('#mvStoryMusicSticker');
const mvReplyBar = $mv('#mvReplyBar');
const mvEmojiPicker = $mv('#mvEmojiPicker');
const mvEmojiPickerGrid = $mv('#mvEmojiPickerGrid');
const mvEmojiPickerClose = $mv('#mvEmojiPickerClose');
const mvMentionedBar = $mv('#mvMentionedBar');

let activeData = { group:null, itemIdx:0, itemDuration:STORY_IMAGE_DURATION, playing:false, raf:0, videoEl:null, replyMedia:null, paused:false, pauseAccum:0, itemStart:0, menuPaused:false, reactionPaused:false, videoTrimRaf:null, cleanMode: false };
let activeAudio = null;

/* ⭐ v16.0.7 — Global media registry: background playback leak বন্ধ করার জন্য */
const _mvAllMedia = new Set();
function mvRegisterMedia(el){
  if(!el || !el.tagName) return el;
  _mvAllMedia.add(el);
  return el;
}
function mvUnregisterMedia(el){
  if(el) _mvAllMedia.delete(el);
}

/* ⭐ v16.0.7 — Global media stop function */
window.mvStopAllMedia = function mvStopAllMedia(){
  /* ⭐ FIX — DOM-এ থাকা যেকোনো stray video/audio জোর করে kill */
  try {
  document.querySelectorAll(
    '.mv-viewer-stage video, .mv-viewer-stage audio, ' +
    '.mv-creator-stage video, .mv-creator-stage audio, ' +
    '.mv-viewer video, .mv-viewer audio'
  ).forEach(el => {
    try {
      el.muted = true;
      el.pause();
      try { el.currentTime = 0; } catch(e){}
      try { el.removeAttribute('src'); } catch(e){}
      try { el.load(); } catch(e){}
    } catch(e){}
  });
} catch(e){}
  /* Singleton refs forcibly clear */
  try { if(activeAudio){ activeAudio.pause(); activeAudio.src=''; activeAudio = null; } } catch(e){}
  try { if(musicPreviewAudio){ musicPreviewAudio.pause(); musicPreviewAudio.src=''; musicPreviewAudio = null; } } catch(e){}
  try { if(activeData && activeData.videoEl){ activeData.videoEl.pause(); } } catch(e){}
  try { if(creatorEl && creatorEl.querySelectorAll){
    creatorEl.querySelectorAll('video').forEach(v => { try{ v.pause(); }catch(e){} });
  } } catch(e){}
};

let mvLiveTimeInterval = null;
let mvLiveTimeItem = null;

function startLiveTimeCounter(item){
  stopLiveTimeCounter();
  if(!item) return;
  mvLiveTimeItem = item;

  const tick = () => {
    if(!viewerEl.classList.contains('show') || mvLiveTimeItem !== item){
      stopLiveTimeCounter();
      return;
    }
    mvHeadTime.textContent = timeAgo(item.createdAt);
  };

  mvHeadTime.textContent = timeAgo(item.createdAt);
  mvLiveTimeInterval = setInterval(tick, 1000);
}

function stopLiveTimeCounter(){
  if(mvLiveTimeInterval){
    clearInterval(mvLiveTimeInterval);
    mvLiveTimeInterval = null;
  }
  mvLiveTimeItem = null;
}

const isPC = () => window.matchMedia('(min-width: 900px)').matches;

function buildReactionPop(){
  mvReactionPop.innerHTML = STORY_REACTIONS.map(id=>{
    const e = ASSET_EMOJIS.find(x=>x.id===id); if(!e) return '';
    return `<button type="button" data-rtype="${e.id}" title="${e.label}">${emojiMarkup(e)}<span class="mv-react-count-badge" data-rtype-count="${e.id}" style="display:none;">0</span></button>`;
  }).join('');
}
buildReactionPop();

function buildEmojiPicker(){
  mvEmojiPickerGrid.innerHTML = KEYBOARD_EMOJIS.map(e=>`<button type="button" data-emoji="${e}">${e}</button>`).join('');
}
buildEmojiPicker();

mvEmojiPickerGrid.addEventListener('click', e=>{
  const btn = e.target.closest('[data-emoji]'); if(!btn) return;
  const emoji = btn.dataset.emoji;
  const input = mvReplyInput;
  const start = input.selectionStart || input.value.length;
  const end = input.selectionEnd || input.value.length;
  input.value = input.value.slice(0, start) + emoji + input.value.slice(end);
  input.focus();
  try{ input.setSelectionRange(start + emoji.length, start + emoji.length); }catch(err){}
  updateReplyButtons();
});
mvEmojiPickerClose.addEventListener('click', ()=>mvEmojiPicker.classList.remove('show'));

function getMyReactionData(itemId){
  if(!itemId) return { counts:{}, totalMine:0 };
  if(!reactions[itemId]) reactions[itemId] = { counts:{}, totalMine:0 };
  if(typeof reactions[itemId].counts !== 'object') reactions[itemId].counts = {};
  if(typeof reactions[itemId].totalMine !== 'number') reactions[itemId].totalMine = 0;
  return reactions[itemId];
}
function getMyTotalReactions(itemId){ return getMyReactionData(itemId).totalMine || 0; }
function getMyReactionCount(itemId, type){ return (getMyReactionData(itemId).counts && getMyReactionData(itemId).counts[type]) || 0; }
function addMyReaction(itemId, type){ const d = getMyReactionData(itemId); if(d.totalMine >= MAX_REACTIONS_PER_USER){ return false; } d.counts[type] = (d.counts[type] || 0) + 1; d.totalMine++; d.at = now(); saveJSON(KEYS.reactions, reactions); return true; }
function removeOneReaction(itemId, type){ const d = getMyReactionData(itemId); if(!d.counts[type] || d.counts[type] <= 0) return false; d.counts[type]--; d.totalMine = Math.max(0, d.totalMine - 1); if(d.counts[type] === 0) delete d.counts[type]; saveJSON(KEYS.reactions, reactions); return true; }
function clearMyReactions(itemId){ delete reactions[itemId]; saveJSON(KEYS.reactions, reactions); }
function renderReactionBadges(item){
  if(!item) return;
  STORY_REACTIONS.forEach(type=>{
    const btn = mvReactionPop.querySelector(`[data-rtype="${type}"]`); if(!btn) return;
    const cnt = getMyReactionCount(item.id, type);
    const badge = btn.querySelector('.mv-react-count-badge');
    if(badge){ if(cnt > 0){ badge.textContent = cnt; badge.style.display = 'grid'; } else { badge.style.display = 'none'; } }
    btn.classList.toggle('selected', cnt > 0);
  });
}
function pauseForReaction(){ if(activeData.reactionPaused) return; activeData.reactionPaused = true; pauseProgress(); }
function resumeFromReaction(){ if(!activeData.reactionPaused) return; activeData.reactionPaused = false; if(!activeData.menuPaused) resumeProgress(); }

function stopActiveMusic(){
  if(activeAudio){ try{ activeAudio.pause(); activeAudio.src=''; }catch(e){} activeAudio = null; }
  const sticker = document.getElementById('mvStoryMusicSticker');
  if (sticker) { sticker.style.display = 'none'; sticker.innerHTML = ''; }
}
function playStoryMusic(music){
  stopActiveMusic();
  if(!music || !music.url) return;
  if(document.hidden) return;
  renderStoryMusicSticker(music);

  try{
    const a = new Audio();
    a.src = music.url; a.volume = 0.75; a.preload = 'auto';
    a.loop = !!music.loop;
    mvRegisterMedia(a);
    const start = Math.max(0, music.trimStart || 0);
    const end = music.trimEnd || (start + MUSIC_TRIM_DEFAULT);
    activeAudio = a;

    const tryPlay = ()=>{ 
      if(activeAudio !== a) return;
      try{ a.currentTime = start; }catch(e){} 
      const p = a.play(); 
      if(p && p.catch){ 
        p.catch(()=>{ 
          /* ⭐ v16.0.10 — aggressive retry on ANY user gesture */
          const retry = ()=>{ 
            document.removeEventListener('touchstart', retry, true);
            document.removeEventListener('click',      retry, true);
            document.removeEventListener('pointerdown',retry, true);
            if(activeAudio === a){ 
              try{ a.currentTime = start; }catch(e){} 
              a.play().catch(()=>{}); 
            } 
          }; 
          document.addEventListener('touchstart', retry, {once:true, capture:true, passive:true}); 
          document.addEventListener('click',      retry, {once:true, capture:true}); 
          document.addEventListener('pointerdown',retry, {once:true, capture:true}); 
        }); 
      } 
    };

    a.addEventListener('canplay', tryPlay, {once:true});
    a.addEventListener('loadeddata', tryPlay, {once:true});
    /* ⭐ small delay to let previous video's audio session release */
    setTimeout(tryPlay, 60);
    tryPlay();
    a.addEventListener('ended', () => {
      if(music.loop && activeAudio === a){
        try{ a.currentTime = start; a.play().catch(()=>{}); }catch(e){}
      }
    });
    a.addEventListener('timeupdate', ()=>{
      const timerEl = document.getElementById('mvMusicStickerTimer');
      if(timerEl){
        const elapsed = Math.max(0, a.currentTime - start);
        const total   = Math.max(1, end - start);
        timerEl.textContent = fmtTime(elapsed) + ' / ' + fmtTime(total);
      }
      if(music.loop) return;
      if(a.currentTime >= end - 0.05 && end < (music.duration || end + 5)){
        try{ a.pause(); }catch(e){}
      }
    });
  }catch(e){}
}

function renderStoryMusicSticker(music) {
    const container = document.getElementById('mvStoryMusicSticker');
    if (!container) return;
    if (!music || !music.url) { container.style.display = 'none'; container.innerHTML = ''; return; }

    const style = music.style || 'classic';
    if (style === 'audio-only') { container.style.display = 'none'; container.innerHTML = ''; return; }

    container.style.display = 'flex';
    container.className = 'mv-music-sticker style-' + style;

    /* ⭐ FIXED position — always bottom center, no move/resize/rotate */
    container.style.left = '50%';
    container.style.bottom = '95px';
    container.style.top = 'auto';
    container.style.transform = 'translateX(-50%)';

    const txt = `${music.title} · ${music.artist}`;
    const coverHtml = music.cover ? `<img src="${esc(music.cover)}" alt="">` : `<i class="fa-solid fa-music"></i>`;
    const waveformHtml = style === 'waveform' ? `<div class="mv-sticker-waveform"><span></span><span></span><span></span><span></span><span></span><span></span><span></span></div>` : '';

    container.innerHTML = `${waveformHtml}<div class="mv-music-sticker-cover">${coverHtml}</div><div class="mv-music-sticker-text-wrap"><span class="mv-music-sticker-text">${esc(txt)}</span></div><span class="mv-music-sticker-timer" id="mvMusicStickerTimer">0:00 / 0:00</span>`;

    const timerInit = container.querySelector('#mvMusicStickerTimer');
    if(timerInit && music){
      const _s = Math.max(0, music.trimStart || 0);
      const _e = music.trimEnd || (_s + MUSIC_TRIM_DEFAULT);
      timerInit.textContent = '0:00 / ' + fmtTime(Math.max(1, _e - _s));
    }

    const textEl = container.querySelector('.mv-music-sticker-text');
    const wrapEl = container.querySelector('.mv-music-sticker-text-wrap');
    if (textEl && wrapEl && textEl.scrollWidth > wrapEl.clientWidth) {
        const clone = textEl.cloneNode(true);
        wrapEl.appendChild(clone);
        textEl.classList.add('scroll');
        clone.classList.add('scroll');
        textEl.style.paddingRight = '30px';
        clone.style.paddingRight = '30px';
    }
}

/* ============================================================
   VIEWER OPEN / CLOSE
   ============================================================ */
function openViewer(userId, startIdx){
  /* ⭐ v16.0.7: app hidden থাকলে viewer খুলবো না */
  if(document.hidden) return;
  cleanExpired();
  const groups = groupStoriesByUser();
  const group = groups.find(g=>g.userId === userId);
  if(!group || !group.items.length){ toast('No active stories'); return; }
  activeData.group = group;
  activeData.itemIdx = Math.max(0, Math.min(startIdx||0, group.items.length-1));
  viewerEl.classList.add('show');
  document.body.style.overflow = 'hidden';
  layoutViewer(); renderSidebar(); renderProgress(); renderItem();
  const item = group.items[activeData.itemIdx];
  if(item && !item.isOwn){ seenMap[item.id] = now(); saveJSON(KEYS.seen, seenMap); }
}
function layoutViewer(){ if(isPC()) viewerEl.classList.add('layout-pc'); else viewerEl.classList.remove('layout-pc'); }
window.addEventListener('resize', ()=>{ if(!viewerEl.classList.contains('show')) return; layoutViewer(); renderSidebar(); });

function closeViewer(){
  cancelProgress(); cancelVideoTrimRaf(); stopActiveMusic();
  stopLiveTimeCounter();

  /* ⭐ v16.0.6.2 — sound button + loader clear */
  const _sb2 = mvStage.querySelector('.mv-video-sound-btn'); if(_sb2) _sb2.remove();
  const _vl2 = mvStage.querySelector('.mv-video-loader');     if(_vl2) _vl2.remove();

  /* ⭐ FIX — viewer video সত্যিই kill করি */
  if(activeData.videoEl){
    const _v = activeData.videoEl;
    activeData.videoEl = null;
    try {
      _v.muted = true;
      _v.pause();
      _v.currentTime = 0;
      _v.removeAttribute('src');
      try { _v.load(); } catch(e){}
      mvUnregisterMedia(_v);
    } catch(e){}
  }
  try {
    mvStage.querySelectorAll('video, audio').forEach(el => {
      try {
        el.muted = true;
        el.pause();
        try { el.currentTime = 0; } catch(e){}
        try { el.removeAttribute('src'); } catch(e){}
      } catch(e){}
    });
  } catch(e){}

  window.mvStopAllMedia();   /* ⭐ সব audio/video জোর করে বন্ধ */
  viewerEl.classList.remove('show');
  viewerEl.classList.remove('paused');
  viewerEl.style.transform = ''; viewerEl.style.opacity = '';
  document.body.style.overflow = '';
  mvHeadMenu.classList.remove('show');
  mvReactionPop.classList.remove('show');
  mvEmojiPicker.classList.remove('show');
  mvMentionedBar.classList.remove('show');
  mvMentionedBar.innerHTML = '';
  resetReplyComposer();
  activeData.group = null; activeData.itemIdx = 0;
  activeData.menuPaused = false; activeData.reactionPaused = false;
  activeData.cleanMode = false;
  viewerEl.classList.remove('clean-mode');
  setTimeout(()=>renderStrip(), 60);
}

function renderSidebar(){
  if(!isPC()) return;
  const groups = groupStoriesByUser();
  const activeUser = activeData.group ? activeData.group.userId : null;
  mvSidebarSubtitle.textContent = `${groups.length} with active stories`;
  mvSidebarList.innerHTML = '';
  groups.forEach((g, i)=>{
    const allSeen = g.items.every(it=>seenMap[it.id]);
    const item = document.createElement('div');
    item.className = 'mv-sb-item';
    if(allSeen && !g.isOwn) item.classList.add('seen');
    if(g.userId === activeUser) item.classList.add('active');
    const verTag = g.verified ? '<i class="fa-solid fa-circle-check mv-verified"></i>' : '';
    item.innerHTML = `<div class="mv-sb-serial">${i+1}</div><div class="mv-sb-avatar"><img src="${esc(g.avatar)}" alt="">${g.active?'<span class="mv-sb-dot show"></span>':''}</div><div class="mv-sb-info"><b>${esc(g.isOwn?'Your Story':g.userName)}${verTag}</b><span>${g.items.length} ${g.items.length===1?'story':'stories'}</span></div><span class="mv-sb-count">${g.items.length}</span>`;
    item.addEventListener('click', ()=>{ if(g.userId === CURRENT_USER.id && !g.items.length) return; activeData.group = g; activeData.itemIdx = 0; renderSidebar(); renderProgress(); renderItem(); });
    mvSidebarList.appendChild(item);
  });
}

function renderProgress(){
  const g = activeData.group; if(!g) return;

  const segs = g.items.map((it, i)=>{
    const cls = i < activeData.itemIdx ? 'seen' : (i === activeData.itemIdx ? 'active' : '');
    return `<span class="mv-progress-seg ${cls}" data-idx="${i}" title="${i === activeData.itemIdx ? 'Restart' : 'Jump to story ' + (i+1)}"><span class="mv-progress-fill"></span></span>`;
  }).join('');

  mvProgress.innerHTML = `<div class="mv-progress-segs">${segs}</div>`;

  /* ⭐ Tap on a segment → jump / restart */
  mvProgress.querySelectorAll('.mv-progress-seg').forEach(seg=>{
    seg.addEventListener('click', e=>{
      e.stopPropagation();
      const idx = parseInt(seg.dataset.idx, 10);
      if(isNaN(idx)) return;

      if(idx === activeData.itemIdx){
        // same story → restart from 0
        renderItem();
      } else {
        activeData.itemIdx = idx;
        const item = g.items[idx];
        if(item && !item.isOwn){ seenMap[item.id] = now(); saveJSON(KEYS.seen, seenMap); }
        renderProgress();
        renderItem();
        renderSidebar();
      }
    });
  });
}
function cancelProgress(){ if(activeData.raf) cancelAnimationFrame(activeData.raf); activeData.raf = 0; activeData.itemStart = 0; activeData.pauseAccum = 0; activeData.paused = false; viewerEl.classList.remove('paused'); }
function cancelVideoTrimRaf(){ if(activeData.videoTrimRaf){ cancelAnimationFrame(activeData.videoTrimRaf); activeData.videoTrimRaf = null; } }
function startProgress(){
  cancelProgress();
  activeData.itemStart = performance.now();

  /* ⭐ FIX: video হলে STORY_VIDEO_MAX (90s) পর্যন্ত allow, না হলে STORY_IMAGE_DURATION */
  const g = activeData.group;
  const item = g ? g.items[activeData.itemIdx] : null;
  const isVideo = !!(item && item.type === 'video');
  const maxDuration = isVideo ? (STORY_VIDEO_MAX * 1000) : STORY_IMAGE_DURATION;
  activeData.itemDuration = Math.min(activeData.itemDuration || maxDuration, maxDuration);

  const tick = ()=>{
    if(!viewerEl.classList.contains('show')) return;
    if(activeData.paused){ activeData.raf = requestAnimationFrame(tick); return; }
    const elapsed = (performance.now() - activeData.itemStart) - activeData.pauseAccum;
    const pct = Math.min(100, (elapsed/activeData.itemDuration)*100);
    const seg = mvProgress.querySelector('.mv-progress-seg.active .mv-progress-fill');
    if(seg) seg.style.width = pct + '%';
    if(pct >= 100){ goNext(); return; }
    activeData.raf = requestAnimationFrame(tick);
  };
  activeData.raf = requestAnimationFrame(tick);
}
function pauseProgress(){
  if(!activeData.raf || activeData.paused) return;
  activeData.paused = true;
  activeData._pauseStart = performance.now();
  viewerEl.classList.add('paused');
  if(activeData.videoEl){ try{activeData.videoEl.pause();}catch(e){} }
  if(activeAudio){ try{activeAudio.pause();}catch(e){} }
}
function resumeProgress(){
  if(!activeData.paused) return;
  activeData.pauseAccum += performance.now() - activeData._pauseStart;
  activeData.paused = false;
  viewerEl.classList.remove('paused');
  if(activeData.videoEl){ activeData.videoEl.play().catch(()=>{}); }
  if(activeAudio){ activeAudio.play().catch(()=>{}); }
}

/* ⭐ renderItem() function header — এটা missing ছিল! */
function renderItem(){
  const g = activeData.group; if(!g){ closeViewer(); return; }
  const item = g.items[activeData.itemIdx]; if(!item){ closeViewer(); return; }
  cancelVideoTrimRaf();

  /* ⭐ FIX v16.0.7 — পুরোনো video BEFORE DOM clear — sound leak বন্ধ */
  if(activeData.videoEl){
  const oldV = activeData.videoEl;
  activeData.videoEl = null;
  try {
    oldV.muted = true;
    oldV.pause();
    oldV.currentTime = 0;
    oldV.removeAttribute('src');
    try { oldV.load(); } catch(e){}
    mvUnregisterMedia(oldV);
    oldV.remove();
  } catch(e){}
}
/* mvStage-এ যেসব stray video আছে সেগুলোও kill */
try {
  mvStage.querySelectorAll('video').forEach(v => {
    try {
      v.muted = true;
      v.pause();
      v.currentTime = 0;
      v.removeAttribute('src');
      try { v.load(); } catch(e){}
      mvUnregisterMedia(v);
      v.remove();
    } catch(e){}
  });
} catch(e){}

  mvHeadAvatar.src = g.avatar || '';
  let privacyHTML = '';
  if(item.isOwn){
    const p = item.privacy || 'public';
    const map = { public:{ icon:'fa-earth-americas', label:'Public' }, friends:{ icon:'fa-user-group', label:'Friends' }, only:{ icon:'fa-user-shield', label:'Only Show To' }, private:{ icon:'fa-lock', label:'Locked' } };
    const m = map[p] || map.public;
    privacyHTML = ` <span class="mv-vh-privacy ${p}"><i class="fa-solid ${m.icon}"></i>${m.label}</span>`;
  }
  mvHeadName.innerHTML = esc(g.userName) + (g.verified ? ' <i class="fa-solid fa-circle-check"></i>' : '') + privacyHTML;
  
  startLiveTimeCounter(item);

  if(item.isOwn) mvReplyBar.classList.add('hidden');
  else { mvReplyBar.classList.remove('hidden'); updateReplyButtons(); }

  const imageCount = (item.images && item.images.length) ? item.images.length : 0;
  if(!item.isOwn && imageCount > 1) mvReplyGalleryBtn.style.display = 'grid';
  else mvReplyGalleryBtn.style.display = 'none';

  const myTopReaction = (()=>{
    const d = getMyReactionData(item.id);
    let top = null, max = 0;
    Object.keys(d.counts).forEach(k=>{ if(d.counts[k] > max){ max = d.counts[k]; top = k; } });
    return top;
  })();
  if(myTopReaction){ mvReplyHeart.querySelector('i').className = 'fa-solid fa-heart'; mvReplyHeart.style.color = '#ff6bcb'; }
  else { mvReplyHeart.querySelector('i').className = 'fa-regular fa-heart'; mvReplyHeart.style.color = ''; }
  renderReactionBadges(item);

  mvStage.innerHTML = '';
  mvStage.style.background = '';

/* ⭐ Video unmuted থাকলে music play হবে না */
const isVideoWithSound = (item.type === 'video') && !item.videoMuted;
if(item.music && item.music.url && !isVideoWithSound){
  playStoryMusic(item.music);
} else {
  stopActiveMusic();
}

/* ⭐ FIX 1 — Loader আগেই create */
let _mvVideoLoader = null;
let _mvSoundBtn = null;
if(item.type === 'video' && item.url){
  const v = document.createElement('video');
  v.className = 'mv-vs-vid';
  v.src = item.url;
  mvRegisterMedia(v);   /* ⭐ FIX — global registry-তে যোগ */
  v.playsInline = true;
    v.setAttribute('playsinline','');
    v.setAttribute('webkit-playsinline','');
    v.preload = 'auto';
    v.autoplay = true;
    v.muted = !!item.videoMuted;
    v.volume = item.videoMuted ? 0 : 1.0;

    const trimStart = Number(item.videoTrimStart) || 0;
    const trimEnd = Number(item.videoTrimEnd) || null;
    const hasTrim = !!(item.videoTrimApplied && trimEnd != null && trimEnd > trimStart);

    /* ⭐ v16.0.9 — Creator-এর video transform (move/rotate/scale/size) viewer-এ apply */
    const vim = item.videoItem || null;
    const userChanged = vim && (
      (vim.x != null && Math.abs(vim.x - 50) > 0.5) ||
      (vim.y != null && Math.abs(vim.y - 50) > 0.5) ||
      (vim.rotation != null && Math.abs(vim.rotation) > 0.5) ||
      (vim.scale != null && Math.abs(vim.scale - 1) > 0.01) ||
      (vim.baseWidth != null && Math.abs(vim.baseWidth - 100) > 0.5)
    );

/* ⭐ FIX 4 — metadata-এর আগেই currentTime set করি */
if(hasTrim && trimStart > 0){
  try { v.currentTime = trimStart; } catch(e){}
}

if(userChanged){
  const wrap = document.createElement('div');
  wrap.className = 'mv-viewer-video-item';
  wrap.style.position = 'absolute';
  wrap.style.left   = (vim.x != null ? vim.x : 50) + '%';
  wrap.style.top    = (vim.y != null ? vim.y : 50) + '%';
  wrap.style.width  = (vim.baseWidth || 100) + '%';
  wrap.style.aspectRatio = vim.aspectRatio || '16 / 9';
  wrap.style.transformOrigin = 'center center';
  wrap.style.transform = `translate(-50%,-50%) rotate(${vim.rotation||0}deg) scale(${vim.scale||1})`;
  wrap.style.zIndex = '1';
  wrap.style.pointerEvents = 'none';

  /* video-কে wrapper-এর ভিতরে full-fill করতে হবে */
  v.style.width = '100%';
  v.style.height = '100%';
  v.style.objectFit = 'cover';
  v.style.maxWidth = 'none';
  v.style.maxHeight = 'none';
  v.style.display = 'block';
  v.style.background = '#000';
  v.style.borderRadius = '6px';

  wrap.appendChild(v);
  mvStage.appendChild(wrap);
} else {
  /* default full-screen fit — user কিছু change করেনি */
  mvStage.appendChild(v);
}
activeData.videoEl = v;

if(hasTrim){
  const loopCheck = () => {
    if(!activeData.videoEl || activeData.videoEl !== v) return;
    if(v.paused || v.ended) return;
    if(v.currentTime < trimStart - 0.05 || v.currentTime >= trimEnd - 0.03){
      try { v.currentTime = trimStart; } catch(e){}
    }
    activeData.videoTrimRaf = requestAnimationFrame(loopCheck);
  };
  v.addEventListener('play', () => {
    cancelVideoTrimRaf();
    if(v.currentTime < trimStart - 0.05 || v.currentTime >= trimEnd - 0.03){ try { v.currentTime = trimStart; } catch(e){} }
    activeData.videoTrimRaf = requestAnimationFrame(loopCheck);
  });
  v.addEventListener('pause', cancelVideoTrimRaf);
  v.addEventListener('ended', cancelVideoTrimRaf);
  v.addEventListener('timeupdate', () => {
    if(v.paused || v.ended) return;
    if(v.currentTime >= trimEnd - 0.03){ try { v.currentTime = trimStart; } catch(e){} }
  });
  /* ⭐ FIX 4 — Backup verify (যদি উপরের set কাজ না করে) */
  v.addEventListener('loadedmetadata', () => { 
    if(Math.abs(v.currentTime - trimStart) > 0.3){
      try { v.currentTime = trimStart; } catch(e){}
    }
  }, {once:true});
}

/* ⭐ FIX 3 — progress সাথে সাথে শুরু (metadata-এর জন্য wait না) */
const estimatedDur = hasTrim 
  ? Math.max(500, (trimEnd - trimStart) * 1000)
  : (Number(item.duration) > 0 ? Math.min(item.duration, STORY_VIDEO_MAX*1000) : 8000);
activeData.itemDuration = estimatedDur;
startProgress();

/* Metadata এলে duration adjust করি */
v.addEventListener('loadedmetadata', ()=>{
  let dur = v.duration || 0;
  if(hasTrim) dur = Math.max(0.5, trimEnd - trimStart);
  const realDur = (isFinite(dur) && dur > 0) 
    ? Math.min(dur * 1000, STORY_VIDEO_MAX * 1000) 
    : estimatedDur;
  if(Math.abs(realDur - activeData.itemDuration) > 200){
    activeData.itemDuration = realDur;
  }
});
v.addEventListener('error', ()=>{ 
  if(!activeData.itemDuration){ activeData.itemDuration = 3000; startProgress(); }
});

    /* ⭐ v16.0.6.2 — Loader যোগ (native ▶ thumbnail লুকাবে) */
    _mvVideoLoader = document.createElement('div');
    _mvVideoLoader.className = 'mv-video-loader';
    _mvVideoLoader.innerHTML = '<div class="mv-video-spinner"></div>';
    mvStage.appendChild(_mvVideoLoader);

    const revealVideo = () => {
      if(_mvVideoLoader && _mvVideoLoader.parentNode){ _mvVideoLoader.remove(); _mvVideoLoader = null; }
      v.classList.add('mv-ready');
    };
    v.addEventListener('loadeddata', revealVideo, { once:true });
    v.addEventListener('canplay',    revealVideo, { once:true });
    v.addEventListener('error', ()=>{
      if(_mvVideoLoader && _mvVideoLoader.parentNode) _mvVideoLoader.remove();
      _mvVideoLoader = null;
      v.classList.add('mv-ready');
    }, { once:true });
    setTimeout(revealVideo, 4000);

/* ⭐ v16.0.10 — Silent autoplay fallback (no "Tap for sound" button) */
const tryPlayWithSound = ()=>{
  if(item.videoMuted){
    v.muted = true; v.volume = 0;
    v.play().catch(()=>{});
    return;
  }
  v.muted = false; v.volume = 1.0;

  const p = v.play();
  if(p && p.catch){
    p.catch(()=>{
      /* Autoplay-with-sound blocked → silently mute, NO prompt button */
      v.muted = true; v.volume = 0;
      v.play().catch(()=>{});
    });
  }
};
tryPlayWithSound();
  }
  else if(item.type === 'image' && item.url){
    const img = document.createElement('img');
    img.className = 'mv-vs-img';
    img.src = item.url;
    img.draggable = false;
    mvStage.appendChild(img);
    activeData.itemDuration = Math.min(item.duration || STORY_IMAGE_DURATION, STORY_IMAGE_DURATION);
    startProgress();
  }
  else if(item.images && item.images.length){
    mvStage.style.background = '#05060d';
    item.images.forEach(im=>{
      const wrap = document.createElement('div');
      wrap.className = 'mv-viewer-image-item';
      wrap.style.left = (im.x||50) + '%'; wrap.style.top = (im.y||50) + '%';
      wrap.style.width = (im.baseWidth || 60) + '%'; wrap.style.aspectRatio = im.aspectRatio || '1 / 1';
      const rot = im.rotation || 0, sc = im.scale || 1;
      if(im.flipH || im.flipV) wrap.style.transform = `translate(-50%,-50%) rotate(${rot}deg) scale(${(im.flipH?-1:1)*(sc)}, ${(im.flipV?-1:1)*(sc)})`;
      else wrap.style.transform = `translate(-50%,-50%) rotate(${rot}deg) scale(${sc})`;
      wrap.style.zIndex = String(10 + (im.z || 1));
      const img = document.createElement('img');
      img.src = im.url; img.draggable = false;
      wrap.appendChild(img);
      mvStage.appendChild(wrap);
    });
    activeData.itemDuration = Math.min(item.duration || STORY_IMAGE_DURATION, STORY_IMAGE_DURATION);
    startProgress();
  }
  else if(item.type === 'text'){
    if(item.bg) mvStage.style.background = item.bg;
    activeData.itemDuration = item.duration || STORY_IMAGE_DURATION;
    startProgress();
  }

  const textList = item.texts && item.texts.length ? item.texts : (item.text ? [{ text:item.text, style:item.textStyle }] : []);

  textList.forEach(tx=>{
    if(!tx || !tx.text) return;
    const t = document.createElement('div');
    t.className = 'mv-viewer-text';
    const ts = tx.style || {};
    t.style.color = ts.color || '#fff';
    t.style.fontSize = (ts.fontSize || 26)+'px';
    t.style.fontFamily = ts.fontFamily || "'Space Grotesk', sans-serif";
    if(ts.italic) t.style.fontStyle = 'italic';
    if(ts.bold) t.style.fontWeight = '800';
    if(ts.effect === 'shadow') t.style.textShadow = `0 4px 18px rgba(0,0,0,.65), 0 0 22px ${ts.effectColor || '#00e5ff'}`;
    else if(ts.effect === 'glow' && ts.effectColor) t.style.textShadow = `0 0 22px ${ts.effectColor}, 0 0 40px ${ts.effectColor}`;
    else if(ts.effect === 'outline' && ts.effectColor){ t.style.WebkitTextStroke = `1.5px ${ts.effectColor}`; t.style.textShadow = '0 4px 18px rgba(0,0,0,.65)'; }
    else if(ts.effect === 'gradient'){
      const from = ts.gradientFrom || '#00e5ff'; const to = ts.gradientTo || '#a855f7';
      t.style.background = `linear-gradient(135deg, ${from}, ${to})`;
      t.style.WebkitBackgroundClip = 'text'; t.style.WebkitTextFillColor = 'transparent'; t.style.backgroundClip = 'text';
      t.style.color = 'transparent';
    }
    const xPct = (tx.x != null ? tx.x : (ts.x != null ? ts.x : 50));
    const yPct = (tx.y != null ? tx.y : (ts.y != null ? ts.y : 50));
    t.style.left = xPct + '%'; t.style.top = yPct + '%';
    const rot = tx.rotation != null ? tx.rotation : (ts.rotation || 0);
    const sc = tx.scale != null ? tx.scale : (ts.scale || 1);
    t.style.transform = `translate(-50%,-50%) rotate(${rot}deg) scale(${sc})`;
    t.innerHTML = renderTextWithMentions(tx.text, tx.mentions || item.mentions || []);
    mvStage.appendChild(t);
  });

  (item.stickers||[]).forEach(st=>{
    const s = document.createElement('div');
    s.className = 'mv-viewer-sticker';
    s.style.left = (st.x||50)+'%'; s.style.top = (st.y||50)+'%';
    const size = st.size||58; const rot = st.rotation||0; const sc = st.scale||1;
    s.style.width = size + 'px'; s.style.height = size + 'px';
    s.style.transform = `translate(-50%,-50%) rotate(${rot}deg) scale(${sc})`;
    if(st.char) s.innerHTML = `<span style="font-size:${size}px;line-height:1;display:block;">${st.char}</span>`;
    else s.innerHTML = `<img src="${esc(st.src)}" alt="">`;
    mvStage.appendChild(s);
  });

  if(item.drawing){
    const img = document.createElement('img');
    img.className = 'mv-viewer-drawing';
    img.src = item.drawing;
    mvStage.appendChild(img);
  }

  if(!item.isOwn){ seenMap[item.id] = now(); saveJSON(KEYS.seen, seenMap); }
}

function renderTextWithMentions(text, mentions){
  let html = esc(text || '');
  if(!mentions || !mentions.length) return html;

  mentions.forEach(m => {
    const marker  = '\u2063' + m.id + '\u2063';
    const escaped = marker.replace(/[.*+?^${}()|[\]\\]/g, '\\$&');
    const re      = new RegExp(escaped, 'g');

    html = html.replace(
      re,
      `<span class="mv-viewer-mention" data-mid="${esc(m.id)}" onclick="window.mvOpenMentionProfile && window.mvOpenMentionProfile('${esc(m.id)}')">${esc(m.name)}</span>`
    );
  });

  return html;
}

function goNext(){
  if(activeData.menuPaused) return;

  /* ⭐ v16.0.6.2 — sound button + loader clear */
  const _sb = mvStage.querySelector('.mv-video-sound-btn'); if(_sb) _sb.remove();
  const _vl = mvStage.querySelector('.mv-video-loader');     if(_vl) _vl.remove();

  /* ⭐ FIX 5 — next story-তে যাওয়ার আগে current video kill */
  if(activeData.videoEl){
    const _v = activeData.videoEl;
    activeData.videoEl = null;
    try {
      _v.muted = true;
      _v.pause();
      _v.currentTime = 0;
      _v.removeAttribute('src');
      try { _v.load(); } catch(e){}
      mvUnregisterMedia(_v);
    } catch(e){}
  }
  if(activeAudio){
    try { activeAudio.pause(); activeAudio.currentTime = 0; } catch(e){}
  }

  const g = activeData.group; if(!g){ closeViewer(); return; }
  if(activeData.itemIdx < g.items.length - 1){ activeData.itemIdx++; renderProgress(); renderItem(); renderSidebar(); }
  else {
    const groups = groupStoriesByUser();
    const idx = groups.findIndex(x=>x.userId === g.userId);
    const nextGroup = groups[idx+1];
    if(nextGroup){ activeData.group = nextGroup; activeData.itemIdx = 0; renderProgress(); renderItem(); renderSidebar(); }
    else closeViewer();
  }
}

function goPrev(){
  if(activeData.menuPaused) return;

  /* ⭐ v16.0.6.2 — sound button + loader clear */
  const _sb = mvStage.querySelector('.mv-video-sound-btn'); if(_sb) _sb.remove();
  const _vl = mvStage.querySelector('.mv-video-loader');     if(_vl) _vl.remove();

  /* ⭐ FIX 5 — prev story-তে যাওয়ার আগে current video kill */
  if(activeData.videoEl){
    const _v = activeData.videoEl;
    activeData.videoEl = null;
    try {
      _v.muted = true;
      _v.pause();
      _v.currentTime = 0;
      _v.removeAttribute('src');
      try { _v.load(); } catch(e){}
      mvUnregisterMedia(_v);
    } catch(e){}
  }
  if(activeAudio){
    try { activeAudio.pause(); activeAudio.currentTime = 0; } catch(e){}
  }

  const g = activeData.group; if(!g){ closeViewer(); return; }
  if(activeData.itemIdx > 0){ activeData.itemIdx--; renderProgress(); renderItem(); renderSidebar(); }
  else {
    const groups = groupStoriesByUser();
    const idx = groups.findIndex(x=>x.userId === g.userId);
    const prevGroup = groups[idx-1];
    if(prevGroup){ activeData.group = prevGroup; activeData.itemIdx = prevGroup.items.length - 1; renderProgress(); renderItem(); renderSidebar(); }
  }
}

mvNavNextZone.addEventListener('click', e=>{ e.stopPropagation(); goNext(); });
mvNavPrevZone.addEventListener('click', e=>{ e.stopPropagation(); goPrev(); });
mvNavNextZone.addEventListener('touchend', e=>{ e.stopPropagation(); e.preventDefault(); goNext(); }, {passive:false});
mvNavPrevZone.addEventListener('touchend', e=>{ e.stopPropagation(); e.preventDefault(); goPrev(); }, {passive:false});

mvHeadClose.addEventListener('click', closeViewer);

function openMoreMenu(){ buildViewerMenu(); mvHeadMenu.classList.add('show'); activeData.menuPaused = true; pauseProgress(); }
function closeMoreMenu(){ if(!mvHeadMenu.classList.contains('show')) return; mvHeadMenu.classList.remove('show'); activeData.menuPaused = false; if(!activeData.reactionPaused) resumeProgress(); }
mvHeadMore.addEventListener('click', e=>{ e.stopPropagation(); if(mvHeadMenu.classList.contains('show')) closeMoreMenu(); else openMoreMenu(); });

document.addEventListener('click', e=>{
  if(!e.target.closest('#mvHeadMenu') && !e.target.closest('#mvHeadMore')) closeMoreMenu();
  if(!e.target.closest('#mvReactionPop') && !e.target.closest('#mvReplyHeart') && mvReactionPop.classList.contains('show')){
    mvReactionPop.classList.remove('show');
    resumeFromReaction();
  }
  if(!e.target.closest('#mvEmojiPicker') && !e.target.closest('#mvReplyEmojiBtn')) mvEmojiPicker.classList.remove('show');
}, true);

let holdTimer = null, isHolding = false;
function startHold(){ isHolding = false; clearTimeout(holdTimer); holdTimer = setTimeout(()=>{ isHolding = true; pauseProgress(); }, 180); }
function endHold(){ clearTimeout(holdTimer); if(isHolding){ isHolding = false; if(!activeData.menuPaused && !activeData.reactionPaused) resumeProgress(); } }
mvStage.addEventListener('pointerdown', startHold);
mvStage.addEventListener('pointerup', endHold);
mvStage.addEventListener('pointercancel', endHold);
mvStage.addEventListener('pointerleave', endHold);

document.addEventListener('keydown', e=>{
  if(!viewerEl.classList.contains('show')) return;
  const tag = (e.target.tagName||'').toLowerCase();
  if(tag==='input'||tag==='textarea') return;
  if(e.key==='Escape'){
    if(mvEmojiPicker.classList.contains('show')){ mvEmojiPicker.classList.remove('show'); return; }
    if(mvHeadMenu.classList.contains('show')){ closeMoreMenu(); return; }
    if(mvReactionPop.classList.contains('show')){ mvReactionPop.classList.remove('show'); resumeFromReaction(); return; }
    closeViewer();
  }
  else if(e.key==='ArrowRight') goNext();
  else if(e.key==='ArrowLeft') goPrev();
  else if(e.key===' '){ e.preventDefault(); activeData.paused ? resumeProgress() : pauseProgress(); }
});

let touchStartY=0, touchStartX=0, touchDragging=false;
viewerEl.addEventListener('touchstart', e=>{
  if(!e.touches || !e.touches.length) return;
  if(e.target.closest('.mv-viewer-reply, .mv-viewer-sidebar, .mv-vh-menu')) return;
  touchStartY = e.touches[0].clientY; touchStartX = e.touches[0].clientX; touchDragging = true;
}, {passive:true});
viewerEl.addEventListener('touchmove', e=>{
  if(!touchDragging || !e.touches.length) return;
  const dy = e.touches[0].clientY - touchStartY;
  const dx = e.touches[0].clientX - touchStartX;
  if(Math.abs(dy) > Math.abs(dx) && dy > 0){
    const progress = Math.min(1, dy / window.innerHeight);
    viewerEl.style.transform = `translateY(${dy*0.55}px)`;
    viewerEl.style.opacity = String(Math.max(0.4, 1 - progress));
    pauseProgress();
  }
}, {passive:true});
viewerEl.addEventListener('touchend', e=>{
  if(!touchDragging) return;
  touchDragging = false;
  const t = e.changedTouches && e.changedTouches[0];
  if(!t){ viewerEl.style.transform=''; viewerEl.style.opacity=''; if(!activeData.menuPaused && !activeData.reactionPaused) resumeProgress(); return; }
  const dy = t.clientY - touchStartY;
  const dx = t.clientX - touchStartX;
  if(Math.abs(dy) > Math.abs(dx) && dy > 100){ closeViewer(); return; }
  viewerEl.style.transform = ''; viewerEl.style.opacity = '';
  if(!activeData.menuPaused && !activeData.reactionPaused) resumeProgress();
}, {passive:true});

function buildViewerMenu(){
  const g = activeData.group; if(!g) return;
  const item = g.items[activeData.itemIdx]; if(!item) return;
  const isOwn = !!g.isOwn;
  const isMuted = mutedUsers.includes(g.userId);
  const isNotInt = notInterested.includes(g.userId);
  const myTotal = getMyTotalReactions(item.id);

  let html = '';
  html += `<button type="button" class="mi-clean" data-act="clean"><i class="fa-solid ${activeData.cleanMode ? 'fa-eye' : 'fa-eye-slash'}"></i> ${activeData.cleanMode ? 'Show UI' : 'Clean Display'}</button>`;
  html += `<div class="mv-vh-divider"></div>`;

  if(isOwn){
    html += `<button type="button" class="mi-viewers" data-act="viewers"><i class="fa-regular fa-eye"></i> Viewers (${(item.viewers||[]).length})</button>`;
    if(item.url) html += `<button type="button" class="mi-download" data-act="download"><i class="fa-solid fa-download"></i> Download</button>`;
    html += `<div class="mv-vh-divider"></div><button type="button" class="mi-delete" data-act="delete"><i class="fa-regular fa-trash-can"></i> Delete Story</button>`;
  } else {
    if(myTotal > 0) html += `<button type="button" class="mi-undo-react" data-act="undo-react"><i class="fa-solid fa-rotate-left"></i> Clear my reactions (${myTotal})</button>`;
    if(item.url) html += `<button type="button" class="mi-download" data-act="download"><i class="fa-solid fa-download"></i> Download</button>`;
    html += `<button type="button" class="mi-notint" data-act="notint"><i class="fa-solid fa-eye-slash"></i> ${isNotInt?'Undo Not Interested':'Not Interested'}</button>`;
    html += `<button type="button" class="mi-mute" data-act="mute"><i class="fa-solid ${isMuted?'fa-volume-high':'fa-volume-xmark'}"></i> ${isMuted?'Unmute Stories':'Mute Stories'}</button>`;
    html += `<div class="mv-vh-divider"></div><button type="button" class="mi-report" data-act="report"><i class="fa-regular fa-flag"></i> Report Story</button>`;
  }
  mvHeadMenu.innerHTML = html;
  mvHeadMenu.querySelectorAll('button').forEach(b=>{
    b.addEventListener('click', e=>{ e.stopPropagation(); handleViewerAction(b.dataset.act, item); closeMoreMenu(); });
  });
}

async function handleViewerAction(act, item){
  const g = activeData.group;
  
  if(act === 'clean'){
      activeData.cleanMode = !activeData.cleanMode;
      viewerEl.classList.toggle('clean-mode', activeData.cleanMode);
      closeMoreMenu();
      return;
  }
  if(act === 'viewers'){ openViewersList(item); return; }
  if(act === 'undo-react'){ clearMyReactions(item.id); renderItem(); toast('All reactions cleared'); return; }
  if(act === 'download'){ downloadStoryItem(item); return; }
  if(act === 'delete'){
    confirmDialog({ title:'Delete this story?', message:'This story will be removed permanently.', okText:'Delete', iconClass:'fa-trash-can',
      onOk:()=>{ delete stories[item.id]; saveJSON(KEYS.stories, stories); toast('Story deleted');
        const remaining = Object.values(stories).filter(s=>s.userId === g.userId);
        if(remaining.length){ const newGroups = groupStoriesByUser(); const same = newGroups.find(x=>x.userId === g.userId); if(same){ activeData.group = same; activeData.itemIdx = Math.min(activeData.itemIdx, same.items.length-1); renderProgress(); renderItem(); renderSidebar(); return; } }
        closeViewer();
      }
    });
    return;
  }
  if(act === 'mute'){
    const id = g.userId; const idx = mutedUsers.indexOf(id);
    if(idx >= 0){ mutedUsers.splice(idx, 1); toast('User unmuted'); } else { mutedUsers.push(id); toast('User muted'); }
    saveJSON(KEYS.muted, mutedUsers); renderStrip(); renderSidebar(); return;
  }
  if(act === 'notint'){
    const id = g.userId; const idx = notInterested.indexOf(id);
    if(idx >= 0){ notInterested.splice(idx, 1); toast('Undo — will see again'); } else { notInterested.push(id); toast('Got it — will show fewer stories'); }
    saveJSON(KEYS.notInterested, notInterested); renderStrip();
    if(idx < 0){ closeViewer(); return; } return;
  }
  if(act === 'report'){
    try{
      const fakePost = document.createElement('div'); fakePost.className = 'post';
      fakePost.dataset.mediaType = item.type === 'video' ? 'video' : (item.type === 'image' ? 'image' : 'text');
      fakePost.dataset.postId = 'mv-story-'+item.id; fakePost.dataset.owner = 'other';
      fakePost._mvData = { text: item.text || '', media: item.url ? [{url:item.url, type:item.type}] : [] };
      document.body.appendChild(fakePost);
      if(typeof window.openReportFlow === 'function') window.openReportFlow(fakePost);
      else toast('Report submitted · Review within 3 days');
      setTimeout(()=>fakePost.remove(), 200);
    }catch(e){ toast('Report submitted'); }
    return;
  }
}

mvReplyEmojiBtn.addEventListener('click', e=>{ e.stopPropagation(); mvReactionPop.classList.remove('show'); resumeFromReaction(); mvEmojiPicker.classList.toggle('show'); });
mvReplyGalleryBtn.addEventListener('click', e=>{ e.stopPropagation(); const item = activeData.group ? activeData.group.items[activeData.itemIdx] : null; if(item && item.images && item.images.length) openGallery(item); });
mvReplyMedia.addEventListener('change', ()=>{
  const f = mvReplyMedia.files && mvReplyMedia.files[0]; if(!f) return;
  const isV = f.type.startsWith('video/');
  const isI = f.type.startsWith('image/') || f.name.toLowerCase().endsWith('.gif');
  if(!isV && !isI){ toast('Only image/video/GIF'); mvReplyMedia.value=''; return; }
  const url = URL.createObjectURL(f);
  activeData.replyMedia = { url, type:isV?'video':'image', name:f.name, mime:f.type };
  mvReplyThumb.innerHTML = isV ? `<video src="${url}" muted playsinline></video>` : `<img src="${url}" alt="">`;
  mvReplyName.textContent = f.name;
  mvReplyPreview.classList.add('show');
  updateReplyButtons();
});
mvReplyRemove.addEventListener('click', resetReplyComposer);
function resetReplyComposer(){
  activeData.replyMedia = null; mvReplyMedia.value = '';
  mvReplyThumb.innerHTML = ''; mvReplyName.textContent = 'Media';
  mvReplyPreview.classList.remove('show');
  mvReplyInput.value = '';
  updateReplyButtons();
}
function updateReplyButtons(){
  const has = (mvReplyInput.value||'').trim().length > 0 || !!activeData.replyMedia;
  if(has){ mvReplyHeart.classList.add('hide'); mvReplySend.classList.remove('hide'); }
  else { mvReplyHeart.classList.remove('hide'); mvReplySend.classList.add('hide'); }
}
mvReplyInput.addEventListener('input', updateReplyButtons);

mvReplyHeart.addEventListener('click', e=>{
  e.stopPropagation();
  mvEmojiPicker.classList.remove('show');
  const item = activeData.group ? activeData.group.items[activeData.itemIdx] : null;
  if(item) renderReactionBadges(item);
  const willOpen = !mvReactionPop.classList.contains('show');
  mvReactionPop.classList.toggle('show');
  if(willOpen) pauseForReaction(); else resumeFromReaction();
});

mvReactionPop.addEventListener('click', e=>{
  const btn = e.target.closest('button'); if(!btn) return;
  e.stopPropagation();
  const type = btn.dataset.rtype;
  if(!type) return;
  const item = activeData.group ? activeData.group.items[activeData.itemIdx] : null;
  if(!item) return;
  const added = addMyReaction(item.id, type); if(!added) return;
  mvReplyHeart.style.transform = 'scale(1.35)';
  setTimeout(()=>{ mvReplyHeart.style.transform = ''; }, 320);
  if(item.isOwn){
    item.viewers = item.viewers || [];
    const me = item.viewers.find(v=>v.id === 'me');
    const cnt = getMyReactionCount(item.id, type);
    if(!me){ item.viewers.push({ id:'me', name: CURRENT_USER.name, image: CURRENT_USER.image, at: now(), reaction: type, count: cnt }); }
    else { me.reaction = type; me.at = now(); me.count = cnt; }
    stories[item.id] = item; saveJSON(KEYS.stories, stories);
  }
  renderReactionBadges(item);
  const myTopReaction = (()=>{ const d = getMyReactionData(item.id); let top = null, max = 0; Object.keys(d.counts).forEach(k=>{ if(d.counts[k] > max){ max = d.counts[k]; top = k; } }); return top; })();
  if(myTopReaction){ mvReplyHeart.querySelector('i').className = 'fa-solid fa-heart'; mvReplyHeart.style.color = '#ff6bcb'; }
});

mvReactionPop.addEventListener('contextmenu', e=>{
  const btn = e.target.closest('button'); if(!btn) return;
  e.preventDefault();
  const type = btn.dataset.rtype;
  if(!type) return;
  const item = activeData.group ? activeData.group.items[activeData.itemIdx] : null;
  if(!item) return;
  if(removeOneReaction(item.id, type)){ renderReactionBadges(item); }
});

mvReplySend.addEventListener('click', sendReply);
mvReplyInput.addEventListener('keydown', e=>{ if(e.key === 'Enter'){ e.preventDefault(); sendReply(); } });
function sendReply(){
  const txt = (mvReplyInput.value||'').trim();
  const media = activeData.replyMedia;
  if(!txt && !media) return;
  const g = activeData.group; const item = g ? g.items[activeData.itemIdx] : null;
  if(item){ replies[item.id] = replies[item.id] || []; replies[item.id].push({ text: txt, media: media?{type:media.type,name:media.name}:null, at: now(), from: CURRENT_USER.name }); saveJSON(KEYS.replies, replies); }
  toast(`Message sent to ${g ? g.userName : ''}`);
  resetReplyComposer();
}

let galleryModal = null;
function openGallery(item){
  if(!item || !item.images || !item.images.length) return;
  if(!galleryModal){
    galleryModal = document.createElement('div');
    galleryModal.className = 'mv-gallery-modal';
    galleryModal.innerHTML = `<div class="mv-gallery-shell"><div class="mv-gallery-head"><h3><i class="fa-regular fa-images"></i> Story Gallery <span id="mvGalleryCount"></span></h3><button class="mv-ch-btn" id="mvGalleryClose" type="button"><i class="fa-solid fa-xmark"></i></button></div><div class="mv-gallery-body"><div class="mv-gallery-grid" id="mvGalleryGrid"></div></div></div>`;
    document.body.appendChild(galleryModal);
    galleryModal.querySelector('#mvGalleryClose').addEventListener('click', ()=>galleryModal.classList.remove('show'));
    galleryModal.addEventListener('click', e=>{ if(e.target === galleryModal) galleryModal.classList.remove('show'); });
  }
  const grid = galleryModal.querySelector('#mvGalleryGrid');
  galleryModal.querySelector('#mvGalleryCount').textContent = `(${item.images.length} images)`;
  grid.innerHTML = item.images.map((im, i)=>`<div class="mv-gallery-item" data-idx="${i}"><img src="${esc(im.url)}" alt=""><span class="mv-gallery-badge">#${i+1}</span><span class="mv-gallery-label">Image ${i+1}</span></div>`).join('');
  galleryModal.classList.add('show');
}

let viewersModal = null;
function openViewersList(item){
  if(!viewersModal){
    viewersModal = document.createElement('div');
    viewersModal.className = 'mv-viewers-modal';
    viewersModal.innerHTML = `<div class="mv-viewers-shell"><div class="mv-viewers-head"><h3>Story Insights <span id="mvViewersCount"></span></h3><button class="mv-vh-btn" id="mvViewersClose" type="button"><i class="fa-solid fa-xmark"></i></button></div><div class="mv-vw-stats"><div class="mv-vw-stat"><b id="mvStViews">0</b><span>Views</span></div><div class="mv-vw-stat"><b id="mvStReacts">0</b><span>Reactions</span></div><div class="mv-vw-stat"><b id="mvStReplies">0</b><span>Replies</span></div></div><div class="mv-viewers-list" id="mvViewersList"></div></div>`;
    document.body.appendChild(viewersModal);
    viewersModal.querySelector('#mvViewersClose').addEventListener('click', ()=>viewersModal.classList.remove('show'));
    viewersModal.addEventListener('click', e=>{ if(e.target === viewersModal) viewersModal.classList.remove('show'); });
  }
  if(item.isOwn && (!item.viewers || !item.viewers.length)) seedOwnStoryViewers(item);
  const list = viewersModal.querySelector('#mvViewersList');
  const viewers = (item.viewers || []).filter(v=>v.id !== 'me');
  const reacts = viewers.filter(v=>v.reaction).length;
  const reps = replies[item.id] ? replies[item.id].length : 0;
  viewersModal.querySelector('#mvStViews').textContent = viewers.length;
  viewersModal.querySelector('#mvStReacts').textContent = reacts;
  viewersModal.querySelector('#mvStReplies').textContent = reps;
  viewersModal.querySelector('#mvViewersCount').textContent = `(${viewers.length})`;
  if(!viewers.length){ list.innerHTML = '<div class="mv-viewers-empty"><i class="fa-regular fa-eye"></i>No views yet</div>'; }
  else { list.innerHTML = viewers.map(v=>{ const rType = v.reaction; const rMark = rType && ASSET_EMOJIS.find(e=>e.id===rType) ? `<div class="mv-vr-reaction"><img src="${esc(ASSET_EMOJIS.find(e=>e.id===rType).src)}" alt=""></div>` : ''; return `<div class="mv-viewer-row"><img src="${esc(v.image||'https://i.pravatar.cc/100?img=1')}" alt=""><div class="mv-vr-info"><b>${esc(v.name)}</b><span>${timeAgo(v.at||now())}</span></div>${rMark}</div>`; }).join(''); }
  viewersModal.classList.add('show');
}

async function downloadStoryItem(item){
  try{
    const url = item.url || (item.images && item.images[0] ? item.images[0].url : null);
    if(url){
      const fakePost = document.createElement('div'); fakePost.className = 'post';
      fakePost.dataset.mediaType = item.type === 'video' ? 'video' : 'image';
      fakePost.dataset.postId = 'story-dl-' + hashString(url);
      if(item.type === 'video'){ const shell = document.createElement('div'); shell.className = 'video-shell'; shell.dataset.videoSrc = url; const v = document.createElement('video'); v.src = url; shell.appendChild(v); fakePost.appendChild(shell); }
      else { const img = document.createElement('img'); img.className = 'post-media'; img.src = url; fakePost.appendChild(img); }
      document.body.appendChild(fakePost);
      if(typeof window.startDownload === 'function') window.startDownload(fakePost, true);
      else { const a = document.createElement('a'); a.href = url; a.download = 'mediaverse_story_' + Date.now() + (item.type === 'video' ? '.mp4' : '.jpg'); document.body.appendChild(a); a.click(); a.remove(); }
      setTimeout(()=>fakePost.remove(), 200); return;
    }
    toast('Saved');
  }catch(e){ toast('Download failed'); }
}
function hashString(str){ let h=0; for(let i=0;i<str.length;i++){h=((h<<5)-h)+str.charCodeAt(i);h|=0;} return 'k'+Math.abs(h).toString(36); }

function confirmDialog(opts){
  const el = document.createElement('div');
  el.className = 'mv-confirm-modal show';
  el.innerHTML = `<div class="mv-confirm-shell"><div class="mv-confirm-icon"><i class="fa-solid ${opts.iconClass||'fa-triangle-exclamation'}"></i></div><h3>${esc(opts.title||'Confirm')}</h3><p>${esc(opts.message||'')}</p><div class="mv-confirm-actions"><button class="mv-confirm-cancel" type="button">Cancel</button><button class="mv-confirm-ok" type="button">${esc(opts.okText||'OK')}</button></div></div>`;
  document.body.appendChild(el);
  const close = ()=>{ el.classList.remove('show'); setTimeout(()=>el.remove(), 220); };
  el.querySelector('.mv-confirm-cancel').addEventListener('click', close);
  el.addEventListener('click', e=>{ if(e.target === el) close(); });
  el.querySelector('.mv-confirm-ok').addEventListener('click', ()=>{ close(); try{ opts.onOk && opts.onOk(); }catch(e){} });
}

let fpModal = null, fpState = { selected:[] };
function openFriendPicker(initialSelected){
  fpState.selected = [...(initialSelected || [])];
  if(!fpModal){
    fpModal = document.createElement('div');
    fpModal.className = 'mv-fp-modal';
    fpModal.innerHTML = `<div class="mv-fp-shell"><div class="mv-fp-head"><h3>Only Show To</h3><button class="mv-ch-btn" id="mvFpClose" type="button"><i class="fa-solid fa-xmark"></i></button></div><div class="mv-fp-search"><i class="fa-solid fa-magnifying-glass"></i><input type="text" id="mvFpSearch" placeholder="Search friends…" autocomplete="off"></div><div class="mv-fp-list" id="mvFpList"></div><div class="mv-fp-foot"><button class="mv-fp-cancel" id="mvFpCancel" type="button">Cancel</button><button class="mv-fp-ok" id="mvFpOk" type="button">Confirm</button></div></div>`;
    document.body.appendChild(fpModal);
    fpModal.querySelector('#mvFpClose').addEventListener('click', ()=>fpModal.classList.remove('show'));
    fpModal.querySelector('#mvFpCancel').addEventListener('click', ()=>fpModal.classList.remove('show'));
    fpModal.addEventListener('click', e=>{ if(e.target === fpModal) fpModal.classList.remove('show'); });
    fpModal.querySelector('#mvFpSearch').addEventListener('input', e=>renderFpList(e.target.value));
    fpModal.querySelector('#mvFpList').addEventListener('click', e=>{
      const row = e.target.closest('.mv-fp-row'); if(!row) return;
      const id = row.dataset.fid; const f = getFriends().find(x=>x.id === id); if(!f) return;
      const idx = fpState.selected.findIndex(x=>x.id === id);
      if(idx >= 0) fpState.selected.splice(idx, 1); else fpState.selected.push(f);
      renderFpList(fpModal.querySelector('#mvFpSearch').value);
    });
    fpModal.querySelector('#mvFpOk').addEventListener('click', ()=>{
      if(!fpState.selected.length){ toast('Select at least one friend'); return; }
      fpModal.classList.remove('show');
      creatorState.privacy = 'only'; creatorState.onlyWho = fpState.selected;
      updatePrivacyChipsUI();
      toast(`Only visible to ${fpState.selected.length} friend${fpState.selected.length===1?'':'s'}`);
    });
  }
  fpModal.querySelector('#mvFpSearch').value = '';
  renderFpList('');
  fpModal.classList.add('show');
  setTimeout(()=>fpModal.querySelector('#mvFpSearch').focus(), 120);
}
function renderFpList(q){
  const list = fpModal.querySelector('#mvFpList');
  const nq = (q||'').toLowerCase().trim();
  const friends = getFriends().filter(f=>!nq || (f.name+' '+f.username).toLowerCase().includes(nq));
  if(!friends.length){ list.innerHTML = '<div style="padding:30px 15px;text-align:center;color:#7a8099;font-size:11px"><i class="fa-solid fa-user-slash" style="display:block;font-size:22px;margin-bottom:8px"></i>No friends found</div>'; return; }
  list.innerHTML = friends.map(f=>{ const sel = fpState.selected.some(x=>x.id === f.id); return `<button class="mv-fp-row ${sel?'selected':''}" type="button" data-fid="${esc(f.id)}"><img src="${esc(f.image)}" alt=""><div class="mv-fp-info"><b>${esc(f.name)}</b><span>${esc(f.username||'@user')}</span></div><span class="mv-fp-check"><i class="fa-solid fa-check"></i></span></button>`; }).join('');
}

let creatorMentionModal = null;
let creatorMentionContext = {
  txt: null,
  textEl: null,
  query: '',
  range: null,
  selected: []        
};

function openCreatorMentionPicker(query, txt, textEl) {
  creatorMentionContext.txt = txt;
  creatorMentionContext.textEl = textEl;
  creatorMentionContext.query = query || '';
  creatorMentionContext.selected = [];

  const selection = window.getSelection();
  if (selection && selection.rangeCount > 0) {
    const range = selection.getRangeAt(0).cloneRange();
    if (textEl && textEl.contains(range.commonAncestorContainer)) {
      creatorMentionContext.range = range;
    }
  }

  if (!creatorMentionModal) {
    creatorMentionModal = document.createElement('div');
    creatorMentionModal.className = 'mv-creator-mention-overlay';
    creatorMentionModal.innerHTML = `
      <div class="mv-mention-shell">
        <div class="mv-mention-head">
          <h3><i class="fa-solid fa-at"></i> Mention someone</h3>
          <button class="mv-ch-btn" id="mvCreatorMentionClose" type="button"><i class="fa-solid fa-xmark"></i></button>
        </div>
        <div class="mv-mention-search">
          <i class="fa-solid fa-magnifying-glass"></i>
          <input type="text" id="mvCreatorMentionSearch" placeholder="Search friends…" autocomplete="off">
        </div>
        <div class="mv-mention-list" id="mvCreatorMentionList"></div>
        <div class="mv-mention-foot">
          <button class="mv-mention-cancel" id="mvCreatorMentionCancel" type="button">Cancel</button>
          <button class="mv-mention-ok" id="mvCreatorMentionSave" type="button">
            <i class="fa-solid fa-check"></i> <span id="mvCreatorMentionSaveLabel">Save</span>
          </button>
        </div>
      </div>`;
    document.body.appendChild(creatorMentionModal);

    creatorMentionModal.querySelector('#mvCreatorMentionClose').addEventListener('click', closeCreatorMentionPicker);
    creatorMentionModal.querySelector('#mvCreatorMentionCancel').addEventListener('click', closeCreatorMentionPicker);
    creatorMentionModal.querySelector('#mvCreatorMentionSave').addEventListener('click', applySelectedMentions);
    creatorMentionModal.addEventListener('click', e => {
      if (e.target === creatorMentionModal) closeCreatorMentionPicker();
    });
    creatorMentionModal.querySelector('#mvCreatorMentionSearch').addEventListener('input', e => {
      creatorMentionContext.query = e.target.value || '';
      renderCreatorMentionList(creatorMentionContext.query);
    });

    const listEl = creatorMentionModal.querySelector('#mvCreatorMentionList');

    const handleToggle = (e) => {
      const row = e.target.closest('[data-mid]');
      if (!row) return;
      e.preventDefault();
      e.stopPropagation();
      toggleMentionSelection(String(row.dataset.mid));
    };

    if (window.PointerEvent) {
      listEl.addEventListener('pointerdown', handleToggle, true);
    } else {
      listEl.addEventListener('mousedown', handleToggle, true);
    }
  }

  const search = creatorMentionModal.querySelector('#mvCreatorMentionSearch');
  search.value = query || '';
  renderCreatorMentionList(query || '');
  updateMentionSaveButton();
  creatorMentionModal.classList.add('show');

  setTimeout(() => {
    try {
      search.focus();
      search.setSelectionRange(search.value.length, search.value.length);
    } catch (e) {}
  }, 80);
}

function closeCreatorMentionPicker() {
  if(creatorMentionModal) creatorMentionModal.classList.remove('show');
  creatorMentionContext.txt = null;
  creatorMentionContext.textEl = null;
  creatorMentionContext.query = '';
  creatorMentionContext.range = null;
  creatorMentionContext.selected = [];
}

function toggleMentionSelection(id) {
  const arr = creatorMentionContext.selected || (creatorMentionContext.selected = []);
  const idx = arr.findIndex(x => String(x.id) === id);
  if (idx >= 0) {
    arr.splice(idx, 1);
  } else {
    const f = getFriends().find(x => String(x.id) === id);
    if (f) arr.push(f);
  }
  renderCreatorMentionList(creatorMentionContext.query || '');
  updateMentionSaveButton();
}

function updateMentionSaveButton() {
  if (!creatorMentionModal) return;
  const btn = creatorMentionModal.querySelector('#mvCreatorMentionSave');
  const label = creatorMentionModal.querySelector('#mvCreatorMentionSaveLabel');
  if (!btn) return;
  const count = (creatorMentionContext.selected || []).length;
  if (label) label.textContent = count > 0 ? `Save (${count})` : 'Save';
  btn.disabled = count === 0;
}

function applySelectedMentions() {
  const selected = creatorMentionContext.selected || [];
  if (!selected.length) { toast('Select at least one friend'); return; }

  const txt = creatorMentionContext.txt;
  const textEl = creatorMentionContext.textEl;
  if (!txt || !textEl) { closeCreatorMentionPicker(); return; }

  let insertedCount = 0;
  selected.forEach(friend => {
    if (insertCreatorMention(friend, { deferCursor: true })) insertedCount++;
  });

  try { txt.text = serializeEditorContent(textEl); } catch (e) {}
  if (typeof updateCreatorPublish === 'function') updateCreatorPublish();

  const finalRange = creatorMentionContext.range
    ? creatorMentionContext.range.cloneRange()
    : null;

  closeCreatorMentionPicker();

  try {
    textEl.focus();
    if (finalRange) {
      const sel = window.getSelection();
      if (sel) { sel.removeAllRanges(); sel.addRange(finalRange); }
    }
  } catch (e) {}

  if (insertedCount > 0) {
    toast(`Mentioned ${insertedCount} ${insertedCount === 1 ? 'person' : 'people'}`);
  } else {
    toast('Already mentioned');
  }
}

function renderCreatorMentionList(q) {
  const query = String(q || '').trim().toLowerCase();
  const list = creatorMentionModal
    ? creatorMentionModal.querySelector('#mvCreatorMentionList')
    : document.getElementById('mvCreatorMentionList');
  if (!list) return;

  const selectedList = creatorMentionContext.selected || [];
  const selectedIds = new Set(selectedList.map(m => String(m.id)));

  const filteredFriends = getFriends().filter(friend => {
    const name = String(
      friend.name || friend.full_name || friend.display_name || friend.username || ''
    ).toLowerCase();
    const username = String(friend.username || '').toLowerCase();
    return !query || name.includes(query) || username.includes(query);
  });

  list.innerHTML = filteredFriends.map(friend => {
    const id = String(friend.id);
    const selected = selectedIds.has(id);
    const rawUsername = String(friend.username || '');
    const cleanUsername = rawUsername.replace(/^@+/, '');
    const atUsername = cleanUsername ? '@' + cleanUsername : '@user';

    return `
      <div
        class="mv-mention-row ${selected ? 'selected' : ''}"
        data-mid="${esc(id)}"
        data-user-id="${esc(id)}"
        aria-selected="${selected ? 'true' : 'false'}"
      >
        <div class="mv-mention-avatar">
          <img src="${esc(friend.image || friend.avatar_url || friend.avatar || '')}" alt="">
        </div>
        <div class="mv-mention-info">
          <div class="mv-mention-name">
            ${esc(friend.name || friend.full_name || friend.display_name || friend.username || '')}
          </div>
          <div class="mv-mention-username">${esc(atUsername)}</div>
        </div>
        <div class="mv-mention-check"><i class="fa-solid fa-check"></i></div>
      </div>
    `;
  }).join('');
}

function insertCreatorMention(friend, opts) {
  opts = opts || {};
  const txt = creatorMentionContext.txt;
  const textEl = creatorMentionContext.textEl;
  if (!txt || !textEl || !friend) return false;

  if (!Array.isArray(txt.mentions)) txt.mentions = [];

  const friendId = String(friend.id);
  const alreadyMentioned = txt.mentions.some(m => String(m.id) === friendId);
  if (alreadyMentioned) return false;

  let range = creatorMentionContext.range;
  if (!range) {
    const selection = window.getSelection();
    if (!selection || selection.rangeCount === 0) return false;
    range = selection.getRangeAt(0).cloneRange();
  }
  if (!textEl.contains(range.commonAncestorContainer)) return false;

  const rangeBeforeCursor = range.cloneRange();
  const node = rangeBeforeCursor.startContainer;
  const offset = rangeBeforeCursor.startOffset;
  let mentionStart = null;

  if (node.nodeType === Node.TEXT_NODE) {
    const text = node.textContent || '';
    const beforeCursor = text.slice(0, offset);
    const atIndex = beforeCursor.lastIndexOf('@');
    if (atIndex !== -1) {
      const charBeforeAt = atIndex > 0 ? beforeCursor.charAt(atIndex - 1) : '';
      if (!charBeforeAt || /\s/.test(charBeforeAt)) {
        mentionStart = { node, offset: atIndex };
      }
    }
  }
  if (mentionStart) {
    range.setStart(mentionStart.node, mentionStart.offset);
    range.setEnd(node, offset);
  }

  const displayName =
    friend.name || friend.display_name || friend.full_name ||
    friend.username || 'user';

const mentionSpan = document.createElement('span');
mentionSpan.className = 'mv-creator-mention';
mentionSpan.contentEditable = 'false';
mentionSpan.dataset.mid = friendId;

const nameSpan = document.createElement('span');
nameSpan.className = 'mv-mention-name';
nameSpan.textContent = displayName;

const xBtn = document.createElement('span');
xBtn.className = 'mv-mention-x';
xBtn.setAttribute('role','button');
xBtn.setAttribute('aria-label','Remove mention');
xBtn.setAttribute('title','Remove mention');
xBtn.textContent = '✕';

mentionSpan.appendChild(nameSpan);
mentionSpan.appendChild(xBtn);

const spaceNode = document.createTextNode('\u00A0');

range.deleteContents();      

  const frag = document.createDocumentFragment();
  frag.appendChild(mentionSpan);
  frag.appendChild(spaceNode);
  range.insertNode(frag);

  const newRange = document.createRange();
  newRange.setStartAfter(spaceNode);
  newRange.collapse(true);
  creatorMentionContext.range = newRange.cloneRange();

  if (!opts.deferCursor) {
    const sel = window.getSelection();
    if (sel) { sel.removeAllRanges(); sel.addRange(newRange); }
  }

  txt.mentions.push({
    id: friend.id,
    username: friend.username || null,
    display_name: friend.display_name || friend.full_name || friend.name || friend.username || null,
    name: displayName,
    image: friend.image || '',
    profileId: friend.profileId || ''
  });

  try { txt.text = serializeEditorContent(textEl); } catch (err) {}
  return true;
}

const creatorEl = (()=>{
  const el = document.createElement('div');
  el.className = 'mv-creator';
  el.innerHTML = `
    <div class="mv-creator-head">
      <button class="mv-ch-btn" id="mvCreatorClose" type="button"><i class="fa-solid fa-xmark"></i></button>
      <h3>Create Story</h3>
      <button class="mv-ch-publish" id="mvCreatorPublish" type="button" disabled>Share ✦</button>
    </div>
    <div class="mv-creator-stage">
      <div class="mv-creator-canvas-wrap" id="mvCreatorCanvas">
        <div class="mv-creator-bg" id="mvCreatorBg"></div>
        <div class="mv-creator-media-layer" id="mvCreatorMediaLayer"></div>
        <div class="mv-creator-text-layer" id="mvCreatorTextLayer"></div>
        <div class="mv-creator-draw" id="mvCreatorDraw"><canvas id="mvCreatorDrawCanvas"></canvas></div>
      </div>
    </div>
    <div class="mv-creator-tools">
      <div class="mv-creator-toolbar">
        <button class="mv-ct-tool" data-tool="text" type="button"><i class="fa-solid fa-font"></i><span>Text</span></button>
        <button class="mv-ct-tool" data-tool="photo" type="button"><i class="fa-regular fa-image"></i><span>Photo</span></button>
        <button class="mv-ct-tool" data-tool="video" type="button"><i class="fa-solid fa-video"></i><span>Video</span></button>
        <button class="mv-ct-tool" data-tool="bg" type="button"><i class="fa-solid fa-palette"></i><span>BG</span></button>
        <button class="mv-ct-tool" data-tool="sticker" type="button"><i class="fa-regular fa-face-smile"></i><span>Sticker</span></button>
        <button class="mv-ct-tool" data-tool="draw" type="button"><i class="fa-solid fa-pen-nib"></i><span>Draw</span></button>
        <button class="mv-ct-tool" data-tool="music" type="button"><i class="fa-solid fa-music"></i><span>Music</span></button>
        <button class="mv-ct-tool" data-tool="privacy" type="button"><i class="fa-solid fa-user-shield"></i><span>Privacy</span></button>
      </div>

      <div class="mv-creator-panel" id="mvPanelText">
        <button class="mv-panel-close" data-panel-close="text" type="button"><i class="fa-solid fa-xmark"></i></button>
        <div class="mv-panel-title" style="display:flex;justify-content:space-between;align-items:center;gap:8px;flex-wrap:wrap;">
          <span>Text Style</span>
          <button type="button" class="mv-panel-mention-btn" id="mvPanelMentionBtn"><i class="fa-solid fa-at"></i> Mention</button>
          <button id="mvNewTextBtn" type="button" style="padding:6px 11px;border-radius:8px;border:none;background:linear-gradient(135deg,#5de8ff,#a855f7);color:#fff;font-family:inherit;font-size:10.5px;font-weight:800;cursor:pointer;"><i class="fa-solid fa-plus" style="margin-right:4px;"></i> New Text</button>
        </div>
        <div class="mv-panel-row" id="mvFontRow" style="margin-bottom:8px;"></div>
        <div class="mv-panel-row" style="margin-bottom:8px;">
          <span class="mv-panel-label">Size</span>
          <div class="mv-size-ctrl"><button type="button" data-size="-1">−</button><input type="number" id="mvSizeInput" min="12" max="72" value="22"><button type="button" data-size="1">+</button></div>
          <div class="mv-btns"><button class="mv-toggle" type="button" data-style="bold" style="font-weight:900;">B</button><button class="mv-toggle" type="button" data-style="italic" style="font-style:italic;">I</button></div>
        </div>
        <div class="mv-panel-row" style="margin-bottom:8px;"><span class="mv-panel-label">Effect</span><div id="mvEffectRow" style="display:flex;gap:5px;flex-wrap:wrap;flex:1;"></div></div>
        <div class="mv-panel-row"><span class="mv-panel-label">Color</span><label class="mv-color-picker"><input type="color" id="mvColorPicker" value="#ffffff"></label><div class="mv-swatches" id="mvSwatches"></div></div>
      </div>

      <div class="mv-creator-panel" id="mvPanelBg"><button class="mv-panel-close" data-panel-close="bg" type="button"><i class="fa-solid fa-xmark"></i></button><div class="mv-panel-title">Background</div><div class="mv-bg-grid" id="mvBgGrid"></div></div>
      <div class="mv-creator-panel" id="mvPanelSticker"><button class="mv-panel-close" data-panel-close="sticker" type="button"><i class="fa-solid fa-xmark"></i></button><div class="mv-panel-title">Emoji Stickers</div><div class="mv-emoji-grid" id="mvEmojiGrid"></div></div>
      <div class="mv-creator-panel" id="mvPanelDraw"><button class="mv-panel-close" data-panel-close="draw" type="button"><i class="fa-solid fa-xmark"></i></button><div class="mv-panel-title">Drawing</div><div class="mv-draw-tools"><input type="color" class="mv-draw-color" id="mvDrawColor" value="#00e5ff"><input type="range" class="mv-draw-size" id="mvDrawSize" min="2" max="30" value="6"><button class="mv-draw-clear" id="mvDrawClear" type="button"><i class="fa-solid fa-eraser"></i></button></div></div>

      <div class="mv-creator-panel" id="mvPanelImage">
        <button class="mv-panel-close" data-panel-close="image" type="button"><i class="fa-solid fa-xmark"></i></button>
        <div class="mv-panel-title">Image Tools</div>
        <div class="mv-img-toolbar">
          <button class="mv-img-tool-btn" data-imgtool="crop" type="button"><i class="fa-solid fa-crop-simple"></i> Crop</button>
          <button class="mv-img-tool-btn" data-imgtool="fit" type="button"><i class="fa-solid fa-expand"></i> Fit Center</button>
          <button class="mv-img-tool-btn" data-imgtool="fill" type="button"><i class="fa-solid fa-arrows-up-down-left-right"></i> Fill</button>
          <button class="mv-img-tool-btn" data-imgtool="flip-h" type="button"><i class="fa-solid fa-left-right"></i> Flip H</button>
          <button class="mv-img-tool-btn" data-imgtool="flip-v" type="button"><i class="fa-solid fa-up-down"></i> Flip V</button>
          <button class="mv-img-tool-btn" data-imgtool="reset" type="button"><i class="fa-solid fa-rotate-left"></i> Reset</button>
          <button class="mv-img-tool-btn" data-imgtool="delete" type="button" style="background:rgba(255,95,130,.14);border-color:rgba(255,95,130,.28);color:#ff8a9a;"><i class="fa-solid fa-trash"></i> Delete</button>
        </div>
      </div>

      <div class="mv-creator-panel" id="mvPanelMusic">
        <button class="mv-panel-close" data-panel-close="music" type="button"><i class="fa-solid fa-xmark"></i></button>
        <div class="mv-panel-title">Add Music</div>
        <div class="mv-music-tabs" id="mvMusicTabs">
          <button class="mv-music-tab active" data-mtab="browse" type="button"><i class="fa-solid fa-compact-disc"></i> Browse</button>
          <button class="mv-music-tab" data-mtab="search" type="button"><i class="fa-solid fa-magnifying-glass"></i> Search</button>
          <button class="mv-music-tab" data-mtab="favs" type="button"><i class="fa-solid fa-star"></i> Favourites</button>
        </div>
        <div class="mv-music-search" id="mvMusicSearchWrap" style="display:none;"><i class="fa-solid fa-magnifying-glass"></i><input type="text" id="mvMusicSearchInput" placeholder="Search song, artist worldwide..." autocomplete="off"><button class="mv-music-search-btn" id="mvMusicSearchBtn" type="button">Search</button></div>
        <div class="mv-music-list" id="mvMusicList"></div>
        
        <div class="mv-music-trim" id="mvMusicTrim">
          <div class="mv-music-trim-head"><b><i class="fa-solid fa-compact-disc"></i> <span id="mvMusicTrimTitle">—</span></b><button type="button" id="mvMusicTrimRemove">Remove</button></div>
          
          <div class="mv-waveform-wrap" id="mvWaveformWrap">
            <canvas class="mv-waveform-canvas" id="mvWaveformCanvas"></canvas>
            <div class="mv-waveform-dim-left" id="mvWaveformDimLeft" style="left:0%;width:0%;"></div>
            <div class="mv-waveform-dim-right" id="mvWaveformDimRight" style="left:11%;width:89%;"></div>
            <div class="mv-waveform-selection" id="mvWaveformSelection" style="left:0%;width:11%;"></div>
            <div class="mv-waveform-playhead" id="mvWaveformPlayhead" style="display:none;"></div>
            <div class="mv-waveform-handle" id="mvWaveformHandleStart" style="left:0%;"></div>
            <div class="mv-waveform-handle" id="mvWaveformHandleEnd" style="left:11%;"></div>
          </div>
          
          <div class="mv-panel-row" style="margin-bottom:10px;">
            <label style="display:flex;align-items:center;gap:8px;cursor:pointer;color:#c8cee0;font-size:11.5px;font-weight:700;">
              <input type="checkbox" id="mvAudioOnlyToggle" style="width:18px;height:18px;accent-color:#5de8ff;">
              <span><i class="fa-solid fa-volume-high" style="color:#5de8ff;"></i> Audio-only (sticker invisible)</span>
            </label>
          </div>
          
          <div class="mv-panel-title" style="margin-top:6px;">Sticker Style</div>
          <div class="mv-sticker-style-row" id="mvStickerStyleRow">
            <button class="mv-sticker-style-btn active" data-style="classic" type="button">
              <div class="mv-sticker-style-preview classic"></div>
              <span class="mv-sticker-style-label">Classic</span>
            </button>
            <button class="mv-sticker-style-btn" data-style="waveform" type="button">
              <div class="mv-sticker-style-preview waveform"></div>
              <span class="mv-sticker-style-label">Waveform</span>
            </button>
            <button class="mv-sticker-style-btn" data-style="compact" type="button">
              <div class="mv-sticker-style-preview compact"></div>
              <span class="mv-sticker-style-label">Compact</span>
            </button>
            <button class="mv-sticker-style-btn" data-style="audio-only" type="button">
              <div class="mv-sticker-style-preview audio-only"></div>
              <span class="mv-sticker-style-label">Audio Only</span>
            </button>
          </div>
          
          <div class="mv-music-bottom-bar">
            <button class="mv-music-bottom-loop" id="mvMusicBottomLoop" type="button" title="Loop">
              <i class="fa-solid fa-repeat"></i>
            </button>
            <div class="mv-music-bottom-meta">
              <b id="mvMusicBottomTitle">—</b>
              <span id="mvMusicBottomArtist">—</span>
              <span class="mv-music-bottom-change">Tap to change</span>
            </div>
            <div class="mv-music-bottom-cover" id="mvMusicBottomCover">
              <i class="fa-solid fa-music"></i>
              <div class="mv-music-bottom-play visible" id="mvMusicBottomPlay"><i class="fa-solid fa-play"></i></div>
            </div>
          </div>
          
          <div class="mv-music-slider-row"><span>Start</span><input type="range" id="mvMusicStartRange" min="0" max="180" value="0" step="1"><span class="mv-music-slider-value" id="mvMusicStartLabel">0:00</span></div>
          <div class="mv-music-slider-row"><span>End</span><input type="range" id="mvMusicEndRange" min="5" max="180" value="20" step="1"><span class="mv-music-slider-value" id="mvMusicEndLabel">0:20</span></div>
          <div class="mv-music-timeline"><div class="mv-music-timeline-selected" id="mvMusicTimelineSelected" style="left:0%;width:11%;"></div><div class="mv-music-playhead" id="mvMusicPlayhead" style="left:0%"></div></div>
          <span class="mv-music-duration-badge"><i class="fa-solid fa-clock"></i> Selected: <span id="mvMusicDurationSelected">0:20</span></span>

<div class="mv-music-preview-row">
  <button class="mv-music-preview-btn" id="mvMusicPreviewBtn" type="button" title="Play / Pause">
    <i class="fa-solid fa-play"></i>
  </button>
  <div class="mv-music-preview-info">
    <span class="mv-music-preview-timer" id="mvMusicPreviewTimer">0:00 / 0:30</span>
    <div class="mv-music-preview-progress"><div class="mv-music-preview-fill" id="mvMusicPreviewBarFill"></div></div>
  </div>
</div>

<div class="mv-music-trim-actions" style="display:flex;gap:8px;margin-top:12px;">
  <button class="mv-dur-btn" id="mvMusicApplyTrimBtn" type="button" style="flex:1;padding:10px;border-radius:11px;border:1px solid rgba(53,230,154,.35);background:linear-gradient(135deg,rgba(53,230,154,.16),rgba(0,229,255,.10));color:#c8ffe2;font-family:inherit;font-size:11.5px;font-weight:800;cursor:pointer;">
    <i class="fa-solid fa-check" style="margin-right:5px;"></i>Apply Trim
  </button>
</div>
        </div>
      </div>

      <div class="mv-creator-panel" id="mvPanelPrivacy">
        <button class="mv-panel-close" data-panel-close="privacy" type="button"><i class="fa-solid fa-xmark"></i></button>
        <div class="mv-panel-title">Who can see this story?</div>
        <div class="mv-privacy-chips" id="mvPrivacyChips">
          <button class="mv-privacy-chip active" data-privacy="public" type="button"><i class="fa-solid fa-earth-americas"></i> Public</button>
          <button class="mv-privacy-chip" data-privacy="friends" type="button"><i class="fa-solid fa-user-group"></i> Friends</button>
          <button class="mv-privacy-chip" data-privacy="only" type="button"><i class="fa-solid fa-user-shield"></i> Only Show To</button>
          <button class="mv-privacy-chip" data-privacy="private" type="button"><i class="fa-solid fa-lock"></i> Locked</button>
        </div>
        <div class="mv-duration-row" id="mvDurationRow" style="display:none;">
          <span class="mv-panel-label">Duration</span>
          <div class="mv-duration-options" id="mvDurationOptions">
            <button class="mv-dur-btn" data-dur="5000" type="button">5s</button>
            <button class="mv-dur-btn" data-dur="10000" type="button">10s</button>
            <button class="mv-dur-btn" data-dur="15000" type="button">15s</button>
            <button class="mv-dur-btn active" data-dur="30000" type="button">30s</button>
          </div>
        </div>
      </div>

      <div class="mv-creator-panel" id="mvPanelVideoTrim">
        <button class="mv-panel-close" data-panel-close="videoTrim" type="button"><i class="fa-solid fa-xmark"></i></button>
        <div class="mv-panel-title">Trim Video (max 1:30)</div>
        <div class="mv-video-trim show" id="mvVideoTrim">
          <div class="mv-video-trim-head"><b><i class="fa-solid fa-video"></i> <span id="mvVideoTrimTitle">Trim your video</span></b><button type="button" id="mvVideoTrimRemove">Remove video</button></div>
          <div class="mv-video-preview"><video id="mvVideoPreviewEl" playsinline preload="metadata"></video><div class="mv-video-timer" id="mvVideoTimer"><span class="mv-vt-cur">0:00</span><span class="mv-vt-sep">/</span><span class="mv-vt-total">0:00</span></div><button class="mv-video-mute-btn" id="mvVideoMuteBtn" type="button" title="Mute / Unmute"><i class="fa-solid fa-volume-high"></i></button><button class="mv-video-play-btn" id="mvVideoPlayBtn" type="button"><i class="fa-solid fa-play"></i></button></div>
          <div class="mv-video-slider-row"><span>Start</span><input type="range" id="mvVideoStartRange" min="0" max="600" value="0" step="0.1"><span class="mv-video-slider-value" id="mvVideoStartLabel">0:00</span></div>
          <div class="mv-video-slider-row"><span>End</span><input type="range" id="mvVideoEndRange" min="1" max="600" value="90" step="0.1"><span class="mv-video-slider-value" id="mvVideoEndLabel">1:30</span></div>
          <div class="mv-video-timeline"><div class="mv-video-timeline-selected" id="mvVideoTimelineSelected" style="left:0%;width:100%;"></div></div>
          <span class="mv-video-duration-badge"><i class="fa-solid fa-clock"></i> Trimmed: <span id="mvVideoDurationSelected">1:30</span></span>
          <div class="mv-video-trim-actions"><button class="mv-video-trim-apply" id="mvVideoTrimApply" type="button"><i class="fa-solid fa-check"></i>Apply Trim</button></div>
        </div>
      </div>
    </div>
    <input type="file" id="mvCreatorMedia" accept="image/*,video/*" hidden>
  `;
  document.body.appendChild(el);
  return el;
})();

const creatorBg = creatorEl.querySelector('#mvCreatorBg');
const creatorMediaLayer = creatorEl.querySelector('#mvCreatorMediaLayer');
const creatorTextLayer = creatorEl.querySelector('#mvCreatorTextLayer');
const creatorDraw = creatorEl.querySelector('#mvCreatorDraw');
const creatorDrawCanvas = creatorEl.querySelector('#mvCreatorDrawCanvas');
const creatorPublish = creatorEl.querySelector('#mvCreatorPublish');
const creatorMedia = creatorEl.querySelector('#mvCreatorMedia');

const CREATOR_FONTS = [
  {id:'space', label:'Space', css:"'Space Grotesk', sans-serif"},{id:'inter', label:'Inter', css:"'Inter', sans-serif"},
  {id:'poppins', label:'Poppins', css:"'Poppins', sans-serif"},{id:'playfair', label:'Playfair', css:"'Playfair Display', serif"},
  {id:'oswald', label:'Oswald', css:"'Oswald', sans-serif"},{id:'bebas', label:'Bebas', css:"'Bebas Neue', sans-serif"},
  {id:'mono', label:'Mono', css:"'Roboto Mono', monospace"},{id:'dancing', label:'Dancing', css:"'Dancing Script', cursive"},
  {id:'pacifico', label:'Pacifico', css:"'Pacifico', cursive"},{id:'lobster', label:'Lobster', css:"'Lobster', cursive"},
  {id:'georgia', label:'Georgia', css:"Georgia, serif"}
];
const CREATOR_EFFECTS = [{id:'none',label:'None',icon:'fa-ban'},{id:'shadow',label:'Shadow',icon:'fa-cloud'},{id:'glow',label:'Glow',icon:'fa-sun'},{id:'outline',label:'Outline',icon:'fa-circle'},{id:'gradient',label:'Gradient',icon:'fa-rainbow'}];
const CREATOR_SWATCHES = ['#ffffff','#000000','#00e5ff','#a855f7','#ff4ecd','#35e69a','#ffd43b','#ff9f43','#ff5875','#4d7cff'];
const CREATOR_BG_LIST = [{id:'none',style:'#0a0c1a'},{id:'sunset',style:'linear-gradient(135deg,#ff6a88,#ff99ac,#ffb199)'},{id:'ocean',style:'linear-gradient(135deg,#2193b0,#6dd5ed)'},{id:'purple',style:'linear-gradient(135deg,#8e2de2,#4a00e0)'},{id:'fire',style:'linear-gradient(135deg,#f12711,#f5af19)'},{id:'aurora',style:'linear-gradient(135deg,#00e5ff,#a855f7,#ff4ecd)'},{id:'mint',style:'linear-gradient(135deg,#11998e,#38ef7d)'},{id:'night',style:'linear-gradient(135deg,#0f0c29,#302b63,#24243e)'},{id:'rose',style:'linear-gradient(135deg,#ee9ca7,#ffdde1)'},{id:'forest',style:'linear-gradient(135deg,#134e5e,#71b280)'},{id:'royal',style:'linear-gradient(135deg,#141e30,#243b55)'},{id:'candy',style:'linear-gradient(135deg,#ff9a9e,#fecfef)'}];

const creatorState = {
  type:'text', images: [], activeImageId: null, mediaUrl:null, mediaType:null,
  bg:'none', bgStyle:'#0a0c1a', texts: [], activeTextId: null, stickers: [],
  drawing:null, music:null, privacy:'public', onlyWho:[],
  imageDuration: STORY_IMAGE_DURATION, musicTab: 'browse',
  videoTrimStart: 0, videoTrimEnd: 0, videoDuration: 0, videoTrimApplied: false,
  videoMuted: false,
  videoPendingApply: false   
};

function defaultTextStyle(){ return { fontId:'space', fontFamily:"'Space Grotesk', sans-serif", fontSize:22, color:'#ffffff', bold:true, italic:false, effect:'shadow', effectColor:'#00e5ff', gradientFrom:'#00e5ff', gradientTo:'#a855f7', rotation:0, scale:1 }; }
function getActiveText(){ if(!creatorState.activeTextId) return creatorState.texts[creatorState.texts.length-1] || null; return creatorState.texts.find(t=>t.id === creatorState.activeTextId) || creatorState.texts[creatorState.texts.length-1] || null; }

/* ⭐ v16.0.6 — Music trim window: video থাকলে video duration, না হলে 30s */
function getEffectiveMusicTrimWindow(){
  if(creatorState.mediaType === 'video' && creatorState.mediaUrl && !creatorState.videoPendingApply){ 
    if(creatorState.videoTrimApplied && creatorState.videoTrimEnd > creatorState.videoTrimStart){
      return Math.max(1, Math.min(STORY_VIDEO_MAX, creatorState.videoTrimEnd - creatorState.videoTrimStart));
    }
    if(creatorState.videoDuration > 0){
      return Math.max(1, Math.min(STORY_VIDEO_MAX, creatorState.videoDuration));
    }
  }
  return MUSIC_TRIM_DEFAULT;
}

function attachTransformHandles(wrap, stateGetter, stateSetter, options){
  options = options || {};
  const onUpdate = options.onUpdate || (()=>{});
  const onDelete = options.onDelete || null;
  const getBound = options.getBound || (()=>({minX:6,maxX:94,minY:6,maxY:94}));
  const dragHandle = document.createElement('button'); dragHandle.type = 'button'; dragHandle.className = 'mv-el-drag-handle'; dragHandle.innerHTML = '<i class="fa-solid fa-up-down-left-right"></i>';
  const rotateHandle = document.createElement('button'); rotateHandle.type = 'button'; rotateHandle.className = 'mv-el-rotate-handle'; rotateHandle.innerHTML = '<i class="fa-solid fa-rotate"></i>';
  const resizeHandle = document.createElement('button'); resizeHandle.type = 'button'; resizeHandle.className = 'mv-el-resize-handle'; resizeHandle.innerHTML = '<i class="fa-solid fa-up-right-and-down-left-from-center"></i>';
  const closeHandle = document.createElement('button'); closeHandle.type = 'button'; closeHandle.className = 'mv-el-close-handle'; closeHandle.innerHTML = '<i class="fa-solid fa-xmark"></i>';
  wrap.appendChild(dragHandle); wrap.appendChild(rotateHandle); wrap.appendChild(resizeHandle); wrap.appendChild(closeHandle);
  const canvasWrap = () => creatorEl.querySelector('#mvCreatorCanvas');

  dragHandle.addEventListener('pointerdown', e=>{
    e.preventDefault(); e.stopPropagation();
    const rect = canvasWrap().getBoundingClientRect(); const s = stateGetter();
    const startX = e.clientX, startY = e.clientY, sx = s.x, sy = s.y;
    const onMove = ev=>{
      const dx = ev.clientX - startX, dy = ev.clientY - startY;
      let nx = sx + (dx/rect.width)*100, ny = sy + (dy/rect.height)*100;
      const b = getBound(); nx = Math.max(b.minX, Math.min(b.maxX, nx)); ny = Math.max(b.minY, Math.min(b.maxY, ny));
      stateSetter({ x:nx, y:ny }); onUpdate();
    };
    const onUp = ()=>{ document.removeEventListener('pointermove', onMove); document.removeEventListener('pointerup', onUp); document.removeEventListener('pointercancel', onUp); };
    document.addEventListener('pointermove', onMove); document.addEventListener('pointerup', onUp); document.addEventListener('pointercancel', onUp);
  });

  rotateHandle.addEventListener('pointerdown', e=>{
    e.preventDefault(); e.stopPropagation();
    const rect = canvasWrap().getBoundingClientRect();
    const cx = rect.left + rect.width * (stateGetter().x/100), cy = rect.top + rect.height * (stateGetter().y/100);
    const startAngle = Math.atan2(e.clientY - cy, e.clientX - cx) * 180/Math.PI;
    const startRot = stateGetter().rotation || 0;
    const onMove = ev=>{
      const ang = Math.atan2(ev.clientY - cy, ev.clientX - cx) * 180/Math.PI;
      let rot = startRot + (ang - startAngle);
      const snapped = Math.round(rot/15)*15;
      if(Math.abs(rot - snapped) < 3) rot = snapped;
      stateSetter({ rotation: rot }); onUpdate();
    };
    const onUp = ()=>{ document.removeEventListener('pointermove', onMove); document.removeEventListener('pointerup', onUp); document.removeEventListener('pointercancel', onUp); };
    document.addEventListener('pointermove', onMove); document.addEventListener('pointerup', onUp); document.addEventListener('pointercancel', onUp);
  });

  resizeHandle.addEventListener('pointerdown', e=>{
    e.preventDefault(); e.stopPropagation();
    const rect = canvasWrap().getBoundingClientRect();
    const startScale = stateGetter().scale || 1;
    const startDist = Math.hypot(e.clientX - (rect.left + rect.width/2), e.clientY - (rect.top + rect.height/2));
    const onMove = ev=>{
      const dist = Math.hypot(ev.clientX - (rect.left + rect.width/2), ev.clientY - (rect.top + rect.height/2));
      const ratio = startDist > 0 ? dist/startDist : 1;
      let scale = startScale * ratio;
      scale = Math.max(0.3, Math.min(4, scale));
      stateSetter({ scale }); onUpdate();
    };
    const onUp = ()=>{ document.removeEventListener('pointermove', onMove); document.removeEventListener('pointerup', onUp); document.removeEventListener('pointercancel', onUp); };
    document.addEventListener('pointermove', onMove); document.addEventListener('pointerup', onUp); document.addEventListener('pointercancel', onUp);
  });

  closeHandle.addEventListener('click', e=>{ e.preventDefault(); e.stopPropagation(); if(onDelete) onDelete(); else wrap.remove(); });

  let pinchData = null;
  wrap.addEventListener('touchstart', e=>{ if(e.touches.length === 2){ const [t1, t2] = e.touches; pinchData = { startDist: Math.hypot(t2.clientX-t1.clientX, t2.clientY-t1.clientY), startAngle: Math.atan2(t2.clientY-t1.clientY, t2.clientX-t1.clientX)*180/Math.PI, startScale: stateGetter().scale||1, startRot: stateGetter().rotation||0 }; } }, {passive:true});
  wrap.addEventListener('touchmove', e=>{
    if(pinchData && e.touches.length === 2){
      e.preventDefault();
      const [t1, t2] = e.touches;
      const dist = Math.hypot(t2.clientX-t1.clientX, t2.clientY-t1.clientY);
      const angle = Math.atan2(t2.clientY-t1.clientY, t2.clientX-t1.clientX)*180/Math.PI;
      let scale = Math.max(0.3, Math.min(4, pinchData.startScale * (dist/pinchData.startDist)));
      let rotation = pinchData.startRot + (angle - pinchData.startAngle);
      stateSetter({ scale, rotation }); onUpdate();
    }
  }, {passive:false});
  wrap.addEventListener('touchend', ()=>{ pinchData = null; }, {passive:true});

  wrap.addEventListener('pointerdown', ()=>{ creatorEl.querySelectorAll('.mv-el-wrap').forEach(w=>w.classList.remove('active','show-handles')); wrap.classList.add('active','show-handles'); });
}

function addTextElement(){
  const txt = { id: uid('txt'), text: '', mentions: [], style: defaultTextStyle(), x: 50, y: 50, rotation: 0, scale: 1 };
  creatorState.texts.push(txt);
  creatorState.activeTextId = txt.id;
  renderTextElement(txt);
  return txt;
}

function renderTextElement(txt){
  const wrap = document.createElement('div');
  wrap.className = 'mv-el-wrap mv-text-wrap';
  wrap.dataset.textId = txt.id;
  wrap.style.left = txt.x + '%'; wrap.style.top = txt.y + '%';
  wrap.style.transform = `translate(-50%,-50%) rotate(${txt.rotation||0}deg) scale(${txt.scale||1})`;

  const textEl = document.createElement('div');
  textEl.className = 'mv-creator-text';
  textEl.contentEditable = 'true';
  textEl.setAttribute('data-placeholder', 'Tap to add text… Type @ to mention');
  textEl.setAttribute('spellcheck', 'false');
  textEl.setAttribute('inputmode', 'text');
  textEl.setAttribute('autocapitalize', 'sentences');
  textEl.setAttribute('autocomplete', 'off');
  if(txt.text && txt.mentions && txt.mentions.length){
    textEl.innerHTML = renderTextWithMentionsForEditor(txt.text, txt.mentions);
  } else {
    textEl.textContent = txt.text || '';
  }
  wrap.appendChild(textEl);

  attachTransformHandles(wrap,
    ()=>({ x:txt.x, y:txt.y, rotation:txt.rotation||0, scale:txt.scale||1 }),
    (patch)=>{
      Object.assign(txt, patch);
      wrap.style.left = txt.x + '%'; wrap.style.top = txt.y + '%';
      wrap.style.transform = `translate(-50%,-50%) rotate(${txt.rotation||0}deg) scale(${txt.scale||1})`;
    },
    { onDelete:()=>{ const idx = creatorState.texts.findIndex(t=>t.id === txt.id); if(idx >= 0) creatorState.texts.splice(idx, 1); wrap.remove(); if(creatorState.activeTextId === txt.id){ creatorState.activeTextId = creatorState.texts.length ? creatorState.texts[creatorState.texts.length-1].id : null; } updateCreatorPublish(); } }
  );

  const focusText = (e)=>{
    if(e) e.stopPropagation();
    creatorState.activeTextId = txt.id;
    creatorEl.querySelectorAll('.mv-el-wrap').forEach(w=>{ w.classList.remove('active'); });
    wrap.classList.add('active','show-handles');
    setTimeout(()=>{ try{ textEl.focus({preventScroll:false}); const range = document.createRange(); range.selectNodeContents(textEl); range.collapse(false); const sel = window.getSelection(); sel.removeAllRanges(); sel.addRange(range); }catch(err){} }, 20);
  };
  textEl.addEventListener('click', (e)=>{ e.stopPropagation(); focusText(e); });
  textEl.addEventListener('pointerdown', (e)=>{ e.stopPropagation(); }, {passive:true});

  textEl.addEventListener('input', ()=>{
    txt.text = serializeEditorContent(textEl);
    detectMentionTrigger(textEl, txt);
    updateCreatorPublish();
  });
  textEl.addEventListener('beforeinput', (e)=>{
    if(e.inputType === 'insertText' && e.data === '@'){
      setTimeout(()=>{ detectMentionTrigger(textEl, txt); }, 5);
    }
  });

  textEl.addEventListener('keydown', e=>{ if(e.key === 'Enter' && !e.shiftKey){ e.preventDefault(); textEl.blur(); } });
  textEl.addEventListener('focus', ()=>{ wrap.classList.add('show-handles'); creatorState.activeTextId = txt.id; });


attachMentionDeletionGuard(textEl, txt);
  applyStyleToTextEl(textEl, txt.style);
  creatorTextLayer.appendChild(wrap);
  return wrap;
}

function serializeEditorContent(textEl){
  let out = '';
  const walk = (node)=>{
    if(node.nodeType === 3){
      out += node.textContent.replace(/\u200B/g, '');
    } else if(node.nodeType === 1){
      if(node.classList && node.classList.contains('mv-creator-mention') && node.dataset.mid){
        out += '\u2063' + node.dataset.mid + '\u2063';
      } else if(node.tagName === 'BR'){
        out += '\n';
      } else {
        for(const child of node.childNodes) walk(child);
      }
    }
  };
  for(const child of textEl.childNodes) walk(child);
  return out;
}

function isMentionChipNode(node) {
  return !!(node && node.nodeType === Node.ELEMENT_NODE &&
    node.classList && node.classList.contains('mv-creator-mention') &&
    node.dataset && node.dataset.mid);
}

function findAdjacentMentionChip(range, key) {
  if (!range || !range.collapsed) return null;
  const container = range.startContainer;
  const offset = range.startOffset;

  if (key === 'Backspace') {
    if (container.nodeType === Node.TEXT_NODE) {
      if (offset === 0) {
        const prev = container.previousSibling;
        if (isMentionChipNode(prev)) return prev;
      }
    } else if (container.nodeType === Node.ELEMENT_NODE) {
      const child = container.childNodes[offset - 1];
      if (isMentionChipNode(child)) return child;
      if (child && child.nodeType === Node.TEXT_NODE && child.textContent === '\u00A0') {
        const prev = child.previousSibling;
        if (isMentionChipNode(prev)) return prev;
      }
    }
  } else {
    if (container.nodeType === Node.TEXT_NODE) {
      if (offset === container.textContent.length) {
        const next = container.nextSibling;
        if (isMentionChipNode(next)) return next;
        if (next && next.nodeType === Node.TEXT_NODE && next.textContent === '\u00A0') {
          const nn = next.nextSibling;
          if (isMentionChipNode(nn)) return nn;
        }
      }
    } else if (container.nodeType === Node.ELEMENT_NODE) {
      const child = container.childNodes[offset];
      if (isMentionChipNode(child)) return child;
      if (child && child.nodeType === Node.TEXT_NODE && child.textContent === '\u00A0') {
        const nn = child.nextSibling;
        if (isMentionChipNode(nn)) return nn;
      }
    }
  }
  return null;
}

function removeMentionChip(textEl, txt, chip) {
  const mid = String(chip.dataset.mid);

  const next = chip.nextSibling;
  chip.remove();
  if (next && next.nodeType === Node.TEXT_NODE && next.textContent.startsWith('\u00A0')) {
    next.textContent = next.textContent.slice(1);
    if (!next.textContent) next.remove();
  }

  if (Array.isArray(txt.mentions)) {
    const idx = txt.mentions.findIndex(m => String(m.id) === mid);
    if (idx >= 0) txt.mentions.splice(idx, 1);
  }

  txt.text = serializeEditorContent(textEl);
  if (typeof updateCreatorPublish === 'function') updateCreatorPublish();
}

function reconcileMentions(textEl, txt) {
  if (!Array.isArray(txt.mentions) || !txt.mentions.length) return;

  const liveIds = new Set();
  textEl.querySelectorAll('.mv-creator-mention[data-mid]').forEach(c => {
    liveIds.add(String(c.dataset.mid));
  });

  const before = txt.mentions.length;
  txt.mentions = txt.mentions.filter(m => liveIds.has(String(m.id)));

  if (txt.mentions.length !== before) {
    txt.text = serializeEditorContent(textEl);
  }
}

function attachMentionDeletionGuard(textEl, txt) {

  function selectionHasMention(range) {
    if (!range || range.collapsed) return false;
    try {
      const frag = range.cloneContents();
      const tmp = document.createElement('div');
      tmp.appendChild(frag);
      return !!tmp.querySelector('.mv-creator-mention[data-mid]');
    } catch (err) { return false; }
  }

  function isTouchingMention(range) {
    if (!range) return false;
    const node = range.startContainer;

    if (node.nodeType === Node.ELEMENT_NODE) {
      if (isMentionChipNode(node)) return true;
      const child = node.childNodes[range.startOffset];
      if (isMentionChipNode(child)) return true;
      const prev = node.childNodes[range.startOffset - 1];
      if (isMentionChipNode(prev)) return true;
    }

    if (node.nodeType === Node.TEXT_NODE) {
      let p = node.parentNode;
      while (p && p !== textEl) {
        if (isMentionChipNode(p)) return true;
        p = p.parentNode;
      }
      const prev = node.previousSibling;
      const next = node.nextSibling;
      if (isMentionChipNode(prev) || isMentionChipNode(next)) return true;
    }
    return false;
  }

  function ensureCursorOutsideChip() {
    const sel = window.getSelection();
    if (!sel || sel.rangeCount === 0) return;
    const range = sel.getRangeAt(0);
    if (!range.collapsed) return;

    const node = range.startContainer;
    let chip = null;

    if (node.nodeType === Node.TEXT_NODE) {
      let p = node.parentNode;
      while (p && p !== textEl) {
        if (isMentionChipNode(p)) { chip = p; break; }
        p = p.parentNode;
      }
    } else if (node.nodeType === Node.ELEMENT_NODE && isMentionChipNode(node)) {
      chip = node;
    }

    if (chip) {
      const r = document.createRange();
      r.setStartAfter(chip);
      r.collapse(true);
      sel.removeAllRanges();
      sel.addRange(r);
    }
  }

  textEl.addEventListener('pointerdown', (e) => {
    const xBtn = e.target.closest && e.target.closest('.mv-mention-x');
    if (xBtn) {
      e.preventDefault();
      e.stopPropagation();
    }
  }, true);

  textEl.addEventListener('mousedown', (e) => {
    const xBtn = e.target.closest && e.target.closest('.mv-mention-x');
    if (xBtn) {
      e.preventDefault();
      e.stopPropagation();
    }
  }, true);

  textEl.addEventListener('click', (e) => {
    const xBtn = e.target.closest && e.target.closest('.mv-mention-x');
    if (!xBtn) return;
    e.preventDefault();
    e.stopPropagation();

    const chip = xBtn.closest('.mv-creator-mention[data-mid]');
    if (!chip) return;

    removeMentionChip(textEl, txt, chip);
  }, true);

  textEl.addEventListener('mouseover', (e) => {
    const xBtn = e.target.closest && e.target.closest('.mv-mention-x');
    if (xBtn && xBtn.parentElement) xBtn.parentElement.classList.add('mv-x-visible');
  });
  textEl.addEventListener('mouseout', (e) => {
    const xBtn = e.target.closest && e.target.closest('.mv-mention-x');
    if (xBtn && xBtn.parentElement) xBtn.parentElement.classList.remove('mv-x-visible');
  });

  textEl.addEventListener('keydown', (e) => {
    if (e.key !== 'Backspace' && e.key !== 'Delete') return;
    if (!Array.isArray(txt.mentions) || !txt.mentions.length) return;

    const sel = window.getSelection();
    if (!sel || sel.rangeCount === 0) return;
    const range = sel.getRangeAt(0);

    if (e.key === 'Delete') {
      if (selectionHasMention(range)) { e.preventDefault(); e.stopPropagation(); return; }
      if (isTouchingMention(range))   { e.preventDefault(); e.stopPropagation(); return; }
      const nextChip = findAdjacentMentionChip(range, 'Delete');
      if (nextChip)                   { e.preventDefault(); e.stopPropagation(); return; }
      return;
    }

    const chip = findAdjacentMentionChip(range, 'Backspace');
    if (!chip) return;
    e.preventDefault();
    e.stopPropagation();
    removeMentionChip(textEl, txt, chip);
  }, true);

  textEl.addEventListener('keyup', ensureCursorOutsideChip);
  textEl.addEventListener('click',  ensureCursorOutsideChip);
  textEl.addEventListener('focus',  ensureCursorOutsideChip);

  textEl.addEventListener('input', () => {
    reconcileMentions(textEl, txt);
  });

  textEl.addEventListener('paste', () => {
    setTimeout(() => reconcileMentions(textEl, txt), 0);
  });

  const observer = new MutationObserver(() => {
    textEl.querySelectorAll('.mv-creator-mention[data-mid]').forEach(chip => {
      const hasNameSpan = chip.querySelector('.mv-mention-name');
      if (!hasNameSpan) {
        const mid = chip.dataset.mid;
        const m = Array.isArray(txt.mentions) ? txt.mentions.find(x => String(x.id) === String(mid)) : null;
        if (m) {
          const name = m.name || m.display_name || m.username || 'user';
          chip.innerHTML = '';
          const ns = document.createElement('span');
          ns.className = 'mv-mention-name';
          ns.textContent = name;
          const xb = document.createElement('span');
          xb.className = 'mv-mention-x';
          xb.setAttribute('role','button');
          xb.setAttribute('aria-label','Remove mention');
          xb.textContent = '✕';
          chip.appendChild(ns);
          chip.appendChild(xb);
        }
      }
    });
  });
  observer.observe(textEl, { childList: true, subtree: true });
}


function renderTextWithMentionsForEditor(text, mentions){
  let html = esc(text || '');
  if(!mentions || !mentions.length) return html;

  mentions.forEach(m => {
    const marker  = '\u2063' + m.id + '\u2063';
    const escaped = marker.replace(/[.*+?^${}()|[\]\\]/g, '\\$&');
    const re      = new RegExp(escaped, 'g');

    const chip =
      `<span class="mv-creator-mention" contenteditable="false" data-mid="${esc(m.id)}">` +
        `<span class="mv-mention-name">${esc(m.name)}</span>` +
        `<span class="mv-mention-x" role="button" aria-label="Remove mention" title="Remove mention">✕</span>` +
      `</span>`;

    html = html.replace(re, chip);
  });

  return html;
}

let mentionDetectTimer = null;
function detectMentionTrigger(textEl, txt) {
  if (!textEl || !txt) return;

  const selection = window.getSelection();

  if (!selection || selection.rangeCount === 0) {
    return;
  }

  const range = selection.getRangeAt(0);

  if (!textEl.contains(range.commonAncestorContainer)) {
    return;
  }

  creatorMentionContext.range =
    range.cloneRange();

  const node = range.startContainer;

  if (node.nodeType !== Node.TEXT_NODE) {
    return;
  }

  const text = node.textContent || '';
  const cursorPosition = range.startOffset;

  const beforeCursor =
    text.slice(0, cursorPosition);

  const atIndex =
    beforeCursor.lastIndexOf('@');

  if (atIndex === -1) {
    return;
  }

  const charBeforeAt =
    atIndex > 0
      ? beforeCursor.charAt(atIndex - 1)
      : '';

  if (charBeforeAt && !/\s/.test(charBeforeAt)) {
    return;
  }

  const query =
    beforeCursor.slice(atIndex + 1);

  if (/\s/.test(query)) {
    return;
  }

  creatorMentionContext.txt = txt;
  creatorMentionContext.textEl = textEl;
  creatorMentionContext.query = query;

  openCreatorMentionPicker(
    query,
    txt,
    textEl
  );
}
function applyStyleToTextEl(el, ts){
  el.style.fontFamily = ts.fontFamily;
  el.style.fontSize = ts.fontSize + 'px';
  el.style.color = ts.color;
  el.style.fontWeight = ts.bold ? '900' : '400';
  el.style.fontStyle = ts.italic ? 'italic' : 'normal';
  el.style.textShadow = 'none';
  el.style.background = '';
  el.style.webkitBackgroundClip = '';
  el.style.backgroundClip = '';
  el.style.webkitTextFillColor = '';
  el.style.webkitTextStroke = '';
  if(ts.effect === 'shadow'){ el.style.textShadow = `0 4px 18px rgba(0,0,0,.65), 0 0 22px ${ts.effectColor || '#00e5ff'}`; }
  else if(ts.effect === 'glow'){ el.style.textShadow = `0 0 22px ${ts.effectColor || '#00e5ff'}, 0 0 40px ${ts.effectColor || '#00e5ff'}`; }
  else if(ts.effect === 'outline'){ el.style.webkitTextStroke = `1.5px ${ts.effectColor || '#00e5ff'}`; el.style.textShadow = '0 4px 18px rgba(0,0,0,.55)'; }
  else if(ts.effect === 'gradient'){ el.style.background = `linear-gradient(135deg, ${ts.gradientFrom || '#00e5ff'}, ${ts.gradientTo || '#a855f7'})`; el.style.webkitBackgroundClip = 'text'; el.style.backgroundClip = 'text'; el.style.webkitTextFillColor = 'transparent'; el.style.color = 'transparent'; }
  else if(ts.color) el.style.color = ts.color;
}

function applyTextStyles(){
  const active = getActiveText(); if(!active) return;
  const wrap = creatorTextLayer.querySelector(`[data-text-id="${active.id}"]`); if(!wrap) return;
  wrap.style.left = active.x + '%'; wrap.style.top = active.y + '%';
  wrap.style.transform = `translate(-50%,-50%) rotate(${active.rotation||0}deg) scale(${active.scale||1})`;
  const textEl = wrap.querySelector('.mv-creator-text');
  if(textEl) applyStyleToTextEl(textEl, active.style);
}

function renderCreatorMedia(){
  creatorMediaLayer.innerHTML = '';

  if(creatorState.mediaType === 'video' && creatorState.mediaUrl){
    const vim = creatorState.videoItem || (creatorState.videoItem = { id:'vid_'+uid('v'), x:50, y:50, scale:1, rotation:0, baseWidth:100, aspectRatio:16/9 });
    const wrap = document.createElement('div');
    wrap.className = 'mv-creator-media-item mv-el-wrap mv-video-item';
    wrap.style.left = (vim.x||50) + '%'; wrap.style.top = (vim.y||50) + '%';
    wrap.style.width = (vim.baseWidth || 100) + '%';
    wrap.style.aspectRatio = vim.aspectRatio || '16 / 9';
    wrap.style.transform = `translate(-50%,-50%) rotate(${vim.rotation||0}deg) scale(${vim.scale||1})`;

const video = document.createElement('video');
video.src = creatorState.mediaUrl;
video.muted = !!creatorState.videoMuted;
video.volume = creatorState.videoMuted ? 0 : 1.0;
video.playsInline = true; video.autoplay = true; video.draggable = false;

/* ⭐ FIX: trim apply হলে only trimmed portion loop হবে */
const _trimActive = !!(creatorState.videoTrimApplied
  && creatorState.videoTrimEnd > creatorState.videoTrimStart);
const _ts = _trimActive ? (Number(creatorState.videoTrimStart) || 0) : 0;
const _te = _trimActive ? (Number(creatorState.videoTrimEnd) || 0) : 0;

if(_trimActive){
  video.loop = false;
  const enforceTrim = () => {
    if(!video.isConnected || video.paused || video.ended){
      video._mvTrimRaf = null; return;
    }
    /* ⭐ FIX — fresh read, closure না */
    const _s = Number(creatorState.videoTrimStart) || 0;
    const _e = Number(creatorState.videoTrimEnd) || 0;
    if(_e > _s && (video.currentTime < _s - 0.05 || video.currentTime >= _e - 0.03)){
      try { video.currentTime = _s; } catch(e){}
    }
    video._mvTrimRaf = requestAnimationFrame(enforceTrim);
  };
  video.addEventListener('loadedmetadata', ()=>{
    try { video.currentTime = _ts; } catch(e){}
  }, { once:true });
  video.addEventListener('play', ()=>{
    if(video._mvTrimRaf) cancelAnimationFrame(video._mvTrimRaf);
    if(video.currentTime < _ts - 0.05 || video.currentTime >= _te - 0.03){
      try { video.currentTime = _ts; } catch(e){}
    }
    video._mvTrimRaf = requestAnimationFrame(enforceTrim);
  });
  video.addEventListener('pause', ()=>{
    if(video._mvTrimRaf){ cancelAnimationFrame(video._mvTrimRaf); video._mvTrimRaf = null; }
  });
} else {
  video.loop = true;
}

    let videoTapStart = null;
    wrap.addEventListener('pointerdown', e=>{
      if(e.target.closest('.mv-el-drag-handle, .mv-el-rotate-handle, .mv-el-resize-handle, .mv-el-close-handle')) return;
      videoTapStart = { x:e.clientX, y:e.clientY, t:Date.now() };
    }, { passive:true });
    wrap.addEventListener('pointerup', e=>{
      if(!videoTapStart) return;
      const dx = Math.abs(e.clientX - videoTapStart.x);
      const dy = Math.abs(e.clientY - videoTapStart.y);
      const dt = Date.now() - videoTapStart.t;
      videoTapStart = null;
      if(dx < 8 && dy < 8 && dt < 500){
        creatorEl.querySelectorAll('.mv-creator-media-item').forEach(item=>item.classList.remove('active','show-handles'));
        wrap.classList.add('active','show-handles');
        creatorEl.querySelectorAll('.mv-ct-tool').forEach(tool=>tool.classList.remove('active'));
        openVideoTrimPanel();
      }
    });

    wrap.appendChild(video);
    video.play().catch(()=>{
      // Keep the selected sound state. Some browsers require a user gesture
      // before audible playback; do not force-mute the canvas video.
    });

attachTransformHandles(wrap,
  ()=>({ x:vim.x, y:vim.y, rotation:vim.rotation||0, scale:vim.scale||1 }),
  (patch)=>{ Object.assign(vim, patch); wrap.style.left = vim.x + '%'; wrap.style.top = vim.y + '%'; wrap.style.transform = `translate(-50%,-50%) rotate(${vim.rotation||0}deg) scale(${vim.scale||1})`; },
  {
    /* ⭐ v16.0.8 — Video X চাপলে full reset, যেন নতুন video select করা যায় */
    onDelete: () => {
      if(creatorState.mediaUrl && creatorState.mediaUrl.startsWith('blob:')){
        try { URL.revokeObjectURL(creatorState.mediaUrl); } catch(e){}
      }
      creatorState.mediaUrl = null;
      creatorState.mediaType = null;
      creatorState.videoItem = null;
      creatorState.videoTrimStart = 0;
      creatorState.videoTrimEnd = 0;
      creatorState.videoDuration = 0;
      creatorState.videoTrimApplied = false;
      creatorState.videoMuted = false;
      creatorState.videoPendingApply = false;
      mvStopTrimLoop();
      mvStopTimerLoop();
      try { const cp = creatorEl.querySelector('#mvVideoPreviewEl'); if(cp){ cp.pause(); cp.removeAttribute('src'); cp.load(); } } catch(e){}
      wrap.remove();
      creatorMediaLayer.style.display = '';
      creatorBg.style.display = 'block';
      closePanel('videoTrim');
      creatorEl.querySelectorAll('.mv-ct-tool').forEach(t => t.classList.remove('active'));
      const muteBtn = creatorEl.querySelector('#mvVideoMuteBtn');
      if(muteBtn){ muteBtn.classList.remove('muted'); const i = muteBtn.querySelector('i'); if(i) i.className = 'fa-solid fa-volume-high'; }
      updateCreatorPublish();
      toast('Video removed ✓ — আপনি এখন নতুন video select করতে পারবেন');

      /* ⭐ BONUS — Auto-ভাবে Video picker আবার খুলে দেবে */
      setTimeout(() => {
        const vBtn = creatorEl.querySelector('.mv-ct-tool[data-tool="video"]');
        if(vBtn) vBtn.click();
      }, 250);
    }
  }
);
creatorMediaLayer.appendChild(wrap);
}

  creatorState.images.forEach(im=>{
    const wrap = document.createElement('div');
    wrap.className = 'mv-creator-media-item mv-el-wrap';
    wrap.dataset.imgId = im.id;
    if(im.id === creatorState.activeImageId) wrap.classList.add('active');
    wrap.style.left = (im.x||50) + '%'; wrap.style.top = (im.y||50) + '%';
    wrap.style.width = (im.baseWidth || 60) + '%'; wrap.style.aspectRatio = im.aspectRatio || '1 / 1';
    const rot = im.rotation || 0, sc = im.scale || 1;
    if(im.flipH || im.flipV) wrap.style.transform = `translate(-50%,-50%) rotate(${rot}deg) scale(${(im.flipH?-1:1)*(sc)}, ${(im.flipV?-1:1)*(sc)})`;
    else wrap.style.transform = `translate(-50%,-50%) rotate(${rot}deg) scale(${sc})`;
    wrap.style.zIndex = String(im.z || 1);

    const img = document.createElement('img'); img.src = im.url; img.draggable = false; wrap.appendChild(img);

    attachTransformHandles(wrap,
      ()=>({ x:im.x, y:im.y, rotation:im.rotation||0, scale:im.scale||1 }),
      (patch)=>{
        Object.assign(im, patch); wrap.style.left = im.x + '%'; wrap.style.top = im.y + '%';
        if(im.flipH || im.flipV) wrap.style.transform = `translate(-50%,-50%) rotate(${im.rotation||0}deg) scale(${(im.flipH?-1:1)*(im.scale||1)}, ${(im.flipV?-1:1)*(im.scale||1)})`;
        else wrap.style.transform = `translate(-50%,-50%) rotate(${im.rotation||0}deg) scale(${im.scale||1})`;
      },
      { onDelete:()=>{ creatorState.images = creatorState.images.filter(x=>x.id !== im.id); if(creatorState.activeImageId === im.id) creatorState.activeImageId = null; renderCreatorMedia(); updateCreatorPublish(); if(!creatorState.images.length) closePanel('image'); } }
    );

    let tapStart = null;
    wrap.addEventListener('pointerdown', e=>{ if(e.target.closest('.mv-el-drag-handle, .mv-el-rotate-handle, .mv-el-resize-handle, .mv-el-close-handle')) return; tapStart = { x:e.clientX, y:e.clientY, t:Date.now() }; }, {passive:true});
    wrap.addEventListener('pointerup', e=>{
      if(!tapStart) return;
      const dx = Math.abs(e.clientX - tapStart.x), dy = Math.abs(e.clientY - tapStart.y), dt = Date.now() - tapStart.t;
      tapStart = null;
      if(dx < 8 && dy < 8 && dt < 500){ creatorState.activeImageId = im.id; creatorEl.querySelectorAll('.mv-creator-media-item').forEach(w=>w.classList.remove('active','show-handles')); wrap.classList.add('active','show-handles'); showPanel('image'); creatorEl.querySelectorAll('.mv-ct-tool').forEach(t=>t.classList.remove('active')); }
    });
    creatorMediaLayer.appendChild(wrap);
  });
}

function resetCreator(){
  creatorState.type = 'text'; creatorState.images = []; creatorState.activeImageId = null;
  creatorState.mediaUrl = null; creatorState.mediaType = null; creatorState.videoItem = null;
  creatorState.bg = 'none'; creatorState.bgStyle = '#0a0c1a';
  creatorState.texts = []; creatorState.activeTextId = null;
  creatorState.stickers = []; creatorState.drawing = null; creatorState.music = null;
  creatorState.privacy = 'public'; creatorState.onlyWho = [];
  creatorState.imageDuration = STORY_IMAGE_DURATION; creatorState.musicTab = 'browse';
  creatorState.videoTrimStart = 0; creatorState.videoTrimEnd = 0; creatorState.videoDuration = 0;
  creatorState.videoTrimApplied = false;
  creatorState.videoMuted = false;

  creatorTextLayer.innerHTML = ''; creatorMediaLayer.innerHTML = '';
  creatorBg.style.background = creatorState.bgStyle; creatorBg.style.display = 'block';
  clearDrawing();
  creatorEl.querySelectorAll('.mv-creator-panel').forEach(p=>p.classList.remove('show'));
  creatorEl.querySelectorAll('.mv-ct-tool').forEach(t=>t.classList.remove('active'));
  updatePrivacyChipsUI();
  const durRow = creatorEl.querySelector('#mvDurationRow'); if(durRow) durRow.style.display = 'none';
  creatorEl.querySelectorAll('.mv-dur-btn').forEach(b=>b.classList.toggle('active', b.dataset.dur === '30000'));
  const trim = creatorEl.querySelector('#mvMusicTrim'); if(trim) trim.classList.remove('show');
  const searchInput = creatorEl.querySelector('#mvMusicSearchInput'); if(searchInput) searchInput.value = '';
  const searchWrap = creatorEl.querySelector('#mvMusicSearchWrap'); if(searchWrap) searchWrap.style.display = 'none';
  creatorEl.querySelectorAll('.mv-music-tab').forEach(t=>t.classList.toggle('active', t.dataset.mtab === 'browse'));
  browseResults = []; searchResults = []; stopMusicPreview(); renderMusicList('');
  
  const existingMusicSticker = creatorEl.querySelector('.mv-music-sticker-wrap');
  if (existingMusicSticker) existingMusicSticker.remove();
  const audioOnly = creatorEl.querySelector('#mvAudioOnlyToggle'); if(audioOnly) audioOnly.checked = false;
  creatorEl.querySelectorAll('.mv-sticker-style-btn').forEach(b=>b.classList.toggle('active', b.dataset.style === 'classic'));
  const loopBtn = creatorEl.querySelector('#mvMusicBottomLoop'); if(loopBtn) loopBtn.classList.remove('on');

  creatorEl.querySelectorAll('.mv-font-btn').forEach(b=>b.classList.toggle('active', b.dataset.fontId === 'space'));
  creatorEl.querySelectorAll('.mv-effect-btn').forEach(b=>b.classList.toggle('active', b.dataset.effect === 'shadow'));
  creatorEl.querySelectorAll('.mv-swatch').forEach(b=>b.classList.toggle('active', b.dataset.color === '#ffffff'));
  creatorEl.querySelector('#mvColorPicker').value = '#ffffff';
  creatorEl.querySelector('#mvSizeInput').value = '22';
  creatorEl.querySelector('.mv-toggle[data-style="bold"]')?.classList.add('active');
  creatorEl.querySelector('.mv-toggle[data-style="italic"]')?.classList.remove('active');
  const muteBtn = creatorEl.querySelector('#mvVideoMuteBtn');
  if(muteBtn){ muteBtn.classList.remove('muted'); const i = muteBtn.querySelector('i'); if(i) i.className = 'fa-solid fa-volume-high'; }
  updateCreatorPublish();
}

function updatePrivacyChipsUI(){ const chips = creatorEl.querySelector('#mvPrivacyChips'); if(!chips) return; chips.querySelectorAll('.mv-privacy-chip').forEach(c=>{ c.classList.toggle('active', c.dataset.privacy === creatorState.privacy); }); }

function updateCreatorPublish(){
  const hasText = creatorState.texts.some(t => t.text && t.text.trim().length > 0);
  const hasImages = creatorState.images.length > 0;
  const hasVideo = creatorState.mediaType === 'video' && !!creatorState.mediaUrl;
  const hasStickers = creatorState.stickers.length > 0;
  const hasDrawing = !!creatorState.drawing;
  creatorPublish.disabled = !(hasText || hasImages || hasVideo || hasStickers || hasDrawing);
}

function openCreator(){
  resetCreator();
  addTextElement();
  creatorEl.classList.add('show');
  document.body.style.overflow = 'hidden';
  setTimeout(()=>{ const firstText = creatorTextLayer.querySelector('.mv-creator-text'); if(firstText) { try{ firstText.focus(); }catch(e){} } }, 220);
  

  if(window.MVMusic && !window._mvMusicBooted){
    window._mvMusicBooted = true;
    setMusicTab('browse').catch(()=>{});
  }
}
function closeCreator(){
  mvStopAllStoryMedia();
  window.mvStopAllMedia();   /* ⭐ extra safety */
  mvStopTrimLoop();
  mvStopTimerLoop();
  creatorEl.classList.remove('show');
  document.body.style.overflow = '';
  stopMusicPreview();
  const active = creatorTextLayer.querySelector('.mv-creator-text:focus'); if(active) active.blur();
  creatorMediaLayer.querySelectorAll('video').forEach(v=>{ try{ v.pause(); }catch(e){} });
}
creatorEl.querySelector('#mvCreatorClose').addEventListener('click', closeCreator);

function showPanel(name){
  const names = ['text','bg','sticker','draw','music','privacy','videoTrim','image'];
  names.forEach(p=>{ const el = creatorEl.querySelector('#mvPanel' + p.charAt(0).toUpperCase() + p.slice(1)); if(el){ el.classList.toggle('show', p === name); } });

  /* ⭐ v16.0.9 — videoTrim panel-এ media + text/sticker layer দুটোই hidden */
  if(name === 'videoTrim'){
    creatorMediaLayer.style.display = 'none';
    creatorTextLayer.style.display = 'none';   /* ⭐ NEW */
  } else {
    creatorMediaLayer.style.display = '';
    creatorTextLayer.style.display = '';       /* ⭐ NEW */
  }

  if(name){ const el = creatorEl.querySelector('#mvPanel' + name.charAt(0).toUpperCase() + name.slice(1)); if(el) setTimeout(()=>{ try{ el.scrollIntoView({behavior:'smooth', block:'nearest'}); }catch(e){} }, 60); }
}
function closePanel(name){
  const el = creatorEl.querySelector('#mvPanel' + name.charAt(0).toUpperCase() + name.slice(1));
  if(el) el.classList.remove('show');
  /* ⭐ v16.0.8 — videoTrim panel বন্ধ হলে media layer ফিরে আসবে */
  /* ⭐ v16.0.9 — text layer + canvas video sound ফিরে আসবে */
  if(name === 'videoTrim'){
    creatorMediaLayer.style.display = '';
    creatorTextLayer.style.display = '';

    /* ⭐ Canvas video sound restore — user-এর mute preference অনুযায়ী */
    const canvasVideo = creatorMediaLayer.querySelector('video');
    if(canvasVideo){
      canvasVideo.muted  = !!creatorState.videoMuted;
      canvasVideo.volume = creatorState.videoMuted ? 0 : 1.0;
    }
  }
}
creatorEl.querySelectorAll('[data-panel-close]').forEach(btn=>{ btn.addEventListener('click', ()=>{
  const panel = btn.dataset.panelClose;
  closePanel(panel);
  if(panel === 'draw') creatorDraw.classList.remove('active');
  if(panel === 'videoTrim'){
    creatorMediaLayer.style.display = '';
    const preview = creatorEl.querySelector('#mvVideoPreviewEl');
    if(preview){ try{ preview.pause(); }catch(e){} }
    mvStopTrimLoop(); mvStopTimerLoop();
  }
}); });

creatorEl.querySelector('#mvPanelMentionBtn').addEventListener('click', e=>{
  e.stopPropagation();
  const active = getActiveText();
  if(!active){ toast('Add text first'); return; }
  const wrap = creatorTextLayer.querySelector(`[data-text-id="${active.id}"]`);
  if(!wrap){ toast('Text element missing'); return; }
  const textEl = wrap.querySelector('.mv-creator-text');
  if(!textEl) return;
  try{
    textEl.focus();
    const range = document.createRange();
    range.selectNodeContents(textEl);
    range.collapse(false);
    const sel = window.getSelection();
    sel.removeAllRanges(); sel.addRange(range);
    document.execCommand('insertText', false, '@');
  }catch(err){}
  setTimeout(()=>{ openCreatorMentionPicker('', active, textEl); }, 30);
});

creatorEl.querySelector('.mv-creator-toolbar').addEventListener('click', e=>{
  const btn = e.target.closest('.mv-ct-tool'); if(!btn) return;
  const tool = btn.dataset.tool;
  if(btn.classList.contains('active') && tool !== 'text'){
    btn.classList.remove('active');
    const map = {bg:'bg', sticker:'sticker', draw:'draw', music:'music', privacy:'privacy'};
    if(map[tool]) closePanel(map[tool]);
    if(tool === 'draw') creatorDraw.classList.remove('active');
    return;
  }
  creatorEl.querySelectorAll('.mv-ct-tool').forEach(t=>t.classList.remove('active'));
  btn.classList.add('active');
  if(tool === 'text'){
    if(!creatorState.texts.length) addTextElement();
    showPanel('text');
    setTimeout(()=>{ const active = getActiveText(); let el = null; if(active) el = creatorTextLayer.querySelector(`[data-text-id="${active.id}"] .mv-creator-text`); if(!el) el = creatorTextLayer.querySelector('.mv-creator-text'); if(el) el.focus(); }, 100);
  }
  else if(tool === 'photo'){
    if(creatorState.mediaType === 'video'){ toast('Remove video first — cannot add photos'); btn.classList.remove('active'); return; }
    creatorMedia.accept = 'image/*,.gif'; creatorMedia.dataset.tool = 'photo'; creatorMedia.click();
    setTimeout(()=>btn.classList.remove('active'), 400);
  }
  else if(tool === 'video'){
    if(creatorState.mediaType === 'video'){ toast('Only 1 video allowed'); btn.classList.remove('active'); return; }
    if(creatorState.images.length > 0){ toast('Remove photos first'); btn.classList.remove('active'); return; }
    creatorMedia.accept = 'video/*'; creatorMedia.dataset.tool = 'video'; creatorMedia.click();
    setTimeout(()=>btn.classList.remove('active'), 400);
  }
  else if(tool === 'bg'){ showPanel('bg'); }
  else if(tool === 'sticker'){ showPanel('sticker'); }
  else if(tool === 'draw'){ showPanel('draw'); creatorDraw.classList.add('active'); setTimeout(fitDrawCanvas, 60); }
  else if(tool === 'music'){ showPanel('music'); setMusicTab(creatorState.musicTab); }
  else if(tool === 'privacy'){ showPanel('privacy'); }
});

creatorEl.querySelector('#mvNewTextBtn').addEventListener('click', e=>{
  e.stopPropagation();
  const txt = addTextElement();
  setTimeout(()=>{ const wrap = creatorTextLayer.querySelector(`[data-text-id="${txt.id}"]`); if(wrap){ const el = wrap.querySelector('.mv-creator-text'); if(el){ try{ el.focus(); const range = document.createRange(); range.selectNodeContents(el); range.collapse(false); const sel = window.getSelection(); sel.removeAllRanges(); sel.addRange(range); }catch(err){} } } }, 60);
  toast('New text added');
});

creatorMedia.addEventListener('change', ()=>{
  const files = creatorMedia.files ? [...creatorMedia.files] : []; if(!files.length) return;
  const tool = creatorMedia.dataset.tool || 'photo';

  if(tool === 'video'){
    if(creatorState.mediaType === 'video'){ toast('Only 1 video per story'); creatorMedia.value=''; return; }
    if(creatorState.images.length > 0){ toast('Remove photos first'); creatorMedia.value=''; return; }
    const f = files[0];
    if(!f.type.startsWith('video/')){ toast('Only video'); creatorMedia.value=''; return; }
    if(f.size > 100*1024*1024){ toast('Video ≤ 100MB'); creatorMedia.value=''; return; }
    const probe = document.createElement('video'); probe.preload = 'metadata'; probe.muted = true;
    probe.onloadedmetadata = ()=>{
      if(probe.duration > STORY_VIDEO_FILE_LIMIT){ toast(`Video too long (max ${Math.floor(STORY_VIDEO_FILE_LIMIT/60)} min)`); creatorMedia.value=''; return; }
      creatorState.mediaUrl = URL.createObjectURL(f); creatorState.mediaType = 'video'; creatorState.type = 'video';
      creatorState.videoDuration = probe.duration;
      creatorState.videoTrimStart = 0;
      creatorState.videoTrimEnd = Math.min(STORY_VIDEO_MAX, probe.duration);
      creatorState.videoTrimApplied = probe.duration <= STORY_VIDEO_MAX;
      creatorState.videoMuted = false;
creatorState.videoPendingApply = true;   
      const ar = (probe.videoWidth||16) / (probe.videoHeight||9);
      creatorState.videoItem = { id:'vid_'+uid('v'), x:50, y:50, scale:1, rotation:0, baseWidth:100, aspectRatio: ar };
      creatorBg.style.display = 'none';
      renderCreatorMedia(); openVideoTrimPanel(); updateCreatorPublish();
      toast(creatorState.videoTrimApplied ? 'Video ready ✓' : 'Video added — trim to 1:30');
    };
probe.onerror = ()=>{ toast('Could not read video'); };
probe.src = URL.createObjectURL(f);
/* ⭐ v16.0.8 — same file আবার select করা যাবে */
creatorMedia.value = '';
return;
  }

  if(creatorState.mediaType === 'video'){ toast('Cannot mix photos with video'); creatorMedia.value=''; return; }
  let added = 0;
  files.forEach(f=>{
    if(!f.type.startsWith('image/') && !f.name.toLowerCase().endsWith('.gif')) return;
    if(f.size > 20*1024*1024){ toast('Image ≤ 20MB'); return; }
    if(creatorState.images.length >= 6){ toast('Max 6 images'); return; }
    const url = URL.createObjectURL(f);
    const img = new Image();
    img.onload = ()=>{
      const ar = img.naturalWidth / img.naturalHeight;
      const im = { id: uid('img'), url, originalUrl: url, x: 50, y: 50, scale: 1, rotation: 0, baseWidth: 60, aspectRatio: ar, z: creatorState.images.length + 1, flipH: false, flipV: false, crop: null };
      creatorState.images.push(im); creatorState.activeImageId = im.id;
      creatorState.type = 'image'; creatorBg.style.display = 'none';
      renderCreatorMedia(); updateCreatorPublish(); added++;
    };
    img.src = url;
  });
  creatorMedia.value = '';
  if(added){ toast(`${added} image${added>1?'s':''} added`); showPanel('image'); }
});

creatorEl.querySelector('#mvPanelImage').addEventListener('click', e=>{
  const btn = e.target.closest('[data-imgtool]'); if(!btn) return;
  const im = creatorState.images.find(x=>x.id === creatorState.activeImageId);
  if(!im){ toast('Select an image first'); return; }
  const action = btn.dataset.imgtool;
  if(action === 'crop'){ openCropOverlay(im); return; }
  if(action === 'fit'){ im.x = 50; im.y = 50; im.scale = 1; im.rotation = 0; const ar = im.aspectRatio || 1; if(ar > 1){ im.baseWidth = 80; } else { im.baseWidth = Math.max(35, 80 * ar); } renderCreatorMedia(); toast('Fit centered ✓'); return; }
  if(action === 'fill'){ im.x = 50; im.y = 50; im.baseWidth = 100; renderCreatorMedia(); toast('Fill applied'); return; }
  if(action === 'flip-h'){ im.flipH = !im.flipH; renderCreatorMedia(); return; }
  if(action === 'flip-v'){ im.flipV = !im.flipV; renderCreatorMedia(); return; }
  if(action === 'reset'){ im.scale = 1; im.rotation = 0; im.baseWidth = 60; im.x = 50; im.y = 50; im.flipH = false; im.flipV = false; im.crop = null; im.url = im.originalUrl || im.url; renderCreatorMedia(); toast('Reset ✓'); return; }
  if(action === 'delete'){ creatorState.images = creatorState.images.filter(x=>x.id !== im.id); creatorState.activeImageId = null; renderCreatorMedia(); updateCreatorPublish(); closePanel('image'); toast('Image deleted'); return; }
});

let cropState = null;
function openCropOverlay(im){
  const existing = creatorEl.querySelector('.mv-crop-overlay'); if(existing) existing.remove();
  const canvasWrap = creatorEl.querySelector('#mvCreatorCanvas');
  const rect = canvasWrap.getBoundingClientRect();
  const imgWrap = creatorMediaLayer.querySelector(`[data-img-id="${im.id}"]`) || creatorMediaLayer.querySelector('.mv-el-wrap.active');
  let imgBox = { x: rect.width * 0.1, y: rect.height * 0.15, w: rect.width * 0.8, h: rect.height * 0.7 };
  if(imgWrap){ const r = imgWrap.getBoundingClientRect(); imgBox = { x: r.left - rect.left, y: r.top - rect.top, w: r.width, h: r.height }; }

  const overlay = document.createElement('div');
  overlay.className = 'mv-crop-overlay show';
  overlay.innerHTML = `<div class="mv-crop-box" style="left:${imgBox.x}px;top:${imgBox.y}px;width:${imgBox.w}px;height:${imgBox.h}px;"><div class="mv-crop-grid-line h" style="top:33.33%"></div><div class="mv-crop-grid-line h" style="top:66.66%"></div><div class="mv-crop-grid-line v" style="left:33.33%"></div><div class="mv-crop-grid-line v" style="left:66.66%"></div><div class="mv-crop-handle tl" data-handle="tl"></div><div class="mv-crop-handle tr" data-handle="tr"></div><div class="mv-crop-handle bl" data-handle="bl"></div><div class="mv-crop-handle br" data-handle="br"></div><div class="mv-crop-actions"><button class="mv-crop-cancel" type="button">Cancel</button><button class="mv-crop-apply" type="button">Apply Crop</button></div></div>`;
  canvasWrap.appendChild(overlay);

  const cropBox = overlay.querySelector('.mv-crop-box');
  cropState = { im, overlay, cropBox, canvasRect: rect, imgBox: { ...imgBox }, box: { ...imgBox } };

  const clampBox = (b)=>{ let { x, y, w, h } = b; w = Math.max(40, w); h = Math.max(40, h); x = Math.max(imgBox.x, Math.min(imgBox.x + imgBox.w - w, x)); y = Math.max(imgBox.y, Math.min(imgBox.y + imgBox.h - h, y)); if(x < imgBox.x) x = imgBox.x; if(y < imgBox.y) y = imgBox.y; if(x + w > imgBox.x + imgBox.w) w = imgBox.x + imgBox.w - x; if(y + h > imgBox.y + imgBox.h) h = imgBox.y + imgBox.h - y; return { x, y, w, h }; };

  cropBox.addEventListener('pointerdown', e=>{
    if(e.target.closest('.mv-crop-handle') || e.target.closest('.mv-crop-actions')) return;
    e.preventDefault(); e.stopPropagation();
    const startX = e.clientX, startY = e.clientY, sx = cropState.box.x, sy = cropState.box.y;
    const onMove = ev=>{ const dx = ev.clientX - startX, dy = ev.clientY - startY; const b = clampBox({ x: sx + dx, y: sy + dy, w: cropState.box.w, h: cropState.box.h }); cropState.box = b; cropBox.style.left = b.x + 'px'; cropBox.style.top = b.y + 'px'; };
    const onUp = ()=>{ document.removeEventListener('pointermove', onMove); document.removeEventListener('pointerup', onUp); };
    document.addEventListener('pointermove', onMove); document.addEventListener('pointerup', onUp);
  });

  overlay.querySelectorAll('.mv-crop-handle').forEach(h=>{
    h.addEventListener('pointerdown', e=>{
      e.preventDefault(); e.stopPropagation();
      const handle = h.dataset.handle; const startX = e.clientX, startY = e.clientY; const startBox = { ...cropState.box };
      const onMove = ev=>{ const dx = ev.clientX - startX, dy = ev.clientY - startY; let { x, y, w, h } = startBox;
        if(handle.includes('l')){ const nw = Math.max(40, w - dx); const nx = x + (w - nw); w = nw; x = nx; }
        if(handle.includes('r')){ w = Math.max(40, w + dx); }
        if(handle.includes('t')){ const nh = Math.max(40, h - dy); const ny = y + (h - nh); h = nh; y = ny; }
        if(handle.includes('b')){ h = Math.max(40, h + dy); }
        const b = clampBox({ x, y, w, h }); cropState.box = b; cropBox.style.left = b.x + 'px'; cropBox.style.top = b.y + 'px'; cropBox.style.width = b.w + 'px'; cropBox.style.height = b.h + 'px';
      };
      const onUp = ()=>{ document.removeEventListener('pointermove', onMove); document.removeEventListener('pointerup', onUp); };
      document.addEventListener('pointermove', onMove); document.addEventListener('pointerup', onUp);
    });
  });

  overlay.querySelector('.mv-crop-cancel').addEventListener('click', ()=>{ overlay.remove(); cropState = null; });
  overlay.querySelector('.mv-crop-apply').addEventListener('click', async ()=>{ await applyCropToImage(im, cropState.imgBox, cropState.box); overlay.remove(); cropState = null; });
}

async function applyCropToImage(im, imgBox, cropBox){
  const srcUrl = im.originalUrl || im.url;
  const img = await new Promise((res, rej)=>{ const i = new Image(); if(/^https?:/i.test(srcUrl)) i.crossOrigin = 'anonymous'; i.onload = ()=>res(i); i.onerror = ()=>rej(new Error('load failed')); i.src = srcUrl; }).catch(()=>null);
  if(!img){ toast('Crop failed'); return; }
  if(!img.naturalWidth || !img.naturalHeight){ toast('Crop failed'); return; }
  const cx = Math.max(0, Math.min(1, (cropBox.x - imgBox.x) / imgBox.w));
  const cy = Math.max(0, Math.min(1, (cropBox.y - imgBox.y) / imgBox.h));
  const cw = Math.max(0, Math.min(1 - cx, cropBox.w / imgBox.w));
  const ch = Math.max(0, Math.min(1 - cy, cropBox.h / imgBox.h));
  if(cw <= 0 || ch <= 0){ toast('Invalid crop area'); return; }
  let sw = Math.round(cw * img.naturalWidth), sh = Math.round(ch * img.naturalHeight);
  let sx = Math.round(cx * img.naturalWidth), sy = Math.round(cy * img.naturalHeight);
  sw = Math.max(20, Math.min(img.naturalWidth - sx, sw)); sh = Math.max(20, Math.min(img.naturalHeight - sy, sh));
  const canvas = document.createElement('canvas'); canvas.width = sw; canvas.height = sh;
  const ctx = canvas.getContext('2d'); ctx.fillStyle = '#0a0c1a'; ctx.fillRect(0, 0, sw, sh);
  try{ ctx.drawImage(img, sx, sy, sw, sh, 0, 0, sw, sh); }catch(e){ toast('Crop failed'); return; }
  let cropped; try{ cropped = canvas.toDataURL('image/jpeg', 0.92); }catch(e){ toast('Crop failed'); return; }
  if(!cropped || cropped.length < 100){ toast('Crop failed'); return; }
  im.url = cropped; im.crop = { cx, cy, cw, ch }; im.aspectRatio = sw / sh;
  im.baseWidth = Math.max(30, Math.min(100, 60 * (cropBox.w / imgBox.w))); im.x = 50; im.y = 50;
  renderCreatorMedia(); toast('Crop applied ✓');
}

/* ═══════════════════════════════════════════════════════════
   VIDEO TRIM v16.0.6 FINAL
   ✓ Start slider → instant seek + auto play
   ✓ End slider → start auto = end − 90 (music-like)
   ✓ No duplicate handlers
   ✓ Mute button
   ✓ Timer fresh-read (always live)
   ✓ Apply → panel close → back to canvas
   ═══════════════════════════════════════════════════════════ */

let mvTrimLoopRaf = null;
let mvTrimTimerRaf = null;

function mvUpdateVideoTimer(){
  const preview = creatorEl.querySelector('#mvVideoPreviewEl');
  const timer = creatorEl.querySelector('#mvVideoTimer');
  if(!timer) return;
  const cur = (preview && isFinite(preview.currentTime)) ? preview.currentTime : 0;
  const total = (creatorState.videoDuration && creatorState.videoDuration > 0)
    ? creatorState.videoDuration
    : ((preview && isFinite(preview.duration) && preview.duration > 0) ? preview.duration : 0);
  const curEl = timer.querySelector('.mv-vt-cur');
  const totalEl = timer.querySelector('.mv-vt-total');
  if(curEl) curEl.textContent = fmtTime(cur);
  if(totalEl) totalEl.textContent = fmtTime(total);
}

function mvStartTimerLoop(){
  mvStopTimerLoop();
  const tick = ()=>{
    mvUpdateVideoTimer();
    const preview = creatorEl.querySelector('#mvVideoPreviewEl');
    if(!preview){ mvTrimTimerRaf = null; return; }
    if(preview.paused || preview.ended){
      mvUpdateVideoTimer();
      mvTrimTimerRaf = null;
      return;
    }
    mvTrimTimerRaf = requestAnimationFrame(tick);
  };
  mvTrimTimerRaf = requestAnimationFrame(tick);
}
function mvStopTimerLoop(){
  if(mvTrimTimerRaf){ cancelAnimationFrame(mvTrimTimerRaf); mvTrimTimerRaf = null; }
}

function mvStartTrimLoop(){
  mvStopTrimLoop();
  const tick = ()=>{
    const preview = creatorEl.querySelector('#mvVideoPreviewEl');
    if(!preview){ mvTrimLoopRaf = null; return; }
    if(preview.paused || preview.ended){ mvTrimLoopRaf = null; return; }
    const s = Number(creatorState.videoTrimStart) || 0;
    const e = Number(creatorState.videoTrimEnd) || 0;
    if(e > s && preview.currentTime >= e - 0.05){
      try { preview.currentTime = s; } catch(err){}
    }
    mvTrimLoopRaf = requestAnimationFrame(tick);
  };
  mvTrimLoopRaf = requestAnimationFrame(tick);
}
function mvStopTrimLoop(){
  if(mvTrimLoopRaf){ cancelAnimationFrame(mvTrimLoopRaf); mvTrimLoopRaf = null; }
}

function mvScheduleTrimSeek(time){
  const preview = creatorEl.querySelector('#mvVideoPreviewEl');
  if(!preview) return;
  try { preview.currentTime = time; } catch(e){}
  mvUpdateVideoTimer();
}

function mvEnsureTrimPlaying(){
  const preview = creatorEl.querySelector('#mvVideoPreviewEl');
  if(!preview) return;
  /* Respect current muted state */
  preview.muted = !!creatorState.videoMuted;
  preview.volume = creatorState.videoMuted ? 0 : 1.0;
  const playBtn = creatorEl.querySelector('#mvVideoPlayBtn');
  if(preview.paused){
    const p = preview.play();
    if(p && p.then){
      p.then(()=>{ if(playBtn) playBtn.classList.add('hide'); })
       .catch(()=>{ if(playBtn) playBtn.classList.remove('hide'); });
    } else if(playBtn){
      playBtn.classList.add('hide');
    }
  } else if(playBtn){
    playBtn.classList.add('hide');
  }
  mvStartTrimLoop();
  mvStartTimerLoop();
  mvUpdateVideoTimer();
}

function syncVideoSliders(){
  const total = Math.max(1, creatorState.videoDuration || 1);
  const startRange = creatorEl.querySelector('#mvVideoStartRange');
  const endRange = creatorEl.querySelector('#mvVideoEndRange');
  if(startRange){ startRange.max = String(total); startRange.value = String(creatorState.videoTrimStart); }
  if(endRange){ endRange.max = String(total); endRange.value = String(creatorState.videoTrimEnd); }
  updateVideoTrimUI();
}

function openVideoTrimPanel(){
  const preview = creatorEl.querySelector('#mvVideoPreviewEl');
  const startRange = creatorEl.querySelector('#mvVideoStartRange');
  const endRange = creatorEl.querySelector('#mvVideoEndRange');
  const title = creatorEl.querySelector('#mvVideoTrimTitle');
  if(!creatorState.mediaUrl) return;
  title.textContent = 'Trim video · ' + fmtTime(creatorState.videoDuration) + ' total';
  preview.src = creatorState.mediaUrl;
  preview.muted = !!creatorState.videoMuted;
  preview.volume = creatorState.videoMuted ? 0 : 1.0;

  const muteBtn = creatorEl.querySelector('#mvVideoMuteBtn');
  if(muteBtn){
    muteBtn.classList.toggle('muted', !!creatorState.videoMuted);
    const i = muteBtn.querySelector('i');
    if(i) i.className = creatorState.videoMuted ? 'fa-solid fa-volume-xmark' : 'fa-solid fa-volume-high';
  }

  if(!preview.dataset.mvTrimLoop){
    preview.dataset.mvTrimLoop = '1';
    preview.addEventListener('play',  ()=>{ mvStartTrimLoop(); mvStartTimerLoop(); });
    preview.addEventListener('pause', ()=>{ mvStopTrimLoop(); mvStopTimerLoop(); mvUpdateVideoTimer(); });
    preview.addEventListener('ended', ()=>{ mvStopTrimLoop(); mvStopTimerLoop(); mvUpdateVideoTimer(); });
    preview.addEventListener('timeupdate', mvUpdateVideoTimer);
    preview.addEventListener('seeked',     mvUpdateVideoTimer);
    preview.addEventListener('loadedmetadata', () => {
      try { preview.currentTime = creatorState.videoTrimStart || 0; } catch(e){}
      mvUpdateVideoTimer();
      mvEnsureTrimPlaying();
    }, { once:true });
    /* Fallback timer for slow devices */
    setInterval(()=>{
      if(!creatorState.mediaUrl) return;
      if(document.hidden) return;
      const p = creatorEl.querySelector('#mvVideoPreviewEl');
      if(p && !p.paused) mvUpdateVideoTimer();
    }, 300);
  }

  syncTrimRangeLimits();
  startRange.value = String(creatorState.videoTrimStart);
  endRange.value = String(creatorState.videoTrimEnd);
  mvUpdateVideoTimer();
  updateVideoTrimUI();

  showPanel('videoTrim');
  const applyBtn = creatorEl.querySelector('#mvVideoTrimApply');
  if(applyBtn){
    applyBtn.classList.toggle('applied', !!creatorState.videoTrimApplied);
    applyBtn.innerHTML = creatorState.videoTrimApplied ? '<i class="fa-solid fa-check-double"></i>Applied ✓' : '<i class="fa-solid fa-check"></i>Apply Trim';
  }
  const playBtn = creatorEl.querySelector('#mvVideoPlayBtn'); if(playBtn) playBtn.classList.remove('hide');

  if(preview.readyState >= 1) mvEnsureTrimPlaying();

  /* ⭐ v16.0.9 — trim panel খোলার সময় canvas-এর video + text/sticker LUKAN */
  creatorMediaLayer.style.display = 'none';
  creatorTextLayer.style.display   = 'none';

  /* ⭐ v16.0.9 — canvas video auto-MUTE (sound শুধু preview video-তে) */
  const canvasVideo = creatorMediaLayer.querySelector('video');
  if(canvasVideo){
    canvasVideo.muted  = true;
    canvasVideo.volume = 0;
  }
}

function updateVideoTrimUI(){
  const startLabel = creatorEl.querySelector('#mvVideoStartLabel');
  const endLabel = creatorEl.querySelector('#mvVideoEndLabel');
  const timeline = creatorEl.querySelector('#mvVideoTimelineSelected');
  const durBadge = creatorEl.querySelector('#mvVideoDurationSelected');
  const s = creatorState.videoTrimStart; const e = creatorState.videoTrimEnd;
  const total = creatorState.videoDuration || 1;
  if(startLabel) startLabel.textContent = fmtTime(s);
  if(endLabel) endLabel.textContent = fmtTime(e);
  if(durBadge) durBadge.textContent = fmtTime(e - s) + ' selected';
  if(timeline){ timeline.style.left = (s/total)*100 + '%'; timeline.style.width = Math.max(2, ((e-s)/total)*100) + '%'; }
}

/* Trim sliders: keep the selected interval between 4 and STORY_VIDEO_MAX seconds. */
function getVideoTrimBounds(){
  const total = Math.max(0, Number(creatorState.videoDuration) || 0);
  return {
    total,
    minGap: Math.min(4, total),
    maxGap: Math.min(STORY_VIDEO_MAX, total)
  };
}

function markVideoTrimChanged(){
  creatorState.videoTrimApplied = false;
  const applyBtn = creatorEl.querySelector('#mvVideoTrimApply');
  if(applyBtn){
    applyBtn.classList.remove('applied');
    applyBtn.innerHTML = '<i class="fa-solid fa-check"></i>Apply Trim';
  }
  updateVideoTrimUI();
}

function syncTrimRangeLimits(){
  const { total, minGap } = getVideoTrimBounds();
  const startRange = creatorEl.querySelector('#mvVideoStartRange');
  const endRange = creatorEl.querySelector('#mvVideoEndRange');
  if(startRange){ startRange.min = '0'; startRange.max = String(Math.max(0, total - minGap)); }
  if(endRange){ endRange.min = String(minGap); endRange.max = String(total); }
}

creatorEl.querySelector('#mvVideoStartRange').addEventListener('pointerdown', ()=>{ mvEnsureTrimPlaying(); });
creatorEl.querySelector('#mvVideoStartRange').addEventListener('input', e=>{
  const { total, minGap, maxGap } = getVideoTrimBounds();
  if(total <= 0) return;

  let start = Number(e.target.value);
  if(!Number.isFinite(start)) start = 0;
  start = Math.max(0, Math.min(start, total - minGap));

  let end = Number(creatorState.videoTrimEnd);
  if(!Number.isFinite(end)) end = total;
  if(end < start + minGap) end = start + minGap;
  if(end - start > maxGap) end = start + maxGap;
  end = Math.min(total, end);
  if(end - start < minGap) start = Math.max(0, end - minGap);

  creatorState.videoTrimStart = start;
  creatorState.videoTrimEnd = end;
  syncTrimRangeLimits();
  const startRange = creatorEl.querySelector('#mvVideoStartRange');
  const endRange = creatorEl.querySelector('#mvVideoEndRange');
  if(startRange) startRange.value = String(start);
  if(endRange) endRange.value = String(end);

  markVideoTrimChanged();
  mvScheduleTrimSeek(start);
  mvEnsureTrimPlaying();
});

creatorEl.querySelector('#mvVideoEndRange').addEventListener('pointerdown', ()=>{ mvEnsureTrimPlaying(); });
creatorEl.querySelector('#mvVideoEndRange').addEventListener('input', e=>{
  const { total, minGap, maxGap } = getVideoTrimBounds();
  if(total <= 0) return;

  let end = Number(e.target.value);
  if(!Number.isFinite(end)) end = total;
  end = Math.max(minGap, Math.min(end, total));

  let start = Number(creatorState.videoTrimStart);
  if(!Number.isFinite(start)) start = 0;
  if(end - start < minGap) start = end - minGap;
  if(end - start > maxGap) start = end - maxGap;
  start = Math.max(0, start);
  if(end - start < minGap) end = Math.min(total, start + minGap);

  creatorState.videoTrimStart = start;
  creatorState.videoTrimEnd = end;
  syncTrimRangeLimits();
  const startRange = creatorEl.querySelector('#mvVideoStartRange');
  const endRange = creatorEl.querySelector('#mvVideoEndRange');
  if(startRange) startRange.value = String(start);
  if(endRange) endRange.value = String(end);

  markVideoTrimChanged();
  mvScheduleTrimSeek(Math.max(start, end - 1.5));
  mvEnsureTrimPlaying();
});

/* ⭐ Mute toggle — video unmuted হলে music বন্ধ */
creatorEl.querySelector('#mvVideoMuteBtn').addEventListener('click', ()=>{
  const preview = creatorEl.querySelector('#mvVideoPreviewEl');
  const btn = creatorEl.querySelector('#mvVideoMuteBtn');
  if(!btn) return;
  creatorState.videoMuted = !creatorState.videoMuted;

  if(preview){
    preview.muted = creatorState.videoMuted;
    preview.volume = creatorState.videoMuted ? 0 : 1.0;
  }
  /* canvas-এর video-ও mute/unmute হবে */
  const canvasVideo = creatorMediaLayer.querySelector('video');
  if(canvasVideo){
    canvasVideo.muted = creatorState.videoMuted;
    canvasVideo.volume = creatorState.videoMuted ? 0 : 1.0;
  }

  btn.classList.toggle('muted', creatorState.videoMuted);
  const i = btn.querySelector('i');
  if(i) i.className = creatorState.videoMuted ? 'fa-solid fa-volume-xmark' : 'fa-solid fa-volume-high';

  /* ⭐ Video unmuted → music stop & sticker hide */
  if(!creatorState.videoMuted && creatorState.music){
    stopMusicPreview();
    const sticker = creatorEl.querySelector('.mv-music-sticker-wrap');
    if(sticker) sticker.style.display = 'none';
    toast('🔇 Video unmuted — music will NOT play. Mute video to hear music.');
  }
  /* ⭐ Video muted → music sticker আবার show */
  else if(creatorState.videoMuted && creatorState.music){
    const sticker = creatorEl.querySelector('.mv-music-sticker-wrap');
    if(sticker) sticker.style.display = '';
    toast('🔊 Video muted — music will play now');
  }
  else {
    toast(creatorState.videoMuted ? 'Muted 🔇' : 'Sound on 🔊');
  }
});

creatorEl.querySelector('#mvVideoPlayBtn').addEventListener('click', ()=>{
  const preview = creatorEl.querySelector('#mvVideoPreviewEl');
  const btn = creatorEl.querySelector('#mvVideoPlayBtn');
  if(!preview) return;
  if(preview.paused){ try{ preview.currentTime = creatorState.videoTrimStart; }catch(e){} mvEnsureTrimPlaying(); }
  else { preview.pause(); btn.classList.remove('hide'); }
});
creatorEl.querySelector('#mvVideoPreviewEl').addEventListener('pause', ()=>{ const btn = creatorEl.querySelector('#mvVideoPlayBtn'); if(btn) btn.classList.remove('hide'); });

creatorEl.querySelector('#mvVideoTrimRemove').addEventListener('click', ()=>{
  creatorMediaLayer.style.display = '';   /* ⭐ NEW */
  creatorState.mediaUrl = null; creatorState.mediaType = null;
  creatorState.videoTrimStart = 0; creatorState.videoTrimEnd = 0; creatorState.videoDuration = 0;
  creatorState.videoTrimApplied = false; creatorState.videoItem = null;
  creatorState.videoMuted = false;
creatorState.videoPendingApply = false;
  mvStopTrimLoop(); mvStopTimerLoop();
  const muteBtn = creatorEl.querySelector('#mvVideoMuteBtn');
  if(muteBtn){ muteBtn.classList.remove('muted'); const i = muteBtn.querySelector('i'); if(i) i.className = 'fa-solid fa-volume-high'; }
  renderCreatorMedia(); closePanel('videoTrim');
  creatorEl.querySelectorAll('.mv-ct-tool').forEach(t=>t.classList.remove('active'));
  updateCreatorPublish(); toast('Video removed');
});

creatorEl.querySelector('#mvVideoTrimApply').addEventListener('click', ()=>{
  creatorState.videoTrimApplied = true;
  creatorState.videoPendingApply = false;

  /* 1️⃣ Preview video সাথে সাথে pause */
  const preview = creatorEl.querySelector('#mvVideoPreviewEl');
  if(preview){ try { preview.pause(); } catch(e){} }
  mvStopTrimLoop(); mvStopTimerLoop();

  /* 2️⃣ Panel সাথে সাথে বন্ধ — কোনো setTimeout নেই */
  closePanel('videoTrim');
  creatorEl.querySelectorAll('.mv-ct-tool').forEach(t => t.classList.remove('active'));

  /* 3️⃣ Canvas video REBUILD না করে, শুধু state update */
  creatorMediaLayer.style.display = '';
  const canvasVideo = creatorMediaLayer.querySelector('video');
  if(canvasVideo){
    /* trim boundaries dynamic — RAF fresh read করবে */
    try { canvasVideo.currentTime = Number(creatorState.videoTrimStart) || 0; } catch(e){}
    canvasVideo.muted  = !!creatorState.videoMuted;
    canvasVideo.volume = creatorState.videoMuted ? 0 : 1.0;
    canvasVideo.play().catch(()=>{});
  } else {
    renderCreatorMedia();   /* fallback — element না থাকলে rebuild */
  }

  const applyBtn = creatorEl.querySelector('#mvVideoTrimApply');
  if(applyBtn){ applyBtn.classList.add('applied'); applyBtn.innerHTML = '<i class="fa-solid fa-check-double"></i>Applied ✓'; }

  const dur = creatorState.videoTrimEnd - creatorState.videoTrimStart;
  toast(`Applied: ${fmtTime(creatorState.videoTrimStart)} → ${fmtTime(creatorState.videoTrimEnd)} (${fmtTime(dur)})`);
});

creatorEl.querySelector('#mvDurationOptions').addEventListener('click', e=>{
  const btn = e.target.closest('.mv-dur-btn'); if(!btn) return;
  creatorState.imageDuration = Math.min(parseInt(btn.dataset.dur, 10) || STORY_IMAGE_DURATION, STORY_IMAGE_DURATION);
  creatorEl.querySelectorAll('.mv-dur-btn').forEach(b=>b.classList.toggle('active', b === btn));
});

function buildCreatorBgGrid(){
  const grid = creatorEl.querySelector('#mvBgGrid');
  grid.innerHTML = CREATOR_BG_LIST.map((b, i)=>`<div class="mv-bg-cell ${i===0?'active':''}" data-bg="${b.id}" style="background:${b.style};"></div>`).join('');
  try{ if(typeof WALLPAPERS !== 'undefined'){ const all = [].concat(WALLPAPERS.gradient||[], WALLPAPERS.mesh||[], WALLPAPERS.cosmic||[]).slice(0, 15); all.forEach(w=>{ const cell = document.createElement('div'); cell.className = 'mv-bg-cell'; cell.dataset.bg = 'wp:' + w.id; cell.style.background = w.style; grid.appendChild(cell); }); } }catch(e){}
}
creatorEl.querySelector('#mvBgGrid').addEventListener('click', e=>{
  const cell = e.target.closest('.mv-bg-cell'); if(!cell) return;
  const bgId = cell.dataset.bg; let style = '';
  if(bgId.startsWith('wp:')){ try{ const id = bgId.slice(3); if(typeof findWallpaperById === 'function'){ const w = findWallpaperById(id); if(w) style = w.style; } }catch(e){} }
  else { const item = CREATOR_BG_LIST.find(x=>x.id === bgId); if(item) style = item.style; }
  if(!style) return;
  creatorState.bg = bgId; creatorState.bgStyle = style;
  creatorBg.style.background = style; creatorBg.style.display = 'block';
  creatorEl.querySelectorAll('.mv-bg-cell').forEach(c=>c.classList.toggle('active', c === cell));
});

function buildEmojiGrid(){
  const grid = creatorEl.querySelector('#mvEmojiGrid');
  const assetItems = [...ASSET_EMOJIS, ...EXTRA_EMOJIS.map(e=>({ id:e.code, src:EXTRA_EMOJI_BASE+e.code+'.png', label:e.label, _code:e.code }))];
  const assetHTML = assetItems.map(e=>{ const fallback = (e._code === '2764') ? '❤️' : '✦'; return `<button class="mv-emoji-btn" type="button" data-emoji-src="${esc(e.src)}" title="${esc(e.label||'')}"><img src="${esc(e.src)}" alt="" onerror="this.style.display='none';this.parentElement.innerHTML='<span style=\\'font-size:22px;color:#fff\\'>${fallback}</span>';"></button>`; }).join('');
  const kbHTML = KEYBOARD_EMOJIS.map(emoji=>`<button class="mv-emoji-btn" type="button" data-emoji-char="${emoji}" title="${emoji}">${emoji}</button>`).join('');
  grid.innerHTML = assetHTML + kbHTML;
}
creatorEl.querySelector('#mvEmojiGrid').addEventListener('click', e=>{
  const btn = e.target.closest('.mv-emoji-btn'); if(!btn) return;
  const src = btn.dataset.emojiSrc; const char = btn.dataset.emojiChar;
  if(char) addSticker({ char }); else if(src) addSticker({ src });
});

function addSticker({ src, char }){
  const wrap = document.createElement('div'); wrap.className = 'mv-el-wrap';
  const size = 60; wrap.style.left = '50%'; wrap.style.top = '50%';
  wrap.style.width = size + 'px'; wrap.style.height = size + 'px'; wrap.style.transform = `translate(-50%,-50%)`;
  const inner = document.createElement('div'); inner.className = 'mv-creator-sticker-el'; inner.style.width = '100%'; inner.style.height = '100%';
  if(char){ inner.style.fontSize = size + 'px'; inner.style.lineHeight = '1'; inner.style.display = 'grid'; inner.style.placeItems = 'center'; inner.textContent = char; }
  else { inner.innerHTML = `<img src="${esc(src)}" alt="">`; }
  wrap.appendChild(inner);
  const stData = { src: src||null, char: char||null, x:50, y:50, size, rotation:0, scale:1 };
  creatorState.stickers.push(stData);
  attachTransformHandles(wrap,
    ()=>({ x:stData.x, y:stData.y, rotation:stData.rotation, scale:stData.scale }),
    (patch)=>{ Object.assign(stData, patch); wrap.style.left = stData.x + '%'; wrap.style.top = stData.y + '%'; wrap.style.transform = `translate(-50%,-50%) rotate(${stData.rotation}deg) scale(${stData.scale})`; },
    { onDelete:()=>{ const i = creatorState.stickers.indexOf(stData); if(i >= 0) creatorState.stickers.splice(i, 1); wrap.remove(); updateCreatorPublish(); } }
  );
  creatorTextLayer.appendChild(wrap);
  wrap.classList.add('show-handles');
  creatorEl.querySelectorAll('.mv-el-wrap').forEach(w=>{ if(w!==wrap) w.classList.remove('active','show-handles'); });
  wrap.classList.add('active'); updateCreatorPublish();
}

creatorEl.querySelector('#mvFontRow').innerHTML = CREATOR_FONTS.map(f=>`<button class="mv-font-btn ${f.id==='space'?'active':''}" data-font-id="${f.id}" style="font-family:${f.css}">${f.label}</button>`).join('');
creatorEl.querySelector('#mvFontRow').addEventListener('click', e=>{
  const btn = e.target.closest('[data-font-id]'); if(!btn) return;
  const f = CREATOR_FONTS.find(x=>x.id === btn.dataset.fontId); if(!f) return;
  const active = getActiveText(); if(active){ active.style.fontId = f.id; active.style.fontFamily = f.css; applyTextStyles(); }
  creatorEl.querySelectorAll('.mv-font-btn').forEach(b=>b.classList.toggle('active', b === btn));
});
creatorEl.querySelector('#mvEffectRow').innerHTML = CREATOR_EFFECTS.map(ef=>`<button class="mv-effect-btn ${ef.id==='shadow'?'active':''}" data-effect="${ef.id}" type="button"><i class="fa-solid ${ef.icon}"></i> ${ef.label}</button>`).join('');
creatorEl.querySelector('#mvEffectRow').addEventListener('click', e=>{
  const btn = e.target.closest('.mv-effect-btn'); if(!btn) return;
  const active = getActiveText(); if(active){ active.style.effect = btn.dataset.effect; applyTextStyles(); }
  creatorEl.querySelectorAll('.mv-effect-btn').forEach(b=>b.classList.toggle('active', b === btn));
});
creatorEl.querySelector('#mvSwatches').innerHTML = CREATOR_SWATCHES.map(c=>`<div class="mv-swatch ${c==='#ffffff'?'active':''}" data-color="${c}" style="--c:${c};background:${c};"></div>`).join('');
creatorEl.querySelector('#mvSwatches').addEventListener('click', e=>{
  const s = e.target.closest('[data-color]'); if(!s) return;
  const active = getActiveText(); if(active){ active.style.color = s.dataset.color; active.style.effectColor = s.dataset.color; applyTextStyles(); }
  creatorEl.querySelectorAll('.mv-swatch').forEach(x=>x.classList.toggle('active', x === s));
  creatorEl.querySelector('#mvColorPicker').value = s.dataset.color;
});
creatorEl.querySelector('#mvColorPicker').addEventListener('input', e=>{ const active = getActiveText(); if(active){ active.style.color = e.target.value; active.style.effectColor = e.target.value; applyTextStyles(); } });
creatorEl.querySelectorAll('.mv-size-ctrl [data-size]').forEach(btn=>{
  btn.addEventListener('click', ()=>{ const dir = parseInt(btn.dataset.size, 10); const active = getActiveText(); if(active){ const next = Math.max(12, Math.min(72, active.style.fontSize + dir*2)); active.style.fontSize = next; creatorEl.querySelector('#mvSizeInput').value = next; applyTextStyles(); } });
});
creatorEl.querySelector('#mvSizeInput').addEventListener('input', e=>{ const v = parseInt(e.target.value, 10); if(v >= 12 && v <= 72){ const active = getActiveText(); if(active){ active.style.fontSize = v; applyTextStyles(); } } });
creatorEl.querySelectorAll('.mv-toggle[data-style]').forEach(btn=>{
  btn.addEventListener('click', ()=>{ const st = btn.dataset.style; const active = getActiveText(); if(active){ if(st === 'bold'){ active.style.bold = !active.style.bold; btn.classList.toggle('active', active.style.bold); } else if(st === 'italic'){ active.style.italic = !active.style.italic; btn.classList.toggle('active', active.style.italic); } applyTextStyles(); } });
});

let drawState = { drawing:false, color:'#00e5ff', size:6 };
function fitDrawCanvas(){ const wrap = creatorEl.querySelector('#mvCreatorCanvas'); const rect = wrap.getBoundingClientRect(); const dpr = window.devicePixelRatio || 1; creatorDrawCanvas.width = rect.width * dpr; creatorDrawCanvas.height = rect.height * dpr; creatorDrawCanvas.style.width = rect.width + 'px'; creatorDrawCanvas.style.height = rect.height + 'px'; const ctx = creatorDrawCanvas.getContext('2d'); ctx.setTransform(dpr, 0, 0, dpr, 0, 0); ctx.lineCap = 'round'; ctx.lineJoin = 'round'; if(creatorState.drawing){ const img = new Image(); img.onload = ()=>{ ctx.drawImage(img, 0, 0, rect.width, rect.height); }; img.src = creatorState.drawing; } }
function clearDrawing(){ const ctx = creatorDrawCanvas.getContext('2d'); ctx.clearRect(0, 0, creatorDrawCanvas.width, creatorDrawCanvas.height); creatorState.drawing = null; updateCreatorPublish(); }
creatorDraw.addEventListener('pointerdown', e=>{ if(!creatorDraw.classList.contains('active')) return; const ctx = creatorDrawCanvas.getContext('2d'); const rect = creatorDrawCanvas.getBoundingClientRect(); drawState.drawing = true; ctx.strokeStyle = drawState.color; ctx.lineWidth = drawState.size; ctx.beginPath(); ctx.moveTo(e.clientX - rect.left, e.clientY - rect.top); creatorDrawCanvas.setPointerCapture?.(e.pointerId); });
creatorDraw.addEventListener('pointermove', e=>{ if(!drawState.drawing) return; const ctx = creatorDrawCanvas.getContext('2d'); const rect = creatorDrawCanvas.getBoundingClientRect(); ctx.lineTo(e.clientX - rect.left, e.clientY - rect.top); ctx.stroke(); });
creatorDraw.addEventListener('pointerup', ()=>{ if(!drawState.drawing) return; drawState.drawing = false; try{ creatorState.drawing = creatorDrawCanvas.toDataURL('image/png'); }catch(e){} updateCreatorPublish(); });
creatorDraw.addEventListener('pointercancel', ()=>{ drawState.drawing = false; });
creatorEl.querySelector('#mvDrawColor').addEventListener('input', e=>{ drawState.color = e.target.value; });
creatorEl.querySelector('#mvDrawSize').addEventListener('input', e=>{ drawState.size = parseInt(e.target.value, 10) || 6; });
creatorEl.querySelector('#mvDrawClear').addEventListener('click', clearDrawing);

let musicPreviewAudio = null;
let browseResults = [];
let searchResults = [];
let musicCurrentTab = 'browse';
let musicPreviewRaf = 0;
let waveformData = null;
let waveformAudioContext = null;

async function setMusicTab(tab){
  musicCurrentTab = tab;
  creatorState.musicTab = tab;
  creatorEl.querySelectorAll('.mv-music-tab').forEach(t => t.classList.toggle('active', t.dataset.mtab === tab));
  const searchWrap = creatorEl.querySelector('#mvMusicSearchWrap');
  if(searchWrap) searchWrap.style.display = tab === 'search' ? 'flex' : 'none';

  if(tab === 'browse'){
    const listEl = creatorEl.querySelector('#mvMusicList');
    listEl.innerHTML = '<div class="mv-music-loading"><i class="fa-solid fa-spinner fa-spin"></i> Loading worldwide tracks…</div>';
    try {
      const tracks = await window.MVMusic.loadPopular(15);
      browseResults = tracks;
      if(!tracks.length) listEl.innerHTML = '<div class="mv-music-empty"><i class="fa-solid fa-music"></i>Could not load tracks.</div>';
      else renderMusicList('');
    } catch(e){
      listEl.innerHTML = '<div class="mv-music-empty"><i class="fa-solid fa-triangle-exclamation"></i>Failed to load.</div>';
    }
  }
  else if(tab === 'favs') renderFavsList();
  else if(tab === 'search'){
    const input = creatorEl.querySelector('#mvMusicSearchInput');
    if(input) input.value = '';
    renderMusicList('');
    setTimeout(()=>input && input.focus(), 150);
  }
}
creatorEl.querySelector('#mvMusicTabs').addEventListener('click', e => {
  const tab = e.target.closest('.mv-music-tab'); if(!tab) return;
  setMusicTab(tab.dataset.mtab);
});

function renderMusicList(query){
  const listEl = creatorEl.querySelector('#mvMusicList');
  let items = [];
  if(musicCurrentTab === 'browse') items = browseResults;
  else if(musicCurrentTab === 'search'){
    items = searchResults;
    if(!items.length && !query){
      listEl.innerHTML = '<div class="mv-music-empty"><i class="fa-solid fa-magnifying-glass"></i>Search songs worldwide</div>';
      listEl._mvItems = []; return;
    }
  }
  else items = window.MVMusic ? window.MVMusic.getFavourites() : [];

  if(!items.length){
    listEl.innerHTML = '<div class="mv-music-empty"><i class="fa-solid fa-music"></i>No music found</div>';
    listEl._mvItems = []; return;
  }

  const selectedId = creatorState.music ? creatorState.music.id : null;
  const playingId = (musicPreviewAudio && musicPreviewAudio._trackId) ? musicPreviewAudio._trackId : null;

  listEl.innerHTML = items.map(m=>{
    const selected = selectedId === m.id;
    const playing  = playingId === m.id;
    const isFav    = window.MVMusic ? window.MVMusic.isFavourite(m.id) : false;
    return `<div class="mv-music-row ${selected?'selected':''} ${playing?'playing':''}" data-music-id="${esc(m.id)}">
      ${musicCoverMarkup(m)}
      <div class="mv-music-meta"><b>${esc(m.title)}</b><span>${esc(m.artist)}</span></div>
      <span class="mv-music-dur">${fmtTime(m.duration)}</span>
      <button class="mv-music-play" type="button" data-preview-id="${esc(m.id)}"><i class="fa-solid ${playing?'fa-pause':'fa-play'}"></i></button>
      <button class="mv-music-fav ${isFav?'on':''}" type="button" data-fav-id="${esc(m.id)}"><i class="fa-${isFav?'solid':'regular'} fa-star"></i></button>
    </div>`;
  }).join('');
  listEl._mvItems = items;
}

function renderFavsList(){
  const listEl = creatorEl.querySelector('#mvMusicList');
  const favs = window.MVMusic ? window.MVMusic.getFavourites() : [];
  if(!favs.length){
    listEl.innerHTML = '<div class="mv-music-empty"><i class="fa-regular fa-star"></i>No favourites yet.</div>';
    listEl._mvItems = []; return;
  }
  const selectedId = creatorState.music ? creatorState.music.id : null;
  const playingId = (musicPreviewAudio && musicPreviewAudio._trackId) ? musicPreviewAudio._trackId : null;
  listEl.innerHTML = favs.map(m=>{
    const selected = selectedId === m.id;
    const playing  = playingId === m.id;
    return `<div class="mv-music-row ${selected?'selected':''} ${playing?'playing':''}" data-music-id="${esc(m.id)}">
      ${musicCoverMarkup(m)}
      <div class="mv-music-meta"><b>${esc(m.title)}</b><span>${esc(m.artist)}</span></div>
      <span class="mv-music-dur">${fmtTime(m.duration)}</span>
      <button class="mv-music-play" type="button" data-preview-id="${esc(m.id)}"><i class="fa-solid ${playing?'fa-pause':'fa-play'}"></i></button>
      <button class="mv-music-fav on" type="button" data-fav-id="${esc(m.id)}"><i class="fa-solid fa-star"></i></button>
    </div>`;
  }).join('');
  listEl._mvItems = favs;
}

function toggleFavourite(m){
  if(!window.MVMusic) return;
  const added = window.MVMusic.toggleFavourite(m);
  toast(added ? 'Added to favourites ⭐' : 'Removed from favourites');
  if(musicCurrentTab === 'favs') renderFavsList(); else renderMusicList('');
}

creatorEl.querySelector('#mvMusicList').addEventListener('click', e => {
  const preview = e.target.closest('[data-preview-id]');
  if(preview){
    e.stopPropagation();
    const items = creatorEl.querySelector('#mvMusicList')._mvItems || [];
    const track = items.find(m => m.id === preview.dataset.previewId);
    if(track) toggleMusicPreview(track);
    return;
  }
  const fav = e.target.closest('[data-fav-id]');
  if(fav){
    e.stopPropagation();
    const items = creatorEl.querySelector('#mvMusicList')._mvItems || [];
    const track = items.find(m => m.id === fav.dataset.favId);
    if(track) toggleFavourite(track);
    return;
  }
  const row = e.target.closest('[data-music-id]');
  if(!row) return;
  const items = creatorEl.querySelector('#mvMusicList')._mvItems || [];
  const track = items.find(m => m.id === row.dataset.musicId);
  if(track) selectMusic(track);
});

function stopMusicPreview(){
  if(musicPreviewAudio){ try{ musicPreviewAudio.pause(); }catch(e){} musicPreviewAudio = null; }
  if(musicPreviewRaf){ cancelAnimationFrame(musicPreviewRaf); musicPreviewRaf = 0; }
  const btn = creatorEl.querySelector('#mvMusicPreviewBtn i');
  if(btn) btn.className = 'fa-solid fa-play';
  const bottomPlay = creatorEl.querySelector('#mvMusicBottomPlay i');
  if(bottomPlay) bottomPlay.className = 'fa-solid fa-play';
  if(creatorState.music) resetMusicPreviewUI();
}
function toggleMusicPreview(track){
  const same = musicPreviewAudio && musicPreviewAudio._trackId === track.id;
  if(same){
    if(musicPreviewAudio.paused) musicPreviewAudio.play().catch(()=>{});
    else musicPreviewAudio.pause();
    renderMusicList(''); return;
  }
stopMusicPreview();
const a = new Audio();
a.src = track.url;
a._trackId = track.id;
a.volume = 0.75;
mvRegisterMedia(a);        /* ⭐ added */
musicPreviewAudio = a;
  a.addEventListener('ended', () => { stopMusicPreview(); renderMusicList(''); });
  a.play().catch(() => toast('Preview unavailable'));
  renderMusicList('');
}

/* ⭐ v16.0.6 — Music auto duration: video থাকলে video duration, না হলে 30s
   ⭐ v16.0.6.1 — Orphan if block moved INSIDE this function */
async function selectMusic(track){
  stopMusicPreview();
  const trim = creatorEl.querySelector('#mvMusicTrim');
  const trimTitle = creatorEl.querySelector('#mvMusicTrimTitle');
  const startRange = creatorEl.querySelector('#mvMusicStartRange');
  const endRange = creatorEl.querySelector('#mvMusicEndRange');

  const fullDuration = Math.max(1, Math.floor(track.duration || 180));
  const effectiveWindow = getEffectiveMusicTrimWindow(); /* ⭐ auto-detect video duration */
  const defaultEnd = Math.min(effectiveWindow, fullDuration);

  creatorState.music = {
    id: track.id,
    title: track.title,
    artist: track.artist,
    url: track.url,
    duration: track.duration,
    cover: track.cover || null,
    emoji: track.emoji || '🎵',
    hue: track.hue || '#5de8ff',
    trimStart: 0,
    trimEnd: defaultEnd,
    x: 50, y: 85, rotation: 0, scale: 1,
    style: 'classic',
    loop: false
  };

  trimTitle.textContent = `${track.title} — ${track.artist}`;

  const maxVal = String(Math.max(1, Math.min(fullDuration, 600)));
  startRange.max = maxVal;
  endRange.max = maxVal;
  startRange.value = '0';
  endRange.value = String(defaultEnd);

  updateMusicTrimUI();
  updateBottomBar(track);
  renderWaveform(track.url, fullDuration);
  updateWaveformSelection(0, defaultEnd, fullDuration);
  updateStickerStyleRow('classic');
  const audioOnly = creatorEl.querySelector('#mvAudioOnlyToggle'); if(audioOnly) audioOnly.checked = false;
  const loopBtn = creatorEl.querySelector('#mvMusicBottomLoop'); if(loopBtn) loopBtn.classList.remove('on');

  trim.classList.add('show');
  if(musicCurrentTab === 'favs') renderFavsList(); else renderMusicList('');
  renderCreatorMusicSticker(creatorState.music);
  resetMusicPreviewUI();

  /* ⭐ v16.0.6.1 — Video unmuted হলে music apply হবে না — user-কে জানাই
     (এই ব্লকটা আগে ফাংশনের বাইরে ছিল → syntax-wise OK কিন্তু logically ভুল ছিল) */
  if(creatorState.mediaType === 'video' && !creatorState.videoMuted){
    // sticker hide করে দিই সাথে সাথে
    const st = creatorEl.querySelector('.mv-music-sticker-wrap');
    if(st) st.style.display = 'none';
    setTimeout(()=>{
      toast('⚠️ Video is UNMUTED — music won\'t play. Mute video to hear music.');
    }, 400);
  } else {
    const st = creatorEl.querySelector('.mv-music-sticker-wrap');
    if(st) st.style.display = '';
  }

  toast(`Music set · ${track.title} (${fmtTime(defaultEnd)})`);
}

function updateMusicTrimUI(){
  const m = creatorState.music;
  if(!m) return;
  const dur = Math.max(1, m.duration || 60);
  const windowSize = getEffectiveMusicTrimWindow(); /* ⭐ dynamic */

  let start = Math.max(0, m.trimStart || 0);
  let end   = m.trimEnd || (start + windowSize);
  if(end - start > windowSize){
    end = Math.min(dur, start + windowSize);
  }
  if(end > dur) end = dur;
  m.trimStart = start;
  m.trimEnd = end;

  creatorEl.querySelector('#mvMusicStartLabel').textContent = fmtTime(start);
  creatorEl.querySelector('#mvMusicEndLabel').textContent = fmtTime(end);

  const playing = musicPreviewAudio && !musicPreviewAudio.paused;
  if(!playing){
    const timerEl = creatorEl.querySelector('#mvMusicPreviewTimer');
    if(timerEl) timerEl.textContent = '0:00 / ' + fmtTime(Math.max(1, end - start));
    const fillEl = creatorEl.querySelector('#mvMusicPreviewBarFill');
    if(fillEl) fillEl.style.width = '0%';
    const playheadEl = creatorEl.querySelector('#mvMusicPlayhead');
    if(playheadEl) playheadEl.style.left = ((start / dur) * 100) + '%';
  }

  const bar = creatorEl.querySelector('#mvMusicTimelineSelected');
  if(bar){
    bar.style.left = ((start / dur) * 100) + '%';
    bar.style.width = Math.max(2, ((end - start) / dur) * 100) + '%';
  }
  const durSel = creatorEl.querySelector('#mvMusicDurationSelected');
  if(durSel) durSel.textContent = fmtTime(end - start);
}

creatorEl.querySelector('#mvMusicStartRange').addEventListener('input', e=>{
  const m = creatorState.music; if(!m) return;
  const total = Math.max(1, m.duration || 1);
  const windowSize = getEffectiveMusicTrimWindow();
  let v = parseFloat(e.target.value) || 0;

  const maxStart = Math.max(0, total - windowSize);
  if(v > maxStart) v = maxStart;
  if(v < 0) v = 0;

  m.trimStart = v;
  e.target.value = String(v);

  const desiredEnd = Math.min(v + windowSize, total);
  m.trimEnd = desiredEnd;
  const endRange = creatorEl.querySelector('#mvMusicEndRange');
  if(endRange) endRange.value = String(desiredEnd);

  updateMusicTrimUI();
  updateWaveformSelection(m.trimStart, m.trimEnd, total);
  resetMusicPreviewUI();
});
creatorEl.querySelector('#mvMusicEndRange').addEventListener('input', e=>{
  const m = creatorState.music; if(!m) return;
  const total = Math.max(1, m.duration || 1);
  const windowSize = getEffectiveMusicTrimWindow();
  let v = parseFloat(e.target.value) || windowSize;
  if(v < 1) v = 1;
  if(v > total) v = total;

  m.trimEnd = v;
  e.target.value = String(v);

  const desiredStart = Math.max(0, v - windowSize);
  m.trimStart = desiredStart;
  const startRange = creatorEl.querySelector('#mvMusicStartRange');
  if(startRange) startRange.value = String(desiredStart);

  updateMusicTrimUI();
  updateWaveformSelection(m.trimStart, m.trimEnd, total);
  resetMusicPreviewUI();
});
creatorEl.querySelector('#mvMusicTrimRemove').addEventListener('click', ()=>{
  stopMusicPreview();
  creatorState.music = null;
  creatorEl.querySelector('#mvMusicTrim').classList.remove('show');
  const sticker = creatorEl.querySelector('.mv-music-sticker-wrap');
  if(sticker) sticker.remove();
  if(musicCurrentTab === 'favs') renderFavsList(); else renderMusicList('');
  toast('Music removed');
});

function updateBottomBar(track){
  const m = creatorState.music;
  const titleEl = creatorEl.querySelector('#mvMusicBottomTitle');
  const artistEl = creatorEl.querySelector('#mvMusicBottomArtist');
  const coverEl = creatorEl.querySelector('#mvMusicBottomCover');
  if(!titleEl || !artistEl || !coverEl) return;
  titleEl.textContent = track.title || '—';
  artistEl.textContent = track.artist || '—';
  let coverHTML = track.cover ? `<img src="${esc(track.cover)}" alt="">` : `<i class="fa-solid fa-music"></i>`;
  coverEl.innerHTML = `${coverHTML}<div class="mv-music-bottom-play visible" id="mvMusicBottomPlay"><i class="fa-solid fa-play"></i></div>`;
  const playEl = coverEl.querySelector('#mvMusicBottomPlay');
  if(playEl){
    playEl.onclick = (e)=>{
      e.stopPropagation();
      const trimBtn = creatorEl.querySelector('#mvMusicPreviewBtn');
      if(trimBtn) trimBtn.click();
      else {
        if(!musicPreviewAudio){
  musicPreviewAudio = new Audio(m.url);
  musicPreviewAudio.volume = 0.75;
  mvRegisterMedia(musicPreviewAudio);   /* ⭐ added */
}
        if(musicPreviewAudio.paused){ musicPreviewAudio.play().catch(()=>{}); playEl.querySelector('i').className = 'fa-solid fa-pause'; }
        else { musicPreviewAudio.pause(); playEl.querySelector('i').className = 'fa-solid fa-play'; }
      }
    };
  }
}
creatorEl.querySelector('#mvMusicBottomLoop').addEventListener('click', ()=>{
  if(!creatorState.music) return;
  creatorState.music.loop = !creatorState.music.loop;
  creatorEl.querySelector('#mvMusicBottomLoop').classList.toggle('on', creatorState.music.loop);
  if(musicPreviewAudio) musicPreviewAudio.loop = creatorState.music.loop;
  toast(creatorState.music.loop ? 'Loop ON' : 'Loop OFF');
});
creatorEl.querySelector('#mvMusicBottomCover').addEventListener('click', (e)=>{
  if(e.target.closest('#mvMusicBottomPlay')) return;
  toast('Tap a song from list to change');
});

creatorEl.querySelector('#mvAudioOnlyToggle').addEventListener('change', (e)=>{
  if(!creatorState.music) return;
  creatorState.music.style = e.target.checked ? 'audio-only' : 'classic';
  updateStickerStyleRow(creatorState.music.style);
  renderCreatorMusicSticker(creatorState.music);
});

creatorEl.querySelector('#mvStickerStyleRow').addEventListener('click', e=>{
  const btn = e.target.closest('.mv-sticker-style-btn'); if(!btn) return;
  const style = btn.dataset.style;
  if(!creatorState.music){ toast('Select a song first'); return; }
  creatorState.music.style = style;
  updateStickerStyleRow(style);
  renderCreatorMusicSticker(creatorState.music);
  const audioOnly = creatorEl.querySelector('#mvAudioOnlyToggle');
  if(audioOnly) audioOnly.checked = (style === 'audio-only');
  toast('Style: ' + style);
});
function updateStickerStyleRow(activeStyle){
  creatorEl.querySelectorAll('.mv-sticker-style-btn').forEach(b=>b.classList.toggle('active', b.dataset.style === activeStyle));
}

async function renderWaveform(audioUrl, duration){
  const canvas = creatorEl.querySelector('#mvWaveformCanvas');
  const wrap = creatorEl.querySelector('#mvWaveformWrap');
  if(!canvas || !wrap) return;
  const rect = wrap.getBoundingClientRect();
  const dpr = window.devicePixelRatio || 1;
  canvas.width = rect.width * dpr;
  canvas.height = rect.height * dpr;
  canvas.style.width = rect.width + 'px';
  canvas.style.height = rect.height + 'px';
  const ctx = canvas.getContext('2d');
  ctx.setTransform(dpr, 0, 0, dpr, 0, 0);

  waveformData = generateFallbackWaveform(80);
  drawWaveformBars(ctx, rect.width, rect.height, waveformData, 0, waveformData.length);

  try {
    if(!waveformAudioContext){
      waveformAudioContext = new (window.AudioContext || window.webkitAudioContext)();
    }
    const res = await fetch(audioUrl, { mode: 'cors' });
    const arrayBuf = await res.arrayBuffer();
    const audioBuf = await waveformAudioContext.decodeAudioData(arrayBuf);
    const ch = audioBuf.getChannelData(0);
    const samples = 120;
    const blockSize = Math.floor(ch.length / samples);
    const bars = [];
    for(let i = 0; i < samples; i++){
      let sum = 0;
      for(let j = 0; j < blockSize; j++) sum += Math.abs(ch[i * blockSize + j]);
      bars.push(sum / blockSize);
    }
    const max = Math.max(...bars) || 1;
    waveformData = bars.map(b => b / max);
    drawWaveformBars(ctx, rect.width, rect.height, waveformData, 0, waveformData.length);
  } catch(err) {
    console.warn('[Waveform] decode failed:', err.message);
  }
}
function generateFallbackWaveform(n){
  const bars = [];
  for(let i = 0; i < n; i++){
    bars.push(0.25 + Math.abs(Math.sin(i * 0.7) * Math.cos(i * 0.3)) * 0.75);
  }
  return bars;
}
function drawWaveformBars(ctx, w, h, bars, startIdx, endIdx){
  ctx.clearRect(0, 0, w, h);
  const n = bars.length;
  const barWidth = w / n;
  const mid = h / 2;
  for(let i = 0; i < n; i++){
    const v = bars[i];
    const bh = Math.max(2, v * (h - 12));
    const x = i * barWidth + barWidth * 0.15;
    const bw = barWidth * 0.7;
    const inSel = i >= startIdx && i < endIdx;
    ctx.fillStyle = inSel ? '#5de8ff' : 'rgba(255,255,255,0.30)';
    ctx.fillRect(x, mid - bh/2, bw, bh);
  }
}

let waveformDragState = null;
function setupWaveformDrag(){
  const wrap = creatorEl.querySelector('#mvWaveformWrap');
  const hStart = creatorEl.querySelector('#mvWaveformHandleStart');
  const hEnd = creatorEl.querySelector('#mvWaveformHandleEnd');
  if(!wrap || !hStart || !hEnd) return;

  const onDown = (which) => (e)=>{
    e.preventDefault(); e.stopPropagation();
    const rect = wrap.getBoundingClientRect();
    waveformDragState = { which, rect };
    const move = (ev)=>{
      if(!waveformDragState) return;
      const x = Math.max(0, Math.min(rect.width, ev.clientX - rect.left));
      const pct = x / rect.width;
      const m = creatorState.music; if(!m) return;
      const total = m.duration || 1;
      const windowSize = getEffectiveMusicTrimWindow();
      const time = pct * total;

      if(which === 'start'){
        const maxStart = Math.max(0, total - windowSize);
        m.trimStart = Math.max(0, Math.min(maxStart, time));
        m.trimEnd = Math.min(total, m.trimStart + windowSize);
      } else {
        const minEnd = Math.min(total, windowSize);
        m.trimEnd = Math.max(minEnd, Math.min(total, time));
        m.trimStart = Math.max(0, m.trimEnd - windowSize);
      }

      updateWaveformSelection(m.trimStart, m.trimEnd, total);
      updateMusicTrimUI();
      const sr = creatorEl.querySelector('#mvMusicStartRange'); if(sr) sr.value = String(m.trimStart);
      const er = creatorEl.querySelector('#mvMusicEndRange'); if(er) er.value = String(m.trimEnd);
      resetMusicPreviewUI();
    };
    const up = ()=>{
      waveformDragState = null;
      document.removeEventListener('pointermove', move);
      document.removeEventListener('pointerup', up);
    };
    document.addEventListener('pointermove', move);
    document.addEventListener('pointerup', up);
  };

  hStart.addEventListener('pointerdown', onDown('start'));
  hEnd.addEventListener('pointerdown', onDown('end'));
}
setupWaveformDrag();

function updateWaveformSelection(start, end, total){
  const wrap = creatorEl.querySelector('#mvWaveformWrap');
  if(!wrap) return;
  const sp = (start / total) * 100;
  const ep = (end / total) * 100;
  const sel = creatorEl.querySelector('#mvWaveformSelection');
  const dimL = creatorEl.querySelector('#mvWaveformDimLeft');
  const dimR = creatorEl.querySelector('#mvWaveformDimRight');
  const hS = creatorEl.querySelector('#mvWaveformHandleStart');
  const hE = creatorEl.querySelector('#mvWaveformHandleEnd');
  if(sel){ sel.style.left = sp + '%'; sel.style.width = (ep - sp) + '%'; }
  if(dimL){ dimL.style.left = '0%'; dimL.style.width = sp + '%'; }
  if(dimR){ dimR.style.left = ep + '%'; dimR.style.width = (100 - ep) + '%'; }
  if(hS){ hS.style.left = sp + '%'; }
  if(hE){ hE.style.left = ep + '%'; }
  const canvas = creatorEl.querySelector('#mvWaveformCanvas');
  if(canvas && waveformData){
    const ctx = canvas.getContext('2d');
    const dpr = window.devicePixelRatio || 1;
    const w = canvas.width / dpr, h = canvas.height / dpr;
    ctx.setTransform(dpr, 0, 0, dpr, 0, 0);
    const startIdx = Math.floor((start/total) * waveformData.length);
    const endIdx = Math.ceil((end/total) * waveformData.length);
    drawWaveformBars(ctx, w, h, waveformData, startIdx, endIdx);
  }
}

function resetMusicPreviewUI(){
  const timerEl = creatorEl.querySelector('#mvMusicPreviewTimer');
  const m = creatorState.music;
  if(timerEl && m){
    const s = m.trimStart || 0;
    const e = m.trimEnd || m.duration || 60;
    timerEl.textContent = '0:00 / ' + fmtTime(Math.max(1, e - s));
  }
  const fillEl = creatorEl.querySelector('#mvMusicPreviewBarFill');
  if(fillEl) fillEl.style.width = '0%';
  const playheadEl = creatorEl.querySelector('#mvMusicPlayhead');
  if(playheadEl && m){
    const total = Math.max(1, m.duration || 60);
    playheadEl.style.left = (((m.trimStart || 0) / total) * 100) + '%';
  }
  const pb = creatorEl.querySelector('#mvMusicPreviewBtn i');
  if(pb) pb.className = 'fa-solid fa-play';
  const bp = creatorEl.querySelector('#mvMusicBottomPlay i');
  if(bp) bp.className = 'fa-solid fa-play';
}

function playTrimmedAudio(){
  const m = creatorState.music;
  if(!m || !m.url){ toast('Select a song first'); return; }

  if(musicPreviewAudio){ try{ musicPreviewAudio.pause(); }catch(e){} musicPreviewAudio = null; }
  if(musicPreviewRaf){ cancelAnimationFrame(musicPreviewRaf); musicPreviewRaf = 0; }

  const start = Math.max(0, m.trimStart || 0);
  const end   = Math.max(start + 0.5, m.trimEnd || (start + MUSIC_TRIM_DEFAULT));
  const total = Math.max(1, m.duration || 60);

const a = new Audio();
a.src = m.url;
a.volume = 0.75;
mvRegisterMedia(a);        /* ⭐ added */
try{ a.currentTime = start; }catch(e){}
musicPreviewAudio = a;

  const setPlayIcons = (playing)=>{
    const pb = creatorEl.querySelector('#mvMusicPreviewBtn i');
    if(pb) pb.className = playing ? 'fa-solid fa-pause' : 'fa-solid fa-play';
    const bp = creatorEl.querySelector('#mvMusicBottomPlay i');
    if(bp) bp.className = playing ? 'fa-solid fa-pause' : 'fa-solid fa-play';
  };
  setPlayIcons(true);

  a.play().catch(()=>{ toast('Preview unavailable'); setPlayIcons(false); });

  const tick = ()=>{
    if(!musicPreviewAudio || musicPreviewAudio !== a){ musicPreviewRaf = 0; return; }
    const cur = a.currentTime;

    const timerEl = creatorEl.querySelector('#mvMusicPreviewTimer');
    if(timerEl){
      const elapsed = Math.max(0, cur - start);
      const totalSel = Math.max(1, end - start);
      timerEl.textContent = fmtTime(elapsed) + ' / ' + fmtTime(totalSel);
    }

    const fillEl = creatorEl.querySelector('#mvMusicPreviewBarFill');
    if(fillEl){
      const pct = ((cur - start) / Math.max(0.1, end - start)) * 100;
      fillEl.style.width = Math.max(0, Math.min(100, pct)) + '%';
    }

    const playheadEl = creatorEl.querySelector('#mvMusicPlayhead');
    if(playheadEl) playheadEl.style.left = ((cur / total) * 100) + '%';

    if(cur >= end - 0.05){
      if(m.loop){
        try{ a.currentTime = start; a.play().catch(()=>{}); }catch(e){}
      } else {
        try{ a.pause(); }catch(e){}
        musicPreviewRaf = 0;
        setPlayIcons(false);
        resetMusicPreviewUI();
        return;
      }
    }
    if(a.ended){
      musicPreviewRaf = 0;
      setPlayIcons(false);
      resetMusicPreviewUI();
      return;
    }
    musicPreviewRaf = requestAnimationFrame(tick);
  };
  musicPreviewRaf = requestAnimationFrame(tick);

  a.addEventListener('pause', ()=>{ setPlayIcons(false); if(musicPreviewRaf){ cancelAnimationFrame(musicPreviewRaf); musicPreviewRaf = 0; } });
  a.addEventListener('ended', ()=>{ setPlayIcons(false); if(musicPreviewRaf){ cancelAnimationFrame(musicPreviewRaf); musicPreviewRaf = 0; } });
}

(function bindPreviewBtn(){
  const btn = creatorEl.querySelector('#mvMusicPreviewBtn');
  if(!btn) return;
  btn.addEventListener('click', ()=>{
    if(musicPreviewAudio && !musicPreviewAudio.paused){
      musicPreviewAudio.pause();
    } else {
      playTrimmedAudio();
    }
  });
})();

(function bindApplyTrim(){
  const btn = creatorEl.querySelector('#mvMusicApplyTrimBtn');
  if(!btn) return;
  btn.addEventListener('click', ()=>{
    const m = creatorState.music;
    if(!m || !m.url){ toast('Select a song first'); return; }

    const total = Math.max(1, m.duration || 60);
    const windowSize = getEffectiveMusicTrimWindow();
    let start = Math.max(0, Math.min(total - 1, m.trimStart || 0));
    let end   = Math.max(start + 0.5, m.trimEnd || (start + windowSize));

    if(end - start > windowSize){
      end = Math.min(total, start + windowSize);
    }
    if(end > total) end = total;
    if(end - start > windowSize) end = start + windowSize;

    m.trimStart = start;
    m.trimEnd = end;

    const sr = creatorEl.querySelector('#mvMusicStartRange');
    const er = creatorEl.querySelector('#mvMusicEndRange');
    if(sr) sr.value = String(start);
    if(er) er.value = String(end);
    updateMusicTrimUI();
    updateWaveformSelection(start, end, total);

    playTrimmedAudio();
    toast(`Playing ${fmtTime(start)} → ${fmtTime(end)} · ${fmtTime(end - start)}`);
  });
})();

creatorEl.querySelector('#mvMusicSearchBtn').addEventListener('click', async ()=>{
  const input = creatorEl.querySelector('#mvMusicSearchInput');
  const btn   = creatorEl.querySelector('#mvMusicSearchBtn');
  const listEl = creatorEl.querySelector('#mvMusicList');
  const q = (input.value || '').trim();
  if(!q){ toast('Type a song or artist'); return; }
  listEl.innerHTML = '<div class="mv-music-loading"><i class="fa-solid fa-spinner fa-spin"></i> Searching worldwide…</div>';
  btn.disabled = true;
  try {
    const tracks = await window.MVMusic.search(q, 25);
    searchResults = tracks;
    if(!tracks.length){
      listEl.innerHTML = `<div class="mv-music-empty"><i class="fa-solid fa-music"></i>No tracks found for "<b>${esc(q)}</b>"</div>`;
    } else renderMusicList('');
  } catch(e){
    console.error('[MVMoments] search error:', e);
    listEl.innerHTML = '<div class="mv-music-empty"><i class="fa-solid fa-triangle-exclamation"></i>Search failed. Check internet.</div>';
  }
  btn.disabled = false;
});
creatorEl.querySelector('#mvMusicSearchInput').addEventListener('keydown', e=>{
  if(e.key === 'Enter'){ e.preventDefault(); creatorEl.querySelector('#mvMusicSearchBtn').click(); }
});

creatorEl.querySelector('#mvPrivacyChips').addEventListener('click', e=>{
  const chip = e.target.closest('.mv-privacy-chip'); if(!chip) return;
  const p = chip.dataset.privacy;
  if(p === 'only'){ openFriendPicker([]); return; }
  creatorState.privacy = p; if(p !== 'only') creatorState.onlyWho = [];
  updatePrivacyChipsUI();
  const labels = {public:'Public', friends:'Friends', private:'Locked'};
  toast(`Privacy: ${labels[p] || p}`);
});

creatorPublish.addEventListener('click', ()=>{
  creatorPublish.disabled = true;
  const old = creatorPublish.innerHTML;
  creatorPublish.innerHTML = '<i class="fa-solid fa-spinner fa-spin"></i> Posting…';
  try{
    const hasImages = creatorState.images.length > 0;
    const hasVideo = creatorState.mediaType === 'video' && !!creatorState.mediaUrl;
    const validTexts = creatorState.texts.filter(t => t.text && t.text.trim().length > 0);
    let type = 'text';
    if(hasVideo) type = 'video'; else if(hasImages) type = 'image';

    const id = uid('story');
/* ⭐ Video unmuted হলে music data save হবে না */
const videoHasSound = (type === 'video') && !creatorState.videoMuted;
const musicData = (creatorState.music && !videoHasSound) ? {
  id: creatorState.music.id,
  title: creatorState.music.title,
  artist: creatorState.music.artist,
  url: creatorState.music.url,
  duration: creatorState.music.duration,
  cover: creatorState.music.cover || null,
  emoji: creatorState.music.emoji || '🎵',
  hue: creatorState.music.hue || '#5de8ff',
  trimStart: creatorState.music.trimStart || 0,
  trimEnd: creatorState.music.trimEnd || creatorState.music.duration || 180,
  style: creatorState.music.style || 'classic',
  loop: !!creatorState.music.loop
} : null;

    const videoTrimApplied = type === 'video' ? !!creatorState.videoTrimApplied : false;
    const videoTrimStart = type === 'video' ? Number(creatorState.videoTrimStart) || 0 : null;
    const videoTrimEnd = type === 'video' ? Number(creatorState.videoTrimEnd) || null : null;

    const allMentions = [];
    validTexts.forEach(t => { if(t.mentions) t.mentions.forEach(m => { if(!allMentions.some(x=>x.id===m.id)) allMentions.push(m); }); });

    const item = {
      id, userId: CURRENT_USER.id, userName: CURRENT_USER.name, userHandle: CURRENT_USER.username,
      avatar: CURRENT_USER.image, verified: CURRENT_USER.verified, isOwn: true,
      type,
      url: hasVideo ? creatorState.mediaUrl : null,
      images: hasImages ? creatorState.images.map(im=>({...im})) : null,
      bg: (!hasImages && !hasVideo && creatorState.bg !== 'none') ? creatorState.bgStyle : null,
      texts: validTexts.map(t=>({ text: t.text, mentions: t.mentions ? [...t.mentions] : [], style: { ...t.style }, x: t.x, y: t.y, rotation: t.rotation, scale: t.scale })),
      text: validTexts.length === 1 ? validTexts[0].text : null,
      textStyle: validTexts.length === 1 ? { ...validTexts[0].style, x: validTexts[0].x, y: validTexts[0].y, rotation: validTexts[0].rotation, scale: validTexts[0].scale } : null,
      mentions: allMentions,
      stickers: creatorState.stickers.map(s=>({src:s.src, char:s.char, x:s.x, y:s.y, size:s.size, rotation:s.rotation, scale:s.scale})),
      drawing: creatorState.drawing || null,
      music: musicData,
      videoTrimStart, videoTrimEnd,
      videoDuration: type === 'video' ? Number(creatorState.videoDuration) || 0 : null,
      videoTrimApplied,
      videoMuted: type === 'video' ? !!creatorState.videoMuted : false,
      videoItem: type === 'video' && creatorState.videoItem ? {...creatorState.videoItem} : null,
      duration: type === 'video'
        ? (videoTrimApplied && videoTrimEnd != null
            ? Math.min(STORY_VIDEO_MAX * 1000, Math.max(500, (videoTrimEnd - videoTrimStart) * 1000))
            : (creatorState.videoDuration ? Math.min(STORY_VIDEO_MAX * 1000, creatorState.videoDuration * 1000) : 8000))
        : (hasImages ? creatorState.imageDuration : STORY_IMAGE_DURATION),
      createdAt: now(), expiresAt: now() + STORY_LIFETIME,
      viewers: [], privacy: creatorState.privacy, onlyWho: [...creatorState.onlyWho]
    };
    stories[id] = item;
    saveJSON(KEYS.stories, stories);

    stopMusicPreview();
    mvStopTrimLoop();
    mvStopTimerLoop();
    try { const cp = creatorEl.querySelector('#mvVideoPreviewEl'); if(cp) cp.pause(); } catch(e){}
    creatorMediaLayer.querySelectorAll('video').forEach(v=>{ try{ v.pause(); }catch(e){} });

toast('Story shared ✦');
closeCreator();
renderStrip();
/* ⭐ v16.0.7: সব media force-stop, তারপর visible হলেই viewer auto-open */
window.mvStopAllMedia();
setTimeout(()=>{
  if(document.hidden) return;      /* hidden হলে viewer খুলবো না */
  openViewer(CURRENT_USER.id, 0);
}, 400);
  }catch(e){ console.error(e); toast('Failed to share story'); }
  creatorPublish.disabled = false;
  creatorPublish.innerHTML = old;
});

buildCreatorBgGrid();
buildEmojiGrid();

let _mvMomentsBooted = false;

function boot(){
  /* ⭐ FIX: boot must run exactly once.
     defer script + DOMContentLoaded + window.load previously caused
     the whole Moments seed/render pipeline to execute twice. */
  if(_mvMomentsBooted) return;
  _mvMomentsBooted = true;

  try {
    seed();
    cleanExpired();
    renderStrip();
    console.log('[MVMoments] ✅ Strip rendered');
  } catch(err) {
    console.error('[MVMoments] Boot error:', err);
  }
}

/* ⭐ defer script already runs after HTML parsing, so one boot hook is enough. */
if(document.readyState === 'loading'){
  document.addEventListener('DOMContentLoaded', boot, { once: true });
} else {
  boot();
}

window.mvOpenMentionProfile = function(mid){
  const all = Object.values(stories);
  for(const s of all){
    const m = (s.mentions || []).find(x => x.id === mid);
    if(m){ openMentionProfile(m); return; }
  }
};
function openMentionProfile(f){
  const el = document.createElement('div');
  el.className = 'mv-confirm-modal show';
  el.innerHTML = `<div class="mv-confirm-shell"><div class="mv-confirm-icon" style="background:linear-gradient(135deg,rgba(0,229,255,.22),rgba(168,85,247,.18));border-color:rgba(0,229,255,.35);"><img src="${esc(f.image)}" style="width:100%;height:100%;border-radius:50%;object-fit:cover;"></div><h3>${esc(f.name)}</h3><p>${esc(f.username || '@user')}${f.profileId ? ' · ' + esc(f.profileId) : ''}</p><div class="mv-confirm-actions"><button class="mv-confirm-cancel" type="button">Close</button><button class="mv-confirm-ok" type="button">View Profile</button></div></div>`;
  document.body.appendChild(el);
  const close = () => { el.classList.remove('show'); setTimeout(() => el.remove(), 220); };
  el.querySelector('.mv-confirm-cancel').addEventListener('click', close);
  el.querySelector('.mv-confirm-ok').addEventListener('click', () => { close(); toast('Opening ' + f.name + "'s profile"); });
  el.addEventListener('click', (e) => { if(e.target === el) close(); });
}

function renderCreatorMusicSticker(music) {
    const canvas = creatorEl.querySelector('#mvCreatorCanvas');
    let existingWrap = canvas.querySelector('.mv-music-sticker-wrap');
    if (existingWrap) existingWrap.remove();

    if (!music) return;
    if (music.style === 'audio-only') return;

    const wrap = document.createElement('div');
    wrap.className = 'mv-music-sticker-wrap';

    /* ⭐ FIXED position — bottom center, no transform handles */
    wrap.style.left = '50%';
    wrap.style.bottom = '95px';
    wrap.style.top = 'auto';
    wrap.style.transform = 'translateX(-50%)';

    const sticker = document.createElement('div');
    sticker.className = 'mv-music-sticker style-' + (music.style || 'classic');
    sticker.style.position = 'relative';
    sticker.style.bottom = 'auto';
    sticker.style.left = 'auto';
    sticker.style.transform = 'none';

    const txt = `${music.title} · ${music.artist}`;
    const coverHtml = music.cover ? `<img src="${esc(music.cover)}" alt="">` : `<i class="fa-solid fa-music"></i>`;
    const waveformHtml = music.style === 'waveform'
        ? `<div class="mv-sticker-waveform"><span></span><span></span><span></span><span></span><span></span><span></span><span></span></div>`
        : '';

    sticker.innerHTML = `${waveformHtml}<div class="mv-music-sticker-cover">${coverHtml}</div><div class="mv-music-sticker-text-wrap"><span class="mv-music-sticker-text">${esc(txt)}</span></div>`;
    wrap.appendChild(sticker);

    /* ❌ NO attachTransformHandles — bar is fixed, not draggable / resizable / rotatable */

    canvas.appendChild(wrap);

    const textEl = wrap.querySelector('.mv-music-sticker-text');
    const wrapEl = wrap.querySelector('.mv-music-sticker-text-wrap');
    if (textEl && wrapEl && textEl.scrollWidth > wrapEl.clientWidth) {
        const clone = textEl.cloneNode(true);
        wrapEl.appendChild(clone);
        textEl.classList.add('scroll');
        clone.classList.add('scroll');
        textEl.style.paddingRight = '30px';
        clone.style.paddingRight = '30px';
    }
}

/* ⭐ v16.0.8 — FIX: Song was auto-stopping after ~5 seconds.
   আগের version-এ এই interval viewer খোলা না থাকলেই সব media
   pause করে দিত — যার কারণে creator panel-এর music preview
   এবং background music প্রতি 5s-এ kill হয়ে যেত।
   এখন শুধু browser tab সত্যিই hidden হলে pause করবে। */
setInterval(() => {
  if(document.hidden){
    _mvAllMedia.forEach(el => {
      if(el && !el.paused){
        try { el.pause(); } catch(e){}
      }
    });
  }
  /* Set memory cleanup — dead elements remove */
  _mvAllMedia.forEach(el => {
    if(!el || !el.isConnected){ _mvAllMedia.delete(el); }
  });
}, 5000);

window.MVMoments = window.MVMoments || {};

window.MVMoments = window.MVMoments || {};
window.MVMoments.__loaded = true;
window.MVMoments.__version = 'v16.0.6';
window.MVMoments.openCreator = openCreator;
window.MVMoments.openViewer = openViewer;
window.MVMoments.closeViewer = closeViewer;
window.MVMoments.renderStrip = renderStrip;
window.MVMoments.stopAllMedia = mvStopAllStoryMedia;
window.MVMoments.debug = {
  getStories: () => stories,
  getActiveData: () => activeData,
  forceRender: () => { cleanExpired(); renderStrip(); }
};

console.log('[MVMoments v16.0.6] ✅ Video trim 1:30 + mute + auto-music-duration + instant seek loaded');
console.log('[MVMoments] Debug: window.MVMoments.debug.getStories()');

})();