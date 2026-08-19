import { MetaFacebookService, MetaInstagramService, ThreadsService, type MetaPostPayload, type Platform } from "@/lib/meta-api";
import { MetaError } from "@/lib/meta-errors";

export type PublishSuccess = {
  success: true;
  platform: Platform;
  postId: string;
  url?: string | null;
  publishedAt?: string | null;
  status: "PUBLISHED" | "SCHEDULED";
};

export type PublishFailure = {
  success: false;
  platform: Platform;
  errorCode: string;
  message: string;
};

export type PublishResult = PublishSuccess | PublishFailure;

/**
 * Per-platform publishers. Each returns the post id and permalink only after
 * Meta has confirmed the publication. Errors are normalized to MetaError so
 * callers never see raw Graph responses.
 */
export interface PlatformPublisher {
  publish(input: MetaPostPayload, token: string): Promise<{ id: string; permalink?: string }>;
}

export class FacebookPublisher implements PlatformPublisher {
  async publish(input: MetaPostPayload, token: string) {
    const service = new MetaFacebookService(token);
    return service.publish(input.targetAccountId!, {
      message: input.caption,
      link: input.mediaUrls?.[0],
      imageUrl: input.mediaType === "IMAGE" ? input.mediaUrls?.[0] : undefined
    });
  }
}

export class InstagramPublisher implements PlatformPublisher {
  async publish(input: MetaPostPayload, token: string) {
    const service = new MetaInstagramService(token);
    return service.publish(input.targetAccountId!, input);
  }
}

export class ThreadsPublisher implements PlatformPublisher {
  async publish(input: MetaPostPayload, token: string) {
    const service = new ThreadsService(token);
    const isText = input.mediaType === "TEXT";
    const mediaUrl = input.mediaUrls?.[0];
    // Threads carousels are not supported by this integration; publish the first
    // item as a single image/video rather than silently dropping the media.
    if (!isText && !mediaUrl) throw new MetaError("META_INVALID_MEDIA", "Threads media posts require an accessible HTTPS media URL.");
    return service.publish({ text: input.caption, mediaUrl, mediaType: isText ? "TEXT" : input.mediaType === "VIDEO" ? "VIDEO" : "IMAGE" });
  }
}

const publishers: Record<Platform, PlatformPublisher> = {
  facebook: new FacebookPublisher(),
  instagram: new InstagramPublisher(),
  threads: new ThreadsPublisher()
};

/**
 * Unified publishing entry point. The frontend never talks to Meta directly —
 * it only sees the normalized success/failure shape below.
 */
export async function publishToPlatform(input: MetaPostPayload, token: string): Promise<PublishResult> {
  const platform = input.platform;
  const publisher = publishers[platform];
  if (!publisher) return { success: false, platform, errorCode: "META_UNKNOWN_ERROR", message: `Unsupported platform: ${platform}` } as PublishFailure;
  const result = await publisher.publish(input, token);
  if (!result?.id) throw new MetaError("META_API_ERROR", "Meta did not confirm publication.");
  return {
    success: true,
    platform,
    postId: result.id,
    url: result.permalink || null,
    publishedAt: new Date().toISOString(),
    status: "PUBLISHED"
  };
}

export function safePublishResponse(error: unknown, platform: Platform): PublishFailure {
  if (error instanceof MetaError) return { success: false, platform, errorCode: error.code, message: error.message };
  return { success: false, platform, errorCode: "META_UNKNOWN_ERROR", message: "Meta publish failed unexpectedly." };
}
