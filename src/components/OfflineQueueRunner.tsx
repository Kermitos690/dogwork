import { useOfflineQueueRunner } from "@/hooks/useOfflineQueue";

/**
 * Mounted once at the app root. Owns the offline → online replay loop.
 * Renders nothing — purely a side-effect host so consumers can keep their
 * file size minimal.
 */
export function OfflineQueueRunner() {
  useOfflineQueueRunner();
  return null;
}
