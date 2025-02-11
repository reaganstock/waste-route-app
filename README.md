# Waste Route App

A mobile application for managing and optimizing waste collection routes.

## Features

- Route creation and management
- Team member management
- Route assignment
- Route completion tracking
- Analytics and performance metrics
- Interactive maps integration

## Tech Stack

- React Native / Expo
- Supabase (Backend)
- Google Maps API
- TypeScript/JavaScript

## Setup

1. Clone the repository:
```bash
git clone [repository-url]
cd waste-route-app
```

2. Install dependencies:
```bash
npm install
```

3. Set up environment variables:
   - Copy `.env.example` to `.env`
   - Fill in the required API keys and configuration values

4. Start the development server:
```bash
npx expo start
```

## Environment Variables

The following environment variables are required:

- `EXPO_PUBLIC_SUPABASE_URL`: Your Supabase project URL
- `EXPO_PUBLIC_SUPABASE_ANON_KEY`: Your Supabase anonymous key
- `EXPO_PUBLIC_GOOGLE_MAPS_API_KEY`: Your Google Maps API key

## Contributing

1. Fork the repository
2. Create your feature branch (`git checkout -b feature/amazing-feature`)
3. Commit your changes (`git commit -m 'Add some amazing feature'`)
4. Push to the branch (`git push origin feature/amazing-feature`)
5. Open a Pull Request

## License

This project is licensed under the MIT License.
