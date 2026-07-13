// Your web app's Firebase configuration
const firebaseConfig = {
  apiKey: "AIzaSyBVySOa-aYt2j5KajwLcM5iGpMwsvCOI5Y",
  authDomain: "studio-7843197521-70b91.firebaseapp.com",
  projectId: "studio-7843197521-70b91",
  storageBucket: "studio-7843197521-70b91.firebasestorage.app",
  messagingSenderId: "897560915380",
  appId: "1:897560915380:web:9a80e59bd636b03fba16e1"
};

// Initialize Firebase & Firestore using compat SDK globals
firebase.initializeApp(firebaseConfig);
const db = firebase.firestore();

// State model
const STATE = {
  views: 1050,
  wishesCount: 660,
  crashesCount: 270,
  photos: [],
  wishes: [],
  currentSlide: 0,
  currentUser: null // 'shanitah' or 'admin'
};

const DEFAULT_PHOTOS = [
  "https://images.unsplash.com/photo-1513151233558-d860c5398176?auto=format&fit=crop&q=80&w=800",
  "https://images.unsplash.com/photo-1530103862676-de8c9debad1d?auto=format&fit=crop&q=80&w=800",
  "https://images.unsplash.com/photo-1464366400600-7168b8af9bc3?auto=format&fit=crop&q=80&w=800"
];

// Document reference for single global stats document
const statsDocRef = db.collection("stats").doc("global");

document.addEventListener('DOMContentLoaded', () => {
  generateFloatingBubbles();
  initAuthSession();
  initStatsSync();
  initWishesSync();
  initPhotosSync();
  initSliderControls();
  initLoginForm();
  initWishSubmission();
});

// 1. Generate bubbles
function generateFloatingBubbles() {
  const container = document.getElementById('bubbleBg');
  const count = window.innerWidth < 600 ? 6 : 12; // fewer bubbles on phone to keep it smooth
  for (let i = 0; i < count; i++) {
    const bubble = document.createElement('div');
    bubble.className = 'floating-bubble';
    const size = Math.random() * 50 + 35;
    bubble.style.width = `${size}px`;
    bubble.style.height = `${size}px`;
    bubble.style.left = `${Math.random() * 100}%`;
    bubble.style.animationDelay = `${Math.random() * 10}s`;
    bubble.style.animationDuration = `${Math.random() * 12 + 12}s`;
    container.appendChild(bubble);
  }
}

// 2. Stats Dashboard Realtime & Simulation Auto-increase
function initStatsSync() {
  const viewEl = document.getElementById('viewCount');
  const wishEl = document.getElementById('wishCount');
  const crashEl = document.getElementById('crashCount');

  // Real-time listener for global stats
  statsDocRef.onSnapshot((snapshot) => {
    if (snapshot.exists) {
      const data = snapshot.data();
      STATE.views = data.views || 1050;
      STATE.wishesCount = data.wishesCount || 660;
      STATE.crashesCount = data.crashesCount || 270;
    } else {
      // Create defaults
      statsDocRef.set({ views: 1050, wishesCount: 660, crashesCount: 270 });
    }
    
    // Render on screen
    viewEl.textContent = STATE.views >= 1200 ? '1.2K' : STATE.views;
    wishEl.textContent = STATE.wishesCount >= 700 ? '700+' : STATE.wishesCount;
    crashEl.textContent = STATE.crashesCount >= 300 ? '300+' : STATE.crashesCount;
  });

  // Views increment simulation: caps at 1200
  setInterval(() => {
    if (STATE.views < 1200) {
      const inc = Math.floor(Math.random() * 3) + 1;
      const nextVal = Math.min(STATE.views + inc, 1200);
      statsDocRef.update({ views: nextVal }).catch(e => console.warn(e));
    }
  }, 10000);

  // Wishes increment simulation: caps at 700
  setInterval(() => {
    if (STATE.wishesCount < 700) {
      const nextVal = Math.min(STATE.wishesCount + 1, 700);
      statsDocRef.update({ wishesCount: nextVal }).catch(e => console.warn(e));
    }
  }, 60000);

  // Crashes increment simulation: caps at 300
  setInterval(() => {
    if (STATE.crashesCount < 300) {
      const nextVal = Math.min(STATE.crashesCount + 1, 300);
      statsDocRef.update({ crashesCount: nextVal }).catch(e => console.warn(e));
    }
  }, 90000);
}

