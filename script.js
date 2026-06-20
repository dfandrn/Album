/* ━━━━━━━━━━━━━━━━━━━━━━━━
       CONFIG & STORAGE
    ━━━━━━━━━━━━━━━━━━━━━━━━ */
    const DEFAULT_PASSCODE = "170626";
    const DEFAULT_LOCK_PARAMS = { maxFails: 5, lockSeconds: 30 };

    const LS = {
      passcode: "prv2.passcode",
      fails: "prv2.fails",
      lockUntil: "prv2.lockUntil",
      lockParams: "prv2.lockParams",
      gallery: "prv2.gallery"
    };

    /* ━━━━━━━━━━━━━━━━━━━━━━━━
       GALLERY STATE
    ━━━━━━━━━━━━━━━━━━━━━━━━ */
    let GALLERY = [];

    function loadGallery(){
      try{
        const raw = localStorage.getItem(LS.gallery);
        if(!raw) return [];
        const parsed = JSON.parse(raw);
        return Array.isArray(parsed) ? parsed : [];
      }catch{ return []; }
    }

    function saveGallery(){
      localStorage.setItem(LS.gallery, JSON.stringify(GALLERY));
    }

    function addPhoto(url, title){
      const id = "ph_" + Date.now() + "_" + Math.random().toString(36).slice(2,6);
      GALLERY.push({ id, title: title || "Kenangan", src: url });
      saveGallery();
    }

    function deletePhoto(id){
      GALLERY = GALLERY.filter(p => p.id !== id);
      saveGallery();
    }

    /* ━━━━━━━━━━━━━━━━━━━━━━━━
       LOCK / PASSCODE HELPERS
    ━━━━━━━━━━━━━━━━━━━━━━━━ */
    function getPass(){ return localStorage.getItem(LS.passcode) || DEFAULT_PASSCODE; }
    function setPass(v){ localStorage.setItem(LS.passcode, v); }
    function getFails(){ return parseInt(localStorage.getItem(LS.fails)||"0",10)||0; }
    function setFails(n){ localStorage.setItem(LS.fails, String(n)); }
    function getLockUntil(){ return parseInt(localStorage.getItem(LS.lockUntil)||"0",10)||0; }
    function setLockUntil(ts){ localStorage.setItem(LS.lockUntil, String(ts)); }
    function getLockParams(){
      try{
        const p = JSON.parse(localStorage.getItem(LS.lockParams)||"{}");
        return {
          maxFails: Number.isFinite(p.maxFails) ? p.maxFails : DEFAULT_LOCK_PARAMS.maxFails,
          lockSeconds: Number.isFinite(p.lockSeconds) ? p.lockSeconds : DEFAULT_LOCK_PARAMS.lockSeconds
        };
      }catch{ return {...DEFAULT_LOCK_PARAMS}; }
    }
    function setLockParams(p){ localStorage.setItem(LS.lockParams, JSON.stringify(p)); }

    /* ━━━━━━━━━━━━━━━━━━━━━━━━
       ELEMENTS
    ━━━━━━━━━━━━━━━━━━━━━━━━ */
    const loading = document.getElementById("loading");
    const app = document.getElementById("app");
    const passView = document.getElementById("passView");
    const galleryView = document.getElementById("galleryView");
    const slideBar = document.getElementById("slideBar");
    const codeInput = document.getElementById("code");
    const errBox = document.getElementById("errBox");
    const lockBox = document.getElementById("lockBox");
    const enterBtn = document.getElementById("enterBtn");
    const lockBtn = document.getElementById("lockBtn");
    const settingsBtn = document.getElementById("settingsBtn");
    const addPhotoBtn = document.getElementById("addPhotoBtn");
    const grid = document.getElementById("grid");

    // Add photo modal
    const addOverlay = document.getElementById("addOverlay");
    const addCloseBtn = document.getElementById("addCloseBtn");
    const photoUrl = document.getElementById("photoUrl");
    const photoTitle = document.getElementById("photoTitle");
    const previewBtn = document.getElementById("previewBtn");
    const previewImg = document.getElementById("previewImg");
    const previewPlaceholder = document.getElementById("previewPlaceholder");
    const previewErr = document.getElementById("previewErr");
    const savePhotoBtn = document.getElementById("savePhotoBtn");
    const photoList = document.getElementById("photoList");

    // Settings modal
    const settingsOverlay = document.getElementById("settingsOverlay");
    const settingsCloseBtn = document.getElementById("settingsCloseBtn");
    const newPass = document.getElementById("newPass");
    const savePassBtn = document.getElementById("savePassBtn");
    const resetLockBtn = document.getElementById("resetLockBtn");
    const resetPassBtn = document.getElementById("resetPassBtn");
    const settingsMsg = document.getElementById("settingsMsg");
    const maxFailsEl = document.getElementById("maxFails");
    const lockSecondsEl = document.getElementById("lockSeconds");
    const saveLockParamsBtn = document.getElementById("saveLockParamsBtn");

    // Viewer
    const viewerOverlay = document.getElementById("viewerOverlay");
    const imgWrap = document.getElementById("imgWrap");
    const viewerImgA = document.getElementById("viewerImgA");
    const viewerImgB = document.getElementById("viewerImgB");
    const viewerCap = document.getElementById("viewerCap");
    const viewerMeta = document.getElementById("viewerMeta");
    const viewerCloseBtn = document.getElementById("viewerCloseBtn");
    const prevBtn = document.getElementById("prevBtn");
    const nextBtn = document.getElementById("nextBtn");
    const viewerSlideBtn = document.getElementById("viewerSlideBtn");
    const viewerDots = document.getElementById("viewerDots");
    const viewerProgressFill = document.getElementById("viewerProgressFill");

    // Slideshow
    const slideBtn = document.getElementById("slideBtn");
    const speedSelect = document.getElementById("speedSelect");
    const slideLabelInfo = document.getElementById("slideLabelInfo");

    /* ━━━━━━━━━━━━━━━━━━━━━━━━
       STATE
    ━━━━━━━━━━━━━━━━━━━━━━━━ */
    let lockTimer = null;
    let viewerIndex = 0;
    let activeImg = "A"; // "A" or "B"
    let slideInterval = null;
    let slideProgressInterval = null;
    let slideStartTime = 0;
    let isSlideshowRunning = false;

    /* ━━━━━━━━━━━━━━━━━━━━━━━━
       PASSCODE GATE
    ━━━━━━━━━━━━━━━━━━━━━━━━ */
    function setError(show, text){ errBox.classList.toggle("show", !!show); if(text) errBox.textContent=text; }
    function setLockNotice(show, text){ lockBox.classList.toggle("show", !!show); if(text) lockBox.textContent=text; }

    function lockRemainSec(){ return Math.max(0, Math.ceil((getLockUntil()-Date.now())/1000)); }

    function stopLockTimer(){ if(lockTimer){ clearInterval(lockTimer); lockTimer=null; } }

    function updateLockUI(){
      const until = getLockUntil();
      if(until && until > Date.now()){
        const sec = lockRemainSec();
        setError(false);
        setLockNotice(true, `Terlalu banyak percobaan. Coba lagi setelah ${sec} detik 💔`);
        codeInput.disabled=true; enterBtn.disabled=true;
        stopLockTimer();
        lockTimer = setInterval(()=>{
          const r = lockRemainSec();
          if(r<=0){
            stopLockTimer(); setLockNotice(false);
            codeInput.disabled=false; enterBtn.disabled=false;
            codeInput.focus();
          }else{
            setLockNotice(true, `Terlalu banyak percobaan. Coba lagi setelah ${r} detik 💔`);
          }
        },250);
        return true;
      }
      return false;
    }

    function showPass(){
      galleryView.style.display="none";
      slideBar.style.display="none";
      passView.style.display="block";
      setError(false); setLockNotice(false);
      codeInput.value=""; codeInput.disabled=false; enterBtn.disabled=false;
      codeInput.focus(); stopLockTimer();
      stopSlideshow();
      updateLockUI();
    }

    function showGallery(){
      passView.style.display="none";
      GALLERY = loadGallery();
      renderGallery();
      galleryView.style.display="block";
      slideBar.style.display="flex";
      setError(false); setLockNotice(false);
    }

    enterBtn.addEventListener("click", ()=>{
      const val = (codeInput.value||"").trim();
      if(!val) return;
      if(getLockUntil()>Date.now()){ updateLockUI(); return; }

      if(val === getPass()){
        setFails(0); setLockUntil(0);
        showGallery();
      } else {
        const params = getLockParams();
        const fails = getFails()+1;
        setFails(fails);
        const remaining = Math.max(0, params.maxFails - fails);

        if(fails >= params.maxFails){
          const until = Date.now() + params.lockSeconds*1000;
          setLockUntil(until);
          setError(false);
          setLockNotice(true, `Terlalu banyak percobaan. Coba lagi setelah ${params.lockSeconds} detik 💔`);
          codeInput.disabled=true; enterBtn.disabled=true;
          stopLockTimer();
          lockTimer = setInterval(()=>{
            const r = lockRemainSec();
            if(r<=0){
              stopLockTimer(); setLockNotice(false);
              setFails(0); setLockUntil(0);
              codeInput.disabled=false; enterBtn.disabled=false;
              codeInput.focus();
            }else{
              setLockNotice(true, `Terlalu banyak percobaan. Coba lagi setelah ${r} detik 💔`);
            }
          },250);
        } else {
          setError(true, `Passcode salah. Sisa percobaan: ${remaining} 💔`);
          setLockNotice(false); codeInput.focus();
        }
      }
    });
    codeInput.addEventListener("keydown", e=>{ if(e.key==="Enter") enterBtn.click(); });
    lockBtn.addEventListener("click", showPass);

    /* ━━━━━━━━━━━━━━━━━━━━━━━━
       GALLERY RENDER
    ━━━━━━━━━━━━━━━━━━━━━━━━ */
    function renderGallery(){
  grid.innerHTML="";
  if(GALLERY.length===0){
    grid.innerHTML=`<div class="empty-state"><strong>Album kosong 🌸</strong>Klik "＋ Tambah Foto" untuk mulai mengisi kenangan indah.</div>`;
    return;
  }
  GALLERY.forEach((item,idx)=>{
    const tile = document.createElement("div");
    tile.className="tile";
    tile.tabIndex=0;
    tile.setAttribute("role","button");
    tile.setAttribute("aria-label","Buka "+item.title);
    
    // --- DISINI KITA HUBUNGKAN ---
    tile.addEventListener("click", () => {
      createHeartRain(); // Memicu efek hujan hati
      openViewer(item);  // Membuka foto
    });
    // -----------------------------

    tile.innerHTML = `<img src="${item.src}" alt="${item.title}" loading="lazy" />`;
    grid.appendChild(tile);

        const img = document.createElement("img");
        img.src=item.src; img.alt=item.title;
        img.onerror=()=>{ img.src="data:image/svg+xml,%3Csvg xmlns='http://www.w3.org/2000/svg' width='400' height='300'%3E%3Crect fill='%23200a14' width='400' height='300'/%3E%3Ctext x='50%25' y='50%25' fill='%23e8a0b4' font-size='14' text-anchor='middle' dominant-baseline='middle'%3EGambar gagal load 💔%3C/text%3E%3C/svg%3E"; };

        const cap = document.createElement("div");
        cap.className="cap";

        const capTitle = document.createElement("span");
        capTitle.className="cap-title";
        capTitle.textContent=item.title;

        const delBtn = document.createElement("button");
        delBtn.className="cap-del";
        delBtn.textContent="Hapus";
        delBtn.addEventListener("click", e=>{
          e.stopPropagation();
          if(confirm(`Hapus foto "${item.title}"?`)){
            deletePhoto(item.id);
            renderGallery();
          }
        });

        cap.appendChild(capTitle);
        cap.appendChild(delBtn);
        tile.appendChild(img);
        tile.appendChild(cap);

        tile.addEventListener("click", ()=>openViewer(idx));
        tile.addEventListener("keydown", e=>{ if(e.key==="Enter"||e.key===" "){ e.preventDefault(); openViewer(idx); } });
        grid.appendChild(tile);
      });
    }

    /* ━━━━━━━━━━━━━━━━━━━━━━━━
       ADD PHOTO MODAL
    ━━━━━━━━━━━━━━━━━━━━━━━━ */
    function openAddModal(){
      photoUrl.value=""; photoTitle.value="";
      previewImg.style.display="none"; previewImg.src="";
      previewPlaceholder.style.display="block";
      previewErr.style.display="none";
      savePhotoBtn.disabled=true;
      renderPhotoList();
      addOverlay.classList.add("show");
      photoUrl.focus();
    }
    function closeAddModal(){ addOverlay.classList.remove("show"); }

    function doPreview(){
      const url = photoUrl.value.trim();
      if(!url){ return; }
      previewPlaceholder.style.display="none";
      previewErr.style.display="none";
      previewImg.style.display="none";
      previewImg.src="";

      const tmp = new Image();
      tmp.onload = ()=>{
        previewImg.src=url;
        previewImg.style.display="block";
        savePhotoBtn.disabled=false;
      };
      tmp.onerror = ()=>{
        previewErr.style.display="block";
        savePhotoBtn.disabled=true;
      };
      tmp.src=url;
    }

