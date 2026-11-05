import { generateReviewText } from '../services/aiReview.service.js';
import { db, initDb } from '../db/db.js';
import { generateSecureReviewToken, triggerAutoReviewInvitation } from '../services/reviewInvitationService.js';
import { env } from '../config/env.js';

async function runE2eTests() {
  console.log('====================================================');
  console.log('🧪 RUNNING AI GOOGLE REVIEW ASSISTANT E2E TEST SUITE');
  console.log('====================================================\n');

  await initDb();

  // TEST 1: Primary Gemini Review Generation (5-star, Screen Replacement)
  console.log('--- TEST 1: Gemini 5-Star Screen Replacement Review ---');
  const res5 = await generateReviewText({
    rating: 5,
    customerFeedback: 'My screen is working perfectly and looks brand new.',
    deviceBrand: 'Apple',
    deviceModel: 'iPhone 13',
    problem: 'Broken glass and unresponsive touch',
    servicePerformed: 'OLED Display & Touch Digitizer Replacement',
  });

  console.log('Success:', res5.success);
  console.log('Provider used:', res5.provider, `(${res5.model})`);
  console.log('Word count:', res5.wordCount, `(duration: ${res5.durationMs}ms)`);
  console.log('Generated Review:\n', `"${res5.reviewText}"\n`);
  if (!res5.success || res5.provider !== 'gemini') {
    throw new Error('Test 1 failed: Expected Gemini primary to generate review');
  }

  // TEST 2: Gemini 1-Star Review (Disappointed, Honest Tone)
  console.log('--- TEST 2: Gemini 1-Star Honest Review (No false praise) ---');
  const res1 = await generateReviewText({
    rating: 1,
    customerFeedback: 'The device took longer than expected and issue persisted.',
    deviceBrand: 'Samsung',
    deviceModel: 'Galaxy S22',
    problem: 'Battery drains fast',
    servicePerformed: 'Battery Replacement',
  });

  console.log('Success:', res1.success);
  console.log('Provider used:', res1.provider);
  console.log('Generated 1-Star Review:\n', `"${res1.reviewText}"\n`);
  if (!res1.success) throw new Error('Test 2 failed');

  // TEST 3: Fallback from Gemini to Groq
  console.log('--- TEST 3: Automatic Fallback: Gemini -> Groq ---');
  const originalGeminiKey = env.GEMINI_API_KEY;
  try {
    env.GEMINI_API_KEY = 'invalid_key_to_force_groq_fallback';
    const fallbackRes = await generateReviewText({
      rating: 5,
      customerFeedback: 'Got camera lens cleaned.',
      deviceBrand: 'OnePlus',
      deviceModel: '11R',
      problem: 'Black spots on camera',
      servicePerformed: 'Camera Lens Dust Cleaning',
    });

    console.log('Fallback Success:', fallbackRes.success);
    console.log('Fallback Provider:', fallbackRes.provider, `(${fallbackRes.model})`);
    console.log('Fallback Occurred:', fallbackRes.fallbackOccurred);
    console.log('Groq Review:\n', `"${fallbackRes.reviewText}"\n`);

    if (!fallbackRes.success || fallbackRes.provider !== 'groq') {
      throw new Error('Test 3 failed: Expected fallback to Groq');
    }
  } finally {
    env.GEMINI_API_KEY = originalGeminiKey;
  }

  // TEST 4: Fallback to OpenRouter (Gemini & Groq unavailable)
  console.log('--- TEST 4: Automatic Fallback: Gemini & Groq -> OpenRouter ---');
  const originalGroqKey = env.GROQ_API_KEY;
  try {
    env.GEMINI_API_KEY = 'invalid_gemini_key';
    env.GROQ_API_KEY = 'invalid_groq_key';
    const orRes = await generateReviewText({
      rating: 4,
      customerFeedback: 'Charging port fixed.',
      deviceBrand: 'Google',
      deviceModel: 'Pixel 7',
      problem: 'Loose charging connector',
      servicePerformed: 'Charging Port Replacement',
    });

    console.log('OpenRouter Fallback Success:', orRes.success);
    console.log('OpenRouter Provider:', orRes.provider, `(${orRes.model})`);
    console.log('OpenRouter Review:\n', `"${orRes.reviewText}"\n`);

    if (!orRes.success || orRes.provider !== 'openrouter') {
      throw new Error('Test 4 failed: Expected fallback to OpenRouter');
    }
  } finally {
    env.GEMINI_API_KEY = originalGeminiKey;
    env.GROQ_API_KEY = originalGroqKey;
  }

  // TEST 5: Database Settings & Idempotency
  console.log('--- TEST 5: Database reviewSettings & Idempotent reviewRequests ---');
  const settings = await db.reviewSettings.get();
  console.log('Settings retrieved:', {
    is_enabled: settings.is_enabled,
    invitation_channel: settings.invitation_channel,
    google_review_url: settings.google_review_url,
    ai_enabled: settings.ai_enabled,
  });

  const testJobId = 'test-job-uuid-123';
  const { token, hash } = generateSecureReviewToken();

  const req1 = await db.reviewRequests.create({
    job_id: testJobId,
    customer_id: 'test-cust-123',
    unique_token: token,
    unique_token_hash: hash,
    invitation_status: 'SENT',
  });
  console.log('Created review request 1:', req1.id, 'status:', req1.invitation_status);

  // Duplicate attempt with same job_id
  const req2 = await db.reviewRequests.create({
    job_id: testJobId,
    customer_id: 'test-cust-123',
    unique_token: 'another_token_should_not_be_used',
    unique_token_hash: 'another_hash',
    invitation_status: 'PENDING',
  });

  if (req1.id !== req2.id) {
    throw new Error('Test 5 failed: Idempotency violated, duplicate request created for same job_id!');
  }
  console.log('✅ Idempotency verified: Duplicate job_id returned existing record without duplicating.');

  // TEST 6: Find by Token & Update Workflow
  console.log('\n--- TEST 6: Public Token Verification & Feedback Update ---');
  const foundByToken = await db.reviewRequests.findByToken(token);
  if (!foundByToken || foundByToken.id !== req1.id) {
    throw new Error('Test 6 failed: Token lookup failed');
  }
  console.log('✅ Token lookup succeeded for token:', token.substring(0, 10) + '...');

  const updatedReq = await db.reviewRequests.update(req1.id, {
    rating: 5,
    customer_feedback: 'Loved the fast repair and clear communication.',
    edited_review: 'My phone screen was replaced here. The new display works great and colors look normal. Thank you for the service.',
    review_page_opened_at: new Date().toISOString(),
    google_redirected_at: new Date().toISOString(),
  });

  console.log('Updated Request Rating:', updatedReq.rating);
  console.log('Redirected At:', updatedReq.google_redirected_at);

  const stats = await db.reviewRequests.getStats();
  console.log('Updated Stats:', stats);

  console.log('\n====================================================');
  console.log('🎉 ALL AI REVIEW ASSISTANT E2E TESTS PASSED 100%!');
  console.log('====================================================');
  process.exit(0);
}

runE2eTests().catch(err => {
  console.error('❌ E2E TEST FAILED:', err);
  process.exit(1);
});
