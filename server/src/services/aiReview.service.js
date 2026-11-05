import axios from 'axios';
import { env } from '../config/env.js';

/**
 * Safe AI Provider Logger
 * Logs provider telemetry without leaking API keys, auth headers, or customer PII.
 */
const logAiAttempt = ({ provider, model, success, durationMs, failureCategory, errorMessage }) => {
  const logObj = {
    timestamp: new Date().toISOString(),
    provider,
    model,
    success,
    durationMs,
    ...(failureCategory ? { failureCategory } : {}),
    ...(errorMessage ? { error: errorMessage.substring(0, 150) } : {}),
  };

  if (success) {
    console.log(`🤖 [AI Review] Provider '${provider}' (${model}) succeeded in ${durationMs}ms`);
  } else {
    console.warn(`⚠️ [AI Review] Provider '${provider}' (${model}) failed [${failureCategory}]: ${logObj.error || 'Unknown error'}`);
  }
};

/**
 * Classify API errors into standardized categories
 */
const categorizeError = (err) => {
  if (err.code === 'ECONNABORTED' || err.message?.includes('timeout')) {
    return 'TIMEOUT';
  }
  const status = err.response?.status;
  if (status === 429) return 'RATE_LIMIT';
  if (status === 401 || status === 403) return 'INVALID_KEY_OR_AUTH';
  if (status === 404) return 'MODEL_NOT_FOUND';
  if (status >= 500) return 'SERVER_ERROR';
  if (err.response?.data?.error?.message?.toLowerCase().includes('quota')) return 'QUOTA_EXCEEDED';
  if (err.code === 'ENOTFOUND' || err.code === 'ECONNREFUSED') return 'NETWORK_ERROR';
  return 'PROVIDER_ERROR';
};

/**
 * Clean & constrain review text to 25-55 words without quotes or artificial prefixes
 */
