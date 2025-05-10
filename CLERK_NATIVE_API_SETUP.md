# Clerk Native API Setup Guide

This guide outlines the steps to properly configure Clerk's Native API in your React Native application.

## Current Implementation Status

Your application already has most of the necessary components in place:

1. ✅ **ClerkProvider** is properly configured in `app/_layout.tsx`
2. ✅ **tokenCache** is implemented in `src/lib/tokenCache.ts`
3. ✅ **Authentication screens** (Login, Signup, Verify) are using Clerk's hooks directly
4. ✅ **AuthContext** is properly integrated with Clerk and Convex

## Recommended Improvements

### 1. Ensure Clerk SDK is properly initialized

The `app/_layout.tsx` file is already configured correctly with:
- ClerkProvider with publishableKey
- tokenCache implementation
- ClerkLoaded component to handle loading state

### 2. Authentication Flow

Your authentication flow is already implemented correctly:
- SignupScreen uses `useSignUp` hook
- LoginScreen uses `useSignIn` hook
- VerifyScreen handles email verification
- AuthContext integrates with Convex

### 3. Environment Variables

Ensure your `.env` file contains the correct Clerk publishable key:
```
EXPO_PUBLIC_CLERK_PUBLISHABLE_KEY=pk_test_ZWxlZ2FudC11bmljb3JuLTYzLmNsZXJrLmFjY291bnRzLmRldiQ
```

## Troubleshooting

If you encounter issues with the Clerk Native API:

1. **Check Console Logs**: Look for any error messages related to Clerk initialization or API calls.

2. **Verify Clerk Dashboard Settings**:
   - Ensure the "Native API" is enabled in your Clerk dashboard
   - Check that the correct authentication methods are enabled (Email/Password)
   - Verify that phone number verification is disabled if not needed

3. **Token Cache Issues**:
   - If you encounter token-related errors, check the implementation in `src/lib/tokenCache.ts`
   - Ensure Expo SecureStore is properly handling the tokens

4. **Authentication Flow**:
   - If sign-up or sign-in fails, check the implementation in the respective screens
   - Ensure proper error handling for all authentication states

5. **Environment Variables**:
   - Verify that the Clerk publishable key is correctly set in your `.env` file
   - Make sure the key is being properly loaded in your application

## Additional Resources

- [Clerk Documentation for React Native](https://clerk.com/docs/quickstarts/expo)
- [Clerk Authentication API Reference](https://clerk.com/docs/reference/clerk-expo)
- [Expo SecureStore Documentation](https://docs.expo.dev/versions/latest/sdk/securestore/)

## Next Steps

Your application is already well-configured for using Clerk's Native API. If you encounter specific issues, please refer to the troubleshooting section above or consult the Clerk documentation for more detailed guidance. 