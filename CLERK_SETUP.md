# Setting Up Clerk Authentication for WasteRoute

This guide will walk you through setting up Clerk authentication for the WasteRoute application.

## Step 1: Create a Clerk Account

1. Go to [clerk.dev](https://clerk.dev) and sign up for an account
2. Create a new application in the Clerk dashboard
3. Name your application (e.g., "WasteRoute")

## Step 2: Configure Your Clerk Application

1. In the Clerk dashboard, go to your application settings
2. Under the "Authentication" section:
   - Enable Email/Password authentication
   - Configure other authentication methods if needed

3. In the "Session management" section:
   - Set the session duration as desired (recommended: 7 days)

4. In the "User management" section:
   - Add custom user metadata fields:
     - Add a field for `role` of type string
   
5. In the "API Keys" section:
   - Copy your "Publishable Key"

## Step 3: Configure Your App

1. Create or update your `.env` file with your Clerk key:
   ```
   EXPO_PUBLIC_CLERK_PUBLISHABLE_KEY=your_clerk_publishable_key_here
   ```

2. Make sure your Convex URL is also in the `.env` file:
   ```
   EXPO_PUBLIC_CONVEX_URL=your_convex_url_here
   ```
   This should have been generated when you ran `npx convex dev --once --configure=new`

## Step 4: Configure Redirect URLs

1. In the Clerk dashboard, go to "Paths & URLs"
2. Add your application URL to the allowed redirect list:
   - For mobile: `waste-route://`
   - For development: `http://localhost:8081`

## Step 5: Testing Your Setup

1. Start your development server:
   ```
   npx convex dev
   ```

2. In another terminal window, start your Expo app:
   ```
   npx expo start
   ```

3. Test the signup, login, and other authentication features

## Troubleshooting

If you encounter any issues:

1. Check your environment variables
2. Ensure Clerk is properly configured for mobile
3. Check the Clerk documentation for mobile apps at [https://clerk.com/docs/quickstarts/expo](https://clerk.com/docs/quickstarts/expo)
4. Check console logs for any authentication-related errors 