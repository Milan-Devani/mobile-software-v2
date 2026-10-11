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

  const { data, error } = await client.storage
    .from(bucket)
    .upload(fileName, fileBuffer, {
      contentType: mimeType,
      upsert: true,
    });

  if (error) {
    throw error;
  }

  const { data: publicUrlData } = client.storage
    .from(bucket)
    .getPublicUrl(fileName);

  return {
    path: data.path,
    url: publicUrlData.publicUrl,
  };
};
