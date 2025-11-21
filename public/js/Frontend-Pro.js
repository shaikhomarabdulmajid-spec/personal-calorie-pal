/**
 * CalCatcher Pro - High Performance Frontend Architecture
 * Pattern: State-Driven Component Rendering
 */

// --- 1. STATE MANAGEMENT (The Brain) ---
const Store = {
    state: {
        user: null,
        view: 'login', // login, dashboard, analysis
        meals: [],
        dailyGoal: 2000,
        currentCalories: 0,
        isAnalyzing: false,
        loadingStep: 0, // 0: Uploading, 1: Scanning, 2: Identifying, 3: Done
        showSearch: false,
        searchResults: [],
        isSearching: false
    },
    
    // Reactive Update System
    listeners: [],
    subscribe(fn) { this.listeners.push(fn); },
    notify() { this.listeners.forEach(fn => fn(this.state)); },
    
    // Actions
    setUser(user) { 
        this.state.user = user; 
        // Save to local storage for persistence
        try { localStorage.setItem('calcatcher_user', JSON.stringify(user)); } catch(e){}
        this.notify(); 
    },
    setView(view) { 
        console.log('Changing view to:', view);
        this.state.view = view; 
        this.notify(); 
    },
    setAnalyzing(bool) { this.state.isAnalyzing = bool; if(!bool) this.state.loadingStep = 0; this.notify(); },
    setLoadingStep(step) { this.state.loadingStep = step; this.notify(); },
    setSearchResults(results) { this.state.searchResults = results; this.notify(); },
    setSearching(bool) { this.state.isSearching = bool; this.notify(); },
    toggleSearch() { this.state.showSearch = !this.state.showSearch; this.notify(); },
    
    addMeal(meal) { 
        this.state.meals.unshift(meal); 
        this.state.currentCalories += meal.calories;
        this.notify(); 
    },

    updateMeal(index, newName, newCals) {
        const oldCals = this.state.meals[index].calories;
        this.state.meals[index].name = newName;
        this.state.meals[index].calories = parseInt(newCals);
        this.state.currentCalories = (this.state.currentCalories - oldCals) + parseInt(newCals);
        this.notify();
    }
};

// --- 2. COMPONENTS (The UI Bricks) ---

