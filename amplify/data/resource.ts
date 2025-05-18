// amplify/data/resource.ts
import { type ClientSchema, a, defineData } from '@aws-amplify/backend';

/*
Define your client schema.
See https://docs.amplify.aws/react/build-a-backend/data/data-modeling/
*/
const schema = a.schema({
  Interaction: a
    .model({
      userId: a.string().required(), // To associate interaction with a user
      question: a.string().required(),
      answer: a.string(),
      timestamp: a.datetime().required(),
      // Add owner-based auth rule if you want users to only access their own interactions
    })
    // Example of owner-based authorization:
    // .authorization(allow => [allow.owner()]), // User must be logged in

  // You might also have:
  // UserProfile: a.model({
  //   userId: a.string().required().unique(), // Often the Cognito sub
  //   username: a.string(),
  //   preferences: a.json(),
  // }).authorization(allow => [allow.owner()]),

  // Lesson: a.model({
  //   title: a.string().required(),
  //   content: a.string(), // Could be Markdown or link to S3 content
  //   topic: a.string(),
  // }).authorization(allow => [allow.publicApiKey()]), // Example: public lessons
});

export type Schema = ClientSchema<typeof schema>;

export const data = defineData({
  schema,
  authorizationModes: {
    // API Key is useful for public data or testing during development
    defaultAuthorizationMode: 'apiKey',
    // You'll likely want to switch to 'userPool' for authenticated user data
    // defaultAuthorizationMode: 'userPool',
    apiKeyAuthorizationMode: {
      expiresInDays: 30,
    },
  },
});
