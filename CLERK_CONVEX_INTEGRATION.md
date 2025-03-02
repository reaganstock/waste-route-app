# Clerk and Convex Integration Guide

This document explains how the authentication flow works in the WasteRoute application, which uses Clerk for authentication and Convex for data storage.

## Authentication Flow

1. **User signs up or logs in using Clerk**
   - The app uses Clerk's authentication system to handle user registration, login, and verification.
   - When a user signs up, they provide their email, password, and role (driver or admin).
   - The app signs out of any existing session before attempting to sign in or sign up to handle Clerk's single session mode.

2. **Email verification**
   - After signup, users need to verify their email address.
   - The app handles various verification statuses, including bypassing phone number requirements.
   - Special handling is in place for "already verified" errors and "missing_requirements" status.

3. **Convex user creation**
   - Once authenticated with Clerk, the app creates a corresponding user record in Convex.
   - The AuthContext manages this synchronization between Clerk and Convex.
   - The app waits for both Clerk authentication and Convex user creation before considering a user fully authenticated.

4. **Navigation based on authentication state**
   - The app uses different layouts based on the user's authentication state and role.
   - Unauthenticated users are directed to the auth screens.
   - Authenticated users are directed to the appropriate tabs based on their role (driver or admin).

## Key Components

### AuthContext

The `AuthContext` is responsible for:
- Tracking the authentication state from both Clerk and Convex
- Creating and managing user records in Convex
- Providing authentication methods to the rest of the app
- Determining when a user is fully authenticated

### Root Layout

The root layout (`app/_layout.tsx`):
- Sets up the Clerk and Convex providers
- Handles navigation based on authentication state
- Shows loading indicators while authentication is being determined

### Auth Layout

The auth layout (`app/(auth)/_layout.tsx`):
- Manages the authentication screens (sign-in, signup, verify)
- Redirects authenticated users to the main app

### Tabs Layout

The tabs layout (`app/(tabs)/_layout.tsx`):
- Shows different navigation options based on user role
- Redirects unauthenticated users back to the auth screens

## Troubleshooting

### Authentication Issues

1. **Single Session Mode Errors**
   - The app now handles Clerk's single session mode by signing out before attempting to sign in or sign up.
   - If you still encounter single session mode errors, try clearing the app's storage or reinstalling the app.

2. **Navigation Loops**
   - If you experience navigation loops (app continuously redirecting between screens), check:
     - Console logs to identify where the loop is occurring
     - Ensure both Clerk and Convex authentication states are properly synchronized
     - Verify that the `hasNavigatedRef` flag is working correctly in the root layout

3. **Verification Issues**
   - If email verification fails, check:
     - Console logs for specific error messages
     - Ensure the verification code is correct
     - Check if the email has already been verified

4. **Convex User Creation Issues**
   - If the Convex user is not being created:
     - Check console logs for errors during user creation
     - Verify that the Convex URL is correct in the environment variables
     - Ensure the Convex functions for user creation are properly implemented

### Environment Variables

Ensure these environment variables are properly set:

- `EXPO_PUBLIC_CLERK_PUBLISHABLE_KEY`: Your Clerk publishable key
- `EXPO_PUBLIC_CONVEX_URL`: Your Convex deployment URL

### Debugging Tips

1. **Check Console Logs**
   - The app includes extensive logging to help diagnose issues
   - Look for logs related to authentication state, navigation, and user creation

2. **Clear Storage**
   - If you encounter persistent authentication issues, try clearing the app's storage
   - For development, you can use `npx expo start --clear` to clear the cache

3. **Verify User Records**
   - Check both Clerk and Convex dashboards to ensure user records are being created correctly
   - Verify that user metadata (role, etc.) is being properly stored

4. **Test with New Accounts**
   - When testing authentication flows, use new email addresses to avoid conflicts with existing accounts

## Recent Updates

The following updates have been made to improve the authentication flow:

1. **AuthContext Improvements**
   - Added better synchronization between Clerk and Convex
   - Implemented retry logic for Convex user creation
   - Added more detailed logging for debugging

2. **Navigation Improvements**
   - Fixed navigation loops by tracking navigation state
   - Improved handling of authentication state changes
   - Added proper loading indicators during authentication

3. **Single Session Mode Handling**
   - Added sign-out before sign-in/sign-up to handle Clerk's single session mode
   - Improved error handling for single session mode errors

4. **Verification Improvements**
   - Enhanced handling of verification statuses
   - Added special handling for phone number requirements
   - Improved error messages and user feedback

## Next Steps

If you encounter any issues not covered in this guide, please:

1. Check the console logs for specific error messages
2. Review the relevant code files (AuthContext, login/signup screens, etc.)
3. Consult the Clerk and Convex documentation for additional troubleshooting steps 