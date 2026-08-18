import { CreatePostInput, PostType, PostCategory, PetPostType } from "./api/posts";

export interface MediaItem {
  /** Stable local identity: React key, retry/remove/fileMap lookup. Assigned
   * once at file-selection time and never reassigned — must NOT be replaced
   * by the server media id after upload, or retry/remove/React reconciliation
   * break. */
  clientId: number;
  /** Local blob: URL for immediate composer preview, created at selection
   * time. Kept alive (never revoked) through LOCAL/UPLOADING/READY/FAILED —
   * revoked only on explicit remove, discard, successful submit, or true
   * unmount. The composer always prefers this over serverUrl so preview
   * rendering never depends on the server URL being resolvable. */
  previewUrl: string;
  /** Present only after a successful upload. */
  serverMediaId?: number;
  /** Present only after a successful upload; the canonical persisted URL. */
  serverUrl?: string;
  thumbnailUrl?: string | null;
  type: "IMAGE" | "VIDEO" | "FILE";
  status: "LOCAL" | "UPLOADING" | "READY" | "FAILED";
  error?: string;
  order: number;
}

export interface CreatePostDraft {
  caption: string;
  privacy: "PUBLIC" | "FOLLOWERS_ONLY" | "PRIVATE";
  /** Post.category — the stable GENERAL/FUNDRAISING enum, distinct from
   * Post.type (TEXT/IMAGE/VIDEO/REEL) and Post.postType (the pet-context
   * enum below). Its selector is sourced from the database-backed
   * PostCategoryTaxonomy list, but only values that round-trip onto this
   * enum are actually sendable — see the Category quick pick's guard in
   * create-post-modal.tsx. */
  category?: string;
  categoryLabel?: string;
  postType: string; // GENERAL, HEALTH_UPDATE, VACCINATION, LOST_PET, ADOPTION, SERVICE_REVIEW
  backgroundStyle?: string;
  media: MediaItem[];
  locationText?: string;
  feelingId?: string;
  feelingLabel?: string;
  feelingEmoji?: string;
  activityId?: string;
  activityLabel?: string;
  activityEmoji?: string;
  taggedPetIds: number[];
  /** ContentTag primary key ids — selected via the Tags quick pick. */
  contentTagIds: number[];
  lostPetName?: string;
  lostPetLocation?: string;
  lostPetContactVisible: boolean;
  songTitle?: string;
  songArtist?: string;
  songStartMs?: number;
  songDurationMs?: number;
}

export const DEFAULT_DRAFT: CreatePostDraft = {
  caption: "",
  privacy: "PUBLIC",
  postType: "GENERAL",
  media: [],
  taggedPetIds: [],
  contentTagIds: [],
  lostPetContactVisible: false,
};

export function inferPostType(media: MediaItem[]): PostType {
  if (media.length === 0) return "TEXT";
  const hasVideo = media.some((m) => m.type === "VIDEO");
  if (hasVideo) return "VIDEO";
  return "IMAGE";
}

export function draftToCreatePostInput(draft: CreatePostDraft): CreatePostInput {
  const mediaIds = draft.media
    .filter((m) => m.status === "READY" && typeof m.serverMediaId === "number")
    .sort((a, b) => a.order - b.order)
    .map((m) => m.serverMediaId as number);

  return {
    caption: draft.caption || undefined,
    type: inferPostType(draft.media),
    category: (draft.category as PostCategory) || undefined,
    mediaIds: mediaIds.length > 0 ? mediaIds : undefined,
    privacy: draft.privacy,
    postType: (draft.postType as PetPostType) || undefined,
    backgroundStyle: draft.backgroundStyle,
    lostPetName: draft.lostPetName || undefined,
    lostPetLocation: draft.lostPetLocation || undefined,
    lostPetContactVisible: draft.lostPetContactVisible,
    taggedPetIds: draft.taggedPetIds.length > 0 ? draft.taggedPetIds : undefined,
    contentTagIds: draft.contentTagIds.length > 0 ? draft.contentTagIds : undefined,
    songTitle: draft.songTitle || undefined,
    songArtist: draft.songArtist || undefined,
    songStartMs: draft.songStartMs || undefined,
    songDurationMs: draft.songDurationMs || undefined,
    locationText: draft.locationText || undefined,
    feelingId: draft.feelingId || undefined,
    feelingLabel: draft.feelingLabel || undefined,
    feelingEmoji: draft.feelingEmoji || undefined,
    activityId: draft.activityId || undefined,
    activityLabel: draft.activityLabel || undefined,
    activityEmoji: draft.activityEmoji || undefined,
  };
}
