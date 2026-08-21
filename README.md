# Shuttle Match Manager

## Local development

1. Install dependencies:

   ```powershell
   cd server; npm install
   cd ..\client; npm install
   ```

2. Copy `server/.env.example` to `server/.env` and fill in the MongoDB, JWT, admin, and SMTP values.
3. Copy `client/.env.example` to `client/.env`.
4. Start the API with `cd server; npm start` and the client with `cd client; npm run dev`.

## GitHub and Render

1. Create an empty GitHub repository.
2. From this folder, run:

   ```powershell
   git init
   git add .
   git commit -m "Prepare Shuttle for deployment"
   git branch -M main
   git remote add origin https://github.com/<your-user>/<your-repository>.git
   git push -u origin main
   ```

3. In Render, choose **New > Blueprint** and select the GitHub repository. Render will read `render.yaml` and create:
   - `shuttle-api`: Node/Express API
   - `shuttle-web`: Vite static frontend

4. Enter the secret values requested by Render for `MONGO_URI`, `ADMIN_EMAIL`, `SMTP_HOST`, `SMTP_USER`, `SMTP_PASSWORD`, and `SMTP_FROM`.
5. Set `VITE_API_URL` on `shuttle-web` to the final API URL followed by `/api`, for example `https://shuttle-api.onrender.com/api`.
6. Update the MongoDB Atlas network access rules to allow Render's connections. For a quick deployment, Atlas can allow `0.0.0.0/0`; use database credentials with limited permissions.

Never commit `server/.env` or `client/.env`. They are excluded by the root `.gitignore`.
