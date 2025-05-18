// amplify/auth/resource.ts
import { defineAuth } from '@aws-amplify/backend';

/**
 * Define and configure your auth resource
 * @see https://docs.amplify.aws/react/build-a-backend/auth
 */
export const auth = defineAuth({
  loginWith: {
    email: true,
    // You can add phone, external providers (Google, Facebook etc.) here
    // externalProviders: {
    //   callbackUrls: ['http://localhost:5173/'], // For Vite dev server
    //   logoutUrls: ['http://localhost:5173/'],
    // }
  },
  // You can add multifactor authentication, user attributes, etc.
  // mfa: {
  //   mode: 'OPTIONAL',
  //   totp: true,
  // },
  // userAttributes: {
  //   preferredUsername: {
  //     mutable: true,
  //     required: false,
  //   }
  // }
});
