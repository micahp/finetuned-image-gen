import Stripe from 'stripe';

const STRIPE_SECRET_KEY = process.env.STRIPE_API_TOKEN;
const IS_BUILD_TIME = process.env.NODE_ENV === 'production' && !process.env.VERCEL && !process.env.RAILWAY_ENVIRONMENT;

if (!STRIPE_SECRET_KEY) {
  if (process.env.NODE_ENV === 'production' && !IS_BUILD_TIME) {
    throw new Error('Missing STRIPE_API_TOKEN in environment variables for production.');
  } else if (!IS_BUILD_TIME) {
    console.warn(
      'WARN: Missing STRIPE_API_TOKEN in environment variables. Stripe functionality will not work.' +
      ' Please add it to your .env.local file for development.'
    );
  }
}

// The Stripe SDK expects a non-empty string for the API key.
// In a non-production environment, if the key is missing, we pass a dummy key
// to allow the application to run, but Stripe operations will fail.
// This prevents crashes during development if Stripe isn't fully configured yet.
// The test will still check if it's an instance of Stripe, which it will be.
// However, actual API calls would fail, which is expected if the key is missing.

export const stripe = new Stripe(STRIPE_SECRET_KEY || 'sk_test_DUMMYKEYFORDEVELOPMENT12345', {
  apiVersion: '2025-04-30.basil', // Use the specific API version expected by the installed SDK
  typescript: true, // Enable TypeScript support
  // Optionally, you can configure other settings like httpProxy, timeout, etc.
});

// Also export the publishable key for client-side use
export const NEXT_PUBLIC_STRIPE_PUBLISHABLE_KEY = process.env.STRIPE_PUBLISHABLE_TOKEN;

if (!NEXT_PUBLIC_STRIPE_PUBLISHABLE_KEY) {
  if (process.env.NODE_ENV === 'production' && !IS_BUILD_TIME) {
    throw new Error('Missing STRIPE_PUBLISHABLE_TOKEN in environment variables for production.');
  } else if (!IS_BUILD_TIME) {
    console.warn(
      'WARN: Missing STRIPE_PUBLISHABLE_TOKEN in environment variables. Stripe Checkout/Elements might not work.' +
      ' Please add it to your .env.local file for development.'
    );
  }
} 