// 3. Sync Wishes from Firestore in real-time
function initWishesSync() {
  const wishesList = document.getElementById('wishesList');
  db.collection("wishes").orderBy("timestamp", "desc").onSnapshot((snapshot) => {
    STATE.wishes = [];
    snapshot.forEach(doc => {
      STATE.wishes.push({ id: doc.id, ...doc.data() });
    });

    wishesList.innerHTML = '';
    
    if (STATE.wishes.length === 0) {
      wishesList.innerHTML = `<p class="placeholder-text" style="text-align: center; color: var(--text-muted); padding: 2rem;">No wishes posted yet. Write the first wish for Shanitah! 💜</p>`;
      return;
    }

    STATE.wishes.forEach(wish => {
      const wishItem = document.createElement('div');
      wishItem.className = 'wish-item';
      
      const timeStr = wish.timestamp ? new Date(wish.timestamp).toLocaleTimeString([], {hour: '2-digit', minute:'2-digit'}) : 'Just now';
      
      wishItem.innerHTML = `
        <div class="wish-item-header">
          <span>${escapeHTML(wish.name)}</span>
          <span class="wish-date">${timeStr}</span>
        </div>
        <p class="wish-text">${escapeHTML(wish.message)}</p>
      `;
      wishesList.appendChild(wishItem);
    });
  });
}

// 4. Sync Photos from Firestore in real-time
function initPhotosSync() {
  db.collection("photos").orderBy("timestamp", "asc").onSnapshot((snapshot) => {
    STATE.photos = [];
    snapshot.forEach(doc => {
      STATE.photos.push({ id: doc.id, base64: doc.data().base64 });
    });

    renderSlider();
    if (STATE.currentUser === 'admin') {
      renderAdminPhotos();
    }
  });
}

// Slider Renderer
function renderSlider() {
  const slider = document.getElementById('photoSlider');
  const dotsContainer = document.getElementById('carouselDots');
  
  slider.innerHTML = '';
  dotsContainer.innerHTML = '';

  const photosList = STATE.photos.length > 0 ? STATE.photos.map(p => p.base64) : DEFAULT_PHOTOS;

  photosList.forEach((src, index) => {
    const slide = document.createElement('div');
    slide.className = `slide ${index === STATE.currentSlide ? 'active' : ''}`;
    
    const img = document.createElement('img');
    img.src = src;
    img.alt = `Birthday memory ${index + 1}`;
    
    slide.appendChild(img);
    slider.appendChild(slide);

    const dot = document.createElement('div');
    dot.className = `dot ${index === STATE.currentSlide ? 'active' : ''}`;
    dot.addEventListener('click', () => showSlide(index));
    dotsContainer.appendChild(dot);
  });
}

function showSlide(index) {
  const photosList = STATE.photos.length > 0 ? STATE.photos.map(p => p.base64) : DEFAULT_PHOTOS;
  if (index >= photosList.length) STATE.currentSlide = 0;
  else if (index < 0) STATE.currentSlide = photosList.length - 1;
  else STATE.currentSlide = index;

  const slides = document.querySelectorAll('.slide');
  const dots = document.querySelectorAll('.dot');
  
  slides.forEach((slide, i) => {
    slide.classList.toggle('active', i === STATE.currentSlide);
  });
  dots.forEach((dot, i) => {
    dot.classList.toggle('active', i === STATE.currentSlide);
  });
}

function initSliderControls() {
  const prevBtn = document.getElementById('prevBtn');
  const nextBtn = document.getElementById('nextBtn');
  
  prevBtn.addEventListener('click', () => showSlide(STATE.currentSlide - 1));
  nextBtn.addEventListener('click', () => showSlide(STATE.currentSlide + 1));
  
  // Auto-rotating slider every 6s
  setInterval(() => {
    showSlide(STATE.currentSlide + 1);
  }, 6000);
}

// 5. Submit Wishes
function initWishSubmission() {
  const wishForm = document.getElementById('wishForm');
  wishForm.addEventListener('submit', async (e) => {
    e.preventDefault();
    const nameInput = document.getElementById('senderName');
    const anonCheckbox = document.getElementById('anonymousWish');
    const messageInput = document.getElementById('senderMessage');

    const name = anonCheckbox.checked ? "Unidentified" : (nameInput.value.trim() || "Unidentified");
    const message = messageInput.value.trim();

    try {
      await db.collection("wishes").add({
        name: name,
        message: message,
        timestamp: Date.now()
      });

      // Increment Wishes count in Firestore
      const nextWishes = Math.min(STATE.wishesCount + 1, 700);
      await statsDocRef.update({ wishesCount: nextWishes });

      // Clear Form
      nameInput.value = '';
      anonCheckbox.checked = false;
      messageInput.value = '';
    } catch (e) {
      console.error("Failed to post wish to Firebase:", e);
    }
  });
}

