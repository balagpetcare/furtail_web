"use client";

import React, { useState, useEffect } from "react";
import { useSearchParams, useRouter } from "next/navigation";
import { useInfiniteQuery } from "@tanstack/react-query";
import { fetchApi } from "@/lib/api-client";
import { PostCard } from "@/components/post/post-card";
import { Skeleton } from "@/components/ui/skeleton";
import { Tabs, TabsList, TabsTrigger, TabsContent } from "@/components/ui/tabs";
import { Input } from "@/components/ui/input";
import { Button } from "@/components/ui/button";
import { Avatar, AvatarFallback, AvatarImage } from "@/components/ui/avatar";
import { getMediaUrl } from "@/lib/media";
import Link from "next/link";
import { Search } from "lucide-react";

function useDebounce<T>(value: T, delay: number): T {
  const [debouncedValue, setDebouncedValue] = useState<T>(value);
  useEffect(() => {
    const handler = setTimeout(() => {
      setDebouncedValue(value);
    }, delay);
    return () => clearTimeout(handler);
  }, [value, delay]);
  return debouncedValue;
}

export default function SearchPage() {
  const searchParams = useSearchParams();
  const router = useRouter();
  
  const initialQuery = searchParams.get("q") || "";
  const initialType = searchParams.get("type") || "all";
  
  const [localQuery, setLocalQuery] = useState(initialQuery);
  const [activeTab, setActiveTab] = useState(initialType);
  
  const debouncedQuery = useDebounce(localQuery, 500);

  // Update URL on debounce
  useEffect(() => {
    if (debouncedQuery !== initialQuery || activeTab !== initialType) {
      const params = new URLSearchParams();
      if (debouncedQuery) params.set("q", debouncedQuery);
      if (activeTab && activeTab !== "all") params.set("type", activeTab);
      router.replace(`/search?${params.toString()}`);
    }
  }, [debouncedQuery, activeTab, router, initialQuery, initialType]);

  interface SearchList {
    items: any[];
    nextCursor?: string | null;
    hasMore?: boolean;
  }
  type SearchPage = SearchList | { people: SearchList; posts: SearchList; pets: SearchList };

  const {
    data,
    isLoading,
    isError,
    fetchNextPage,
    hasNextPage,
    isFetchingNextPage
  } = useInfiniteQuery({
    queryKey: ["search", debouncedQuery, activeTab],
    queryFn: ({ pageParam }) => fetchApi<SearchPage>(`/search`, {
      params: { q: debouncedQuery, type: activeTab, cursor: pageParam as string | undefined, limit: 20 }
    }),
    getNextPageParam: (lastPage) =>
      "items" in lastPage ? lastPage.nextCursor || undefined : undefined,
    initialPageParam: undefined as string | undefined,
    enabled: debouncedQuery.length > 0,
  });

  const results =
    data?.pages.flatMap((page) =>
      "items" in page ? page.items : [...page.people.items, ...page.posts.items, ...page.pets.items],
    ) || [];

  return (
    <div className="py-6 px-4 sm:px-0 max-w-3xl mx-auto">
      <div className="mb-6">
        <h1 className="text-2xl font-bold text-gray-900 tracking-tight mb-4">Search</h1>
        
        <div className="relative">
          <div className="absolute inset-y-0 left-0 pl-3 flex items-center pointer-events-none">
            <Search className="h-5 w-5 text-gray-400" />
          </div>
          <Input 
            type="text"
            className="pl-10 rounded-2xl h-12 bg-gray-50 border-gray-200 focus:bg-white text-lg"
            placeholder="Search Furtail..."
            value={localQuery}
            onChange={(e) => setLocalQuery(e.target.value)}
            autoFocus
          />
        </div>
      </div>

      <Tabs value={activeTab} onValueChange={setActiveTab} className="w-full">
        <TabsList className="w-full bg-white border border-gray-100 rounded-xl mb-6 p-1 flex">
          <TabsTrigger value="all" className="flex-1 rounded-lg py-2">All</TabsTrigger>
          <TabsTrigger value="people" className="flex-1 rounded-lg py-2">People</TabsTrigger>
          <TabsTrigger value="posts" className="flex-1 rounded-lg py-2">Posts</TabsTrigger>
          <TabsTrigger value="pets" className="flex-1 rounded-lg py-2">Pets</TabsTrigger>
        </TabsList>

        <div className="space-y-4">
          {!debouncedQuery ? (
            <div className="p-12 text-center text-gray-500">
              Enter a search term to find posts, pets, and people.
            </div>
          ) : isLoading ? (
            <>
              <Skeleton className="w-full h-32 rounded-2xl" />
              <Skeleton className="w-full h-32 rounded-2xl" />
            </>
          ) : isError ? (
            <div className="p-8 text-center text-red-500 bg-red-50 rounded-2xl">
              Something went wrong while searching.
            </div>
          ) : results.length === 0 ? (
            <div className="p-12 text-center text-gray-500 border-2 border-dashed border-gray-200 rounded-2xl">
              No results found for &quot;{debouncedQuery}&quot; in {activeTab}.
            </div>
          ) : (
            <div className="space-y-4">
              {results.map((item: any, idx: number) => {
                const isUser = !!item.displayName || !!item.username;
                const isPet = !!item.species || !!item.breed || (item.name && !isUser);
                const isPost = !!item.caption || !!item.content || item.likeCount !== undefined;

                if (isPost) {
                  return <PostCard key={item.id || idx} post={item} />;
                }

                if (isUser) {
                  return (
                    <Link href={`/profile/${item.userId || item.id}`} key={item.userId || item.id}>
                      <div className="bg-white p-4 rounded-2xl border border-gray-100 flex items-center gap-4 hover:bg-gray-50 transition-colors">
                        <Avatar className="w-14 h-14">
                          <AvatarImage src={getMediaUrl(item.avatarUrl)} />
                          <AvatarFallback>{item.displayName?.[0] || 'U'}</AvatarFallback>
                        </Avatar>
                        <div>
                          <h4 className="font-bold text-gray-900">{item.displayName || item.username}</h4>
                          <p className="text-sm text-gray-500">@{item.username}</p>
                        </div>
                      </div>
                    </Link>
                  );
                }

                if (isPet) {
                  return (
                    <Link href={`/pet/${item.id}`} key={item.id}>
                      <div className="bg-white p-4 rounded-2xl border border-gray-100 flex items-center gap-4 hover:bg-gray-50 transition-colors">
                        <Avatar className="w-14 h-14">
                          <AvatarImage src={getMediaUrl(item.avatarUrl)} />
                          <AvatarFallback>P</AvatarFallback>
                        </Avatar>
                        <div>
                          <h4 className="font-bold text-gray-900">{item.name}</h4>
                          <p className="text-sm text-gray-500 capitalize">{item.species}</p>
                        </div>
                      </div>
                    </Link>
                  );
                }

                return null;
              })}

              {hasNextPage && (
                <div className="text-center pt-4">
                  <Button 
                    variant="outline" 
                    onClick={() => fetchNextPage()} 
                    disabled={isFetchingNextPage}
                  >
                    {isFetchingNextPage ? "Loading..." : "Load more results"}
                  </Button>
                </div>
              )}
            </div>
          )}
        </div>
      </Tabs>
    </div>
  );
}
