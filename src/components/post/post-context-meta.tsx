import React from "react";
import { type Post } from "@/lib/api/posts";
import { useRelativeTime, formatExactTime } from "@/lib/time";
import { Activity, AlertCircle, HeartPulse, MapPin, PawPrint, Star, Syringe, HeartHandshake } from "lucide-react";

interface PostContextMetaProps {
  post: Post;
}

const Dot = () => <span aria-hidden="true">·</span>;

const POST_TYPE_CONFIG: Record<string, { label: string; icon: React.ReactNode }> = {
  HEALTH_UPDATE: { label: "Health Update", icon: <HeartPulse className="w-3.5 h-3.5" /> },
  VACCINATION: { label: "Vaccination", icon: <Syringe className="w-3.5 h-3.5" /> },
  ADOPTION: { label: "Adoption", icon: <PawPrint className="w-3.5 h-3.5" /> },
  SERVICE_REVIEW: { label: "Service Review", icon: <Star className="w-3.5 h-3.5" /> },
  LOST_PET: { label: "Lost Pet", icon: <AlertCircle className="w-3.5 h-3.5 text-red-500" /> },
};

export function PostContextMeta({ post }: PostContextMetaProps) {
  const relativeTime = useRelativeTime(post.createdAt);
  const exactTime = formatExactTime(post.createdAt);

  const metaItems: React.ReactNode[] = [];

  // 1. Username (truncate if long)
  if (post.author.username) {
    metaItems.push(
      <span key="username" className="truncate max-w-[120px]">
        @{post.author.username}
      </span>
    );
  }

  // 2. Relative time
  metaItems.push(
    <span key="time" title={exactTime}>
      {relativeTime}
    </span>
  );

  // 3. Feeling
  if (post.feelingLabel) {
    metaItems.push(
      <span key="feeling" className="inline-flex items-center gap-1">
        {post.feelingEmoji && <span aria-hidden="true">{post.feelingEmoji}</span>}
        <span>{post.feelingLabel}</span>
      </span>
    );
  }

  // 4. Activity
  if (post.activityLabel) {
    metaItems.push(
      <span key="activity" className="inline-flex items-center gap-1">
        {post.activityEmoji ? (
          <span aria-hidden="true">{post.activityEmoji}</span>
        ) : (
          <Activity className="w-3.5 h-3.5" aria-hidden="true" />
        )}
        <span>{post.activityLabel}</span>
      </span>
    );
  }

  // 5. Post Type
  if (post.postType && post.postType !== "GENERAL") {
    const config = POST_TYPE_CONFIG[post.postType];
    if (config) {
      metaItems.push(
        <span key="postType" className="inline-flex items-center gap-1">
          {config.icon}
          <span>{config.label}</span>
        </span>
      );
    }
  }

  // 6. Tagged Pet
  if (post.taggedPets && post.taggedPets.length > 0) {
    const firstPet = post.taggedPets[0];
    const extraCount = post.taggedPets.length - 1;
    metaItems.push(
      <span key="pet" className="inline-flex items-center gap-1">
        <PawPrint className="w-3.5 h-3.5" aria-hidden="true" />
        <span>
          {firstPet.name} {extraCount > 0 ? `+${extraCount}` : ""}
        </span>
      </span>
    );
  }

  // 7. Location
  if (post.locationTag) {
    metaItems.push(
      <span key="location" className="inline-flex items-center gap-1 truncate max-w-[150px]" title={post.locationTag}>
        <MapPin className="w-3.5 h-3.5" aria-hidden="true" />
        <span className="truncate">{post.locationTag}</span>
      </span>
    );
  }

  // 8. Category
  if (post.category && post.category !== "GENERAL") {
    if (post.category === "FUNDRAISING") {
      metaItems.push(
        <span key="category" className="inline-flex items-center gap-1">
          <HeartHandshake className="w-3.5 h-3.5" aria-hidden="true" />
          <span>Fundraising</span>
        </span>
      );
    } else {
      // Capitalize first letter of category if it's something else
      metaItems.push(
        <span key="category" className="inline-flex items-center gap-1">
          {post.category.charAt(0).toUpperCase() + post.category.slice(1).toLowerCase()}
        </span>
      );
    }
  }

  // 9. Content Tags
  if (post.contentTags && post.contentTags.length > 0) {
    const tagsToShow = post.contentTags.slice(0, 2);
    const extraTags = post.contentTags.length - 2;
    
    // The prompt says: "#Dogs · #Vaccination +2"
    // So we can map them and join them with dots, or treat them as separate meta items
    // If they are separate meta items, they will wrap nicely.
    tagsToShow.forEach((tag, idx) => {
      const isLastTag = idx === tagsToShow.length - 1;
      metaItems.push(
        <span key={`tag-${tag.id}`} className="inline-flex items-center gap-1">
          #{tag.label}
          {isLastTag && extraTags > 0 ? ` +${extraTags}` : ""}
        </span>
      );
    });
  }

  return (
    <div className="flex flex-wrap items-center gap-x-1.5 gap-y-1 text-xs text-gray-500 max-w-full">
      {metaItems.map((item, index) => (
        <React.Fragment key={index}>
          {item}
          {index < metaItems.length - 1 && <Dot />}
        </React.Fragment>
      ))}
    </div>
  );
}