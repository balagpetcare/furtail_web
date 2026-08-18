"use client";

import React, { useRef } from "react";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Textarea } from "@/components/ui/textarea";
import { Card } from "@/components/ui/card";
import { Avatar, AvatarFallback, AvatarImage } from "@/components/ui/avatar";
import { useRouter } from "next/navigation";
import { useMutation, useQuery, useQueryClient } from "@tanstack/react-query";
import { toast } from "sonner";
import { authApi, authKeys } from "@/lib/api/auth";
import { usersApi } from "@/lib/api/users";
import { socialApi } from "@/lib/api/social";
import { getMediaUrl } from "@/lib/media";
import { Skeleton } from "@/components/ui/skeleton";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { UserX, Laptop, Smartphone, Globe, ShieldAlert } from "lucide-react";
import Link from "next/link";

interface UploadedMedia {
  id: number;
  url: string;
}

async function uploadAvatar(file: File): Promise<UploadedMedia> {
  const formData = new FormData();
  formData.append("file", file);
  formData.append("purpose", "avatar");
  const res = await fetch("/api/proxy/media/upload", { method: "POST", body: formData });
  if (!res.ok) throw new Error("Failed to upload avatar");
  const body = await res.json();
  return body.data as UploadedMedia;
}

export default function SettingsPage() {
  const router = useRouter();
  const queryClient = useQueryClient();
  const fileInputRef = useRef<HTMLInputElement>(null);

  const { data: userData, isLoading } = useQuery({
    queryKey: authKeys.me,
    queryFn: authApi.getMe,
  });

  const updateProfileMutation = useMutation({
    mutationFn: (data: Record<string, unknown>) => usersApi.updateProfile(data),
    onSuccess: () => {
      toast.success("Settings saved successfully!");
      queryClient.invalidateQueries({ queryKey: authKeys.me });
      router.push("/profile");
    },
    onError: (error: unknown) => {
      toast.error(error instanceof Error ? error.message : "Failed to save settings");
    },
  });

  const privacyMutation = useMutation({
    mutationFn: (data: Record<string, unknown>) => usersApi.updateProfile(data),
    onSuccess: () => {
      toast.success("Privacy settings saved");
      queryClient.invalidateQueries({ queryKey: authKeys.me });
    },
    onError: () => toast.error("Failed to save privacy settings"),
  });

  const { data: blockedUsers } = useQuery({
    queryKey: ["social", "blocked"],
    queryFn: socialApi.getBlockedUsers,
  });

  const unblockMutation = useMutation({
    mutationFn: (userId: string) => socialApi.unblockUser(userId),
    onSuccess: () => {
      toast.success("User unblocked");
      queryClient.invalidateQueries({ queryKey: ["social", "blocked"] });
    },
    onError: () => toast.error("Failed to unblock user"),
  });

  const { data: sessionData, refetch: refetchSessions } = useQuery({
    queryKey: ["auth", "sessions"],
    queryFn: async () => {
      const res = await fetch("/api/auth/sessions");
      if (!res.ok) throw new Error("Failed to load sessions");
      const d = await res.json();
      return d.sessions || [];
    }
  });

  const revokeSessionMutation = useMutation({
    mutationFn: async (sessionId: string) => {
      const res = await fetch(`/api/auth/sessions/${sessionId}`, { method: "DELETE" });
      if (!res.ok) throw new Error("Failed to revoke session");
      return res.json();
    },
    onSuccess: () => {
      toast.success("Session revoked successfully");
      refetchSessions();
    },
    onError: () => toast.error("Failed to revoke session"),
  });

  const logoutOthersMutation = useMutation({
    mutationFn: async () => {
      const res = await fetch("/api/auth/logout-all", { method: "POST" });
      if (!res.ok) throw new Error("Failed to log out other devices");
      return res.json();
    },
    onSuccess: () => {
      toast.success("Logged out other devices");
      refetchSessions();
    },
    onError: () => toast.error("Failed to log out other devices"),
  });

  const avatarMutation = useMutation({
    mutationFn: async (file: File) => {
      const media = await uploadAvatar(file);
      return usersApi.updateProfile({ avatarMediaId: media.id });
    },
    onSuccess: () => {
      toast.success("Avatar updated");
      queryClient.invalidateQueries({ queryKey: authKeys.me });
    },
    onError: () => toast.error("Failed to update avatar"),
  });

  const handleSave = (e: React.FormEvent) => {
    e.preventDefault();
    const formData = new FormData(e.target as HTMLFormElement);
    updateProfileMutation.mutate({
      displayName: formData.get("displayName"),
      bio: formData.get("bio"),
      placeLive: formData.get("location"),
    });
  };

  const handleAvatarChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (file) avatarMutation.mutate(file);
  };

  if (isLoading) {
    return (
      <div className="py-6 px-4 sm:px-0">
        <Skeleton className="w-48 h-8 mb-6" />
        <Skeleton className="w-full h-[500px] rounded-3xl" />
      </div>
    );
  }

  const profile = userData?.profile;

  return (
    <div className="py-6 px-4 sm:px-0 max-w-3xl mx-auto">
      <div className="mb-6">
        <h1 className="text-2xl font-bold text-gray-900 tracking-tight mb-2">Settings</h1>
        <p className="text-gray-500">Manage your profile and account preferences.</p>
      </div>

      <Card className="p-6 rounded-3xl border border-gray-100 shadow-sm">
        <h2 className="text-xl font-bold text-gray-900 mb-6">Edit Profile</h2>

        <form onSubmit={handleSave} className="space-y-6">
          <div className="flex items-center gap-6">
            <Avatar className="w-20 h-20 border border-gray-100">
              <AvatarImage src={getMediaUrl(profile?.avatarMedia?.url ?? null)} />
              <AvatarFallback>{profile?.displayName?.[0] || "U"}</AvatarFallback>
            </Avatar>
            <input
              ref={fileInputRef}
              type="file"
              accept="image/*"
              className="hidden"
              onChange={handleAvatarChange}
            />
            <Button
              type="button"
              variant="outline"
              className="rounded-xl"
              onClick={() => fileInputRef.current?.click()}
              disabled={avatarMutation.isPending}
            >
              {avatarMutation.isPending ? "Uploading..." : "Change Avatar"}
            </Button>
          </div>

          <div className="space-y-2">
            <Label htmlFor="displayName">Display Name</Label>
            <Input id="displayName" name="displayName" defaultValue={profile?.displayName} className="rounded-xl h-12" />
          </div>

          <div className="space-y-2">
            <Label htmlFor="bio">Bio</Label>
            <Textarea
              id="bio"
              name="bio"
              placeholder="Tell us about yourself and your pets..."
              className="rounded-xl min-h-[120px] resize-none"
              defaultValue={profile?.bio || ""}
            />
          </div>

          <div className="space-y-2">
            <Label htmlFor="location">Location</Label>
            <Input id="location" name="location" placeholder="City, Country" className="rounded-xl h-12" defaultValue={profile?.placeLive || ""} />
          </div>

          <div className="pt-6 border-t border-gray-100 flex justify-end">
            <Button type="submit" className="px-8 h-12 rounded-full bg-gray-900 hover:bg-gray-800 font-semibold" disabled={updateProfileMutation.isPending}>
              {updateProfileMutation.isPending ? "Saving..." : "Save Changes"}
            </Button>
          </div>
        </form>
      </Card>

      <Card className="p-6 rounded-3xl border border-gray-100 shadow-sm mt-6">
        <h2 className="text-xl font-bold text-gray-900 mb-2">Privacy</h2>
        <p className="text-gray-500 text-sm mb-6">Control who can see and interact with you.</p>

        <div className="space-y-5">
          <PrivacySelect
            label="Profile visibility"
            defaultValue={String(profile?.visibility || "PUBLIC")}
            options={[
              { value: "PUBLIC", label: "Everyone" },
              { value: "FOLLOWERS_ONLY", label: "Followers only" },
              { value: "PRIVATE", label: "Only me" },
            ]}
            onSave={(value) => privacyMutation.mutate({ visibility: value })}
          />
          <PrivacySelect
            label="Who can follow you"
            defaultValue={String(profile?.whoCanFollow || "EVERYONE")}
            options={[
              { value: "EVERYONE", label: "Everyone" },
              { value: "FOLLOWERS", label: "Followers" },
              { value: "NOBODY", label: "Nobody" },
            ]}
            onSave={(value) => privacyMutation.mutate({ whoCanFollow: value })}
          />
          <PrivacySelect
            label="Who can message you"
            defaultValue={String(profile?.whoCanMessage || "EVERYONE")}
            options={[
              { value: "EVERYONE", label: "Everyone" },
              { value: "FOLLOWERS", label: "Followers" },
              { value: "NOBODY", label: "Nobody" },
            ]}
            onSave={(value) => privacyMutation.mutate({ whoCanMessage: value })}
          />
          <PrivacySelect
            label="Who can comment on your posts"
            defaultValue={String(profile?.whoCanComment || "EVERYONE")}
            options={[
              { value: "EVERYONE", label: "Everyone" },
              { value: "FOLLOWERS", label: "Followers" },
              { value: "NOBODY", label: "Nobody" },
            ]}
            onSave={(value) => privacyMutation.mutate({ whoCanComment: value })}
          />
        </div>
      </Card>

      <Card className="p-6 rounded-3xl border border-gray-100 shadow-sm mt-6">
        <h2 className="text-xl font-bold text-gray-900 mb-2">Blocked Users</h2>
        <p className="text-gray-500 text-sm mb-4">
          Blocked users can&apos;t view your profile, message you, or interact with your posts.
        </p>
        {!blockedUsers?.items.length ? (
          <p className="text-sm text-gray-400 py-2">You haven&apos;t blocked anyone.</p>
        ) : (
          <div className="space-y-3">
            {blockedUsers.items.map((user) => {
              const targetId = String(user.id ?? user.userId ?? "");
              return (
                <div key={targetId} className="flex items-center gap-3">
                  <Avatar className="w-10 h-10">
                    <AvatarImage src={getMediaUrl(user.avatarUrl ?? null)} />
                    <AvatarFallback>{user.displayName?.[0] || "U"}</AvatarFallback>
                  </Avatar>
                  <div className="flex-1 min-w-0">
                    <Link href={`/profile/${targetId}`} className="font-semibold text-sm text-gray-900 hover:underline">
                      {user.displayName || `User ${targetId}`}
                    </Link>
                  </div>
                  <Button
                    size="sm"
                    variant="outline"
                    className="rounded-full"
                    onClick={() => unblockMutation.mutate(targetId)}
                    disabled={unblockMutation.isPending}
                  >
                    <UserX className="w-4 h-4 mr-1.5" /> Unblock
                  </Button>
                </div>
              );
            })}
          </div>
        )}
      </Card>

      <Card className="p-6 rounded-3xl border border-gray-100 shadow-sm mt-6">
        <div className="flex justify-between items-center mb-2">
          <h2 className="text-xl font-bold text-gray-900">Security & Active Sessions</h2>
          {sessionData && sessionData.length > 1 && (
            <Button
              size="sm"
              variant="outline"
              className="text-xs text-red-600 hover:text-red-500 rounded-full"
              onClick={() => logoutOthersMutation.mutate()}
              disabled={logoutOthersMutation.isPending}
            >
              <ShieldAlert className="w-4 h-4 mr-1.5" /> Log out other devices
            </Button>
          )}
        </div>
        <p className="text-gray-500 text-sm mb-6">
          Manage your currently active sessions across multiple devices and browsers.
        </p>

        {!sessionData || sessionData.length === 0 ? (
          <p className="text-sm text-gray-400 py-2">No active sessions found.</p>
        ) : (
          <div className="space-y-4 divide-y divide-gray-100">
            {sessionData.map((session: any) => {
              const isCurrent = session.isCurrent;
              const deviceLabel = session.userAgent || "Unknown Device";
              const ip = session.ipAddress || "Unknown IP";
              const lastActive = session.lastActiveAt ? new Date(session.lastActiveAt).toLocaleString() : "Recently";
              
              const isLaptop = /windows|macintosh|linux/i.test(deviceLabel);
              const isMobile = /iphone|ipad|android/i.test(deviceLabel);

              return (
                <div key={session.id} className="flex items-center gap-4 pt-3 first:pt-0">
                  <div className="p-2.5 bg-gray-50 rounded-xl border border-gray-100/50 text-gray-400">
                    {isLaptop ? (
                      <Laptop className="w-5 h-5 text-purple-600" />
                    ) : isMobile ? (
                      <Smartphone className="w-5 h-5 text-purple-600" />
                    ) : (
                      <Globe className="w-5 h-5 text-purple-600" />
                    )}
                  </div>
                  
                  <div className="flex-1 min-w-0">
                    <div className="flex items-center gap-2">
                      <p className="font-semibold text-sm text-gray-800 truncate">
                        {isLaptop ? "Desktop computer" : isMobile ? "Mobile device" : "Web browser"}
                      </p>
                      {isCurrent && (
                        <span className="text-[10px] bg-green-50 text-green-700 font-bold px-2 py-0.5 rounded-full border border-green-200">
                          This device
                        </span>
                      )}
                    </div>
                    <p className="text-xs text-gray-500 truncate mt-0.5">
                      {deviceLabel} • {ip}
                    </p>
                    <p className="text-[11px] text-gray-400 mt-1">
                      Active: {lastActive}
                    </p>
                  </div>

                  {!isCurrent && (
                    <Button
                      size="sm"
                      variant="outline"
                      className="rounded-full text-xs text-gray-500 hover:text-red-600 hover:border-red-200"
                      onClick={() => revokeSessionMutation.mutate(session.id)}
                      disabled={revokeSessionMutation.isPending}
                    >
                      Revoke
                    </Button>
                  )}
                </div>
              );
            })}
          </div>
        )}
      </Card>
    </div>
  );
}

function PrivacySelect({
  label,
  defaultValue,
  options,
  onSave,
}: {
  label: string;
  defaultValue: string;
  options: { value: string; label: string }[];
  onSave: (value: string) => void;
}) {
  return (
    <div className="flex items-center justify-between gap-4">
      <Label className="font-medium text-gray-800">{label}</Label>
      <Select defaultValue={defaultValue} onValueChange={(v: unknown) => v && onSave(String(v))}>
        <SelectTrigger className="w-48 rounded-xl">
          <SelectValue />
        </SelectTrigger>
        <SelectContent>
          {options.map((o) => (
            <SelectItem key={o.value} value={o.value}>
              {o.label}
            </SelectItem>
          ))}
        </SelectContent>
      </Select>
    </div>
  );
}
