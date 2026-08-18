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
  Video,
  X,
  Globe,
  Users,
  Lock,
  SmileIcon,
  Zap,
  FileText,
  Grid3x3,
  Hash,
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
} from "@/lib/api/taxonomies";
import {
  CreatePostDraft,
  DEFAULT_DRAFT,
  MediaItem,
  draftToCreatePostInput,
} from "@/lib/create-post-draft";
import {
  POST_TYPES,
  getPostTypeLabel,
  isValidPostCategoryKey,
  applyFeelingSelection,
  applyActivitySelection,
  togglePetSelection,
  toggleContentTagSelection,
} from "@/lib/create-post-rules";
import { PopoverPicker, SelectedChip, QUICK_PICK_TRIGGER_CLASS, type PickerOption } from "@/components/ui/popover-picker";
import { PetTagPopover } from "@/components/post/pet-tag-popover";
import { LocationPopover } from "@/components/post/location-popover";
import { EmojiPopover } from "@/components/post/emoji-popover";
import { BackgroundStylesScroller } from "@/components/post/background-styles-scroller";
import { MediaPreviewGrid } from "@/components/post/media-preview-grid";
import { CaptionEditorWithPreview, type CaptionEditorHandle } from "@/components/post/caption-editor-with-preview";
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

const POST_TYPE_OPTIONS: PickerOption[] = POST_TYPES.map((pt, i) => ({
  id: i,
  key: pt.value,
  label: pt.label,
  sortOrder: i,
  isActive: true,
}));

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
  const photoInputRef = useRef<HTMLInputElement>(null);
  const videoInputRef = useRef<HTMLInputElement>(null);
  const captionRef = useRef<CaptionEditorHandle>(null);
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

  // Dynamic taxonomy hooks — the sole source for every selector below; no
  // hardcoded production catalog anywhere in this composer.
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
    onError: (error: unknown) => {
      const apiError = error as { status?: number; message?: string };
      const status = apiError?.status;
      const message = apiError?.message || "Failed to create post. Please try again.";

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

      if (photoInputRef.current) photoInputRef.current.value = "";
      if (videoInputRef.current) videoInputRef.current.value = "";
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
  const controlsDisabled = hasUploadingMedia || mutation.isPending;

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

  const postTypeLabel = getPostTypeLabel(draft.postType);

  const selectedBackgroundStyle = draft.backgroundStyle
    ? backgroundStylesQuery.data?.data?.find((s) => s.key === draft.backgroundStyle)
    : undefined;

  const selectedPets = (userPets || []).filter((pet) => draft.taggedPetIds.includes(Number(pet.id)));
  const selectedTags = (tagsQuery.data?.data || []).filter((tag) => draft.contentTagIds.includes(tag.id));

  const hasSelectedMetadata =
    Boolean(draft.feelingId) ||
    Boolean(draft.activityId) ||
    selectedPets.length > 0 ||
    Boolean(draft.locationText) ||
    Boolean(draft.category) ||
    selectedTags.length > 0;

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
        <DialogContent
          showCloseButton={false}
          className="sm:max-w-[680px] rounded-2xl p-0 bg-white border border-gray-100 shadow-xl max-h-[90vh] overflow-hidden flex flex-col"
        >
          {/* Header — centered title, large tap-friendly close button */}
          <DialogHeader className="relative border-b border-gray-50 px-4 py-3.5 flex-shrink-0">
            <DialogTitle className="text-center text-[21px] font-bold text-gray-950 leading-none">
              Create post
            </DialogTitle>
            <DialogClose
              className="absolute right-2 top-1/2 -translate-y-1/2 w-10 h-10 flex items-center justify-center rounded-full text-gray-500 hover:bg-gray-100 hover:text-gray-700 transition-colors focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-purple-500"
              aria-label="Close"
            >
              <X className="w-5 h-5" />
            </DialogClose>
          </DialogHeader>

          <div className="overflow-y-auto flex-1 px-5 py-4">
            {/* Author Section */}
            <div className="flex items-center gap-3 mb-3.5">
              <Avatar className="w-12 h-12 sm:w-[52px] sm:h-[52px] border border-gray-100 flex-shrink-0">
                <AvatarImage src={getMediaUrl(avatarUrl)} alt="Avatar" />
                <AvatarFallback className="bg-purple-50 text-purple-700 font-semibold text-lg">
                  {fallbackInitial}
                </AvatarFallback>
              </Avatar>
              <div className="flex-1 min-w-0">
                <p className="font-semibold text-sm text-gray-900 truncate">
                  {displayName || "Furtail Member"}
                </p>

                {/* Privacy Selector */}
                <Popover>
                  <PopoverTrigger className="flex items-center gap-1 mt-1 bg-gray-100 hover:bg-gray-200 px-2 py-1 rounded-full text-[11px] text-gray-600 font-medium transition-colors cursor-pointer focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-purple-500">
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

            {/* ── ONE Quick Picks row — every action lives here, nothing duplicated below ── */}
            <div
              className="flex items-center gap-1.5 overflow-x-auto scrollbar-hide pb-1 mb-3"
              role="toolbar"
              aria-label="Post options"
            >
              {/* Post Type — own chip relabels itself on selection (not a removable chip) */}
              <PopoverPicker
                options={POST_TYPE_OPTIONS}
                isLoading={false}
                onSelect={(option) => {
                  setDraft((prev) => ({ ...prev, postType: option.key }));
                }}
                triggerLabel={postTypeLabel}
                triggerIcon={<FileText className="w-3.5 h-3.5" />}
                showEmoji={false}
                disabled={controlsDisabled}
              />

              {/* Feeling — database-driven, mutually exclusive with Activity */}
              <PopoverPicker
                options={feelingsQuery.data?.data || null}
                isLoading={feelingsQuery.isLoading}
                error={feelingsQuery.error ? "Unable to load feelings" : undefined}
                onRetry={() => feelingsQuery.refetch()}
                onSelect={(option) => {
                  setDraft((prev) => applyFeelingSelection(prev, option));
                }}
                triggerLabel="Feeling"
                triggerIcon={<SmileIcon className="w-3.5 h-3.5" />}
                disabled={controlsDisabled}
              />

              {/* Activity — database-driven, mutually exclusive with Feeling */}
              <PopoverPicker
                options={activitiesQuery.data?.data || null}
                isLoading={activitiesQuery.isLoading}
                error={activitiesQuery.error ? "Unable to load activities" : undefined}
                onRetry={() => activitiesQuery.refetch()}
                onSelect={(option) => {
                  setDraft((prev) => applyActivitySelection(prev, option));
                }}
                triggerLabel="Activity"
                triggerIcon={<Zap className="w-3.5 h-3.5" />}
                disabled={controlsDisabled}
              />

              {/* Tag Pet — authenticated user's actual pet registry, multi-select */}
              {userPets && userPets.length > 0 && (
                <PetTagPopover
                  pets={userPets}
                  selectedPetIds={draft.taggedPetIds}
                  onToggle={(petId) => {
                    setDraft((prev) => ({
                      ...prev,
                      taggedPetIds: togglePetSelection(prev.taggedPetIds, petId),
                    }));
                  }}
                  disabled={controlsDisabled}
                />
              )}

              {/* Location — small popup, no permanent full-width field */}
              <LocationPopover
                value={draft.locationText}
                onSave={(locationText) => {
                  setDraft((prev) => ({ ...prev, locationText: locationText || undefined }));
                }}
                disabled={controlsDisabled}
              />

              {/* Category — database-backed PostCategoryTaxonomy; only entries that
                  round-trip onto the stable Post.category enum are accepted. */}
              <PopoverPicker
                options={categoriesQuery.data?.data || null}
                isLoading={categoriesQuery.isLoading}
                error={categoriesQuery.error ? "Unable to load categories" : undefined}
                onRetry={() => categoriesQuery.refetch()}
                onSelect={(option) => {
                  if (!isValidPostCategoryKey(option.key)) {
                    toast.error(`"${option.label}" can't be applied to a post yet`);
                    return;
                  }
                  setDraft((prev) => ({
                    ...prev,
                    category: option.key.toUpperCase(),
                    categoryLabel: option.label,
                  }));
                }}
                triggerLabel="Category"
                triggerIcon={<Grid3x3 className="w-3.5 h-3.5" />}
                showEmoji={false}
                disabled={controlsDisabled}
              />

              {/* Tags — database-backed ContentTag, multi-select (distinct from Pet tagging) */}
              <PopoverPicker
                multiSelect
                options={tagsQuery.data?.data || null}
                isLoading={tagsQuery.isLoading}
                error={tagsQuery.error ? "Unable to load tags" : undefined}
                onRetry={() => tagsQuery.refetch()}
                selectedKeys={selectedTags.map((t) => t.key)}
                onToggle={(option) => {
                  setDraft((prev) => ({
                    ...prev,
                    contentTagIds: toggleContentTagSelection(prev.contentTagIds, option.id),
                  }));
                }}
                triggerLabel="Tags"
                triggerIcon={<Hash className="w-3.5 h-3.5" />}
                showEmoji={false}
                disabled={controlsDisabled}
              />

              {/* Photo */}
              <input
                ref={photoInputRef}
                type="file"
                accept="image/*"
                multiple
                className="hidden"
                onChange={(e) => handleMediaSelect(e.target.files)}
              />
              <button
                type="button"
                onClick={() => photoInputRef.current?.click()}
                disabled={controlsDisabled}
                className={QUICK_PICK_TRIGGER_CLASS}
                aria-label="Add photo"
              >
                <ImageIcon className="w-3.5 h-3.5" />
                <span>Photo</span>
              </button>

              {/* Video */}
              <input
                ref={videoInputRef}
                type="file"
                accept="video/*"
                className="hidden"
                onChange={(e) => handleMediaSelect(e.target.files)}
              />
              <button
                type="button"
                onClick={() => videoInputRef.current?.click()}
                disabled={controlsDisabled}
                className={QUICK_PICK_TRIGGER_CLASS}
                aria-label="Add video"
              >
                <Video className="w-3.5 h-3.5" />
                <span>Video</span>
              </button>

              {/* Emoji — inserts at the caption's current cursor position */}
              <EmojiPopover
                onSelect={(emoji) => captionRef.current?.insertAtCursor(emoji)}
                disabled={controlsDisabled}
              />

              {hasUploadingMedia && (
                <span className="text-[10px] text-gray-500 animate-pulse ml-1 flex-shrink-0">
                  Uploading...
                </span>
              )}
            </div>

            {/* Background swatches — one row, database-driven, no "Background" label.
                Only offered for eligible text posts (no media selected). */}
            {draft.media.length === 0 && (
              <div className="mb-3">
                <BackgroundStylesScroller
                  styles={backgroundStylesQuery.data?.data || null}
                  isLoading={backgroundStylesQuery.isLoading}
                  selected={draft.backgroundStyle}
                  onSelect={(styleKey) => {
                    setDraft((prev) => ({
                      ...prev,
                      backgroundStyle: prev.backgroundStyle === styleKey ? undefined : styleKey,
                    }));
                  }}
                />
              </div>
            )}

            {/* Caption Editor — itself the live background preview when a style is selected */}
            <div className="mb-3">
              <CaptionEditorWithPreview
                ref={captionRef}
                value={draft.caption}
                onChange={(value) => {
                  setDraft((prev) => ({ ...prev, caption: value }));
                }}
                selectedBackgroundStyle={selectedBackgroundStyle}
                isDisabled={mutation.isPending}
              />
            </div>

            {/* Selected metadata — one consistent chip design, only what's actually selected */}
            {hasSelectedMetadata && (
              <div className="flex flex-wrap gap-2 mb-3">
                {draft.feelingId && (
                  <SelectedChip
                    label={draft.feelingLabel || ""}
                    emoji={draft.feelingEmoji}
                    onRemove={() =>
                      setDraft((prev) => ({
                        ...prev,
                        feelingId: undefined,
                        feelingLabel: undefined,
                        feelingEmoji: undefined,
                      }))
                    }
                  />
                )}
                {draft.activityId && (
                  <SelectedChip
                    label={draft.activityLabel || ""}
                    emoji={draft.activityEmoji}
                    onRemove={() =>
                      setDraft((prev) => ({
                        ...prev,
                        activityId: undefined,
                        activityLabel: undefined,
                        activityEmoji: undefined,
                      }))
                    }
                  />
                )}
                {selectedPets.map((pet) => (
                  <SelectedChip
                    key={pet.id}
                    label={pet.name}
                    emoji="🐾"
                    onRemove={() =>
                      setDraft((prev) => ({
                        ...prev,
                        taggedPetIds: prev.taggedPetIds.filter((id) => id !== Number(pet.id)),
                      }))
                    }
                  />
                ))}
                {draft.locationText && (
                  <SelectedChip
                    label={draft.locationText}
                    emoji="📍"
                    onRemove={() => setDraft((prev) => ({ ...prev, locationText: undefined }))}
                  />
                )}
                {draft.category && (
                  <SelectedChip
                    label={draft.categoryLabel || draft.category}
                    onRemove={() =>
                      setDraft((prev) => ({ ...prev, category: undefined, categoryLabel: undefined }))
                    }
                  />
                )}
                {selectedTags.map((tag) => (
                  <SelectedChip
                    key={tag.id}
                    label={`#${tag.label}`}
                    onRemove={() =>
                      setDraft((prev) => ({
                        ...prev,
                        contentTagIds: prev.contentTagIds.filter((id) => id !== tag.id),
                      }))
                    }
                  />
                ))}
              </div>
            )}

            {/* Media Preview — actual previews only once media exists, plus a compact "+" to add more */}
            <MediaPreviewGrid
              media={draft.media}
              onRemove={handleRemoveMedia}
              onRetry={handleRetryMedia}
              onAddMore={() => photoInputRef.current?.click()}
              addMoreDisabled={controlsDisabled}
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
          </div>

          {/* Footer — just the Post button, no second toolbar */}
          <div className="border-t border-gray-50 px-5 py-4 flex-shrink-0">
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
