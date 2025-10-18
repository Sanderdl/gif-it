<template>
  <div class="export-controls">
    <div class="export-settings">
      <label>
        Quality:
        <select v-model="exportSettings.quality">
          <option value="high">High (256 colors)</option>
          <option value="medium">Medium (128 colors)</option>
          <option value="low">Low (64 colors)</option>
        </select>
      </label>
      <label>
        Width:
        <input
          type="number"
          v-model.number="exportSettings.width"
          min="100"
          max="1920"
          step="10"
        />px
      </label>
      <label>
        FPS:
        <input
          type="number"
          v-model.number="exportSettings.fps"
          min="5"
          max="30"
          step="1"
        />
      </label>
    </div>

    <button @click="exportGif" :disabled="isExporting" class="export-btn">
      {{ isExporting ? "Exporting..." : "🎬 Export as GIF" }}
    </button>
    <div v-if="exportStatus" class="export-status" :class="exportStatus.type">
      {{ exportStatus.message }}
    </div>
  </div>
</template>

<script setup lang="ts">
import { ref, watch } from "vue";

interface Props {
  videoFilePath: string;
  startTime: number;
  endTime: number;
  videoWidth: number;
  videoHeight: number;
  cropEnabled?: boolean;
  cropSettings?: {
    x: number;
    y: number;
    width: number;
    height: number;
  };
}

interface Emits {
  (
    e: "cropChange",
    payload: {
      enabled: boolean;
      x: number;
      y: number;
      width: number;
      height: number;
    }
  ): void;
}

const props = defineProps<Props>();
const emit = defineEmits<Emits>();

// Export state
const isExporting = ref(false);
const exportStatus = ref<{ type: "success" | "error"; message: string } | null>(
  null
);
const exportSettings = ref({
  quality: "medium" as "high" | "medium" | "low",
  width: 480,
  fps: 15,
});

// Crop state - sync with props
const cropSettings = ref({
  x: props.cropSettings?.x || 0,
  y: props.cropSettings?.y || 0,
  width: props.cropSettings?.width || props.videoWidth,
  height: props.cropSettings?.height || props.videoHeight,
});

watch(
  () => props.cropSettings,
  (newVal) => {
    if (newVal) {
      cropSettings.value = {
        x: newVal.x,
        y: newVal.y,
        width: newVal.width,
        height: newVal.height,
      };
    }
  },
  { deep: true }
);

async function exportGif() {
  if (isExporting.value) return;

  isExporting.value = true;
  exportStatus.value = null;

  try {
    const exportOptions: any = {
      inputPath: props.videoFilePath,
      startTime: props.startTime,
      endTime: props.endTime,
      width: exportSettings.value.width,
      fps: exportSettings.value.fps,
      quality: exportSettings.value.quality,
    };

    exportOptions.crop = {
      x: cropSettings.value.x,
      y: cropSettings.value.y,
      width: cropSettings.value.width,
      height: cropSettings.value.height,
    };

    const result = await window.electronAPI.exportGif(exportOptions);

    if (result.success) {
      exportStatus.value = {
        type: "success",
        message: `GIF exported successfully to: ${result.outputPath}`,
      };
    } else {
      exportStatus.value = {
        type: "error",
        message: `Export failed: ${result.error}`,
      };
    }
  } catch (error) {
    exportStatus.value = {
      type: "error",
      message: `Export failed: ${
        error instanceof Error ? error.message : "Unknown error"
      }`,
    };
  } finally {
    isExporting.value = false;
  }
}
</script>

<style scoped>
.export-controls {
  margin-top: 16px;
  padding: 16px;
  background: #f8f9fa;
  border-radius: 8px;
  border: 1px solid #e9ecef;
}

.export-settings {
  display: flex;
  gap: 16px;
  align-items: center;
  margin-bottom: 12px;
  flex-wrap: wrap;
}

.export-settings label {
  display: flex;
  align-items: center;
  gap: 6px;
  font-size: 14px;
  color: #495057;
}

.export-settings select,
.export-settings input {
  padding: 4px 8px;
  border: 1px solid #ced4da;
  border-radius: 4px;
  font-size: 14px;
}

.export-settings input[type="number"] {
  width: 80px;
}

.export-btn {
  background: #28a745;
  color: white;
  border: none;
  padding: 10px 20px;
  border-radius: 6px;
  font-size: 14px;
  font-weight: 500;
  cursor: pointer;
  transition: all 0.2s;
  display: flex;
  align-items: center;
  gap: 8px;
}

.export-btn:hover:not(:disabled) {
  background: #218838;
  transform: translateY(-1px);
}

.export-btn:disabled {
  background: #6c757d;
  cursor: not-allowed;
  transform: none;
}

.export-status {
  margin-top: 12px;
  padding: 8px 12px;
  border-radius: 4px;
  font-size: 14px;
  font-weight: 500;
}

.export-status.success {
  background: #d4edda;
  color: #155724;
  border: 1px solid #c3e6cb;
}

.export-status.error {
  background: #f8d7da;
  color: #721c24;
  border: 1px solid #f5c6cb;
}

.crop-settings {
  margin: 12px 0;
  padding: 12px;
  background: #ffffff;
  border: 1px solid #dee2e6;
  border-radius: 6px;
}

.crop-toggle {
  display: flex;
  align-items: center;
  gap: 8px;
  font-weight: 500;
  margin-bottom: 8px;
}

.crop-toggle input[type="checkbox"] {
  width: 16px;
  height: 16px;
}

.crop-controls {
  margin-top: 12px;
}

.crop-row {
  display: flex;
  gap: 16px;
  margin-bottom: 8px;
}

.crop-row label {
  display: flex;
  align-items: center;
  gap: 6px;
  font-size: 14px;
  color: #495057;
}

.crop-row input[type="number"] {
  width: 70px;
  padding: 4px 8px;
  border: 1px solid #ced4da;
  border-radius: 4px;
  font-size: 14px;
}

.reset-crop-btn {
  background: #6c757d;
  color: white;
  border: none;
  padding: 6px 12px;
  border-radius: 4px;
  font-size: 12px;
  cursor: pointer;
  transition: background-color 0.2s;
  margin-top: 8px;
}

.reset-crop-btn:hover {
  background: #5a6268;
}

.crop-presets {
  display: flex;
  gap: 8px;
  margin-top: 8px;
  flex-wrap: wrap;
}

.preset-btn {
  background: #007bff;
  color: white;
  border: none;
  padding: 4px 8px;
  border-radius: 4px;
  font-size: 12px;
  cursor: pointer;
  transition: background-color 0.2s;
}

.preset-btn:hover {
  background: #0056b3;
}
</style>