function renderPhotoList() {
  if (GALLERY.length === 0) {
    photoList.innerHTML = `<div style="text-align:center;color:rgba(255,200,215,.35);font-size:13px;padding:20px;">Belum ada foto.</div>`;
    return;
  }
  photoList.innerHTML = "";
  GALLERY.forEach(item => {
    // 1. Cek status love dari localStorage berdasarkan ID foto
    const isLoved = localStorage.getItem(`love_${item.id}`) === "true";
    
    const el = document.createElement("div");
    el.className = "slide-item";

    el.innerHTML = `
      <img src="${item.src}" alt="${item.title}" onerror="this.style.display='none'" />
      <div class="si-info">
        <div class="si-title">${item.title}</div>
        <div class="si-url">${item.src}</div>
      </div>
      <button class="love-btn ${isLoved ? 'loved' : ''}" style="margin-right: 8px;">
        ${isLoved ? '❤️' : '🤍'}
      </button>
      <button class="si-del" data-id="${item.id}">Hapus</button>
    `;

    // 2. Tambahkan Event Listener untuk Tombol Love
    const loveBtn = el.querySelector(".love-btn");
    loveBtn.addEventListener("click", () => {
      const currentlyLoved = loveBtn.classList.toggle("loved");
      loveBtn.innerHTML = currentlyLoved ? '❤️' : '🤍';
      
      // Simpan status ke localStorage
      localStorage.setItem(`love_${item.id}`, currentlyLoved);
    });

    // 3. Tombol Hapus (dari kodingan lamamu)
    el.querySelector(".si-del").addEventListener("click", () => {
      deletePhoto(item.id);
      renderPhotoList();
      renderGallery();
    });

    photoList.appendChild(el);
  });
    }

    addPhotoBtn.addEventListener("click", openAddModal);
    addCloseBtn.addEventListener("click", closeAddModal);
    addOverlay.addEventListener("click", e=>{ if(e.target===addOverlay) closeAddModal(); });

    previewBtn.addEventListener("click", doPreview);
    photoUrl.addEventListener("keydown", e=>{ if(e.key==="Enter") doPreview(); });

    savePhotoBtn.addEventListener("click", ()=>{
      const url = photoUrl.value.trim();
      const title = photoTitle.value.trim() || "Kenangan";
      if(!url) return;
      addPhoto(url, title);
      GALLERY = loadGallery();
      renderGallery();
      renderPhotoList();
      photoUrl.value=""; photoTitle.value="";
      previewImg.style.display="none"; previewImg.src="";
      previewPlaceholder.style.display="block";
      savePhotoBtn.disabled=true;
    });

    /* ━━━━━━━━━━━━━━━━━━━━━━━━
       SETTINGS MODAL
    ━━━━━━━━━━━━━━━━━━━━━━━━ */
    function showSettingsMsg(type, text){
      settingsMsg.classList.add("show");
      settingsMsg.style.background = type==="ok" ? "rgba(168,230,207,.12)" : "rgba(251,113,133,.12)";
      settingsMsg.style.border = type==="ok" ? "1px solid rgba(168,230,207,.25)" : "1px solid rgba(251,113,133,.25)";
      settingsMsg.style.color = "rgba(255,255,255,.9)";
      settingsMsg.style.borderRadius = "11px";
      settingsMsg.style.padding = "9px 12px";
      settingsMsg.style.fontSize = "13px";
      settingsMsg.textContent = text;
    }

    settingsBtn.addEventListener("click", ()=>{
      const p=getLockParams();
      maxFailsEl.value=String(p.maxFails);
      lockSecondsEl.value=String(p.lockSeconds);
      newPass.value="";
      settingsMsg.classList.remove("show");
      settingsOverlay.classList.add("show");
      settingsCloseBtn.focus();
    });
    settingsCloseBtn.addEventListener("click", ()=>{ settingsOverlay.classList.remove("show"); });
    settingsOverlay.addEventListener("click", e=>{ if(e.target===settingsOverlay) settingsOverlay.classList.remove("show"); });

    savePassBtn.addEventListener("click", ()=>{
      const v=(newPass.value||"").trim();
      if(!v||v.length<1||v.length>64){ showSettingsMsg("err","Passcode tidak valid (1-64 karakter)."); return; }
      setPass(v); setFails(0); setLockUntil(0);
      showSettingsMsg("ok","Passcode berhasil diperbarui 🌸");
    });
    resetLockBtn.addEventListener("click", ()=>{ setFails(0); setLockUntil(0); showSettingsMsg("ok","Lockout direset."); });
    resetPassBtn.addEventListener("click", ()=>{
      setPass(DEFAULT_PASSCODE); setFails(0); setLockUntil(0); newPass.value="";
      showSettingsMsg("ok",`Passcode dikembalikan ke default: "${DEFAULT_PASSCODE}"`);
    });
    saveLockParamsBtn.addEventListener("click", ()=>{
      const mf=parseInt((maxFailsEl.value||"").trim(),10);
      const ls=parseInt((lockSecondsEl.value||"").trim(),10);
      if(!Number.isFinite(mf)||mf<1||mf>25){ showSettingsMsg("err","Maks salah harus 1-25."); return; }
      if(!Number.isFinite(ls)||ls<5||ls>600){ showSettingsMsg("err","Durasi lock harus 5-600 detik."); return; }
      setLockParams({maxFails:mf,lockSeconds:ls}); setFails(0); setLockUntil(0);
      showSettingsMsg("ok","Parameter lockout disimpan 🌸");
    });

    /* ━━━━━━━━━━━━━━━━━━━━━━━━
       FULLSCREEN VIEWER
    ━━━━━━━━━━━━━━━━━━━━━━━━ */
    function buildDots(){
      viewerDots.innerHTML="";
      if(GALLERY.length<=1) return;
      GALLERY.forEach((_,i)=>{
        const d=document.createElement("div");
        d.className="dot"+(i===viewerIndex?" active":"");
        viewerDots.appendChild(d);
      });
    }
    function updateDots(){
      const dots=viewerDots.querySelectorAll(".dot");
      dots.forEach((d,i)=>d.classList.toggle("active",i===viewerIndex));
    }

    function setViewerContent(idx, dir){
      if(GALLERY.length===0) return;
      if(idx<0) idx=GALLERY.length-1;
      if(idx>=GALLERY.length) idx=0;
      viewerIndex=idx;

      const item=GALLERY[viewerIndex];
      viewerCap.textContent=item.title;
      viewerMeta.textContent=`Foto ${viewerIndex+1} dari ${GALLERY.length}`;

      const current = activeImg==="A" ? viewerImgA : viewerImgB;
      const next = activeImg==="A" ? viewerImgB : viewerImgA;

      next.src=item.src;
      next.className="hidden-img";
      next.style.opacity="0";
      next.style.transform="translateX("+(dir>0?"60px":"-60px")+")";
      next.classList.remove("hidden-img");
      next.style.display="block";

      requestAnimationFrame(()=>{
        requestAnimationFrame(()=>{
          next.style.transition="opacity .32s ease, transform .32s ease";
          next.style.opacity="1";
          next.style.transform="translateX(0)";
          current.style.transition="opacity .32s ease, transform .32s ease";
          current.style.opacity="0";
          current.style.transform="translateX("+(dir>0?"-50px":"50px")+")";
          setTimeout(()=>{
            current.style.display="none";
            current.style.transition="";
            next.style.transition="";
            activeImg = activeImg==="A" ? "B" : "A";
          },340);
        });
      });

      updateDots();
    }

    function openViewer(idx){
      if(GALLERY.length===0) return;
      if(idx<0) idx=0;
      if(idx>=GALLERY.length) idx=GALLERY.length-1;
      viewerIndex=idx;
      activeImg="A";

      const item=GALLERY[viewerIndex];
      viewerImgA.src=item.src; viewerImgA.style.display="block"; viewerImgA.style.opacity="1"; viewerImgA.style.transform="";
      viewerImgB.src=""; viewerImgB.style.display="none"; viewerImgB.style.opacity="0";
      viewerCap.textContent=item.title;
      viewerMeta.textContent=`Foto ${viewerIndex+1} dari ${GALLERY.length}`;
      buildDots();

      viewerOverlay.classList.add("show");
      viewerOverlay.setAttribute("aria-hidden","false");
      viewerCloseBtn.focus();
    }

    function closeViewer(){
      viewerOverlay.classList.remove("show");
      viewerOverlay.setAttribute("aria-hidden","true");
      stopSlideshow();
    }

    function navigateViewer(dir){
      stopSlideshowTimer();
      setViewerContent(viewerIndex+dir, dir);
      if(isSlideshowRunning) startSlideshowTimer();
    }

    viewerCloseBtn.addEventListener("click", closeViewer);
    prevBtn.addEventListener("click", ()=>navigateViewer(-1));
    nextBtn.addEventListener("click", ()=>navigateViewer(1));
    viewerOverlay.addEventListener("click", e=>{ if(e.target===viewerOverlay) closeViewer(); });

    /* ━━━━━━━━━━━━━━━━━━━━━━━━
       SLIDESHOW ENGINE
    ━━━━━━━━━━━━━━━━━━━━━━━━ */
    function getSpeed(){ return parseInt(speedSelect.value,10)||4000; }

    function startSlideshowTimer(){
      stopSlideshowTimer();
      slideStartTime=Date.now();
      const spd=getSpeed();
      viewerProgressFill.style.width="0%";

      slideProgressInterval=setInterval(()=>{
        const elapsed=Date.now()-slideStartTime;
        const pct=Math.min(100,(elapsed/spd)*100);
        viewerProgressFill.style.width=pct+"%";
      },80);

      slideInterval=setTimeout(()=>{
        setViewerContent(viewerIndex+1, 1);
        if(isSlideshowRunning) startSlideshowTimer();
      }, spd);
    }

    function stopSlideshowTimer(){
      if(slideInterval){ clearTimeout(slideInterval); slideInterval=null; }
      if(slideProgressInterval){ clearInterval(slideProgressInterval); slideProgressInterval=null; }
      viewerProgressFill.style.width="0%";
    }

    function startSlideshow(){
      if(GALLERY.length<2) return;
      isSlideshowRunning=true;

      // Open viewer if not open
      if(!viewerOverlay.classList.contains("show")) openViewer(0);

      slideBtn.textContent="⏸ Berhenti";
      viewerSlideBtn.textContent="⏸ Berhenti";
      slideLabelInfo.style.display="inline";
      slideLabelInfo.textContent=`Slide ${viewerIndex+1}/${GALLERY.length}`;
      startSlideshowTimer();
    }

    function stopSlideshow(){
      isSlideshowRunning=false;
      stopSlideshowTimer();
      slideBtn.textContent="▶ Putar";
      viewerSlideBtn.textContent="▶ Slideshow";
      slideLabelInfo.style.display="none";
    }

    slideBtn.addEventListener("click", ()=>{
      if(GALLERY.length===0){ alert("Tambah foto dulu ya 🌸"); return; }
      if(GALLERY.length<2){ alert("Minimal 2 foto untuk slideshow 🌸"); return; }
      if(isSlideshowRunning) stopSlideshow(); else startSlideshow();
    });

    viewerSlideBtn.addEventListener("click", ()=>{
      if(isSlideshowRunning) stopSlideshow(); else {
        if(GALLERY.length<2){ return; }
        startSlideshow();
      }
    });

    speedSelect.addEventListener("change", ()=>{
      if(isSlideshowRunning){ stopSlideshowTimer(); startSlideshowTimer(); }
    });

    /* Update label while slideshow runs */
    const _origSetViewerContent = setViewerContent;

    /* ━━━━━━━━━━━━━━━━━━━━━━━━
       KEYBOARD
    ━━━━━━━━━━━━━━━━━━━━━━━━ */
    window.addEventListener("keydown", e=>{
      if(viewerOverlay.classList.contains("show")){
        if(e.key==="Escape") closeViewer();
        if(e.key==="ArrowRight") navigateViewer(1);
        if(e.key==="ArrowLeft") navigateViewer(-1);
      } else if(settingsOverlay.classList.contains("show")){
        if(e.key==="Escape") settingsOverlay.classList.remove("show");
      } else if(addOverlay.classList.contains("show")){
        if(e.key==="Escape") closeAddModal();
      }
    });

    /* ━━━━━━━━━━━━━━━━━━━━━━━━
       BOOT
    ━━━━━━━━━━━━━━━━━━━━━━━━ */
    const minLoad=1600;
    const startTime=Date.now();
    window.addEventListener("load", ()=>{
      const remaining=Math.max(0, minLoad-(Date.now()-startTime));
      setTimeout(()=>{
        loading.classList.add("hidden");
        app.classList.add("show");
        setTimeout(()=>{ loading.style.display="none"; showPass(); }, 380);
      }, remaining);
    });

    updateLockUI();
    
    // Ambil elemen audio dan tombol
