# Ungry

A collaborative shopping list app that lets you create and share shopping lists with friends. Built as an alternative to the discontinued HNGRY app.

## Features
- User registration and authentication
- Create and manage shopping lists
- Share lists with friends using access keys
- Real-time collaboration on shared lists
- Mark items as bought/unbought
- Sort items by name or date

## Tech Stack
- React + TypeScript
- Vite
- Tailwind CSS
- Supabase (Database & Authentication)

## Local Development

### Prerequisites
- Node.js 18+
- Docker (optional, for containerized setup)
- Supabase account

### Setup

1. **Clone the repository**
   ```bash
   git clone <repository-url>
   cd ungry
   ```

2. **Set up Supabase**
   - Create a new project at [supabase.com](https://supabase.com)
   - Run the SQL migrations from `supabase/migrations/` in your project's SQL editor
   - Get your project URL and anon key from Settings > API

3. **Configure environment**
   ```bash
   cp .env.example .env
   ```
   Edit `.env` with your Supabase credentials:
   ```
   VITE_SUPABASE_URL=your_supabase_project_url
   VITE_SUPABASE_ANON_KEY=your_supabase_anon_key
   ```

### Running the App

#### Option 1: Development Server
```bash
npm install
npm run dev
```
App runs at `http://localhost:5173`

#### Option 2: Docker (Recommended)
```bash
docker compose up -d --build
```
App runs at `http://localhost:3000`

#### Option 3: Production Build
```bash
npm install
npm run build
npm run preview
```

## SPA Deployment

Ungry is a Single Page Application (SPA) that can be deployed to any static hosting platform. The app is completely client-side with no server dependencies.

### Build for Production
```bash
npm run build
```
This creates a `dist/` folder with optimized static files ready for deployment.

### Deployment Notes
- Configure your hosting to redirect all routes to `index.html` for client-side routing
- Most modern static hosts handle this automatically for SPAs
- Set your environment variables in your hosting platform's dashboard

### Cloudflare Workers Deployment
```bash
# 1. Connect your GitHub repo to Cloudflare Workers
# 2. Set build command: npm run build
# 3. Set deploy command: cd cloudflare && npx wrangler deploy
# 4. Add environment variables: VITE_SUPABASE_URL, VITE_SUPABASE_ANON_KEY
# 5. Deploy automatically on git push
```

## Database Schema
- `shopping_lists`: List metadata and access keys
- `list_items`: Individual items with bought status
- `list_members`: User permissions for shared lists
- `item_suggestions`: Autocomplete suggestions

## Security
- Row Level Security (RLS) policies ensure data isolation
- Users can only access lists they own or are members of
- Secure authentication via Supabase

---

*This is a fun experimental project - feel free to try it out! 🚀*
