# WasteRoute App

A mobile application for waste management route planning and execution.

## Description

WasteRoute helps waste management companies plan and execute collection routes efficiently. It allows administrators to create routes, assign them to drivers, and monitor progress in real-time. Drivers can view their assigned routes, navigate to collection points, and mark houses as completed.

## Key Features

- Team Management
- Route Planning
- Real-time Tracking
- Performance Analytics
- Geofencing
- Push Notifications

## Technology Stack

- React Native / Expo
- Convex (for backend)
- Clerk (for authentication)
- Expo Location (for geofencing)
- Expo Notifications (for push notifications)

## Prerequisites

- Node.js 16+ and npm
- Expo CLI: `npm install -g expo-cli`
- Convex account
- Clerk account
- Physical device or emulator for testing

## Installation

1. Clone the repository:
   ```bash
   git clone https://github.com/yourusername/waste-route-app.git
   cd waste-route-app
   ```

2. Install dependencies:
   ```bash
   npm install
   ```

3. Set up environment variables:
   - Create a `.env` file in the project root
   - Add the following variables:
     ```
     EXPO_PUBLIC_CONVEX_URL=your_convex_url_here
     EXPO_PUBLIC_CLERK_PUBLISHABLE_KEY=your_clerk_publishable_key_here
     ```

4. Set up Convex:
   - Follow the setup instructions in the Convex dashboard
   - Initialize Convex in your project:
     ```bash
     npx convex dev --once --configure=new
     ```

5. Set up Clerk:
   - Follow the instructions in `CLERK_SETUP.md`

## Running the App

1. Start the Convex development server:
   ```bash
   npx convex dev
   ```

2. In a new terminal, start the Expo development server:
   ```bash
   npx expo start
   ```

3. Use the Expo Go app to scan the QR code (or press 'a' to open on Android emulator, 'i' for iOS simulator)

## Development

### Project Structure

- `convex/` - Convex backend functions and schema
- `src/`
  - `components/` - Reusable UI components
  - `contexts/` - Context providers
  - `hooks/` - Custom React hooks
  - `lib/` - Utility functions and API clients
  - `screens/` - App screens

### Adding New Features

To implement the features on your to-do list:

1. **Geofencing**:
   - Use the existing `useGeofencing` hook
   - Configure geofence boundaries in route creation
   - Setup notifications when entering/exiting zones

2. **Notifications**:
   - Use Expo Notifications
   - Configure both local and push notifications
   - Set up notification handlers

3. **Authentication**:
   - Follow the Clerk setup guide
   - Ensure user roles are properly set

4. **Screens**:
   - Update navigation to use full screens rather than popups
   - Implement consistent UI across all screens

5. **Keyboard**:
   - Implement proper keyboard handling
   - Use KeyboardAvoidingView where appropriate

6. **Onboarding**:
   - Create an onboarding flow for new users
   - Add tutorial screens

7. **Payments**:
   - Integrate a payment provider (Stripe recommended)
   - Set up subscription management

8. **EAS (Expo Application Services)**:
   - Set up EAS Build for creating production builds
   - Configure EAS Update for over-the-air updates

## License

This project is licensed under the [MIT License](LICENSE).
