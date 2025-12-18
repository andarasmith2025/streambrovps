const { google } = require('googleapis');
const User = require('../models/User');

// Default OAuth client (fallback for backward compatibility)
const oauth2Client = new google.auth.OAuth2(
  process.env.GOOGLE_CLIENT_ID,
  process.env.GOOGLE_CLIENT_SECRET,
  process.env.GOOGLE_REDIRECT_URI
);

// Runtime guard (non-fatal): log if envs are missing
if (!process.env.GOOGLE_CLIENT_ID || !process.env.GOOGLE_CLIENT_SECRET || !process.env.GOOGLE_REDIRECT_URI) {
  console.warn('[OAuth] Default env vars missing. Users must configure their own YouTube API credentials.');
}

const YT_SCOPES = [
  // Full access for streaming management; switch to youtube.readonly if you only need read-only
  'https://www.googleapis.com/auth/youtube'
];

// Create OAuth client for specific user
async function getUserOAuthClient(userId, redirectUri = null) {
  try {
    const credentials = await User.getYouTubeCredentials(userId);
    
    if (credentials.youtube_client_id && credentials.youtube_client_secret) {
      // User has their own credentials
      console.log(`[OAuth] Using user-specific credentials for user ${userId}`);
      const userRedirectUri = redirectUri || credentials.youtube_redirect_uri || process.env.GOOGLE_REDIRECT_URI;
      return new google.auth.OAuth2(
        credentials.youtube_client_id,
        credentials.youtube_client_secret,
        userRedirectUri
      );
    } else {
      // Fallback to default credentials
      console.log(`[OAuth] Using default credentials for user ${userId}`);
      if (redirectUri) {
        return new google.auth.OAuth2(
          process.env.GOOGLE_CLIENT_ID,
          process.env.GOOGLE_CLIENT_SECRET,
          redirectUri
        );
      }
      return oauth2Client;
    }
  } catch (error) {
    console.error(`[OAuth] Error getting user credentials for ${userId}:`, error);
    if (redirectUri) {
      return new google.auth.OAuth2(
        process.env.GOOGLE_CLIENT_ID,
        process.env.GOOGLE_CLIENT_SECRET,
        redirectUri
      );
    }
    return oauth2Client;
  }
}

async function getAuthUrl(state, userId = null, redirectUri = null) {
  const client = userId ? await getUserOAuthClient(userId, redirectUri) : oauth2Client;
  
  const url = client.generateAuthUrl({
    access_type: 'offline',
    prompt: 'consent',
    scope: YT_SCOPES,
    state: state || 'streambro',
    include_granted_scopes: true,
  });
  
  console.log(`[OAuth] Generated auth URL for user ${userId || 'default'} with redirect: ${redirectUri || 'default'}`);
  return url;
}

async function exchangeCodeForTokens(code, userId = null, redirectUri = null) {
  const client = userId ? await getUserOAuthClient(userId, redirectUri) : oauth2Client;
  const { tokens } = await client.getToken(code);
  return tokens;
}

function getYouTubeClient(tokens, userId = null) {
  // For synchronous calls, we need to handle this differently
  // We'll create a new client with the tokens
  let client;
  
  if (userId && tokens._userCredentials) {
    // If we have cached user credentials in tokens object
    client = new google.auth.OAuth2(
      tokens._userCredentials.client_id,
      tokens._userCredentials.client_secret,
      tokens._userCredentials.redirect_uri
    );
  } else {
    // Use default client
    client = oauth2Client;
  }
  
  client.setCredentials(tokens);
  return google.youtube({ version: 'v3', auth: client });
}

// Helper to attach user credentials to tokens for later use
async function attachUserCredentials(tokens, userId) {
  if (!userId) return tokens;
  
  try {
    const credentials = await User.getYouTubeCredentials(userId);
    if (credentials.youtube_client_id && credentials.youtube_client_secret) {
      tokens._userCredentials = {
        client_id: credentials.youtube_client_id,
        client_secret: credentials.youtube_client_secret,
        redirect_uri: credentials.youtube_redirect_uri
      };
    }
  } catch (error) {
    console.error('[OAuth] Error attaching user credentials:', error);
  }
  
  return tokens;
}

module.exports = { 
  oauth2Client, 
  getUserOAuthClient,
  getAuthUrl, 
  exchangeCodeForTokens, 
  getYouTubeClient,
  attachUserCredentials
};
