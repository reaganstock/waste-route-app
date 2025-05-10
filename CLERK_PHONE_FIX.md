# Fixing Phone Number Requirement in Clerk

If you're experiencing issues with Clerk still requiring a phone number even after you've disabled it in the dashboard, follow these steps to completely disable the phone number requirement:

## Steps to Disable Phone Number Requirement

1. **Log in to your Clerk Dashboard**
   - Go to [dashboard.clerk.dev](https://dashboard.clerk.dev) and sign in

2. **Select Your Application**
   - Click on the application you're using for WasteRoute

3. **Navigate to User & Authentication Settings**
   - In the left sidebar, click on "User & Authentication"

4. **Check Contact Information Requirements**
   - Under the "Contact information" section, make sure:
     - "Require phone number" is UNCHECKED
     - "Allow phone number" can be either checked or unchecked based on your preference

5. **Check Sign-up Requirements**
   - Click on "Sign-up" in the left sidebar
   - Under "Required fields", make sure "Phone number" is NOT selected

6. **Check Missing Fields Requirements**
   - Click on "Advanced" in the left sidebar
   - Look for any settings related to "Missing fields" or "Required fields"
   - Make sure phone number is not listed as a required field

7. **Save Changes**
   - Make sure to save any changes you make

8. **Clear Browser Cache**
   - Sometimes Clerk dashboard changes can be cached. Clear your browser cache.

9. **Restart Your Development Server**
   - Stop and restart your Expo and Convex development servers

## Alternative Solution in Code

If the above steps don't resolve the issue, our code now includes a workaround that:

1. Detects when Clerk is incorrectly requiring a phone number
2. Bypasses this requirement and allows the user to proceed with email verification
3. Handles "already verified" errors gracefully

This workaround should allow users to sign up and verify their accounts even if Clerk is incorrectly requiring a phone number.

## Testing the Fix

To test if the fix is working:

1. Try signing up with a new email address
2. Verify the email with the code sent
3. You should be able to complete the process without being asked for a phone number

If you're still experiencing issues, please check the console logs for any error messages and make sure your Clerk publishable key is correct in your `.env` file. 