const Components = {
    // The "Living" Background
    MeshBackground: () => `<div class="mesh-bg"></div>`,

    // Login View
    LoginView: () => `
        <div class="login-wrapper">
            <div class="login-card fade-in-up">
                <div class="login-emoji">🥗</div>
                <h1 class="login-title">CalCatcher.</h1>
                <p class="subtitle mb-20">AI-Powered Nutrition Intelligence.</p>
                
                <form onsubmit="event.preventDefault(); Actions.login()">
                    <input type="text" class="input-field" placeholder="Username" id="username" autocomplete="username">
                    <input type="password" class="input-field" placeholder="Password" id="password" autocomplete="current-password">
                    
                    <button type="submit" class="btn-primary w-full">
                        Enter System
                    </button>
                </form>
                
                <div style="margin-top: 20px; text-align: center;">
                    <button onclick="Actions.forceDashboard()" style="background: none; border: none; color: #666; cursor: pointer; text-decoration: underline;">
                        (Debug: Force Enter)
                    </button>
                </div>
            </div>
        </div>
    `,

    // Desktop Sidebar
    Sidebar: (state) => `
        <div class="desktop-sidebar">
            <div class="sidebar-brand">
                <span>🥗</span> CalCatcher
            </div>
            <div class="desktop-nav-item active" onclick="Actions.nav('dashboard')">
                <i class="fas fa-home"></i> Dashboard
            </div>
            <div class="desktop-nav-item" onclick="document.getElementById('fileInput').click()">
                <i class="fas fa-camera"></i> AI Analysis
            </div>
            <div class="desktop-nav-item" onclick="Actions.toggleSearch()">
                <i class="fas fa-search"></i> Food Search
            </div>
            <div class="desktop-nav-item" onclick="Actions.nav('settings')">
                <i class="fas fa-cog"></i> Settings
            </div>
            
            <div class="mt-auto">
                <div class="glass-card goal-card">
                    <div class="goal-label">Daily Goal</div>
                    <div class="goal-value">${state.currentCalories} / ${state.dailyGoal}</div>
                    <div class="progress-bar-bg">
                        <div class="progress-bar-fill" style="width: ${Math.min((state.currentCalories / state.dailyGoal) * 100, 100)}%;"></div>
                    </div>
                </div>
            </div>
        </div>
    `,

    // Desktop Stats Panel
    StatsPanel: (state) => `
        <div class="stats-panel">
            <h3 class="stats-panel-title">Your Stats</h3>
            <div class="glass-card text-center" style="padding: 20px;">
                <div class="stat-big-icon">🔥</div>
                <div class="stat-big-value">${state.meals.length}</div>
                <div style="color: var(--text-muted);">Meals Logged</div>
            </div>
             <div class="glass-card" style="padding: 20px;">
                <h4>Macronutrients</h4>
                <div class="macro-row">
                    <div class="macro-label">
                        <span>Protein</span>
                        <span>85g</span>
                    </div>
                    <div class="progress-bar-bg">
                        <div class="progress-bar-fill" style="width: 70%; background: var(--accent);"></div>
                    </div>
                </div>
                <div class="macro-row">
                    <div class="macro-label">
                        <span>Carbs</span>
                        <span>120g</span>
                    </div>
                    <div class="progress-bar-bg">
                        <div class="progress-bar-fill" style="width: 50%; background: var(--primary);"></div>
                    </div>
                </div>
            </div>
            
            <div class="glass-card" style="padding: 20px; margin-top: 20px;">
                <h4>Today's Goal</h4>
                <div class="flex-gap-15" style="margin-top: 15px; align-items: center;">
                    <div style="font-size: 32px;">🎯</div>
                    <div>
                        <div class="goal-value">${state.currentCalories}/${state.dailyGoal} cal</div>
                        <div style="font-size: 12px; color: var(--text-muted);">${Math.round((state.currentCalories/state.dailyGoal)*100)}% Complete</div>
                    </div>
                </div>
            </div>
            
            <div class="glass-card" style="padding: 20px; margin-top: 20px;">
                <h4>Quick Add</h4>
                <div class="quick-add-grid">
                    <button class="btn-primary" style="padding: 8px;" onclick="Actions.quickAdd('Water', 0)">💧 Water</button>
                    <button class="btn-primary" style="padding: 8px;" onclick="Actions.quickAdd('Coffee', 5)">☕ Coffee</button>
                    <button class="btn-primary" style="padding: 8px;" onclick="Actions.quickAdd('Apple', 95)">🍎 Apple</button>
                    <button class="btn-primary" style="padding: 8px;" onclick="Actions.quickAdd('Banana', 105)">🍌 Banana</button>
                </div>
            </div>
        </div>
    `,

    // Search Modal
    SearchModal: (state) => `
        <div class="modal-overlay" onclick="if(event.target === this) Actions.toggleSearch()">
            <div class="modal-card">
                <div class="modal-header">
                    <h3>Search Food Database</h3>
                    <button class="modal-close" onclick="Actions.toggleSearch()">&times;</button>
                </div>
                <div class="flex-gap-10 mb-20">
                    <input type="text" id="searchInput" class="input-field" placeholder="Type a food name (e.g. Apple)..." style="margin-bottom: 0;" onkeypress="if(event.key === 'Enter') Actions.searchFood()">
                    <button class="btn-primary" style="width: auto;" onclick="Actions.searchFood()">Search</button>
                </div>
                <div class="search-results">
                    ${state.isSearching ? '<div class="text-center" style="padding: 20px;">Searching...</div>' : ''}
                    ${!state.isSearching && state.searchResults.length === 0 ? '<div class="text-center" style="color: var(--text-muted); padding: 20px;">No results found</div>' : ''}
                    ${state.searchResults.map(food => `
                        <div class="search-item" onclick="Actions.addFoodFromSearch('${food.name}', ${food.calories})">
                            <div>
                                <div style="font-weight: 600;">${food.name}</div>
                                <div style="font-size: 12px; color: var(--text-muted);">${food.portion}</div>
                            </div>
                            <div style="font-weight: 700; color: var(--primary);">${food.calories} cal</div>
                        </div>
                    `).join('')}
                </div>
            </div>
        </div>
    `,

    // Dashboard View
    DashboardView: (state) => {
        const progress = (state.currentCalories / state.dailyGoal) * 502; // 502 is circumference
        const offset = 502 - Math.min(progress, 502);
        
        const mainContent = `
        <div class="main-content">
            <!-- Header -->
            <div class="fade-in-up flex-between mb-20">
                <div class="user-welcome">
                    <p class="subtitle">Welcome back,</p>
                    <h2>${state.user?.username || 'Guest'}</h2>
                </div>
                <div class="user-avatar">
                    👤
                </div>
            </div>

            <!-- Hero Ring -->
            <div class="glass-card fade-in-up stagger-1">
                <div class="ring-container">
                    <svg width="220" height="220">
                        <circle class="ring-bg" cx="110" cy="110" r="80"></circle>
                        <circle class="ring-progress" cx="110" cy="110" r="80" 
                            stroke-dasharray="502" 
                            stroke-dashoffset="${offset}">
                        </circle>
                    </svg>
                    <div class="ring-content">
                        <span class="kcal-number">${state.currentCalories}</span>
                        <span class="kcal-label">kcal consumed</span>
                    </div>
                </div>
                <div class="ring-stats-row">
                    <div class="ring-stat-item">
                        <div class="ring-stat-val" style="color: var(--primary);">120g</div>
                        <div class="ring-stat-lbl">Carbs</div>
                    </div>
                    <div class="ring-stat-item">
                        <div class="ring-stat-val" style="color: var(--accent);">85g</div>
                        <div class="ring-stat-lbl">Protein</div>
                    </div>
                    <div class="ring-stat-item">
                        <div class="ring-stat-val" style="color: #29B6F6;">45g</div>
                        <div class="ring-stat-lbl">Fat</div>
                    </div>
                </div>
            </div>

            <!-- Recent Activity -->
            <div class="glass-card fade-in-up stagger-2 mb-20">
                <h4>Today's Progress</h4>
                <div class="activity-grid">
                    <div class="activity-card" style="background: rgba(74, 144, 226, 0.1);">
                        <span class="activity-icon">📊</span>
                        <div style="font-weight: 700;">${state.meals.length}</div>
                        <div style="font-size: 12px; color: var(--text-muted);">Items</div>
                    </div>
                    <div class="activity-card" style="background: rgba(45, 212, 191, 0.1);">
                        <span class="activity-icon">⚡</span>
                        <div style="font-weight: 700;">${state.currentCalories}</div>
                        <div style="font-size: 12px; color: var(--text-muted);">Calories</div>
                    </div>
                    <div class="activity-card" style="background: rgba(251, 191, 36, 0.1);">
                        <span class="activity-icon">🎯</span>
                        <div style="font-weight: 700;">${Math.round((state.currentCalories/state.dailyGoal)*100)}%</div>
                        <div style="font-size: 12px; color: var(--text-muted);">Goal</div>
                    </div>
                </div>
            </div>

            <!-- Meal List -->
            <h3 class="fade-in-up stagger-2" style="margin: 24px 0 16px 0;">Today's Intake</h3>
            <div class="meal-list fade-in-up stagger-3">
                ${state.meals.length === 0 ? 
                    `<div class="glass-card text-center" style="padding: 40px;">
                        <div style="font-size: 48px; margin-bottom: 15px;">🍽️</div>
                        <h4>No meals logged yet</h4>
                        <p style="color: var(--text-muted); margin-bottom: 20px;">Start tracking your nutrition by uploading a photo or searching our database.</p>
                        <div class="flex-center flex-gap-10">
                            <button class="btn-primary" onclick="document.getElementById('fileInput').click()">📸 Take Photo</button>
                            <button class="btn-primary" onclick="Actions.toggleSearch()">🔍 Search Food</button>
                        </div>
                    </div>` : 
                    state.meals.map((meal, index) => `
                        <div class="glass-card meal-item">
                            <div class="meal-icon">${meal.icon || '🍽️'}</div>
                            <div class="meal-info">
                                <div class="meal-name">${meal.name}</div>
                                <div class="meal-time">${meal.time}</div>
                            </div>
                            <div class="meal-cal">${meal.calories} cal</div>
                            <div class="meal-actions">
                                <button class="btn-icon-small" onclick="Actions.editMeal(${index})" title="Edit Meal">
                                    <i class="fas fa-pen"></i>
                                </button>
                            </div>
                        </div>
                    `).join('')
                }
            </div>
        </div>`;

        return `
            ${Components.Sidebar(state)}
            ${mainContent}
            ${Components.StatsPanel(state)}
            
            ${state.showSearch ? Components.SearchModal(state) : ''}

            <!-- Floating Dock (Mobile Only) -->
            <div class="dock fade-in-up stagger-3">
                <div class="dock-item active" onclick="Actions.nav('home')"><i class="fas fa-home"></i></div>
                <div class="dock-item" onclick="Actions.toggleSearch()"><i class="fas fa-search"></i></div>
                <div class="dock-item" onclick="Actions.nav('profile')"><i class="fas fa-user"></i></div>
            </div>

            <!-- Scan Button (Mobile Only) -->
            <div class="scan-btn-wrapper fade-in-up stagger-3">
                <div class="scan-btn" onclick="document.getElementById('fileInput').click()">
                    +
                </div>
            </div>
            <input type="file" id="fileInput" hidden onchange="Actions.handleUpload(this)">
        `;
    },

    // Loading Overlay - The "Fake" AI Steps
    LoadingOverlay: (state) => {
        const steps = [
            { icon: '📤', text: 'Uploading image...' },
            { icon: '🔍', text: 'Scanning pixels...' },
            { icon: '🧠', text: 'Identifying food...' },
            { icon: '⚡', text: 'Calculating macros...' }
        ];
        
        return `
        <div class="loading-overlay">
            <div class="loading-emoji">🥑</div>
            <h2>Analyzing...</h2>
            <div class="loading-steps">
                ${steps.map((step, i) => `
                    <div class="step-item ${i <= state.loadingStep ? 'active' : ''} ${i < state.loadingStep ? 'done' : ''}">
                        <div class="step-icon">
                            ${i === state.loadingStep ? '<div class="step-spinner"></div>' : (i < state.loadingStep ? '✅' : '⚪')}
                        </div>
                        <div class="step-text">${step.text}</div>
                    </div>
                `).join('')}
            </div>
        </div>
    `},
};

