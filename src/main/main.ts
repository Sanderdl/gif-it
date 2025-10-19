import { app, BrowserWindow, ipcMain, session } from "electron";
import { join } from "path";
import {
  generateThumbnails,
  getVideoMetadata,
  exportToGif,
  GifExportOptions,
} from "./video_utils";

function createWindow() {
  const mainWindow = new BrowserWindow({
    width: 1024,
    height: 768,
    webPreferences: {
      preload: join(__dirname, "preload.js"),
      nodeIntegration: false,
      contextIsolation: true,
    },
    autoHideMenuBar: true,
  });

  if (process.env.NODE_ENV === "development") {
    const rendererPort = process.argv[2];
    mainWindow.loadURL(`http://localhost:${rendererPort}`);
  } else {
    mainWindow.loadFile(join(app.getAppPath(), "renderer", "index.html"));
  }
}

app.whenReady().then(() => {
  createWindow();

  session.defaultSession.webRequest.onHeadersReceived((details, callback) => {
    callback({
      responseHeaders: {
        ...details.responseHeaders,
        "Content-Security-Policy": ["script-src 'self'"],
      },
    });
  });

  app.on("activate", function () {
    // On macOS it's common to re-create a window in the app when the
    // dock icon is clicked and there are no other windows open.
    if (BrowserWindow.getAllWindows().length === 0) {
      createWindow();
    }
  });
});

app.on("window-all-closed", function () {
  if (process.platform !== "darwin") app.quit();
});

ipcMain.handle("process-file-path", async (_event, filePath: string) => {
  if (!filePath) return;
  const videoData = await getVideoMetadata(filePath);
  const thumbnails = await generateThumbnails(filePath, videoData.duration);
  return { videoData, thumbnails };
});

ipcMain.handle("export-gif", async (_event, options: GifExportOptions) => {
  try {
    const outputPath = await exportToGif(options);
    return { success: true, outputPath };
  } catch (error) {
    return {
      success: false,
      error: error instanceof Error ? error.message : "Unknown error",
    };
  }
});
