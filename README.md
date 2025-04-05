# Ungry

This is a simple shopping list app built with [Bolt.new](https://bolt.new), a no-code AI tool for creating apps. It allows users to create and share shopping lists with friends.

## Why?
I'm just experimenting with Bolt.new and testing out its capabilities. The goal is to create an alternative to **Hungry**, which is shutting down on **March 31**.

## Features
- User registration
- Create a shopping list
- Share it with friends
- Keep track of items together
- Marking bought items

## Tech Stack
- React + TypeScript
- Vite
- Tailwind CSS
- Supabase (Database & Authentication)

## Prerequisites
- Node.js 18+ installed
- A Supabase account and project

## Development Setup

1. Clone the repository
   ```bash
   git clone <repository-url>
   cd ungry
   ```

2. Install dependencies
   ```bash
   npm install
   ```

3. Set up Supabase
   - Create a new project in Supabase
   - Run the SQL migrations from `supabase/migrations/` in your Supabase project's SQL editor
   - Get your project's URL and anon key from the project settings

4. Create environment variables
   Create a `.env` file in the root directory with the following:
   ```
   VITE_SUPABASE_URL=your_supabase_project_url
   VITE_SUPABASE_ANON_KEY=your_supabase_anon_key
   ```

5. Start the development server
   ```bash
   npm run dev
   ```

## Database Setup
The app uses Supabase as its database. The schema includes:
- `shopping_lists`: Stores shopping lists
- `list_items`: Stores items in shopping lists
- `list_members`: Manages list sharing
- `item_suggestions`: Stores frequently used items for autocomplete

All necessary migrations are in the `supabase/migrations/` directory.

## Deployment

### Local Production Build
1. Build the project
   ```bash
   npm run build
   ```
2. Preview the production build
   ```bash
   npm run preview
   ```

### Netlify Deployment
1. Create a new site in Netlify
2. Configure build settings:
   - Build command: `npm run build`
   - Publish directory: `dist`
3. Add environment variables:
   - `VITE_SUPABASE_URL`
   - `VITE_SUPABASE_ANON_KEY`

### Docker Deployment
1. Create a Dockerfile:
   ```dockerfile
   FROM node:18-alpine
   WORKDIR /app
   COPY package*.json ./
   RUN npm install
   COPY . .
   RUN npm run build
   
   FROM nginx:alpine
   COPY --from=0 /app/dist /usr/share/nginx/html
   EXPOSE 80
   CMD ["nginx", "-g", "daemon off;"]
   ```

2. Build and run:
   ```bash
   docker build -t ungry .
   docker run -p 80:80 \
     -e VITE_SUPABASE_URL=your_supabase_url \
     -e VITE_SUPABASE_ANON_KEY=your_supabase_anon_key \
     ungry
   ```

## Environment Variables
The app requires the following environment variables:
```
VITE_SUPABASE_ANON_KEY= # Supabase project's anon/public key
VITE_SUPABASE_URL= # Supabase project URL
```

These variables are used to connect to your Supabase project for data storage and user authentication.

## Security Considerations
- The app uses Supabase's Row Level Security (RLS) policies
- Each table has specific access policies
- Users can only access lists they own or are members of
- Authentication is handled securely by Supabase

## TO-DO
- Add feature to leave the list
- Items auto-complete

This is just a fun test project, but feel free to try it out! 🚀