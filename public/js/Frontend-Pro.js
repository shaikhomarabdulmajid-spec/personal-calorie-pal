/**
 * CalCatcher Pro v3.1 — Elite Polished Standard
 * Augmented with Reactive Notifications & Global Search
 */

const escapeHTML = (str) => {
    if (typeof str !== 'string') return str;
    return str.replace(/[&<>"']/g, tag => ({
        '&': '&amp;', '<': '&lt;', '>': '&gt;', '"': '&quot;', "'": '&#39;'
    }[tag] || tag));
};

// --- 1. REACTIVE STATE ENGINE ---
const Store = {
    state: {
        user: JSON.parse(localStorage.getItem('calcatcher_user')) || null,
        token: localStorage.getItem('calcatcher_token') || null,
        view: localStorage.getItem('calcatcher_token') ? 'dashboard' : 'login',
        meals: [],
        dailyGoal: 2000,
        currentCalories: 0,
        isAnalyzing: false,
        analysisStatus: 'Ready',
        showSearch: false,
        searchResults: [],
        isSearching: false,
        macros: { protein: 0, carbs: 0, fat: 0 },
        notifications: []
    },

    listeners: [],
    subscribe(fn) { this.listeners.push(fn); },
    notify() {
        window.requestAnimationFrame(() => {
            this.listeners.forEach(fn => fn(this.state));
        });
    },

    update(patch) {
        this.state = { ...this.state, ...patch };
        this.notify();
    },

    setAuth(user, token) {
        this.update({ user, token });
        if (token) {
            localStorage.setItem('calcatcher_token', token);
            localStorage.setItem('calcatcher_user', JSON.stringify(user));
        } else {
            localStorage.clear();
        }
    },

    recalculateTotals() {
        const currentCalories = this.state.meals.reduce((sum, m) => sum + m.calories, 0);
        const macros = {
            protein: Math.round(currentCalories * 0.1 / 4),
            carbs: Math.round(currentCalories * 0.6 / 4),
            fat: Math.round(currentCalories * 0.3 / 9)
        };
        this.update({ currentCalories, macros });
    },

    notifyUser(message, type = 'info') {
        const id = Date.now();
        const notifications = [...this.state.notifications, { id, message, type }];
        this.update({ notifications });
        setTimeout(() => {
            this.update({ notifications: this.state.notifications.filter(n => n.id !== id) });
        }, 4000);
    }
};

