import { dialog } from "electron";
import { spawn, exec } from "node:child_process";
import { promises as fs } from "node:fs";
import path from "node:path";
import os from "node:os";

interface StreamProbe {
  streams: Array<StreamData>;
}

interface StreamData {
  width: number;
  height: number;
  display_aspect_ratio: string;
  r_frame_rate: string;
  avg_frame_rate: string;
  duration_ts: number;
  duration: string;
  bit_rate: string;
  tags: {
    rotate?: string;
    DURATION?: string;
  };
}

export interface VideoMetadata {
  objectUrl?: string;
  filePath: string;
  width: number;
  height: number;
  aspectRatio: string;
  frameRate: number;
  duration: number;
}

export const pickFile = async () => {
  const result = await dialog.showOpenDialog({
    properties: ["openFile"],
    filters: [{ name: "Videos", extensions: ["mp4", "m4v", "mov", "webm"] }],
  });

  if (!result.canceled) {
    return result.filePaths[0];
  }
};

export const getVideoMetadata = async (
  filePath: string
): Promise<VideoMetadata> => {
  return new Promise((resolve, reject) => {
    exec(
      `ffprobe -v error -hide_banner -of default=noprint_wrappers=0 -print_format json -select_streams v:0 -show_streams "${filePath}"`,
      (err, output) => {
        if (err) {
          reject(err);
        } else {
          const streamsData = JSON.parse(output) as StreamProbe;
          const firstStream = streamsData.streams[0] as StreamData;
          const videoData = processStreamData(firstStream, filePath);
          resolve(videoData);
        }
      }
    );
  });
};

const processStreamData = (
  data: StreamData,
  filePath: string
): VideoMetadata => {
  const frameRateNumbers = data.r_frame_rate.split("/");
  let frameRate = 30;
  if (frameRateNumbers.length >= 2) {
    frameRate = Number(frameRateNumbers[0]) / Number(frameRateNumbers[1]);
  }

  const rotation = Number(data.tags.rotate ?? "0");
  const orientationSwitched = rotation === 90 || rotation === 270;

  let duration = data.duration;
  if (!duration && data.tags.DURATION) {
    const hms = data.tags.DURATION;
    const a = hms.split(":"); // split it at the colons
    // minutes are worth 60 seconds. Hours are worth 60 minutes.
    duration = +a[0] * 60 * 60 + +a[1] * 60 + (+a[2]).toString();
  }

  return {
    filePath,
    width: orientationSwitched ? data.height : data.width,
    height: orientationSwitched ? data.width : data.height,
    aspectRatio: data.display_aspect_ratio,
    duration: Number(duration),
    frameRate,
  };
};

export interface GifExportOptions {
  inputPath: string;
  startTime: number;
  endTime: number;
  width?: number;
  fps?: number;
  quality?: "high" | "medium" | "low";
  crop?: {
    x: number;
    y: number;
    width: number;
    height: number;
  };
}

