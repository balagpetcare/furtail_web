"use client";

import React, { useEffect, useRef, useState, useCallback } from "react";
import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
  DialogClose,
} from "@/components/ui/dialog";
import {
  Popover,
  PopoverContent,
  PopoverTrigger,
} from "@/components/ui/popover";
import { Avatar, AvatarFallback, AvatarImage } from "@/components/ui/avatar";
import { Button } from "@/components/ui/button";
import {
  Image as ImageIcon,
  X,
  Globe,
  Users,
  Lock,
  SmileIcon,
  MapPin,
  Trash2,
  Loader,
  ChevronDown,
} from "lucide-react";
import { getMediaUrl } from "@/lib/media";
import { createPreviewUrlTracker, type PreviewUrlTracker } from "@/lib/preview-url-tracker";
import { authKeys, authApi } from "@/lib/api/auth";
import { postsApi, postsKeys } from "@/lib/api/posts";
import { petsApi, petsKeys } from "@/lib/api/pets";
import {
  useFeelings,
  useActivities,
  usePostCategories,
  useContentTags,
  useBackgroundStyles,
  type TaxonomyOption,
} from "@/lib/api/taxonomies";
import {
  CreatePostDraft,
  DEFAULT_DRAFT,
  MediaItem,
  draftToCreatePostInput,
} from "@/lib/create-post-draft";
import { PopoverPicker, SelectedChip } from "@/components/ui/popover-picker";
import { BackgroundStylesScroller } from "@/components/post/background-styles-scroller";
import { CreatePostMetadataRow } from "@/components/post/create-post-metadata-row";
import { MediaActionBar } from "@/components/post/media-action-bar";
import { MediaPreviewGrid } from "@/components/post/media-preview-grid";
import { CaptionEditorWithPreview } from "@/components/post/caption-editor-with-preview";
import { toast } from "sonner";

interface CreatePostModalProps {
  open: boolean;
  onOpenChange: (open: boolean) => void;
}

const PRIVACY_OPTIONS = [
  { value: "PUBLIC", label: "Public", icon: Globe, description: "Anyone can see this" },
  { value: "FOLLOWERS_ONLY", label: "Followers", icon: Users, description: "Only your followers" },
  { value: "PRIVATE", label: "Private", icon: Lock, description: "Only you" },
] as const;

// Canonical post types - stable domain invariants
const POST_TYPES = [
  { value: "GENERAL", label: "General" },
  { value: "HEALTH_UPDATE", label: "Health Update" },
  { value: "VACCINATION", label: "Vaccination" },
  { value: "LOST_PET", label: "Lost Pet Alert" },
  { value: "ADOPTION", label: "Adoption" },
  { value: "SERVICE_REVIEW", label: "Service Review" },
];

interface UploadedMediaResult {
  serverMediaId: number;
  serverUrl: string;
  thumbnailUrl: string | null;
}

/**
 * Strict runtime parser for the upload response contract. A successful
 * upload requires BOTH a positive numeric id and a non-empty url — silently
 * accepting `url: ""` here is exactly how a server-side regression turns
 * into a client-side "gray preview box" days later, since the caller would
 * otherwise mark the item READY with nothing valid to render or submit.
 */
function parseUploadResponse(body: unknown): UploadedMediaResult {
  const data = (body as { data?: Record<string, unknown> } | null)?.data;
  const id = data?.id;
  const url = data?.url;
  if (typeof id !== "number" || !Number.isFinite(id) || id <= 0) {
    throw new Error("Upload response missing a valid media id");
  }
  if (typeof url !== "string" || url.length === 0) {
    throw new Error("Upload response missing a valid media url");
  }
  const thumbnailUrl = typeof data?.thumbnailUrl === "string" ? data.thumbnailUrl : null;
  return { serverMediaId: id, serverUrl: url, thumbnailUrl };
}

async function uploadPostMedia(file: File): Promise<UploadedMediaResult> {
  const formData = new FormData();
  formData.append("file", file);
  formData.append("purpose", "post");

  const res = await fetch("/api/proxy/media/upload", {
    method: "POST",
    body: formData,
  });

  if (!res.ok) throw new Error("Failed to upload media");
  const body = await res.json();
  return parseUploadResponse(body);
}

function detectMediaType(
  mimeType: string
): "IMAGE" | "VIDEO" | "FILE" {
  if (mimeType.startsWith("video/")) return "VIDEO";
  if (mimeType.startsWith("image/")) return "IMAGE";
  return "FILE";
}