// 6. Login & Authenticated Views
function initLoginForm() {
  const loginTrigger = document.getElementById('loginTrigger');
  const loginModal = document.getElementById('loginModal');
  const modalClose = document.getElementById('modalClose');
  const loginBtn = document.getElementById('loginBtn');
  const usernameInput = document.getElementById('usernameInput');
  const passwordInput = document.getElementById('passwordInput');
  const loginError = document.getElementById('loginError');

  // Trigger modal visibility
  loginTrigger.addEventListener('click', () => {
    loginModal.classList.add('show');
  });

  modalClose.addEventListener('click', () => {
    loginModal.classList.remove('show');
    usernameInput.value = '';
    passwordInput.value = '';
    loginError.textContent = '';
  });

  // Login handler
  loginBtn.addEventListener('click', () => {
    const user = usernameInput.value.trim();
    const pass = passwordInput.value;

    if (user === 'Shanitah' && pass === 'withlovefromshayne') {
      STATE.currentUser = 'shanitah';
      localStorage.setItem('birthday_user', 'shanitah');
      setupShanitahView();
      loginModal.classList.remove('show');
    } else if (user === 'admin@shanitah.com' && pass === 'Kyeyuneneithen1$') {
      STATE.currentUser = 'admin';
      localStorage.setItem('birthday_user', 'admin');
      setupAdminView();
    } else {
      loginError.textContent = 'Incorrect credentials. Try again!';
    }
  });
}

function initAuthSession() {
  const savedUser = localStorage.getItem('birthday_user');
  if (savedUser === 'shanitah') {
    STATE.currentUser = 'shanitah';
    setupShanitahView();
  } else if (savedUser === 'admin') {
    STATE.currentUser = 'admin';
    setupAdminView();
  }
}

// Setup Shanitah's special view layout
function setupShanitahView() {
  const container = document.getElementById('specialMessageContainer');
  const unlockBtn = document.getElementById('unlockMsgBtn');
  const secretLetter = document.getElementById('secretLetter');
  
  container.classList.remove('hidden');

  unlockBtn.addEventListener('click', () => {
    secretLetter.classList.remove('hidden');
    unlockBtn.classList.add('hidden');
  });

  document.getElementById('loginTrigger').textContent = '🎂💜';
}

// Setup Admin Dashboard and events
function setupAdminView() {
  document.getElementById('loginView').classList.add('hidden');
  document.getElementById('adminDashboardView').classList.remove('hidden');
  document.getElementById('loginTrigger').textContent = '🎂🛠️';

  // Load current values to inputs
  document.getElementById('adminViewsInput').value = STATE.views;
  document.getElementById('adminWishesInput').value = STATE.wishesCount;
  document.getElementById('adminCrashesInput').value = STATE.crashesCount;

  // Handle stat updates
  document.getElementById('updateStatsBtn').onclick = async () => {
    const v = parseInt(document.getElementById('adminViewsInput').value) || 0;
    const w = parseInt(document.getElementById('adminWishesInput').value) || 0;
    const c = parseInt(document.getElementById('adminCrashesInput').value) || 0;

    await statsDocRef.update({
      views: v,
      wishesCount: w,
      crashesCount: c
    });
    alert("Stats updated successfully in Firestore!");
  };

  // Image Upload handler
  const imageUpload = document.getElementById('imageUpload');
  imageUpload.onchange = (e) => {
    const file = e.target.files[0];
    if (!file) return;

    const reader = new FileReader();
    reader.onload = async function(event) {
      const base64String = event.target.result;
      
      await db.collection("photos").add({
        base64: base64String,
        timestamp: Date.now()
      });
    };
    reader.readAsDataURL(file);
  };

  // Setup wish clearing option
  document.getElementById('clearWishesBtn').onclick = async () => {
    if (confirm("Reset/Delete all custom wishes?")) {
      STATE.wishes.forEach(async (w) => {
        await db.collection("wishes").doc(w.id).delete();
      });
    }
  };

  renderAdminPhotos();
}

// Render administrative photo list with delete button triggers
function renderAdminPhotos() {
  const adminPhotoGrid = document.getElementById('adminPhotoGrid');
  adminPhotoGrid.innerHTML = '';

  STATE.photos.forEach((photo) => {
    const item = document.createElement('div');
    item.className = 'admin-photo-item';
    
    const img = document.createElement('img');
    img.src = photo.base64;

    const deleteBtn = document.createElement('button');
    deleteBtn.className = 'admin-photo-delete';
    deleteBtn.innerHTML = '&times;';
    deleteBtn.onclick = async () => {
      await db.collection("photos").doc(photo.id).delete();
    };

    item.appendChild(img);
    item.appendChild(deleteBtn);
    adminPhotoGrid.appendChild(item);
  });
}

// Security / HTML Escaping Utility
function escapeHTML(str) {
  return str.replace(/[&<>'"]/g, 
    tag => ({
      '&': '&amp;',
      '<': '&lt;',
      '>': '&gt;',
      "'": '&#39;',
      '"': '&quot;'
    }[tag] || tag)
  );
}
