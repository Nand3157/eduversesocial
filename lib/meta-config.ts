/**
 * Centralized Meta configuration. All values come from environment variables —
 * never hard-coded. Nothing here is safe to expose to the browser; do not
 * import this module from client components.
 */
export const META_GRAPH_VERSION = process.env.META_GRAPH_VERSION || "v26.0";
export const META_APP_ID = process.env.META_APP_ID;
export const META_APP_SECRET = process.env.META_APP_SECRET;
export const META_REDIRECT_URI = process.env.META_REDIRECT_URI;
export const THREADS_APP_ID = process.env.THREADS_APP_ID;
export const THREADS_APP_SECRET = process.env.THREADS_APP_SECRET;
export const THREADS_REDIRECT_URI = process.env.THREADS_REDIRECT_URI;
export const ENCRYPTION_KEY = process.env.ENCRYPTION_KEY;

/**
 * The only permissions requested from Facebook Login. Each one maps to a
 * documented capability:
 *  - public_profile      : read the basic identity of the connecting user (Facebook Login requirement)
 *  - pages_show_list     : discover the Pages the user administers (/me/accounts)
 *  - pages_read_engagement : read Page insights and post metrics
 *  - pages_manage_posts  : publish to Pages owned by the user
 *  - instagram_basic     : read linked Instagram Business account info (Facebook Login flow)
 *  - instagram_content_publish : publish images, reels and carousels (Facebook Login flow)
 *  - instagram_manage_insights : read Instagram account/media insights (Facebook Login flow)
 *
 * Note: the instagram_business_* variants are for the Instagram Login flow and
 * are NOT valid in the facebook.com/dialog/oauth URL used by this app.
 */
export const META_REQUIRED_PERMISSIONS = [
  "public_profile",
  "pages_show_list",
  "pages_read_engagement",
  "pages_manage_posts",
  "instagram_basic",
  "instagram_content_publish",
  "instagram_manage_insights"
] as const;

/**
 * Threads permissions. These live on the separate Threads app and are not
 * shared with the Facebook app:
 *  - threads_basic           : read the Threads profile
 *  - threads_content_publish : publish text and media threads
 *  - threads_manage_insights : read Threads user and media insights
 */
export const THREADS_REQUIRED_PERMISSIONS = ["threads_basic", "threads_content_publish", "threads_manage_insights"] as const;