export function CreatePostModal({ open, onOpenChange }: CreatePostModalProps) {
  const [draft, setDraft] = useState<CreatePostDraft>(DEFAULT_DRAFT);
  const [showDiscard, setShowDiscard] = useState(false);
  const fileInputRef = useRef<HTMLInputElement>(null);
  const queryClient = useQueryClient();
  const idempotencyKeyRef = useRef<string | null>(null);
  const clientMediaIdRef = useRef(0);
  const fileMapRef = useRef<Map<number, File>>(new Map()); // Store File objects for retry
  // Tracks every previewUrl (blob:) currently alive for this draft. Revoked
  // ONLY through explicit calls below (remove/discard/success/unmount) —
  // never as a side effect of a draft.media status change. An effect keyed
  // on draft.media would re-run its cleanup (and revoke the still-displayed
  // blob URL) on every LOCAL->UPLOADING->READY transition, which was the
  // confirmed cause of composer previews going gray. See
  // lib/preview-url-tracker.ts for the tested lifecycle contract.
  const previewUrlTrackerRef = useRef<PreviewUrlTracker>(createPreviewUrlTracker());

  useEffect(() => {
    if (open) {
      idempotencyKeyRef.current = null;
    }
  }, [open]);

  // Unmount-only cleanup — empty deps array means this cleanup fires once,
  // when CreatePostModal itself unmounts, not on every re-render.
  useEffect(() => {
    const tracker = previewUrlTrackerRef.current;
    return () => tracker.revokeAll();
  }, []);

  const revokeAllPreviewUrls = useCallback(() => {
    previewUrlTrackerRef.current.revokeAll();
  }, []);

  const revokePreviewUrl = useCallback((url: string) => {
    previewUrlTrackerRef.current.revoke(url);
  }, []);

  const { data: user } = useQuery({
    queryKey: authKeys.me,
    queryFn: () => authApi.getMe(),
    enabled: open,
  });

  const { data: userPets } = useQuery({
    queryKey: petsKeys.myPets(),
    queryFn: () => petsApi.getMyPets().then((res) => res.items),
    enabled: open,
  });

  // Dynamic taxonomy hooks
  const feelingsQuery = useFeelings();
  const activitiesQuery = useActivities();
  const categoriesQuery = usePostCategories();
  const tagsQuery = useContentTags();
  const backgroundStylesQuery = useBackgroundStyles();

  const mutation = useMutation({
    mutationFn: async () => {
      if (!idempotencyKeyRef.current) {
        idempotencyKeyRef.current = crypto.randomUUID();
      }

      const payload = draftToCreatePostInput(draft);

      return postsApi.createPost({
        ...payload,
        idempotencyKey: idempotencyKeyRef.current,
      });
    },
    onSuccess: () => {
      idempotencyKeyRef.current = null;
      fileMapRef.current.clear();
      revokeAllPreviewUrls();
      setDraft(DEFAULT_DRAFT);
      onOpenChange(false);
      toast.success("Post created successfully!");
      queryClient.invalidateQueries({ queryKey: postsKeys.all });
    },
    onError: (error: any) => {
      // Handle typed ApiError with status property
      const status = error?.status;
      const message = error?.message || "Failed to create post. Please try again.";

      if (status === 409) {
        toast.error(
          "This post was already submitted. Discard draft and start a new one."
        );
        // Do NOT clear the idempotency key so retries use the same key
        // User must explicitly discard the draft to get a new key
      } else {
        toast.error(message);
      }
    },
  });

  const handleMediaSelect = useCallback(
    async (files: FileList | null) => {
      if (!files) return;
      const fileArray = Array.from(files);

      // Add local items immediately with LOCAL status. clientId is the sole
      // identity used for React keys, fileMap lookup, and retry/remove — it
      // is never reassigned to the server media id.
      const newItems: MediaItem[] = fileArray.map((file, index) => {
        const clientId = ++clientMediaIdRef.current;
        fileMapRef.current.set(clientId, file); // Store File for retry
        const previewUrl = previewUrlTrackerRef.current.create(file);
        return {
          clientId,
          previewUrl,
          type: detectMediaType(file.type),
          status: "LOCAL" as const,
          order: draft.media.length + index,
        };
      });

      setDraft((prev) => {
        // Clear background when media is added (text posts with backgrounds + media don't mix)
        const shouldClearBackground = prev.backgroundStyle && prev.media.length === 0;
        if (shouldClearBackground) {
          toast("Background style cleared (media posts can't have backgrounds)");
        }
        return {
          ...prev,
          media: [...prev.media, ...newItems],
          backgroundStyle: shouldClearBackground ? undefined : prev.backgroundStyle,
        };
      });

      // Upload each file sequentially
      for (let i = 0; i < fileArray.length; i++) {
        const file = fileArray[i];
        const localItem = newItems[i];

        try {
          // Update status to UPLOADING — previewUrl/clientId/order untouched
          setDraft((prev) => ({
            ...prev,
            media: prev.media.map((m) =>
              m.clientId === localItem.clientId ? { ...m, status: "UPLOADING" as const } : m
            ),
          }));

          const uploaded = await uploadPostMedia(file);

          // Merge server fields only — keep previewUrl/clientId/order/type
          // from the existing item so the composer never has to depend on
          // the (possibly slow, possibly temporarily unreachable) server URL
          // for rendering.
          setDraft((prev) => ({
            ...prev,
            media: prev.media.map((m) =>
              m.clientId === localItem.clientId
                ? {
                    ...m,
                    serverMediaId: uploaded.serverMediaId,
                    serverUrl: uploaded.serverUrl,
                    thumbnailUrl: uploaded.thumbnailUrl,
                    status: "READY" as const,
                  }
                : m
            ),
          }));
        } catch (error: unknown) {
          const errorMsg = error instanceof Error ? error.message : `Failed to upload ${file.name}`;
          setDraft((prev) => ({
            ...prev,
            media: prev.media.map((m) =>
              m.clientId === localItem.clientId
                ? { ...m, status: "FAILED" as const, error: errorMsg }
                : m
            ),
          }));
          toast.error(errorMsg);
        }
      }

      if (fileInputRef.current) fileInputRef.current.value = "";
    },
    [draft.media]
  );

  const handleRetryMedia = useCallback(
    async (clientId: number) => {
      const failedItem = draft.media.find((m) => m.clientId === clientId);
      const file = fileMapRef.current.get(clientId);
      if (!failedItem || !file) return;

      try {
        setDraft((prev) => ({
          ...prev,
          media: prev.media.map((m) =>
            m.clientId === clientId ? { ...m, status: "UPLOADING" as const, error: undefined } : m
          ),
        }));

        const uploaded = await uploadPostMedia(file);

        // Same clientId, same previewUrl, same order — only server fields
        // and status change on retry, so no duplicate tile is ever created.
        setDraft((prev) => ({
          ...prev,
          media: prev.media.map((m) =>
            m.clientId === clientId
              ? {
                  ...m,
                  serverMediaId: uploaded.serverMediaId,
                  serverUrl: uploaded.serverUrl,
                  thumbnailUrl: uploaded.thumbnailUrl,
                  status: "READY" as const,
                }
              : m
          ),
        }));
        toast.success("Upload successful");
      } catch (error: unknown) {
        const errorMsg = error instanceof Error ? error.message : "Upload failed";
        setDraft((prev) => ({
          ...prev,
          media: prev.media.map((m) =>
            m.clientId === clientId
              ? { ...m, status: "FAILED" as const, error: errorMsg }
              : m
          ),
        }));
        toast.error(errorMsg);
      }
    },
    [draft.media]
  );

  const handleRemoveMedia = useCallback(
    (clientId: number) => {
      setDraft((prev) => {
        const itemToRemove = prev.media.find((m) => m.clientId === clientId);
        if (itemToRemove) {
          revokePreviewUrl(itemToRemove.previewUrl);
        }
        fileMapRef.current.delete(clientId);
        return {
          ...prev,
          media: prev.media.filter((m) => m.clientId !== clientId),
        };
      });
    },
    [revokePreviewUrl]
  );

  const hasFailedMedia = draft.media.some((m) => m.status === "FAILED");
  const hasUploadingMedia = draft.media.some(
    (m) => m.status === "LOCAL" || m.status === "UPLOADING"
  );
  const readyMediaCount = draft.media.filter((m) => m.status === "READY").length;

  const canSubmit =
    !mutation.isPending &&
    !hasUploadingMedia &&
    !hasFailedMedia &&
    (draft.caption.trim().length > 0 || readyMediaCount > 0);

  const isDraftEmpty =
    draft.caption.trim().length === 0 &&
    draft.media.length === 0 &&
    draft.taggedPetIds.length === 0 &&
    !draft.locationText;

  const displayName = user?.profile.displayName;
  const avatarUrl = user?.profile.avatarMedia?.url ?? null;
  const fallbackInitial = displayName ? displayName.charAt(0).toUpperCase() : "U";

  const privacyOption = PRIVACY_OPTIONS.find((p) => p.value === draft.privacy);
  const PrivacyIcon = privacyOption?.icon || Globe;

  return (
    <>
      <Dialog open={open} onOpenChange={(newOpen) => {
        if (!newOpen && !isDraftEmpty) {
          setShowDiscard(true);
        } else if (newOpen) {
          setShowDiscard(false);
          onOpenChange(true);
        } else {
          onOpenChange(false);
        }
      }}>
        <DialogContent className="sm:max-w-[680px] rounded-2xl p-0 bg-white border border-gray-100 shadow-xl max-h-[90vh] overflow-hidden flex flex-col">
          <DialogHeader className="border-b border-gray-50 px-5 py-4 flex-shrink-0">
            <div className="flex items-center justify-between">
              <DialogTitle className="text-base font-bold text-gray-950">Create post</DialogTitle>
              <DialogClose className="opacity-70 hover:opacity-100" />
            </div>
          </DialogHeader>

          <div className="overflow-y-auto flex-1 px-5 py-4">
            {/* Author Section */}
            <div className="flex items-center gap-3 mb-3">
              <Avatar className="w-10 h-10 border border-gray-100">
                <AvatarImage src={getMediaUrl(avatarUrl)} alt="Avatar" />
                <AvatarFallback className="bg-purple-50 text-purple-700 font-semibold">
                  {fallbackInitial}
                </AvatarFallback>
              </Avatar>
              <div className="flex-1">
                <p className="font-semibold text-sm text-gray-900">
                  {displayName || "Furtail Member"}
                </p>

                {/* Privacy Selector */}
                <Popover>
                  <PopoverTrigger className="flex items-center gap-1 mt-1 bg-gray-100 hover:bg-gray-200 px-2 py-1 rounded-full text-[11px] text-gray-600 font-medium transition-colors cursor-pointer">
                    <PrivacyIcon className="w-3 h-3" />
                    <span>{privacyOption?.label}</span>
                    <ChevronDown className="w-3 h-3" />
                  </PopoverTrigger>
                  <PopoverContent className="w-56 p-2" align="start">
                    {PRIVACY_OPTIONS.map((option) => {
                      const Icon = option.icon;
                      return (
                        <button
                          key={option.value}
                          onClick={() => {
                            setDraft((prev) => ({
                              ...prev,
                              privacy: option.value,
                            }));
                          }}
                          className={`w-full text-left px-3 py-2 rounded-lg mb-1 transition-colors ${
                            draft.privacy === option.value
                              ? "bg-purple-100 text-purple-900"
                              : "hover:bg-gray-100"
                          }`}
                        >
                          <div className="flex items-center gap-2">
                            <Icon className="w-4 h-4" />
                            <div>
                              <div className="text-sm font-medium">{option.label}</div>
                              <div className="text-xs text-gray-600">
                                {option.description}
                              </div>
                            </div>
                          </div>
                        </button>
                      );
                    })}
                  </PopoverContent>
                </Popover>
              </div>
            </div>

            {/* Metadata Action Row */}
            <CreatePostMetadataRow draft={draft} />

            {/* Caption Editor with Background Preview */}
            <div className="mb-3">
              <CaptionEditorWithPreview
                value={draft.caption}
                onChange={(value) => {
                  setDraft((prev) => ({ ...prev, caption: value }));
                }}
                selectedBackgroundStyle={
                  draft.backgroundStyle
                    ? backgroundStylesQuery.data?.data?.find((s) => s.key === draft.backgroundStyle)
                    : undefined
                }
                isDisabled={mutation.isPending}
              />
            </div>

            {/* Media Preview Grid - Professional Layout */}
            <MediaPreviewGrid
              media={draft.media}
              onRemove={handleRemoveMedia}
              onRetry={handleRetryMedia}
            />

            {/* Lost Pet Conditional Fields */}
            {draft.postType === "LOST_PET" && (
              <div className="mb-4 p-3 bg-red-50 border border-red-200 rounded-lg space-y-2">
                <input
                  type="text"
                  placeholder="Pet name"
                  value={draft.lostPetName || ""}
                  onChange={(e) => {
                    setDraft((prev) => ({
                      ...prev,
                      lostPetName: e.target.value,
                    }));
                  }}
                  className="w-full px-2 py-1.5 border border-gray-200 rounded text-sm outline-none focus:border-red-400"
                />
                <input
                  type="text"
                  placeholder="Last seen location"
                  value={draft.lostPetLocation || ""}
                  onChange={(e) => {
                    setDraft((prev) => ({
                      ...prev,
                      lostPetLocation: e.target.value,
                    }));
                  }}
                  className="w-full px-2 py-1.5 border border-gray-200 rounded text-sm outline-none focus:border-red-400"
                />
                <label className="flex items-center gap-2 cursor-pointer">
                  <input
                    type="checkbox"
                    checked={draft.lostPetContactVisible}
                    onChange={(e) => {
                      setDraft((prev) => ({
                        ...prev,
                        lostPetContactVisible: e.target.checked,
                      }));
                    }}
                    className="w-4 h-4 rounded"
                  />
                  <span className="text-sm text-gray-700">
                    Show my contact information
                  </span>
                </label>
              </div>
            )}

            {/* Background Style (Text Posts) - Database-driven scroller */}
            {draft.media.length === 0 && (
              <div className="mb-4">
                <BackgroundStylesScroller
                  styles={backgroundStylesQuery.data?.data || null}
                  isLoading={backgroundStylesQuery.isLoading}
                  selected={draft.backgroundStyle}
                  onSelect={(styleKey) => {
                    setDraft((prev) => ({
                      ...prev,
                      backgroundStyle: styleKey,
                    }));
                  }}
                />
              </div>
            )}

            {/* Feeling & Activity */}
            <div className="flex gap-2 mb-4 flex-wrap">
              {/* Feeling - Database-driven */}
              <PopoverPicker
                options={feelingsQuery.data?.data || null}
                isLoading={feelingsQuery.isLoading}
                error={feelingsQuery.error ? "Unable to load feelings" : undefined}
                onRetry={() => feelingsQuery.refetch()}
                onSelect={(option) => {
                  setDraft((prev) => ({
                    ...prev,
                    feelingId: option.key,
                    feelingLabel: option.label,
                    feelingEmoji: option.emoji,
                  }));
                }}
                triggerLabel="Feeling"
                triggerIcon={<SmileIcon className="w-4 h-4" />}
              />

              {/* Activity - Database-driven */}
              <PopoverPicker
                options={activitiesQuery.data?.data || null}
                isLoading={activitiesQuery.isLoading}
                error={activitiesQuery.error ? "Unable to load activities" : undefined}
                onRetry={() => activitiesQuery.refetch()}
                onSelect={(option) => {
                  setDraft((prev) => ({
                    ...prev,
                    activityId: option.key,
                    activityLabel: option.label,
                    activityEmoji: option.emoji,
                  }));
                }}
                triggerLabel="Activity"
                triggerIcon={<SmileIcon className="w-4 h-4" />}
              />

            </div>

            {/* Tagged Pets - Compact searchable popup (if user has pets) */}
            {userPets && userPets.length > 0 && (
              <Popover>
                <PopoverTrigger className="px-3 py-1.5 rounded-full text-sm font-medium border border-gray-300 hover:bg-gray-50 disabled:opacity-50 disabled:cursor-not-allowed transition-colors">
                  Tag Pet
                </PopoverTrigger>
                <PopoverContent className="w-72 p-0">
                  <div className="space-y-2 p-3 max-h-64 overflow-y-auto">
                    {userPets.map((pet: any) => (
                      <button
                        key={pet.id}
                        onClick={() => {
                          setDraft((prev) => ({
                            ...prev,
                            taggedPetIds: prev.taggedPetIds.includes(pet.id)
                              ? prev.taggedPetIds.filter((id) => id !== pet.id)
                              : [...prev.taggedPetIds, pet.id],
                          }));
                        }}
                        className={`w-full text-left px-3 py-2 rounded-lg transition-colors text-sm flex items-center gap-2 ${
                          draft.taggedPetIds.includes(pet.id)
                            ? "bg-blue-100 text-blue-900"
                            : "hover:bg-gray-100"
                        }`}
                      >
                        <input
                          type="checkbox"
                          checked={draft.taggedPetIds.includes(pet.id)}
                          onChange={() => {}}
                          className="w-4 h-4"
                        />
                        <div className="flex-1">
                          <div className="font-medium">{pet.name}</div>
                          {pet.breed && <div className="text-xs text-gray-500">{pet.breed}</div>}
                        </div>
                      </button>
                    ))}
                  </div>
                </PopoverContent>
              </Popover>
            )}

            {/* Location */}
            <div className="mb-4">
              <input
                type="text"
                placeholder="Add location"
                value={draft.locationText || ""}
                onChange={(e) => {
                  setDraft((prev) => ({
                    ...prev,
                    locationText: e.target.value,
                  }));
                }}
                className="w-full px-3 py-2 border border-gray-200 rounded-lg text-sm outline-none focus:border-purple-400 focus:ring-1 focus:ring-purple-200"
              />
            </div>

            {/* Feeling/Activity Chips Display */}
            {(draft.feelingId || draft.activityId) && (
              <div className="mb-4 flex flex-wrap gap-2">
                {draft.feelingId && (
                  <div className="flex items-center gap-2 bg-blue-50 text-blue-900 px-3 py-1 rounded-full text-xs font-medium">
                    <span>{draft.feelingEmoji} {draft.feelingLabel}</span>
                    <button
                      onClick={() => {
                        setDraft((prev) => ({
                          ...prev,
                          feelingId: undefined,
                          feelingLabel: undefined,
                          feelingEmoji: undefined,
                        }));
                      }}
                      className="text-blue-600 hover:text-blue-800"
                    >
                      <X className="w-3 h-3" />
                    </button>
                  </div>
                )}
                {draft.activityId && (
                  <div className="flex items-center gap-2 bg-green-50 text-green-900 px-3 py-1 rounded-full text-xs font-medium">
                    <span>{draft.activityEmoji} {draft.activityLabel}</span>
                    <button
                      onClick={() => {
                        setDraft((prev) => ({
                          ...prev,
                          activityId: undefined,
                          activityLabel: undefined,
                          activityEmoji: undefined,
                        }));
                      }}
                      className="text-green-600 hover:text-green-800"
                    >
                      <X className="w-3 h-3" />
                    </button>
                  </div>
                )}
              </div>
            )}
          </div>

          {/* Footer */}
          <div className="border-t border-gray-50 px-5 py-4 space-y-3 flex-shrink-0">
            {/* Professional Media Action Bar */}
            <div>
              <span className="text-xs text-gray-500 font-semibold block mb-2">
                Add to your post
              </span>
              <MediaActionBar
                onPhotoSelect={handleMediaSelect}
                onVideoSelect={(files) => {
                  if (files) handleMediaSelect(files);
                }}
                onEmojiSelect={(emoji) => {
                  setDraft((prev) => ({
                    ...prev,
                    caption: (prev.caption || '') + emoji,
                  }));
                }}
                onBackgroundClick={() => {
                  // Background click - handled via BackgroundStylesScroller above
                }}
                isDisabled={hasUploadingMedia || mutation.isPending}
                isUploading={hasUploadingMedia}
              />
            </div>

            {/* Submit Button */}
            <Button
              type="button"
              onClick={() => {
                if (canSubmit) mutation.mutate();
              }}
              disabled={!canSubmit}
              className="w-full rounded-full h-10 font-bold bg-purple-600 hover:bg-purple-700 active:scale-95 transition-all text-white disabled:opacity-50 disabled:cursor-not-allowed"
            >
              {mutation.isPending ? "Posting..." : "Post"}
            </Button>
          </div>
        </DialogContent>
      </Dialog>

      {/* Discard Confirmation */}
      {showDiscard && (
        <Dialog open={showDiscard} onOpenChange={setShowDiscard}>
          <DialogContent className="sm:max-w-[360px]">
            <DialogHeader>
              <DialogTitle>Discard post?</DialogTitle>
            </DialogHeader>
            <p className="text-sm text-gray-600">
              You have unsaved changes. Are you sure you want to discard this post?
            </p>
            <div className="flex gap-3 justify-end mt-6">
              <Button
                variant="outline"
                onClick={() => setShowDiscard(false)}
              >
                Keep editing
              </Button>
              <Button
                variant="destructive"
                onClick={() => {
                  setShowDiscard(false);
                  fileMapRef.current.clear();
                  revokeAllPreviewUrls();
                  setDraft(DEFAULT_DRAFT);
                  onOpenChange(false);
                }}
              >
                Discard
              </Button>
            </div>
          </DialogContent>
        </Dialog>
      )}
    </>
  );
}
