import { CreatePostInput, PostType, PostCategory, PetPostType } from "./api/posts";

export interface MediaItem {
  id: number;
  url: string;
  type: "IMAGE" | "VIDEO" | "FILE";
  status: "LOCAL" | "UPLOADING" | "READY" | "FAILED";
  error?: string;
  order: number;
}

export interface CreatePostDraft {
  caption: string;
  privacy: "PUBLIC" | "FOLLOWERS_ONLY" | "PRIVATE";
  category?: string;
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
    .filter((m) => m.status === "READY")
    .sort((a, b) => a.order - b.order)
    .map((m) => m.id);

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