// --- 2. ELITE UI COMPONENTS ---
const Components = {
    Background: () => `<div class="mesh-bg"></div>`,

    Notifications: (state) => `
    <div class="notification-area">
      ${state.notifications.map(n => `
        <div class="notification-toast ${n.type} fade-in-up">
          ${n.message}
        </div>
      `).join('')}
    </div>
  `,

    Login: () => `
    <div class="login-wrapper">
      <div class="login-card fade-in-up">
        <div class="login-emoji">⚡</div>
        <h1 class="login-title">CalCatcher Pro</h1>
        <p class="subtitle mb-20">Elite Nutritional Intelligence.</p>
        <form onsubmit="event.preventDefault(); Actions.login()">
          <input type="text" class="input-field" placeholder="Username" id="l-user" required maxlength="20">
          <input type="password" class="input-field" placeholder="Password" id="l-pass" required>
          <button type="submit" class="btn-primary w-full" id="l-btn">Initialize Session</button>
        </form>
        <p class="text-center mt-20" style="font-size: 14px;">
          Unauthorized? <a href="#" onclick="Store.update({view:'register'})" style="color: var(--primary); font-weight: 700;">Request Access</a>
        </p>
      </div>
    </div>
  `,

    Register: () => `
    <div class="login-wrapper">
      <div class="login-card fade-in-up">
        <div class="login-emoji">🧬</div>
        <h1 class="login-title">Provision Instance</h1>
        <p class="subtitle mb-20">Secure your biometric footprint.</p>
        <form onsubmit="event.preventDefault(); Actions.register()">
          <input type="text" class="input-field" placeholder="Username" id="r-user" required maxlength="20">
          <input type="password" class="input-field" placeholder="Password" id="r-pass" required minlength="6">
          <button type="submit" class="btn-primary w-full" id="r-btn">Confirm Provision</button>
        </form>
        <p class="text-center mt-20" style="font-size: 14px;">
          Authorized? <a href="#" onclick="Store.update({view:'login'})" style="color: var(--primary); font-weight: 700;">Return to Console</a>
        </p>
      </div>
    </div>
  `,

    Dashboard: (state) => {
        const offset = 502 - Math.min((state.currentCalories / state.dailyGoal) * 502, 502);
        return `
      <div class="desktop-sidebar">
        <div class="sidebar-brand">🥗 CalCatcher</div>
        <div class="desktop-nav-item active"><i class="fas fa-microchip"></i> Analytics</div>
        <div class="desktop-nav-item" onclick="document.getElementById('fIn').click()"><i class="fas fa-camera"></i> Vision Scan</div>
        <div class="desktop-nav-item" onclick="Actions.toggleSearch()"><i class="fas fa-search"></i> Food Database</div>
        <div class="mt-auto">
          <div class="desktop-nav-item" onclick="Actions.logout()" style="color: var(--accent)"><i class="fas fa-sign-out-alt"></i> Terminate</div>
        </div>
      </div>
      <div class="main-content">
        <div class="fade-in-up">
          <div class="flex-between mb-20">
            <div>
              <p class="subtitle">Environment: Production</p>
              <h2>${escapeHTML(state.user?.username)}</h2>
            </div>
            <div class="user-avatar" style="background: white;">🥗</div>
          </div>

          <div class="glass-card">
            <div class="ring-container">
              <svg width="220" height="220">
                <circle class="ring-bg" cx="110" cy="110" r="80"></circle>
                <circle class="ring-progress" cx="110" cy="110" r="80" stroke-dasharray="502" stroke-dashoffset="${offset}"></circle>
              </svg>
              <div class="ring-content">
                <span class="kcal-number">${state.currentCalories}</span>
                <span class="kcal-label">kcal logged</span>
              </div>
            </div>
          </div>

          <h3 style="margin: 32px 0 16px 0;">Intelligence Feedback</h3>
          <div class="meal-list">
            ${state.meals.length === 0 ? `
              <div class="glass-card text-center" style="padding: 60px 40px; border-style: dashed; background: transparent;">
                <div style="font-size: 48px; margin-bottom: 20px;">🕸️</div>
                <h4>No Entropic Data</h4>
                <p style="color: var(--text-muted); font-size: 14px;">Perform a Vision Scan to populate your log.</p>
              </div>
            ` :
                state.meals.map(m => `
              <div class="glass-card meal-item">
                <div class="meal-icon">🥗</div>
                <div class="meal-info">
                  <div class="meal-name">${escapeHTML(m.name)}</div>
                  <div class="meal-time">${new Date(m.created_at).toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' })}</div>
                </div>
                <div class="meal-cal" style="color: ${m.score > 0 ? 'var(--primary)' : 'var(--accent)'}">${m.calories}kcal</div>
              </div>
            `).join('')
            }
          </div>
        </div>
      </div>
      <div class="stats-panel">
        <h3>Bio-Matrix</h3>
        <div class="macro-row">
          <div class="macro-label"><span>Protein</span><span>${state.macros.protein}g</span></div>
          <div class="progress-bar-bg"><div class="progress-bar-fill" style="width: ${Math.min(state.macros.protein, 100)}%; background: var(--accent);"></div></div>
        </div>
        <div class="macro-row">
          <div class="macro-label"><span>Carbohydrates</span><span>${state.macros.carbs}g</span></div>
          <div class="progress-bar-bg"><div class="progress-bar-fill" style="width: ${Math.min(state.macros.carbs / 2, 100)}%; background: var(--primary);"></div></div>
        </div>
        <div class="glass-card" style="margin-top: auto; padding: 20px;">
          <div class="flex-between">
            <div style="font-weight: 800;">Efficiency</div>
            <div style="font-size: 12px; color: var(--primary)">${Math.round((state.currentCalories / state.dailyGoal) * 100)}%</div>
          </div>
          <div class="progress-bar-bg" style="margin-top: 12px;"><div class="progress-bar-fill" style="width: ${Math.min((state.currentCalories / state.dailyGoal) * 100, 100)}%;"></div></div>
        </div>
      </div>
      ${state.showSearch ? Components.Search(state) : ''}
      <div class="scan-btn-wrapper"><button class="scan-btn" onclick="document.getElementById('fIn').click()" aria-label="New Scan">+</button></div>
      <input type="file" id="fIn" hidden onchange="Actions.handleUpload(this)" accept="image/*">
    `;
    },

    Search: (state) => `
    <div class="modal-overlay" role="dialog" onclick="if(event.target === this) Actions.toggleSearch()">
      <div class="modal-card">
        <div class="modal-header"><h3>Matrix Database</h3><button class="modal-close" onclick="Actions.toggleSearch()">&times;</button></div>
        <input type="text" class="input-field" placeholder="Search biological entries..." oninput="Actions.searchFood(this.value)">
        <div class="search-results">
          ${state.isSearching ? '<div class="text-center p-20">Querying Matrix...</div>' :
            state.searchResults.length === 0 ? '<p class="text-center" style="padding: 20px; color: var(--text-muted)">Query initialized...</p>' :
                state.searchResults.map(f => `<div class="search-item" onclick="Store.notifyUser('Manual logging coming soon', 'info')"><strong>${f.name}</strong><span>${f.calories} kcal</span></div>`).join('')
        }
        </div>
      </div>
    </div>
  `,

    Loading: (state) => `
    <div class="loading-overlay">
      <div class="loading-emoji">🛰️</div>
      <h2>Neural Processing</h2>
      <p style="color: var(--text-muted); margin-top: 14px; letter-spacing: 1px; font-weight: 700; text-transform: uppercase; font-size: 11px;">${state.analysisStatus}</p>
      <div style="width: 200px; height: 3px; background: rgba(0,0,0,0.05); margin-top: 24px; border-radius: 10px; overflow: hidden;">
        <div style="width: 100%; height: 100%; background: var(--primary); animation: loadLine 1.5s infinite var(--smooth);"></div>
      </div>
    </div>
  `
};

// --- 3. BUSINESS ACTIONS ---
const Actions = {
    socket: null,
    searchDebounce: null,

    init() {
        Store.subscribe(Render);
        if (Store.state.token) {
            this.initSocket();
            this.fetchMeals();
        }
        Render(Store.state);
    },

    initSocket() {
        if (!Store.state.user) return;
        this.socket = io({ reconnectionAttempts: 5 });
        this.socket.emit('join', Store.state.user.id);

        this.socket.on('job:update', (data) => {
            if (data.status === 'processing') Store.update({ analysisStatus: 'Extracting Nutritional Matrix...' });
            if (data.status === 'completed') {
                Store.update({ isAnalyzing: false, analysisStatus: 'Ready' });
                Store.notifyUser(`Analyzed: ${data.result.name}`, 'success');
                this.fetchMeals();
            }
            if (data.status === 'failed') {
                Store.update({ isAnalyzing: false });
                Store.notifyUser("Neural disruption detected. Retry authentication.", "error");
            }
        });

        this.socket.on('disconnect', () => console.warn("Socket stream interrupted."));
    },

    async register() {
        const username = document.getElementById('r-user').value;
        const password = document.getElementById('r-pass').value;
        const btn = document.getElementById('r-btn');
        btn.disabled = true;
        btn.innerText = 'Provisioning...';
        try {
            const res = await fetch('/api/v1/auth/register', {
                method: 'POST',
                headers: { 'Content-Type': 'application/json' },
                body: JSON.stringify({ username, password })
            });
            const data = await res.json();
            if (data.success) {
                Store.notifyUser("Access Granted. Please log in.", "success");
                Store.update({ view: 'login' });
            } else Store.notifyUser(data.error, "error");
        } catch (e) { Store.notifyUser("Provisioning failure.", "error"); }
        finally { btn.disabled = false; btn.innerText = 'Confirm Provision'; }
    },

    async login() {
        const username = document.getElementById('l-user').value;
        const password = document.getElementById('l-pass').value;
        const btn = document.getElementById('l-btn');
        btn.disabled = true;
        btn.innerText = 'Initializing...';
        try {
            const res = await fetch('/api/v1/auth/login', {
                method: 'POST',
                headers: { 'Content-Type': 'application/json' },
                body: JSON.stringify({ username, password })
            });
            const { success, data, error } = await res.json();
            if (success) {
                Store.setAuth(data.user, data.token);
                this.initSocket();
                Store.update({ view: 'dashboard' });
                await this.fetchMeals();
                Store.notifyUser(`Welcome back, Agent ${data.user.username}`, "info");
            } else Store.notifyUser(error || "Access Denied.", "error");
        } catch (e) { Store.notifyUser("Console locked.", "error"); }
        finally { btn.disabled = false; btn.innerText = 'Initialize Session'; }
    },

    async logout() {
        Store.setAuth(null, null);
        if (this.socket) this.socket.disconnect();
        Store.update({ view: 'login' });
        Store.notifyUser("Session terminated.", "info");
    },

    async fetchMeals() {
        if (!Store.state.token) return;
        try {
            const res = await fetch('/api/v1/meals', {
                headers: { 'Authorization': `Bearer ${Store.state.token}` }
            });
            const { success, data } = await res.json();
            if (success) {
                Store.update({ meals: data });
                Store.recalculateTotals();
            }
        } catch (e) { Store.notifyUser("Metadata Sync Failure", "error"); }
    },

    async handleUpload(input) {
        if (!input.files?.[0]) return;
        Store.update({ isAnalyzing: true, analysisStatus: 'Transferring Biometrics...' });

        const fd = new FormData();
        fd.append('image', input.files[0]);
        try {
            const res = await fetch('/api/v1/analyze', {
                method: 'POST',
                headers: { 'Authorization': `Bearer ${Store.state.token}` },
                body: fd
            });
            const result = await res.json();
            if (!result.success) throw new Error(result.error);
        } catch (e) {
            Store.notifyUser("Transmission rejected: " + e.message, "error");
            Store.update({ isAnalyzing: false });
        } finally { input.value = ''; }
    },

    toggleSearch() { Store.update({ showSearch: !Store.state.showSearch, searchResults: [] }); },

    async searchFood(q) {
        if (!q.trim()) return Store.update({ searchResults: [] });
        clearTimeout(this.searchDebounce);
        this.searchDebounce = setTimeout(async () => {
            Store.update({ isSearching: true });
            try {
                const res = await fetch(`/api/v1/foods/search?q=${encodeURIComponent(q)}`, {
                    headers: { 'Authorization': `Bearer ${Store.state.token}` }
                });
                const { success, data } = await res.json();
                if (success) Store.update({ searchResults: data });
            } catch (e) { Store.notifyUser("Search unavailable", "error"); }
            finally { Store.update({ isSearching: false }); }
        }, 400);
    }
};

function Render(state) {
    const app = document.getElementById('app');
    if (!app) return;
    let html = Components.Background();
    if (state.view === 'login') html += Components.Login();
    else if (state.view === 'register') html += Components.Register();
    else if (state.view === 'dashboard') html += Components.Dashboard(state);
    if (state.isAnalyzing) html += Components.Loading(state);
    html += Components.Notifications(state);
    app.innerHTML = html;
}

document.addEventListener('DOMContentLoaded', () => Actions.init());
window.Store = Store; window.Actions = Actions;
