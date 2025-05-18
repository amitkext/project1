// amplify/functions/resource.ts
import { defineFunction } from '@aws-amplify/backend';
// Import CDK IAM classes for PolicyStatement and Effect
import { Effect, PolicyStatement } from 'aws-cdk-lib/aws-iam';
// Import the Stack construct if you need to reference the region dynamically
import { Stack } from 'aws-cdk-lib';

// Define your preferred Bedrock model and region outside the function definition
const BEDROCK_MODEL_ID = 'anthropic.claude-3-haiku-20240307-v1:0'; // Example: Claude 3 Haiku
// Or 'amazon.titan-text-express-v1', 'ai21.j2-mid-v1', etc.
// Ensure this model is enabled in your Bedrock console for the region you choose below.
const AWS_BEDROCK_REGION = 'us-east-1'; // Or your preferred AWS region where Bedrock model is enabled

// Define your function resource ONCE
export const aiTutorFunction = defineFunction({
  name: 'aiTutorHandlerBedrock', // Choose a name for your function resource
  entry: './handler.ts', // Path to the Lambda handler code

  // Define environment variables for Bedrock model and region
  environment: {
    BEDROCK_MODEL_ID: BEDROCK_MODEL_ID,
    AWS_BEDROCK_REGION: AWS_BEDROCK_REGION,
    // You can remove OPENAI_API_KEY if it was here
  },
  memoryMB: 512, // Bedrock SDK can also be memory intensive
  timeoutSeconds: 60, // Bedrock calls can take time
});

// Grant permissions to invoke Bedrock models AFTER defining the function
// Access the underlying Lambda construct and use addToRolePolicy
aiTutorFunction.resources.lambda.addToRolePolicy(
  new PolicyStatement({
    effect: Effect.ALLOW,
    actions: ['bedrock:InvokeModel'],
    // Restrict to the specific model ARN for better security
    // Use Stack.of(aiTutorFunction).region to get the region dynamically if needed
    resources: [`arn:aws:bedrock:${AWS_BEDROCK_REGION}::foundation-model/${BEDROCK_MODEL_ID}`],
    // If you need multiple models, list their ARNs:
    // resources: [
    //   `arn:aws:bedrock:${AWS_BEDROCK_REGION}::foundation-model/anthropic.claude-3-haiku-20240307-v1:0`,
    //   `arn:aws:bedrock:${AWS_BEDROCK_REGION}::foundation-model/amazon.titan-text-express-v1`,
    //   // ... add other model ARNs
    // ],
  })
);

// No second definition of aiTutorFunction here!