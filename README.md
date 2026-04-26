

<h1>CalCatcher Pro 🥑</h1>

## ❔ What it does
CalCatcher is an <strong>AI-Powered Nutrition Intelligence</strong> app that takes an uploaded image and logs the foods in that image onto the user's food log. It also has a health score (still in progress) to motivate users to eat healthier foods. The profile (still in progress) esnures all foods scanned in previous days are logged and loaded when the user signs in.  

<img width="1917" height="862" alt="CalCatcher - Demo" src="https://github.com/user-attachments/assets/d70e42b4-b7d3-4e93-8432-3fec0395a4ad" />



## 🚀 Setup Locally

1. Install dependencies:
   ```bash
   npm install
   ```

2. Start the server:
   ```bash
   node server.js
   ```

3. Open http://localhost:3001

## ☁️ Deployment (Render.com)

1. Push this repository to GitHub.
2. Create a new **Web Service** on Render.
3. Connect your repository.
4. **Settings:**
   - **Root Directory:** `.` (Leave this blank!)
   - **Build Command:** `npm install`
   - **Start Command:** `node server.js`
  
## ⚔️ Challenges Faced
Integrating the Frontend and the Backend on our initial design was a major headache. The buttons would stop working, the animations would glitch out, and the image detection would tweak out. The whole app was then redesigned. My teammate seamlessly integrated the frontend to the backend along with the Image Recognition API. The end product turned out to be even better than what we expected.
