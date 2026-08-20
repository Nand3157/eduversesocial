import {
  Brain,
  Clock3,
  LineChart,
  MessageCircleHeart,
  Sparkles,
  Target
} from "lucide-react";

export interface PlatformLogo {
  name: string;
  slug: string;
  svgPath: string;
  color: string;
}

export const platformLogos: PlatformLogo[] = [
  {
    name: "Instagram",
    slug: "instagram",
    color: "#E4405F",
    svgPath: "M12 2.163c3.204 0 3.584.012 4.85.07 3.252.148 4.771 1.691 4.919 4.919.058 1.265.069 1.645.069 4.849 0 3.205-.012 3.584-.069 4.849-.149 3.225-1.664 4.771-4.919 4.919-1.266.058-1.644.07-4.85.07-3.204 0-3.584-.012-4.849-.07-3.26-.149-4.771-1.699-4.919-4.92-.058-1.265-.07-1.644-.07-4.849 0-3.204.013-3.583.07-4.849.149-3.227 1.664-4.771 4.919-4.919 1.266-.057 1.645-.069 4.849-.069zm0-2.163c-3.259 0-3.667.014-4.947.072-4.358.2-6.78 2.618-6.98 6.98-.059 1.281-.073 1.689-.073 4.948 0 3.259.014 3.668.072 4.948.2 4.358 2.618 6.78 6.98 6.98 1.281.058 1.689.072 4.948.072 3.259 0 3.668-.014 4.948-.072 4.354-.2 6.782-2.618 6.979-6.98.059-1.28.073-1.689.073-4.948 0-3.259-.014-3.667-.072-4.947-.196-4.354-2.617-6.78-6.979-6.98-1.281-.059-1.69-.073-4.949-.073zm0 5.838c-3.403 0-6.162 2.759-6.162 6.162s2.759 6.163 6.162 6.163 6.162-2.759 6.162-6.163c0-3.403-2.759-6.162-6.162-6.162zm0 10.162c-2.209 0-4-1.79-4-4 0-2.209 1.791-4 4-4s4 1.791 4 4c0 2.21-1.791 4-4 4zm6.406-11.845c-.796 0-1.441.645-1.441 1.44s.645 1.44 1.441 1.44c.795 0 1.439-.645 1.439-1.44s-.644-1.44-1.439-1.44z"
  },
  {
    name: "Facebook",
    slug: "facebook",
    color: "#1877F2",
    svgPath: "M24 12.073c0-6.627-5.373-12-12-12s-12 5.373-12 12c0 5.99 4.388 10.954 10.125 11.854v-8.385H7.078v-3.47h3.047V9.43c0-3.007 1.792-4.669 4.533-4.669 1.312 0 2.686.235 2.686.235v2.953H15.83c-1.491 0-1.956.925-1.956 1.874v2.25h3.328l-.532 3.47h-2.796v8.385C19.612 23.027 24 18.062 24 12.073z"
  },
  {
    name: "Threads",
    slug: "threads",
    color: "#FFFFFF",
    svgPath: "M12.186 24C5.438 24 0 18.572 0 11.833 0 5.093 5.438 0 12.186 0c3.275 0 6.305 1.282 8.53 3.608l-2.656 2.82c-1.554-1.62-3.666-2.518-5.874-2.518-4.706 0-8.528 3.815-8.528 8.508 0 4.693 3.822 8.509 8.528 8.509 3.018 0 5.76-1.583 7.218-4.17-.674-.356-1.408-.602-2.189-.731-1.398 2.05-3.684 3.321-6.19 3.321-4.086 0-7.406-3.316-7.406-7.393 0-4.077 3.32-7.394 7.406-7.394 2.845 0 5.372 1.62 6.586 4.093l.353-.167c.725-1.49 1.83-2.723 3.238-3.567A12.146 12.146 0 0 0 12.186 24z"
  },
  {
    name: "YouTube",
    slug: "youtube",
    color: "#FF0000",
    svgPath: "M23.498 6.186a3.016 3.016 0 0 0-2.122-2.136C19.505 3.545 12 3.545 12 3.545s-7.505 0-9.377.505A3.017 3.017 0 0 0 .502 6.186C0 8.07 0 12 0 12s0 3.93.502 5.814a3.016 3.016 0 0 0 2.122 2.136c1.871.505 9.376.505 9.376.505s7.505 0 9.377-.505a3.015 3.015 0 0 0 2.122-2.136C24 15.93 24 12 24 12s0-3.93-.502-5.814zM9.545 15.568V8.432L15.818 12l-6.273 3.568z"
  },
  {
    name: "LinkedIn",
    slug: "linkedin",
    color: "#0A66C2",
    svgPath: "M19 3a2 2 0 0 1 2 2v14a2 2 0 0 1-2 2H5a2 2 0 0 1-2-2V5a2 2 0 0 1 2-2h14m-.5 15.5v-5.3a3.26 3.26 0 0 0-3.26-3.26c-.85 0-1.84.52-2.28 1.3v-1.11h-2.79v8.37h2.79v-4.93c0-.77.62-1.4 1.39-1.4a1.4 1.4 0 0 1 1.4 1.4v4.93h2.75M6.88 8.56a1.68 1.68 0 0 0 1.68-1.68c0-.93-.75-1.69-1.68-1.69a1.69 1.69 0 0 0-1.69 1.69c0 .93.76 1.68 1.69 1.68m1.39 9.94v-8.37H5.5v8.37h2.77z"
  },
  {
    name: "TikTok",
    slug: "tiktok",
    color: "#00F2FE",
    svgPath: "M12.525.02c1.31-.02 2.61-.01 3.91-.02.08 1.53.63 3.09 1.75 4.17 1.12 1.11 2.7 1.62 4.24 1.79v4.03c-1.44-.05-2.89-.35-4.2-.97-.57-.26-1.1-.59-1.62-1.01v8.43c.03 2.1-.51 4.25-1.68 6.02-1.32 2.01-3.48 3.42-5.83 3.84-2.45.44-5.02.04-7.23-1.15-2.22-1.2-3.86-3.22-4.57-5.61-.71-2.39-.42-5.02.8-7.18 1.21-2.16 3.28-3.66 5.72-4.14 1.25-.24 2.54-.18 3.76.17v4.13c-.76-.32-1.6-.4-2.4-.24-1.09.22-2.04.91-2.55 1.9-.51.99-.49 2.21.05 3.17.54.96 1.54 1.57 2.64 1.65 1.1.08 2.2-.39 2.85-1.28.48-.65.73-1.46.72-2.27V.02z"
  }
];

export const features = [
  {
    icon: Brain,
    title: "Meta Graph Memory",
    description:
      "Continuously learns from Instagram Reels, Facebook Pages, and Threads engagement callbacks to predict performance."
  },
  {
    icon: LineChart,
    title: "Cross-Platform Telemetry",
    description: "Visualize real-time reach, save velocity, and comment sentiment across all connected social channels."
  },
  {
    icon: MessageCircleHeart,
    title: "Audience Sentiment Engine",
    description: "Deep semantic analysis of incoming comments to categorize buyer intent vs general discussion."
  },
  {
    icon: Clock3,
    title: "Dynamic Publishing Windows",
    description: "Calculates precise hour-by-hour posting slots tailored to your unique audience timezone distribution."
  },
  {
    icon: Target,
    title: "Content Hook Intelligence",
    description: "Deconstructs high-performing carousels and shorts to recommend winning visual and text hooks."
  },
  {
    icon: Sparkles,
    title: "Automated Meta Dispatch",
    description: "Schedule & publish directly via official Meta Graph API after verified account connection."
  }
];