const music = document.getElementById("bgMusic");
const musicBtn = document.getElementById("musicBtn");

// Fungsi untuk play/pause musik
musicBtn.addEventListener("click", () => {
    if (music.paused) {
        music.play();
        musicBtn.textContent = "⏸"; // Ikon pause saat musik jalan
    } else {
        music.pause();
        musicBtn.textContent = "🎵"; // Ikon nada saat musik berhenti
    }
});

// Opsional: Musik otomatis jalan saat klik tombol "Masuk"
enterBtn.addEventListener("click", () => {
    // ... (kode pengecekan password kamu) ...
    if(val === getPass()){
        // ... (kode sukses login) ...
        music.play().catch(e => console.log("Menunggu interaksi pengguna"));
        musicBtn.textContent = "⏸";
    }
});

function createHeartRain() {
  const container = document.getElementById("heartRainContainer");
  for (let i = 0; i < 15; i++) { // Jumlah hati yang jatuh
    const heart = document.createElement("div");
    heart.innerHTML = "❤️";
    heart.className = "heart";
    heart.style.left = Math.random() * 100 + "vw";
    heart.style.animationDuration = (Math.random() * 2 + 2) + "s";
    container.appendChild(heart);
    
    // Hapus hati setelah animasi selesai
    setTimeout(() => heart.remove(), 4000);
  }
  
  
}
const pesanCinta = [
    "HAI SAYANGG",
    "foto kamu ga akan hilang sayangg..!",
    "aku kangen kamu...",
    "love you sayangg.",
    "Senyum kamu cantik banget di sini.",
    "selalu ada momen indah di sini!"
];

function munculinPesan() {
    const box = document.getElementById("fake-chat-box");
    const text = document.getElementById("chat-text");
    
    // Pilih pesan acak
    const randomPesan = pesanCinta[Math.floor(Math.random() * pesanCinta.length)];
    text.innerText = randomPesan;
    
    // Munculkan
    box.style.opacity = "1";
    
    // Hilangkan setelah 3 detik
    setTimeout(() => {
        box.style.opacity = "0";
    }, 3000);
}

// Munculkan pesan setiap 10 detik sekali
setInterval(munculinPesan, 10000);
