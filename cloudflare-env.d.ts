declare namespace Cloudflare {
  interface Env {
  DEEPSEEK_API_KEY?: string;
    DB?: D1Database;
    BUCKET?: R2Bucket;
    STORAGE_KEY?: string;
    MODEL_ALLOWED_HOSTS?: string;
  }
}