const cleanReviewOutput = (rawText, maxWords = 55) => {
  if (!rawText || typeof rawText !== 'string') return '';
  let cleaned = rawText
    .replace(/^["'`]+|["'`]+$/g, '') // Remove outer quotes
    .replace(/^(here is a review:|review:|customer review:)/i, '') // Remove model preambles
    .replace(/\*\*/g, '') // Remove bold markdown
    .trim();

  // Remove reasoning blocks if model wrapped in <think> tags
  cleaned = cleaned.replace(/<think>[\s\S]*?<\/think>/gi, '').trim();

  // Check word count
  const words = cleaned.split(/\s+/).filter(Boolean);
  if (words.length > maxWords) {
    cleaned = words.slice(0, maxWords).join(' ') + '.';
    // Fix any double punctuation
    cleaned = cleaned.replace(/\.\.+$/, '.');
  }

  return cleaned;
};

/**
 * Build a structured, honest prompt adhering strictly to Google Review policies
 */
const buildReviewPrompt = ({ rating, customerFeedback, deviceBrand, deviceModel, problem, servicePerformed }) => {
  const stars = Math.min(5, Math.max(1, parseInt(rating || 5, 10)));
  const device = `${deviceBrand || ''} ${deviceModel || ''}`.trim() || 'phone';
  const issue = problem || 'device issue';
  const service = servicePerformed || 'repair service';
  const feedback = (customerFeedback || '').trim();

  return `You are a real customer writing a short, authentic Google review for a mobile repair shop named "Mobotech Mobile Care".

RATING: ${stars} out of 5 stars
DEVICE: ${device}
REPORTED PROBLEM: ${issue}
SERVICE DONE: ${service}
CUSTOMER'S OWN WORDS/FEEDBACK: ${feedback ? `"${feedback}"` : "None provided"}

STRICT GUIDELINES:
1. Write in FIRST PERSON ("I", "my") as the customer who got their device serviced.
2. LENGTH: Exactly 25 to 50 words. Be short, natural, and conversational.
3. TONE:
   - If 5 stars: Genuinely pleased and appreciative of getting the phone fixed.
   - If 4 stars: Positive and satisfied.
   - If 3 stars: Balanced and fair experience.
   - If 1 or 2 stars: Honest, disappointed, or matter-of-fact about the problem. Do NOT make it positive.
4. STRICT TRUTH - DO NOT INVENT:
   - Do NOT invent discounts, prices, or cheap rates.
   - Do NOT invent fast timing or speed unless mentioned in customer feedback.
   - Do NOT invent staff behavior or shop cleanliness.
   - Do NOT use clichés like "100% satisfied", "best shop ever", or "highly recommend" unless customer feedback says so.
5. Only reference the actual device (${device}) and service (${service}).
6. OUTPUT ONLY the final review text. No greeting, no quotes, no explanations, no titles.`;
};

/**
 * Provider 1: Google Gemini (Primary)
 */
const callGemini = async ({ prompt, timeout }) => {
  const apiKey = env.GEMINI_API_KEY;
  const model = env.GEMINI_TEXT_MODEL || 'gemini-2.5-flash';
  if (!apiKey) throw new Error('GEMINI_API_KEY is not configured');

  const startTime = Date.now();
  try {
    const url = `https://generativelanguage.googleapis.com/v1beta/models/${model}:generateContent?key=${apiKey}`;
    const payload = {
      contents: [{ parts: [{ text: prompt }] }],
      generationConfig: {
        thinkingConfig: { thinkingBudget: 0 },
        temperature: 0.7,
        maxOutputTokens: 300,
      },
    };

    const res = await axios.post(url, payload, {
      headers: { 'Content-Type': 'application/json' },
      timeout,
    });

    const durationMs = Date.now() - startTime;
    const rawReply = res.data?.candidates?.[0]?.content?.parts?.[0]?.text;
    const cleaned = cleanReviewOutput(rawReply, env.AI_REVIEW_MAX_WORDS);

    if (!cleaned) throw new Error('Empty response received from Gemini');

    logAiAttempt({ provider: 'gemini', model, success: true, durationMs });
    return { text: cleaned, provider: 'gemini', model, durationMs };
  } catch (err) {
    const durationMs = Date.now() - startTime;
    const category = categorizeError(err);
    logAiAttempt({
      provider: 'gemini',
      model,
      success: false,
      durationMs,
      failureCategory: category,
      errorMessage: err.response?.data?.error?.message || err.message,
    });
    throw err;
  }
};

/**
 * Provider 2: Groq (First Fallback)
 */
const callGroq = async ({ prompt, timeout }) => {
  const apiKey = env.GROQ_API_KEY;
  const model = env.GROQ_TEXT_MODEL || 'qwen/qwen3.8-27b';
  if (!apiKey) throw new Error('GROQ_API_KEY is not configured');

  const startTime = Date.now();
  try {
    const url = 'https://api.groq.com/openai/v1/chat/completions';
    const payload = {
      model,
      messages: [
        {
          role: 'system',
          content: 'You write short, natural, authentic first-person customer reviews. Output ONLY the review text with no quotes or preamble.',
        },
        { role: 'user', content: prompt },
      ],
      max_tokens: 250,
      temperature: 0.7,
    };

    const res = await axios.post(url, payload, {
      headers: {
        Authorization: `Bearer ${apiKey}`,
        'Content-Type': 'application/json',
      },
      timeout,
    });

    const durationMs = Date.now() - startTime;
    const rawReply = res.data?.choices?.[0]?.message?.content;
    const cleaned = cleanReviewOutput(rawReply, env.AI_REVIEW_MAX_WORDS);

    if (!cleaned) throw new Error('Empty response received from Groq');

    logAiAttempt({ provider: 'groq', model, success: true, durationMs });
    return { text: cleaned, provider: 'groq', model, durationMs };
  } catch (err) {
    const durationMs = Date.now() - startTime;
    const category = categorizeError(err);
    logAiAttempt({
      provider: 'groq',
      model,
      success: false,
      durationMs,
      failureCategory: category,
      errorMessage: err.response?.data?.error?.message || err.message,
    });
    throw err;
  }
};

/**
 * Provider 3: OpenRouter (Second Fallback)
 */
const callOpenRouter = async ({ prompt, timeout }) => {
  const apiKey = env.OPENROUTER_API_KEY;
  const model = env.OPENROUTER_TEXT_MODEL || 'nvidia/nemotron-3.5-lightning:free';
  if (!apiKey) throw new Error('OPENROUTER_API_KEY is not configured');

  const startTime = Date.now();
  try {
    const url = 'https://openrouter.ai/api/v1/chat/completions';
    const payload = {
      model,
      messages: [
        {
          role: 'system',
          content: 'You write short, natural, authentic first-person customer reviews. Output ONLY the review text with no quotes or preamble.',
        },
        { role: 'user', content: prompt },
      ],
      max_tokens: 300,
      reasoning: { max_tokens: 0 },
      temperature: 0.7,
    };

    const res = await axios.post(url, payload, {
      headers: {
        Authorization: `Bearer ${apiKey}`,
        'Content-Type': 'application/json',
        'HTTP-Referer': 'https://mobotech.com',
        'X-Title': 'Mobotech Mobile Care',
      },
      timeout,
    });

    const durationMs = Date.now() - startTime;
    const rawReply = res.data?.choices?.[0]?.message?.content;
    const cleaned = cleanReviewOutput(rawReply, env.AI_REVIEW_MAX_WORDS);

    if (!cleaned) throw new Error('Empty response received from OpenRouter');

    logAiAttempt({ provider: 'openrouter', model, success: true, durationMs });
    return { text: cleaned, provider: 'openrouter', model, durationMs };
  } catch (err) {
    const durationMs = Date.now() - startTime;
    const category = categorizeError(err);
    logAiAttempt({
      provider: 'openrouter',
      model,
      success: false,
      durationMs,
      failureCategory: category,
      errorMessage: err.response?.data?.error?.message || err.message,
    });
    throw err;
  }
};

/**
 * Map provider string to call function
 */
const providerCallers = {
  gemini: callGemini,
  groq: callGroq,
  openrouter: callOpenRouter,
};

/**
 * Centralized AI Review Generation with Automatic Ordered Fallback:
 * Priority 1: Gemini -> Priority 2: Groq -> Priority 3: OpenRouter
 */
export const generateReviewText = async ({
  rating = 5,
  customerFeedback = '',
  deviceBrand = '',
  deviceModel = '',
  problem = '',
  servicePerformed = '',
}) => {
  const prompt = buildReviewPrompt({
    rating,
    customerFeedback,
    deviceBrand,
    deviceModel,
    problem,
    servicePerformed,
  });

  const timeout = env.AI_REQUEST_TIMEOUT || 20000;
  const primary = (env.AI_PRIMARY_PROVIDER || 'gemini').toLowerCase().trim();
  const fallbacks = (env.AI_FALLBACK_PROVIDERS || ['groq', 'openrouter']).map(p => p.toLowerCase().trim());

  // Deduplicated list of providers in exact priority order
  const providerSequence = Array.from(new Set([primary, ...fallbacks])).filter(p => providerCallers[p]);

  const attempts = [];

  for (const provider of providerSequence) {
    const caller = providerCallers[provider];
    try {
      const result = await caller({ prompt, timeout });
      const wordCount = result.text.split(/\s+/).filter(Boolean).length;

      return {
        success: true,
        reviewText: result.text,
        provider: result.provider,
        model: result.model,
        wordCount,
        durationMs: result.durationMs,
        fallbackOccurred: provider !== primary,
      };
    } catch (err) {
      attempts.push({
        provider,
        category: categorizeError(err),
        message: err.message,
      });
      // Continue automatically to next fallback in priority order
    }
  }

  // All providers failed
  const errorDetails = attempts.map(a => `${a.provider}: ${a.category}`).join(', ');
  console.error(`❌ [AI Review] All providers exhausted. Attempts: ${errorDetails}`);

  return {
    success: false,
    reviewText: null,
    provider: null,
    error: 'All AI review suggestion providers are temporarily unavailable. Please try again or share your review directly.',
    attempts,
  };
};
