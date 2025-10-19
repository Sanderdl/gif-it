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
    <div class="action-buttons">
      <button @click="handleReset" class="btn border">
        Load another video
      </button>
      <button @click="exportGif" :disabled="isExporting" class="btn">
        {{ isExporting ? "Exporting..." : "Export as GIF" }}
      </button>
    </div>
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
  (e: "reset"): void;
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

const handleReset = () => {
  emit("reset");
};

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
  margin-top: 1rem;
  padding: 1rem;
  background: var(--color-panel-bg);
  border-radius: 0.5rem;
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
}

.export-settings select,
.export-settings input {
  padding: 4px 8px;
  border: none;
  border-radius: 4px;
  font-size: 14px;
}

.export-settings input[type="number"] {
  width: 80px;
}

.action-buttons {
  display: flex;
  justify-content: end;
  gap: 1rem;
  align-items: center;
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
  color: var(--color-primary-dark);
  border: 1px solid var(--color-primary-dark);
}

.export-status.error {
  background: var(--color-error-bg);
  color: var(--color-error-txt);
  border: 1px solid var(--color-error-txt);
}
</style>
