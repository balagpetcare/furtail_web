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
import { authKeys, authApi } from "@/lib/api/auth";
import { postsApi, postsKeys } from "@/lib/api/posts";
import { petsApi, petsKeys } from "@/lib/api/pets";
import { taxonomyApi } from "@/lib/api/taxonomy";
import {
  CreatePostDraft,
  DEFAULT_DRAFT,
  MediaItem,
  draftToCreatePostInput,
} from "@/lib/create-post-draft";
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

const POST_TYPES = [
  { value: "GENERAL", label: "General" },
  { value: "HEALTH_UPDATE", label: "Health Update" },
  { value: "VACCINATION", label: "Vaccination" },
  { value: "LOST_PET", label: "Lost Pet Alert" },
  { value: "ADOPTION", label: "Adoption" },
  { value: "SERVICE_REVIEW", label: "Service Review" },
];

// Canonical background style IDs matching Flutter's PostBackgroundStyle presets
const BACKGROUND_STYLES = [
  { value: "none", label: "Normal", color: "bg-white" },
  { value: "orange_red", label: "Sunset Orange", color: "bg-gradient-to-br from-orange-500 to-red-500" },
  { value: "blue_purple", label: "Neon Blue", color: "bg-gradient-to-br from-blue-400 to-blue-600" },
  { value: "dark_purple", label: "Deep Purple", color: "bg-gradient-to-br from-purple-600 to-orange-400" },
  { value: "green_teal", label: "Ocean Breeze", color: "bg-gradient-to-br from-teal-500 to-green-400" },
  { value: "midnight", label: "Midnight", color: "bg-gradient-to-br from-gray-800 to-gray-600" },
];

