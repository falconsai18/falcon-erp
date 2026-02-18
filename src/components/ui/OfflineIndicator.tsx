import React from 'react';
import { useSync } from '@/hooks/useSync';
import { useOffline } from '@/hooks/useOffline';
import { Cloud, CloudOff, RefreshCw } from 'lucide-react';
import { cn } from '@/lib/utils';

export function OfflineIndicator() {
  const { isOnline } = useOffline();
  const { pendingCount, isSyncing, lastSyncTime, sync } = useSync();

  const formatLastSync = () => {
    if (!lastSyncTime) return 'Never synced';
    const minutes = Math.floor((Date.now() - lastSyncTime.getTime()) / 60000);
    if (minutes < 1) return 'Just now';
    if (minutes < 60) return `${minutes}m ago`;
    const hours = Math.floor(minutes / 60);
    if (hours < 24) return `${hours}h ago`;
    return `${Math.floor(hours / 24)}d ago`;
  };

  if (!isOnline) {
    return (
      <div className="flex items-center gap-2 px-3 py-1.5 rounded-full bg-red-500/20 text-red-400 text-xs font-medium">
        <CloudOff size={14} />
        <span>Offline</span>
        {pendingCount > 0 && (
          <span className="ml-1 px-1.5 py-0.5 rounded-full bg-red-500 text-white text-[10px]">
            {pendingCount}
          </span>
        )}
      </div>
    );
  }

  if (isSyncing) {
    return (
      <div className="flex items-center gap-2 px-3 py-1.5 rounded-full bg-brand-500/20 text-brand-400 text-xs font-medium">
        <RefreshCw size={14} className="animate-spin" />
        <span>Syncing...</span>
      </div>
    );
  }

  return (
    <button
      onClick={() => sync()}
      className={cn(
        "flex items-center gap-2 px-3 py-1.5 rounded-full text-xs font-medium transition-colors",
        pendingCount > 0
          ? "bg-amber-500/20 text-amber-400 hover:bg-amber-500/30"
          : "bg-emerald-500/20 text-emerald-400 hover:bg-emerald-500/30"
      )}
    >
      <Cloud size={14} />
      <span>{formatLastSync()}</span>
      {pendingCount > 0 && (
        <span className="ml-1 px-1.5 py-0.5 rounded-full bg-amber-500 text-white text-[10px]">
          {pendingCount}
        </span>
      )}
    </button>
  );
}

// Compact version for tight spaces
export function OfflineIndicatorCompact() {
  const { isOnline } = useOffline();
  const { pendingCount, isSyncing } = useSync();

  if (!isOnline) {
    return (
      <div className="flex items-center gap-1.5 text-red-400">
        <CloudOff size={16} />
        {pendingCount > 0 && (
          <span className="text-xs font-medium">{pendingCount}</span>
        )}
      </div>
    );
  }

  if (isSyncing) {
    return (
      <div className="flex items-center gap-1.5 text-brand-400">
        <RefreshCw size={16} className="animate-spin" />
      </div>
    );
  }

  return (
    <div className={cn(
      "flex items-center gap-1.5",
      pendingCount > 0 ? "text-amber-400" : "text-emerald-400"
    )}>
      <Cloud size={16} />
      {pendingCount > 0 && (
        <span className="text-xs font-medium">{pendingCount}</span>
      )}
    </div>
  );
}

// Dot indicator for corner placement
export function OfflineDot() {
  const { isOnline } = useOffline();
  const { isSyncing } = useSync();

  return (
    <div
      className={cn(
        "w-2 h-2 rounded-full transition-colors",
        !isOnline && "bg-red-500",
        isOnline && isSyncing && "bg-brand-400 animate-pulse",
        isOnline && !isSyncing && "bg-emerald-500"
      )}
      title={!isOnline ? 'Offline' : isSyncing ? 'Syncing' : 'Online'}
    />
  );
}