// --- 3. ACTIONS (The Logic) ---
const Actions = {
    init() {
        // Font Awesome for icons
        const link = document.createElement('link');
        link.rel = 'stylesheet';
        link.href = 'https://cdnjs.cloudflare.com/ajax/libs/font-awesome/6.0.0/css/all.min.css';
        document.head.appendChild(link);

        // Check for saved user
        try {
            const savedUser = localStorage.getItem('calcatcher_user');
            if (savedUser) {
                Store.state.user = JSON.parse(savedUser);
                // Optional: Auto-login if you want, but for now let's stick to manual
                // Store.state.view = 'dashboard'; 
            }
        } catch(e) {}

        Store.subscribe(Render);
        Render(Store.state);
    },

    login() {
        try {
            const userField = document.getElementById('username');
            const user = userField ? userField.value : 'Guest';
            
            if(!user) {
                alert('Please enter a username');
                return;
            }
            
            // Force update
            this.state = Store.state; // Sync
            Store.setUser({ username: user });
            Store.setView('dashboard');
            
        } catch (e) {
            alert("Login Error: " + e.message);
        }
    },

    async handleUpload(input) {
        if (input.files && input.files[0]) {
            Store.setAnalyzing(true);
            
            // Step 1: Uploading
            Store.setLoadingStep(0);
            
            const formData = new FormData();
            formData.append('image', input.files[0]);

            try {
                // Fake delay for "Scanning"
                setTimeout(() => Store.setLoadingStep(1), 800);
                
                // Fake delay for "Identifying"
                setTimeout(() => Store.setLoadingStep(2), 1800);

                // Use relative path for deployment
                const response = await fetch('/api/analyze', {
                    method: 'POST',
                    body: formData
                });
                
                // Fake delay for "Calculating"
                Store.setLoadingStep(3);
                
                const data = await response.json();
                
                // Small delay to show the final checkmark
                await new Promise(r => setTimeout(r, 500));

                if (data.success) {
                    Store.addMeal({
                        name: data.analysis.foodName,
                        calories: data.analysis.calories,
                        time: new Date().toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' }),
                        icon: '📸'
                    });
                } else {
                    alert('AI Analysis failed: ' + (data.message || 'Unknown error'));
                }
            } catch (e) {
                console.error(e);
                alert(`Connection Error: ${e.message}\n\nCheck console for details.`);
            } finally {
                Store.setAnalyzing(false);
                // Reset input
                input.value = '';
            }
        }
    },

    async searchFood() {
        const query = document.getElementById('searchInput').value;
        if (!query) return;
        
        Store.setSearching(true);
        try {
            const response = await fetch(`/api/foods/search?q=${encodeURIComponent(query)}`);
            const data = await response.json();
            if (data.success) {
                Store.setSearchResults(data.data);
            }
        } catch (e) {
            console.error(e);
            alert('Search failed. Is the backend running?');
        } finally {
            Store.setSearching(false);
            // Keep focus on input
            setTimeout(() => document.getElementById('searchInput')?.focus(), 100);
        }
    },
    
    toggleSearch() {
        Store.toggleSearch();
    },
    
    addFoodFromSearch(name, calories) {
        Store.addMeal({
            name: name,
            calories: calories,
            time: new Date().toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' }),
            icon: '🔍'
        });
        Store.toggleSearch();
    },

    quickAdd(name, calories) {
        Store.addMeal({
            name: name,
            calories: calories,
            time: new Date().toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' }),
            icon: name === 'Water' ? '💧' : name === 'Coffee' ? '☕' : name === 'Apple' ? '🍎' : '🍌'
        });
    },

    editMeal(index) {
        const meal = Store.state.meals[index];
        const newName = prompt("Edit Food Name:", meal.name);
        if (newName) {
            const newCals = prompt("Edit Calories:", meal.calories);
            if (newCals && !isNaN(newCals)) {
                Store.updateMeal(index, newName, newCals);
            }
        }
    },

    nav(page) {
        console.log('Navigating to', page);
        // Implement nav logic here
    },

    // DEBUG: Force Dashboard
    forceDashboard() {
        Store.setUser({ username: 'DebugUser' });
        Store.setView('dashboard');
    }
};

// --- 4. RENDERER (The Engine) ---
function Render(state) {
    try {
        const app = document.getElementById('app');
        if (!app) return;
        
        let content = Components.MeshBackground();
        
        if (state.view === 'login') {
            content += Components.LoginView();
        } else if (state.view === 'dashboard') {
            content += Components.DashboardView(state);
        }

        if (state.isAnalyzing) {
            content += Components.LoadingOverlay(state);
        }

        app.innerHTML = content;
    } catch (e) {
        console.error("Render Error:", e);
        alert("Render Error: " + e.message);
    }
}

// Start the Engine
document.addEventListener('DOMContentLoaded', Actions.init);
window.Actions = Actions; // Expose for HTML onclicks
