import { type ClassValue, clsx } from "clsx";
import { twMerge } from "tailwind-merge";

export function cn(...inputs: ClassValue[]) {
  return twMerge(clsx(inputs));
}

export function formatDate(date: string | Date): string {
  return new Intl.DateTimeFormat("en-US", {
    month: "short",
    day: "numeric",
    year: "numeric",
  }).format(new Date(date));
}

export function formatRelativeTime(date: string | Date): string {
  const now = new Date();
  const d = new Date(date);
  const diff = now.getTime() - d.getTime();
  const seconds = Math.floor(diff / 1000);
  const minutes = Math.floor(seconds / 60);
  const hours = Math.floor(minutes / 60);
  const days = Math.floor(hours / 24);

  if (seconds < 60) return "just now";
  if (minutes < 60) return `${minutes}m ago`;
  if (hours < 24) return `${hours}h ago`;
  if (days < 7) return `${days}d ago`;
  return formatDate(date);
}

export function truncate(str: string, length: number): string {
  if (str.length <= length) return str;
  return str.slice(0, length - 3) + "...";
}

export function platformDisplayName(platform: string): string {
  const names: Record<string, string> = {
    twitter: "Twitter/X",
    linkedin: "LinkedIn",
    instagram: "Instagram",
    youtube_shorts: "YouTube Shorts",
    newsletter: "Newsletter",
    blog: "Blog Post",
    quote_graphic: "Quote Graphics",
  };
  return names[platform] || platform;
}

export function platformColor(platform: string): string {
  const colors: Record<string, string> = {
    twitter: "bg-sky-500",
    linkedin: "bg-blue-700",
    instagram: "bg-gradient-to-r from-purple-500 to-pink-500",
    youtube_shorts: "bg-red-600",
    newsletter: "bg-emerald-600",
    blog: "bg-amber-600",
    quote_graphic: "bg-violet-600",
  };
  return colors[platform] || "bg-gray-500";
}

export function statusColor(status: string): string {
  const colors: Record<string, string> = {
    pending: "bg-yellow-100 text-yellow-800",
    processing: "bg-blue-100 text-blue-800",
    transcribing: "bg-indigo-100 text-indigo-800",
    generating: "bg-purple-100 text-purple-800",
    completed: "bg-green-100 text-green-800",
    failed: "bg-red-100 text-red-800",
    draft: "bg-gray-100 text-gray-800",
    approved: "bg-blue-100 text-blue-800",
    scheduled: "bg-orange-100 text-orange-800",
    published: "bg-green-100 text-green-800",
  };
  return colors[status] || "bg-gray-100 text-gray-800";
}

export function fileSizeFormat(bytes: number): string {
  if (bytes === 0) return "0 B";
  const k = 1024;
  const sizes = ["B", "KB", "MB", "GB"];
  const i = Math.floor(Math.log(bytes) / Math.log(k));
  return `${parseFloat((bytes / Math.pow(k, i)).toFixed(1))} ${sizes[i]}`;
}

export function durationFormat(seconds: number): string {
  const h = Math.floor(seconds / 3600);
  const m = Math.floor((seconds % 3600) / 60);
  const s = Math.floor(seconds % 60);
  if (h > 0) return `${h}:${m.toString().padStart(2, "0")}:${s.toString().padStart(2, "0")}`;
  return `${m}:${s.toString().padStart(2, "0")}`;
}
