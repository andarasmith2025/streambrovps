# Gemini AI Features

## Overview
StreamBro now includes AI-powered content generation using Google's Gemini 3.0 Flash Preview model for creating SEO-optimized YouTube metadata.

## Features

### 1. **AI Title Generation** ✨
- **Input**: 2-3 keywords (e.g., "gaming tutorial", "live coding")
- **Output**: SEO-optimized, engaging title (max 70 characters)
- **Speed**: < 2 seconds
- **Location**: New Stream Modal → Title field → "Generate Title" button

**Example**:
- Input: `javascript tutorial`
- Output: `Master JavaScript in 30 Days | Complete Beginner Guide`

### 2. **AI Description Generation** ✨
- **Input**: Stream title
- **Output**: SEO-optimized description (150-300 characters)
- **Speed**: < 2 seconds
- **Location**: New Stream Modal → YouTube API tab → "Generate Description" button

**Example**:
- Input Title: `Master JavaScript in 30 Days`
- Output: `Learn essential JavaScript concepts every developer needs. This comprehensive guide covers variables, functions, async/await, and modern ES6+ features. Perfect for beginners and intermediate developers.`

### 3. **AI Tags Generation** ✨
- **Input**: Title + Description
- **Output**: 8-10 relevant YouTube tags
- **Speed**: < 2 seconds
- **Location**: New Stream Modal → YouTube API tab → "Generate with AI" button

**Example**:
- Input: Title + Description about JavaScript
- Output: `javascript, programming, web development, coding tutorial, ES6, async await, beginner guide, learn javascript, javascript 2024, coding`

## Setup

### 1. Get Gemini API Key
1. Visit [Google AI Studio](https://aistudio.google.com/app/apikey)
2. Sign in with Google account
3. Click "Create API Key"
4. Copy the API key

### 2. Configure in StreamBro
1. Go to **Settings** → **Gemini AI Settings**
2. Paste your API key
3. Click "Test API Key" to verify
4. Click "Save"

## Usage Workflow

### Quick Start (Recommended)
1. **Enter keywords** in title field (e.g., "gaming stream")
2. Click **"Generate Title"** → AI creates full title
3. Click **"Generate Description"** → AI creates description
4. Click **"Generate with AI"** (tags) → AI creates tags
5. Review and edit if needed
6. Create stream

### Manual Mode
- You can still enter title, description, and tags manually
- AI generation is completely optional
- Mix AI-generated and manual content as needed

## Technical Details

### Models Used
- **Primary**: `gemini-3-flash-preview` (Gemini 3.0 Flash Preview)
- **Fallback**: `gemini-2.5-flash-preview-05-20` (Gemini 2.5 Flash)
- Automatic fallback if primary model unavailable

### API Endpoints
- `POST /api/gemini/generate-title` - Generate title from keywords
- `POST /api/gemini/generate-description` - Generate description from title
- `POST /api/gemini/generate-tags` - Generate tags from title + description
- `POST /api/gemini/test-key` - Test API key validity

### Rate Limits
- **Free tier**: 15 requests per minute, 1500 per day
- **Paid tier**: Higher limits based on plan
- See [Gemini API Pricing](https://ai.google.dev/pricing)

### Error Handling
- Invalid API key → User-friendly error message
- Quota exceeded → Retry later message
- Safety filters → Content flagged message
- Network errors → Graceful fallback

## Best Practices

### For Title Generation
- Use 2-5 keywords that describe your content
- Be specific (e.g., "react hooks tutorial" vs "coding")
- Include main topic and format if relevant

### For Description Generation
- Generate title first for best results
- Review and customize the output
- Add your own call-to-action if needed

### For Tags Generation
- Generate after title and description are set
- Review tags for relevance
- Remove or replace any irrelevant tags
- Add custom tags if needed

## Troubleshooting

### "API key not configured"
→ Go to Settings and add your Gemini API key

### "Quota exceeded"
→ Wait a few minutes or upgrade to paid tier

### "Content flagged by safety filters"
→ Try different keywords or title

### Generation takes too long
→ Check internet connection, typical response < 2 seconds

## Privacy & Security

- API key stored encrypted in database
- Only accessible by authenticated users
- No content stored by Gemini (per Google's policy)
- All requests use HTTPS

## Cost Estimation

### Free Tier (Sufficient for most users)
- 15 requests/minute = 900 requests/hour
- 1500 requests/day
- **Example**: 500 streams/day = 1500 AI generations = FREE

### Paid Tier (If needed)
- $0.00015 per request (Gemini 3.0 Flash)
- 10,000 requests = $1.50
- Very affordable for high-volume users

## Future Enhancements

Planned features:
- [ ] Batch generation for multiple streams
- [ ] Custom AI prompts/templates
- [ ] Language-specific optimization
- [ ] Category-based suggestions
- [ ] Thumbnail text generation
- [ ] Auto-translate descriptions

## Support

For issues or questions:
1. Check this documentation
2. Test API key in Settings
3. Check Gemini API status
4. Contact support with error details

---

**Note**: AI-generated content should be reviewed before publishing. While Gemini produces high-quality results, human oversight ensures accuracy and brand consistency.
