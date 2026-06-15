"use client";

import Link from "next/link";
import { ExternalLink, Globe, MessageSquare } from "lucide-react";
import type { Site } from "@/types";

export default function SiteGrid({ sites }: { sites: Site[] }) {
  if (sites.length === 0) {
    return (
      <div className="text-center py-20 text-gold-dim">
        <Globe className="w-12 h-12 mx-auto mb-4 opacity-50" />
        <p className="text-lg">No sites curated yet</p>
        <p className="text-sm mt-1">Check back later or ask an admin to add some</p>
      </div>
    );
  }

  return (
    <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-4">
      {sites.map((site) => (
        <Link
          key={site.id}
          href={`/sites/${site.id}`}
          className="group block bg-surface border border-gold/15 rounded-xl overflow-hidden hover:border-gold/25 transition-all hover:shadow-lg hover:shadow-gold/10"
        >
          <div className="h-36 bg-raised flex items-center justify-center overflow-hidden">
            {site.thumbnail ? (
              <img
                src={site.thumbnail}
                alt={site.title}
                className="w-full h-full object-cover group-hover:scale-105 transition-transform duration-300"
              />
            ) : (
              <Globe className="w-10 h-10 text-gold-dim" />
            )}
          </div>
          <div className="p-4">
            <h3 className="font-semibold text-gold group-hover:text-gold-light transition-colors truncate">
              {site.title}
            </h3>
            {site.description && (
              <p className="text-sm text-gold-dim mt-1 line-clamp-2">
                {site.description}
              </p>
            )}
            <div className="flex items-center gap-1.5 mt-3 text-xs text-gold-dim">
              <ExternalLink className="w-3 h-3" />
              <span className="truncate">{new URL(site.url).hostname}</span>
            </div>
          </div>
        </Link>
      ))}
    </div>
  );
}
