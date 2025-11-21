const app = {
    state: {
        user: null,
        calories: 0,
        healthScore: 85,
        meals: []
    },

    init: () => {
        console.log("🚀 App Initialized");
        
        // Login Handler
        const loginForm = document.getElementById('loginForm');
        if(loginForm) {
            loginForm.addEventListener('submit', (e) => {
                e.preventDefault();
                const username = document.getElementById('username').value;
                if(username) app.login(username);
            });
        }

        // File Upload Handler
        const fileInput = document.getElementById('fileInput');
        if(fileInput) {
            fileInput.addEventListener('change', app.handleUpload);
        }

        // Search Handler
        const searchInput = document.getElementById('searchInput');
        if(searchInput) {
            searchInput.addEventListener('keyup', (e) => app.search(e.target.value));
        }
    },

    login: (username) => {
        console.log("Logging in as", username);
        app.state.user = username;
        document.getElementById('user-display').innerText = username;
        
        // Pre-populate if empty (The "Lived In" Feel)
        if(app.state.meals.length === 0) {
            app.addMeal("Oatmeal & Berries", 350, '<i class="fa-solid fa-check-circle"></i> Good start!', 5);
            app.addMeal("Black Coffee", 5, '<i class="fa-solid fa-mug-hot"></i> Antioxidants', 0);
        }

        // Switch Views
        document.getElementById('view-login').classList.remove('active');
        document.getElementById('view-dashboard').classList.add('active');
    },

    logout: () => {
        location.reload();
    },

    addMeal: (name, cals, insight = '', scoreDelta = 0) => {
        app.state.meals.push({ name, cals, insight });
        app.state.calories += cals;
        app.state.healthScore += scoreDelta;
        
        // Clamp Score
        if(app.state.healthScore > 100) app.state.healthScore = 100;
        if(app.state.healthScore < 0) app.state.healthScore = 0;

        // Update UI
        document.getElementById('total-cals').innerText = app.state.calories;
        const scoreEl = document.getElementById('health-score');
        if(scoreEl) {
            scoreEl.innerText = app.state.healthScore;
            scoreEl.style.color = app.state.healthScore > 70 ? '#10B981' : (app.state.healthScore > 40 ? '#F59E0B' : '#EF4444');
        }
        
        const div = document.createElement('div');
        div.className = 'meal-item';
        div.innerHTML = `
            <div class="meal-icon">${scoreDelta >= 0 ? '<i class="fa-solid fa-bowl-food" style="color:var(--primary)"></i>' : '<i class="fa-solid fa-burger" style="color:#EF4444"></i>'}</div>
            <div class="meal-info">
                <div class="meal-name">${name}</div>
                <div class="meal-insight">${insight}</div>
            </div>
            <div class="meal-cals">${cals} kcal</div>
        `;
        document.getElementById('meal-list').prepend(div);
    },

    handleUpload: async (e) => {
        const file = e.target.files[0];
        if (!file) return;

        // Show Loading
        const overlay = document.getElementById('loading-overlay');
        const text = document.getElementById('loading-text');
        overlay.classList.remove('hidden');
        
        // Fake Steps
        text.innerText = "Uploading...";
        await new Promise(r => setTimeout(r, 800));
        text.innerText = "Scanning pixels...";
        await new Promise(r => setTimeout(r, 800));
        text.innerText = "Identifying food...";

        // Real Upload
        const formData = new FormData();
        formData.append('image', file);

        try {
            const res = await fetch('/api/analyze', { method: 'POST', body: formData });
            const data = await res.json();
            
            app.addMeal(data.name, data.calories, data.insight, data.score);
            overlay.classList.add('hidden');
        } catch (err) {
            alert("Error analyzing image");
            overlay.classList.add('hidden');
        }
    },

    search: async (query) => {
        const container = document.getElementById('searchResults');
        
        if(query.length < 2) {
            container.classList.remove('active');
            return;
        }

        try {
            const res = await fetch(`/api/foods/search?q=${query}`);
            const data = await res.json();
            
            if (data.data.length > 0) {
                container.classList.add('active');
                container.innerHTML = data.data.map(item => `
                    <div class="search-item" onclick="app.addMeal('${item.name}', ${item.calories}, 'Manual Entry', 0); document.getElementById('searchInput').value = ''; document.getElementById('searchResults').classList.remove('active');">
                        <div class="search-item-left">
                            <i class="fas fa-utensils search-icon"></i>
                            <div>
                                <div style="font-weight: 600;">${item.name}</div>
                                <div style="font-size: 12px; color: #6B7280;">${item.calories} kcal</div>
                            </div>
                        </div>
                        <div class="search-add-btn">
                            <i class="fas fa-plus"></i>
                        </div>
                    </div>
                `).join('');
            } else {
                container.classList.remove('active');
            }
        } catch(e) {
            console.error(e);
        }
    }
};

// Start App
window.onload = app.init;
