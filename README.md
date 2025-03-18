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

## Environment variables
App is interacting with Supabase database to store and manage users, shopping lists, items, etc. 
You should provide the following env variables to the application:
```
VITE_SUPABASE_ANON_KEY= # ANON KEY
VITE_SUPABASE_URL= # URL
```

This is just a fun test project, but feel free to try it out! 🚀

## Build app

1. Clone the repository
2. Install dependencies:
   ```bash
   npm install
   ```
3. Create a `.env` file in the root directory and add your Supabase credentials
4. Start the development server:
   ```bash
   npm run dev
   ```
5. Build for production:
   ```bash
   npm run build
   ```