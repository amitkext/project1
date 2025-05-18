// amplify/backend.ts
import { defineBackend } from '@aws-amplify/backend';
import { auth } from './auth/resource';
import { data } from './data/resource';
import { aiTutorFunction } from './functions/resource'; // Import your function

export const backend = defineBackend({
  auth,
  data,
  aiTutorFunction, // Add your function here
});