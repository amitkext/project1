// amplify/functions/handler.ts
import {
  BedrockRuntimeClient,
  InvokeModelCommand,
} from '@aws-sdk/client-bedrock-runtime';
// Correct import path for environment variables type
import { EnvironmentVariables } from './env-type';

// Use a more descriptive English name for the environment variables type
type FunctionEnvironment = EnvironmentVariables;

let bedrockClient: BedrockRuntimeClient;

// Helper function to parse model response (specific to Anthropic Claude)
// You'll need to adjust this based on the response structure of your chosen model
const parseClaudeResponse = (responseBody: Uint8Array): string | null => {
  try {
    const jsonString = new TextDecoder('utf-8').decode(responseBody); // Specify encoding
    const parsed = JSON.parse(jsonString);
    // For Claude, the response is often in parsed.completion or parsed.content[0].text
    if (parsed.content && Array.isArray(parsed.content) && parsed.content[0] && typeof parsed.content[0].text === 'string') {
        return parsed.content[0].text.trim();
    }
    if (typeof parsed.completion === 'string') { // Older Claude models
        return parsed.completion.trim();
    }
    console.warn("Could not find expected text field in Claude response:", parsed);
    return null;
  } catch (e) {
    console.error('Error parsing Bedrock Claude response:', e);
    return null;
  }
};

// Example for Amazon Titan Text
const parseTitanResponse = (responseBody: Uint8Array): string | null => {
    try {
        const jsonString = new TextDecoder('utf-8').decode(responseBody); // Specify encoding
        const parsed = JSON.parse(jsonString);
        // Adjust based on the exact Titan response structure if needed
        return parsed.results?.[0]?.outputText || null;
    } catch (e) {
        console.error('Error parsing Bedrock Titan response:', e);
        return null;
    }
};

// Example for AI21 Labs Jurassic-2
const parseAI21Response = (responseBody: Uint8Array): string | null => {
    try {
        const jsonString = new TextDecoder('utf-8').decode(responseBody); // Specify encoding
        const parsed = JSON.parse(jsonString);
        // Adjust based on the exact AI21 response structure if needed
        return parsed.completions?.[0]?.data?.text || null;
    } catch (e) {
        console.error('Error parsing Bedrock AI21 response:', e);
        return null;
    }
};


// The main Lambda handler function
export const handler = async (event: { arguments: { prompt: string } }) => {
  console.log('Received event:', JSON.stringify(event, null, 2));
  const { prompt } = event.arguments;

  if (!prompt) {
    console.error('Prompt is missing in the event arguments.');
    return { error: 'Prompt is required' };
  }

  // Access environment variables directly from process.env, cast for type safety
  const { BEDROCK_MODEL_ID, AWS_BEDROCK_REGION } = process.env as FunctionEnvironment;

  if (!BEDROCK_MODEL_ID || !AWS_BEDROCK_REGION) {
    console.error('Bedrock Model ID or Region environment variables are not configured.');
    return { error: 'AI Service is not configured (missing model/region environment variables).' };
  }

  // Initialize client if it doesn't exist
  if (!bedrockClient) {
    bedrockClient = new BedrockRuntimeClient({ region: AWS_BEDROCK_REGION });
  }

  // Construct the payload according to the *specific model's* expected format.
  // The language of the response is primarily determined by the prompt you send
  // and potentially model-specific parameters.
  let requestBody;
  let contentType = 'application/json'; // Default

  if (BEDROCK_MODEL_ID.startsWith('anthropic.claude')) {
    requestBody = {
      anthropic_version: 'bedrock-2023-05-31', // Required for Claude 3 models
      max_tokens: 1000, // Max tokens to generate
      messages: [
        {
          role: 'user',
          content: [{ type: 'text', text: prompt }],
        },
      ],
      // Optional: Add a system prompt to guide the AI's behavior and language
      system: 'You are a helpful AI Tutor. Provide clear and concise explanations in English.',
      // Other optional parameters like temperature, top_p, etc. can be added here
    };
  } else if (BEDROCK_MODEL_ID.startsWith('amazon.titan-text')) {
    requestBody = {
      inputText: prompt,
      textGenerationConfig: {
        maxTokenCount: 1000,
        temperature: 0.7,
        topP: 0.9,
        // Check Titan documentation for language-specific parameters if any
      },
    };
  } else if (BEDROCK_MODEL_ID.startsWith('ai21.j2')) {
    requestBody = {
      prompt: `User: ${prompt}\nAI Tutor:`, // Format prompt as needed by AI21
      maxTokens: 500,
      temperature: 0.7,
      // Check AI21 documentation for language-specific parameters if any
    };
  } else {
    console.error(`Unsupported model ID for payload construction: ${BEDROCK_MODEL_ID}`);
    return { error: `Model ${BEDROCK_MODEL_ID} is not currently configured for payload generation.` };
  }

  const command = new InvokeModelCommand({
    modelId: BEDROCK_MODEL_ID,
    body: JSON.stringify(requestBody),
    contentType: contentType,
    accept: 'application/json', // Most models accept this response type
  });

  try {
    console.log(`Invoking Bedrock model ${BEDROCK_MODEL_ID} in region ${AWS_BEDROCK_REGION}`);
    const apiResponse = await bedrockClient.send(command);

    let answer: string | null = null;
    // Response parsing depends on the model provider and model version
    if (BEDROCK_MODEL_ID.startsWith('anthropic.claude')) {
        answer = parseClaudeResponse(apiResponse.body);
    } else if (BEDROCK_MODEL_ID.startsWith('amazon.titan-text')) {
        answer = parseTitanResponse(apiResponse.body);
    } else if (BEDROCK_MODEL_ID.startsWith('ai21.j2')) {
        answer = parseAI21Response(apiResponse.body);
    } else {
        // Fallback or error if model isn't explicitly handled
        console.warn(`No specific parser for model ${BEDROCK_MODEL_ID}. Attempting generic text decode, results may vary.`);
        try {
             answer = new TextDecoder('utf-8').decode(apiResponse.body);
        } catch (decodeError) {
             console.error('Failed to decode model response body:', decodeError);
             return { error: 'Could not decode AI model response.' };
        }
         // You might need to parse JSON even for a fallback if the response is always JSON
         try {
             const parsedFallback = JSON.parse(answer);
             answer = JSON.stringify(parsedFallback, null, 2); // Or try to find a likely text field
             console.warn('Generic decode resulted in JSON, returning stringified JSON.');
         } catch (jsonError) {
             // Not JSON, just return the decoded text
             console.warn('Generic decode resulted in non-JSON text.');
         }
    }

    if (!answer) {
      console.error('Bedrock did not return a parsable answer.', new TextDecoder('utf-8').decode(apiResponse.body));
      return { error: 'AI did not return a valid answer or response could not be parsed.' };
    }

    return {
      answer: answer,
      originalPrompt: prompt,
    };
  } catch (error: any) {
    console.error('Error invoking Bedrock model:', error);
    // Return a more informative error if possible
    const errorMessage = error.message || 'Unknown Bedrock invocation error';
    return {
      error: `Failed to get response from AI: ${errorMessage}`,
    };
  }
};