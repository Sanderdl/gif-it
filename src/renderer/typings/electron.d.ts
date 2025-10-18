import { VideoMetadata } from "../../main/video_utils";

/**
 * Should match main/preload.ts for typescript support in renderer
 */
export default interface ElectronApi {
  processFile: (file: File) => Promise<{
    videoData: VideoMetadata;
    thumbnails: string[];
  } | null>;
  exportGif: (options: {
    inputPath: string;
    startTime: number;
    endTime: number;
    width?: number;
    fps?: number;
    quality?: 'high' | 'medium' | 'low';
  }) => Promise<{ success: boolean; outputPath?: string; error?: string }>;
}

declare global {
  interface Window {
    electronAPI: ElectronApi;
  }
}