export const exportToGif = async (
  options: GifExportOptions
): Promise<string> => {
  const {
    inputPath,
    startTime,
    endTime,
    width = 480,
    fps = 15,
    quality = "medium",
    crop,
  } = options;

  // Show save dialog
  const result = await dialog.showSaveDialog({
    defaultPath: `export-${Date.now()}.gif`,
    filters: [{ name: "GIF Images", extensions: ["gif"] }],
  });

  if (result.canceled || !result.filePath) {
    throw new Error("Export cancelled");
  }

  const outputPath = result.filePath;
  const duration = endTime - startTime;

  // Quality settings
  const qualitySettings = {
    high: { colors: 256, dither: "bayer:bayer_scale=5" },
    medium: { colors: 128, dither: "bayer:bayer_scale=3" },
    low: { colors: 64, dither: "bayer:bayer_scale=1" },
  };

  const { colors, dither } = qualitySettings[quality];

  // Build video filter chain
  const videoFilters = [`fps=${fps}`];

  // Add crop filter if cropping is enabled
  if (crop) {
    videoFilters.push(`crop=${crop.width}:${crop.height}:${crop.x}:${crop.y}`);
  }

  // Add scale filter
  videoFilters.push(`scale=${width}:-1:flags=lanczos`);

  // Add palette generation
  videoFilters.push(`palettegen=max_colors=${colors}:reserve_transparent=0`);

  // FFmpeg command for palette generation
  const args = [
    "-y", // Overwrite output file
    "-ss",
    startTime.toString(), // Start time
    "-t",
    duration.toString(), // Duration
    "-i",
    inputPath, // Input file
    "-vf",
    videoFilters.join(","),
    "-f",
    "image2pipe",
    "-vcodec",
    "png",
    "-",
  ];

  // Build video filter chain for final GIF
  const finalVideoFilters = [`fps=${fps}`];

  // Add crop filter if cropping is enabled
  if (crop) {
    finalVideoFilters.push(
      `crop=${crop.width}:${crop.height}:${crop.x}:${crop.y}`
    );
  }

  // Add scale filter
  finalVideoFilters.push(`scale=${width}:-1:flags=lanczos`);

  const paletteArgs = [
    "-y",
    "-ss",
    startTime.toString(),
    "-t",
    duration.toString(),
    "-i",
    inputPath,
    "-i",
    "-", // Palette from stdin
    "-filter_complex",
    [
      `[0:v]${finalVideoFilters.join(",")}[v]`,
      `[v][1:v]paletteuse=dither=${dither}:diff_mode=rectangle`,
    ].join(";"),
    outputPath,
  ];

  return new Promise((resolve, reject) => {
    // First pass: generate palette
    const paletteProcess = spawn("ffmpeg", args);
    const gifProcess = spawn("ffmpeg", paletteArgs);

    // Pipe palette to GIF process
    paletteProcess.stdout.pipe(gifProcess.stdin);

    let errorOutput = "";

    paletteProcess.stderr.on("data", (data) => {
      errorOutput += data.toString();
    });

    gifProcess.stderr.on("data", (data) => {
      errorOutput += data.toString();
    });

    paletteProcess.on("error", (err) => {
      reject(new Error(`Palette generation failed: ${err.message}`));
    });

    gifProcess.on("error", (err) => {
      reject(new Error(`GIF creation failed: ${err.message}`));
    });

    gifProcess.on("close", (code) => {
      if (code === 0) {
        resolve(outputPath);
      } else {
        reject(
          new Error(
            `FFmpeg process failed with code ${code}. Error: ${errorOutput}`
          )
        );
      }
    });
  });
};

export async function generateThumbnails(
  inputPath: string,
  durationSeconds: number,
  intervalSeconds: number = 5
) {
  const dir = await fs.mkdtemp(path.join(os.tmpdir(), "thumbs-"));

  // Generate timestamps at a fixed interval (default every 5s)

  const safeInterval = Math.max(1, Math.floor(intervalSeconds));

  // Build a single, speed-first ffmpeg command that extracts frames at interval
  // Use low JPEG quality, fast scaling, disable audio, and enable multithreading
  const outPattern = path.join(dir, "thumb-%06d.jpg");
  const fpsExpr = `fps=1/${safeInterval}`;
  const scaleExpr = "scale=320:-1:flags=fast_bilinear"; // small and fast
  const vf = `${fpsExpr},${scaleExpr}`;

  const args: string[] = [
    "-y",
    "-skip_frame",
    "nokey",
    "-hwaccel",
    "auto",
    "-nostdin",
    "-hide_banner",
    "-loglevel",
    "error",
    "-threads",
    "0",
    "-an",
    "-i",
    inputPath,
    "-map",
    "0:v:0",
    "-vsync",
    "passthrough",
    "-vf",
    vf,
    "-q:v",
    "31",
    outPattern,
  ];

  try {
    await new Promise<void>((resolve, reject) => {
      const p = spawn("ffmpeg", args, { stdio: "inherit" });
      p.on("error", reject);
      p.on("close", (code) =>
        code === 0 ? resolve() : reject(new Error(`ffmpeg exited ${code}`))
      );
    });
  } catch (err) {
    console.error(err);
  }

  const files = (await fs.readdir(dir))
    .filter((f) => f.endsWith(".jpg"))
    .sort();
  const thumbnails = [] as string[];
  for (const f of files) {
    const base64 = (await fs.readFile(path.join(dir, f))).toString("base64");
    thumbnails.push(`data:image/jpg;base64,${base64}`);
  }
  return thumbnails; // array of file paths
}
