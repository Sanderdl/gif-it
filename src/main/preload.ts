import { contextBridge, ipcRenderer } from "electron";
import { webUtils } from "electron";

contextBridge.exposeInMainWorld("electronAPI", {
  processFile: (file: File) => {
    const filePath = webUtils.getPathForFile(file);
    return ipcRenderer.invoke("process-file-path", filePath);
  },
  exportGif: (options: {
    inputPath: string;
    startTime: number;
    endTime: number;
    width?: number;
    fps?: number;
    quality?: 'high' | 'medium' | 'low';
  }) => {
    return ipcRenderer.invoke("export-gif", options);
  },
});