async function uploadPostMedia(
  file: File,
  onProgress?: (progress: number) => void
): Promise<MediaItem> {
  const formData = new FormData();
  formData.append("file", file);
  formData.append("purpose", "post");

  const res = await fetch("/api/proxy/media/upload", {
    method: "POST",
    body: formData,
  });

  if (!res.ok) throw new Error("Failed to upload media");
  const body = await res.json();
  const mediaId = body.data?.id;

  return {
    id: mediaId,
    url: body.data?.url || "",
    type: detectMediaType(file.type),
    status: "READY",
    order: 0,
  };
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

  useEffect(() => {
    if (open) {
      idempotencyKeyRef.current = null;
    }
  }, [open]);

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

  const { data: feelingActivities } = useQuery({
    queryKey: ["feeling-activities"],
    queryFn: () => taxonomyApi.getFeelingActivities(),
    enabled: open,
  });

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

      // Add local items immediately with LOCAL status
      const newItems: MediaItem[] = fileArray.map((file) => ({
        id: ++clientMediaIdRef.current, // Temporary client ID
        url: URL.createObjectURL(file),
        type: detectMediaType(file.type),
        status: "LOCAL" as const,
        order: draft.media.length + fileArray.indexOf(file),
      }));

      setDraft((prev) => ({
        ...prev,
        media: [...prev.media, ...newItems],
      }));

      // Upload each file sequentially
      for (let i = 0; i < fileArray.length; i++) {
        const file = fileArray[i];
        const localItem = newItems[i];

        try {
          // Update status to UPLOADING
          setDraft((prev) => ({
            ...prev,
            media: prev.media.map((m) =>
              m.id === localItem.id ? { ...m, status: "UPLOADING" as const } : m
            ),
          }));

          // Upload media
          const uploadedMedia = await uploadPostMedia(file);

          // Update status to READY with server media ID
          setDraft((prev) => ({
            ...prev,
            media: prev.media.map((m) =>
              m.id === localItem.id
                ? {
                    ...uploadedMedia,
                    id: uploadedMedia.id, // Replace client ID with server ID
                    order: m.order,
                    status: "READY" as const,
                  }
                : m
            ),
          }));
        } catch (error: any) {
          // Keep failed item visible with error
          const errorMsg =
            error?.message || `Failed to upload ${file.name}`;
          setDraft((prev) => ({
            ...prev,
            media: prev.media.map((m) =>
              m.id === localItem.id
                ? {
                    ...m,
                    status: "FAILED" as const,
                    error: errorMsg,
                  }
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
    async (clientId: number, file?: File) => {
      const failedItem = draft.media.find((m) => m.id === clientId);
      if (!failedItem || !file) return;

      try {
        // Update status to UPLOADING
        setDraft((prev) => ({
          ...prev,
          media: prev.media.map((m) =>
            m.id === clientId ? { ...m, status: "UPLOADING" as const } : m
          ),
        }));

        // Upload media
        const uploadedMedia = await uploadPostMedia(file);

        // Update status to READY with server media ID
        setDraft((prev) => ({
          ...prev,
          media: prev.media.map((m) =>
            m.id === clientId
              ? {
                  ...uploadedMedia,
                  id: uploadedMedia.id,
                  order: m.order,
                  status: "READY" as const,
                }
              : m
          ),
        }));
        toast.success("Upload successful");
      } catch (error: any) {
        const errorMsg = error?.message || "Upload failed";
        setDraft((prev) => ({
          ...prev,
          media: prev.media.map((m) =>
            m.id === clientId
              ? { ...m, status: "FAILED" as const, error: errorMsg }
              : m
          ),
        }));
        toast.error(errorMsg);
      }
    },
    [draft.media]
  );

  const handleRemoveMedia = useCallback((id: number) => {
    setDraft((prev) => ({
      ...prev,
      media: prev.media.filter((m) => m.id !== id),
    }));
  }, []);

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
            <div className="flex items-center gap-3 mb-4">
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

            {/* Caption Editor */}
            <textarea
              value={draft.caption}
              onChange={(e) => {
                setDraft((prev) => ({ ...prev, caption: e.target.value }));
              }}
              placeholder="What's happening in your pet world?"
              rows={5}
              className="w-full bg-transparent resize-none outline-none text-gray-800 placeholder-gray-400 text-base focus:ring-0 mb-4"
              disabled={mutation.isPending}
            />

            {/* Media Preview Grid */}
            {draft.media.length > 0 && (
              <div className="mb-4 p-3 bg-gray-50 rounded-lg border border-gray-100">
                <div className="grid grid-cols-2 sm:grid-cols-3 gap-2">
                  {draft.media.map((media) => (
                    <div
                      key={media.id}
                      className="relative rounded-lg overflow-hidden bg-gray-200 aspect-square group"
                    >
                      {media.type === "VIDEO" ? (
                        <video
                          src={getMediaUrl(media.url)}
                          className="w-full h-full object-cover"
                        />
                      ) : (
                        <img
                          src={getMediaUrl(media.url)}
                          alt="Preview"
                          className="w-full h-full object-cover"
                        />
                      )}

                      {/* Uploading state */}
                      {(media.status === "LOCAL" ||
                        media.status === "UPLOADING") && (
                        <div className="absolute inset-0 bg-black/50 flex flex-col items-center justify-center gap-2">
                          <Loader className="w-5 h-5 text-white animate-spin" />
                          <span className="text-xs text-white font-medium">
                            {media.status === "LOCAL" ? "Queued" : "Uploading"}
                          </span>
                        </div>
                      )}

                      {/* Failed state */}
                      {media.status === "FAILED" && (
                        <div className="absolute inset-0 bg-red-500/70 flex flex-col items-center justify-center gap-2">
                          <X className="w-5 h-5 text-white" />
                          <span className="text-xs text-white font-medium text-center px-1">
                            Failed
                          </span>
                          <button
                            onClick={() => {
                              // Retry functionality would go here
                              // For now, just allow removing failed items
                            }}
                            className="text-[10px] bg-white/20 hover:bg-white/30 text-white px-2 py-1 rounded mt-1 transition-colors"
                          >
                            Remove
                          </button>
                        </div>
                      )}

                      {/* Remove button for non-failed items */}
                      {media.status !== "FAILED" && media.status !== "LOCAL" && (
                        <button
                          type="button"
                          onClick={() => handleRemoveMedia(media.id)}
                          className="absolute top-1 right-1 bg-black/60 hover:bg-black/80 text-white rounded-full p-1 opacity-0 group-hover:opacity-100 transition-opacity"
                          aria-label="Remove media"
                        >
                          <X className="w-3 h-3" />
                        </button>
                      )}

                      {/* Media type badge */}
                      {media.status === "READY" && (
                        <div className="absolute bottom-1 right-1 text-xs text-white bg-black/60 px-1.5 py-0.5 rounded">
                          {media.type === "VIDEO" ? "Video" : "Image"}
                        </div>
                      )}
                    </div>
                  ))}
                </div>
              </div>
            )}

            {/* Post Type Selector */}
            <div className="mb-4">
              <label className="text-xs font-semibold text-gray-600 mb-2 block">
                Post Type
              </label>
              <Popover>
                <PopoverTrigger className="w-full flex items-center justify-between px-3 py-2 border border-gray-200 rounded-lg hover:border-gray-300 transition-colors">
                    <span className="text-sm text-gray-700">
                      {POST_TYPES.find((t) => t.value === draft.postType)
                        ?.label || "General"}
                    </span>
                    <ChevronDown className="w-4 h-4 text-gray-500" />
                </PopoverTrigger>
                <PopoverContent className="w-full p-2" align="start">
                  {POST_TYPES.map((type) => (
                    <button
                      key={type.value}
                      onClick={() => {
                        setDraft((prev) => ({
                          ...prev,
                          postType: type.value,
                        }));
                      }}
                      className={`w-full text-left px-3 py-2 rounded-lg mb-1 transition-colors text-sm ${
                        draft.postType === type.value
                          ? "bg-purple-100 text-purple-900 font-medium"
                          : "hover:bg-gray-100"
                      }`}
                    >
                      {type.label}
                    </button>
                  ))}
                </PopoverContent>
              </Popover>
            </div>

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

            {/* Background Style (Text Posts) */}
            {draft.media.length === 0 && (
              <div className="mb-4">
                <label className="text-xs font-semibold text-gray-600 mb-2 block">
                  Text Background
                </label>
                <div className="grid grid-cols-4 gap-2">
                  {BACKGROUND_STYLES.map((style) => (
                    <button
                      key={style.value}
                      onClick={() => {
                        setDraft((prev) => ({
                          ...prev,
                          backgroundStyle: style.value,
                        }));
                      }}
                      className={`h-12 rounded-lg border-2 transition-all ${
                        draft.backgroundStyle === style.value
                          ? "border-purple-600"
                          : "border-gray-200"
                      } ${style.color}`}
                      title={style.label}
                    />
                  ))}
                </div>
              </div>
            )}

            {/* Feeling & Activity */}
            <div className="grid grid-cols-2 gap-2 mb-4">
              {/* Feeling */}
              <Popover>
                <PopoverTrigger className="flex items-center gap-2 px-3 py-2 border border-gray-200 rounded-lg hover:border-gray-300 transition-colors">
                    <SmileIcon className="w-4 h-4 text-gray-600" />
                    <span className="text-xs font-medium text-gray-700 truncate">
                      {draft.feelingLabel || "Feeling"}
                    </span>
                </PopoverTrigger>
                <PopoverContent className="w-72 p-2 max-h-80 overflow-y-auto" align="start">
                  <div className="space-y-1">
                    {feelingActivities?.data
                      ?.filter((item) => item.type === "FEELING")
                      .map((item) => (
                        <button
                          key={item.id}
                          onClick={() => {
                            setDraft((prev) => ({
                              ...prev,
                              feelingId: item.id,
                              feelingLabel: item.labelEn,
                              feelingEmoji: item.emoji,
                            }));
                          }}
                          className={`w-full text-left px-3 py-2 rounded-lg transition-colors flex items-center gap-2 ${
                            draft.feelingId === item.id
                              ? "bg-purple-100"
                              : "hover:bg-gray-100"
                          }`}
                        >
                          <span className="text-lg">{item.emoji}</span>
                          <span className="text-sm">{item.labelEn}</span>
                        </button>
                      ))}
                  </div>
                </PopoverContent>
              </Popover>

              {/* Activity */}
              <Popover>
                <PopoverTrigger className="flex items-center gap-2 px-3 py-2 border border-gray-200 rounded-lg hover:border-gray-300 transition-colors">
                    <SmileIcon className="w-4 h-4 text-gray-600" />
                    <span className="text-xs font-medium text-gray-700 truncate">
                      {draft.activityLabel || "Activity"}
                    </span>
                </PopoverTrigger>
                <PopoverContent className="w-72 p-2 max-h-80 overflow-y-auto" align="start">
                  <div className="space-y-1">
                    {feelingActivities?.data
                      ?.filter((item) => item.type === "ACTIVITY")
                      .map((item) => (
                        <button
                          key={item.id}
                          onClick={() => {
                            setDraft((prev) => ({
                              ...prev,
                              activityId: item.id,
                              activityLabel: item.labelEn,
                              activityEmoji: item.emoji,
                            }));
                          }}
                          className={`w-full text-left px-3 py-2 rounded-lg transition-colors flex items-center gap-2 ${
                            draft.activityId === item.id
                              ? "bg-purple-100"
                              : "hover:bg-gray-100"
                          }`}
                        >
                          <span className="text-lg">{item.emoji}</span>
                          <span className="text-sm">{item.labelEn}</span>
                        </button>
                      ))}
                  </div>
                </PopoverContent>
              </Popover>
            </div>

            {/* Tagged Pets */}
            {userPets && userPets.length > 0 && (
              <div className="mb-4">
                <label className="text-xs font-semibold text-gray-600 mb-2 block">
                  Tag Pets
                </label>
                <div className="space-y-1 max-h-40 overflow-y-auto border border-gray-200 rounded-lg p-2">
                  {userPets.map((pet: any) => (
                    <label
                      key={pet.id}
                      className="flex items-center gap-2 p-2 hover:bg-gray-50 rounded cursor-pointer"
                    >
                      <input
                        type="checkbox"
                        checked={draft.taggedPetIds.includes(pet.id)}
                        onChange={(e) => {
                          setDraft((prev) => ({
                            ...prev,
                            taggedPetIds: e.target.checked
                              ? [...prev.taggedPetIds, pet.id]
                              : prev.taggedPetIds.filter(
                                  (id) => id !== pet.id
                                ),
                          }));
                        }}
                        className="w-4 h-4 rounded"
                      />
                      <div className="flex-1 text-sm">
                        <div className="font-medium text-gray-700">{pet.name}</div>
                        {pet.breed && (
                          <div className="text-xs text-gray-600">{pet.breed}</div>
                        )}
                      </div>
                    </label>
                  ))}
                </div>
              </div>
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
            {/* Actions Bar */}
            <div className="flex items-center justify-between">
              <span className="text-xs text-gray-500 font-semibold">
                Add to your post
              </span>
              <div className="flex items-center gap-2">
                <input
                  ref={fileInputRef}
                  type="file"
                  accept="image/*,video/*"
                  multiple
                  className="hidden"
                  onChange={(e) => handleMediaSelect(e.target.files)}
                />
                <Button
                  type="button"
                  variant="ghost"
                  size="icon"
                  onClick={() => fileInputRef.current?.click()}
                  disabled={hasUploadingMedia || mutation.isPending}
                  className="text-purple-600 hover:text-purple-700 hover:bg-purple-50 rounded-full h-8 w-8"
                  aria-label="Add photos or videos"
                >
                  <ImageIcon className="w-4 h-4" />
                </Button>
                {hasUploadingMedia && (
                  <span className="text-[10px] text-gray-400 animate-pulse">
                    Uploading...
                  </span>
                )}
              </div>
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
