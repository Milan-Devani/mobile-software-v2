import { createClient } from '@supabase/supabase-js';
import { env } from './env.js';

let supabaseClient = null;

export const isSupabaseConfigured = () => {
  return Boolean(env.SUPABASE_URL && (env.SUPABASE_SERVICE_ROLE_KEY || env.SUPABASE_ANON_KEY));
};

export const getSupabase = () => {
  if (!isSupabaseConfigured()) {
    return null;
  }
  
  if (!supabaseClient) {
    const key = env.SUPABASE_SERVICE_ROLE_KEY || env.SUPABASE_ANON_KEY;
    supabaseClient = createClient(env.SUPABASE_URL, key, {
      auth: {
        autoRefreshToken: false,
        persistSession: false,
      },
    });
  }
  
  return supabaseClient;
};

export const uploadToSupabaseStorage = async (fileBuffer, fileName, mimeType, bucket = env.SUPABASE_STORAGE_BUCKET) => {
  const client = getSupabase();
  if (!client) {
    throw new Error('Supabase client is not configured.');
  }

  let { data, error } = await client.storage
    .from(bucket)
    .upload(fileName, fileBuffer, {
      contentType: mimeType,
      upsert: true,
    });

  // If bucket does not exist, automatically create it as public and retry
  if (error && (error.message?.includes('Bucket not found') || error.statusCode === '404' || error.status === 404)) {
    try {
      await client.storage.createBucket(bucket, { public: true });
      const retryResult = await client.storage
        .from(bucket)
        .upload(fileName, fileBuffer, {
          contentType: mimeType,
          upsert: true,
        });
      data = retryResult.data;
      error = retryResult.error;
    } catch (bucketErr) {
      console.warn('⚠️ Bucket auto-creation attempt error:', bucketErr.message);
    }
  }

  if (error) {
    throw error;
  }

  const { data: publicUrlData } = client.storage
    .from(bucket)
    .getPublicUrl(fileName);

  return {
    path: data?.path || fileName,
    url: publicUrlData?.publicUrl,
  };
};
