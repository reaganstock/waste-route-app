# WasteRoute App

A mobile application for waste management companies to efficiently manage collection routes, track drivers, and optimize operations.

![WasteRoute App](./assets/app-preview.png)

## Features

- **Route Planning**: Create optimized collection routes with GPS navigation
- **Real-time Geofencing**: Get alerts when approaching collection points
- **Team Management**: Assign routes to team members and track performance
- **Analytics Dashboard**: Track completion metrics and route statistics
- **Offline Support**: Continue working even with limited connectivity

## Technologies

- React Native / Expo
- Supabase for backend and authentication
- Expo Router for navigation
- Geolocation and mapping APIs
- Notifications system for proximity alerts

## Environment Setup

1. Clone the repository
```bash
git clone https://github.com/reaganstock/waste-route-app.git
cd waste-route-app
```

2. Install dependencies
```bash
npm install
```

3. Create a `.env` file based on `.env.example` with your configuration

4. Start the development server
```bash
npm start
```

## Production Deployment

### Prerequisites

- [Expo CLI](https://docs.expo.dev/get-started/installation/) installed globally
- [EAS CLI](https://docs.expo.dev/build/setup/) installed globally
- An Expo account with access to EAS Build
- Apple Developer Account (for iOS) and/or Google Play Developer Account (for Android)
- [Supabase](https://supabase.com/) project set up

### Configure EAS

1. Login to Expo account:
```bash
eas login
```

2. Update `app.json` and `eas.json` with your project information

3. Configure environment variables:
```bash
eas secret:create --scope project --name EXPO_PUBLIC_SUPABASE_URL --value "your_supabase_url"
eas secret:create --scope project --name EXPO_PUBLIC_SUPABASE_ANON_KEY --value "your_supabase_anon_key"
eas secret:create --scope project --name EXPO_PUBLIC_GOOGLE_MAPS_API_KEY --value "your_google_maps_api_key"
```

### Build Production App

#### Build for iOS
```bash
eas build --platform ios --profile production
```

#### Build for Android
```bash
eas build --platform android --profile production
```

### Submit to App Stores

#### Submit to App Store (iOS)
```bash
eas submit --platform ios
```

#### Submit to Google Play Store (Android)
```bash
eas submit --platform android
```

## Setting Up Supabase

The database schema and migrations are located in the `supabase/migrations` directory. To set up your Supabase project:

1. Install the Supabase CLI
2. Run `supabase link --project-ref YOUR_PROJECT_ID`
3. Apply migrations with `supabase db push`

## Testing

This application includes geofencing features that rely on real device capabilities. For the best testing experience:

1. Use a physical device rather than an emulator
2. Enable location services and grant appropriate permissions
3. Test near actual locations to verify geofencing functionality

## License

This project is licensed under the MIT License - see the LICENSE file for details.

## Support

For issues or feature requests, please [open an issue](https://github.com/reaganstock/waste-route-app/issues) on GitHub.
