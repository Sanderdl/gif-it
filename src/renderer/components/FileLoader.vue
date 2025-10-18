<template>
  <div class="file-loader">
    <div
      class="drop-zone"
      :class="{ 'drag-over': isDragOver, 'has-error': error }"
      @drop="handleDrop"
      @dragover="handleDragOver"
      @dragenter="handleDragEnter"
      @dragleave="handleDragLeave"
    >
      <div class="drop-zone-content">
        <div class="icon">
          <svg
            width="48"
            height="48"
            viewBox="0 0 24 24"
            fill="none"
            stroke="currentColor"
            stroke-width="2"
          >
            <path
              d="M14 2H6a2 2 0 0 0-2 2v16a2 2 0 0 0 2 2h12a2 2 0 0 0 2-2V8z"
            />
            <polyline points="14,2 14,8 20,8" />
            <line x1="16" y1="13" x2="8" y2="13" />
            <line x1="16" y1="17" x2="8" y2="17" />
            <polyline points="10,9 9,9 8,9" />
          </svg>
        </div>
        <h3>Load Video File</h3>
        <p v-if="!error">Drag and drop a video file here or click to browse</p>
        <p v-if="!error" class="supported-formats">
          Supported formats: MP4, WebM, MOV, M4V, MKV
        </p>
        <div v-if="error" class="error-message">
          <p>{{ error }}</p>
        </div>
        <button @click="openFileDialog" type="button" class="browse-button">
          Choose File
        </button>
        <input
          ref="fileInput"
          type="file"
          id="load-file"
          accept=".mp4,.webm,.mov,.m4v,.mkv"
          @change="handleInputChange"
        />
      </div>
    </div>
  </div>
</template>

<script setup lang="ts">
import { ref } from "vue";
import { VideoMetadata } from "../../main/video_utils";
import { appState } from "../AppState";

const fileInput = ref<HTMLInputElement>();

const isDragOver = ref(false);
const error = ref<string | null>(null);

const emit = defineEmits<{
  (
    e: "change",
    payload: { videoData: VideoMetadata; thumbnails: string[] }
  ): void;
}>();

const handleDrop = async (event: DragEvent) => {
  event.preventDefault();
  isDragOver.value = false;
  error.value = null;

  const files = event.dataTransfer?.files;
  if (files && files.length > 0) {
    const file = files[0] as File;
    appState.loading = true;
    try {
      const result = await window.electronAPI.processFile(file);

      if (result) {
        result.videoData.objectUrl = URL.createObjectURL(file);
        emit("change", result);
      }
    } catch (e: any) {
      error.value = e?.message || String(e);
    }
    appState.loading = false;
  }
};

const handleDragOver = (event: DragEvent) => {
  event.preventDefault();
};

const handleDragEnter = (event: DragEvent) => {
  event.preventDefault();
  isDragOver.value = true;
};

const handleDragLeave = (event: DragEvent) => {
  event.preventDefault();
  // Only set isDragOver to false if we're leaving the drop zone entirely
  if (event.currentTarget !== event.relatedTarget) {
    isDragOver.value = false;
  }
};

const openFileDialog = async () => {
  fileInput.value?.click();
};

const handleInputChange = async (event: Event) => {
  error.value = null;
  const input = event.target as HTMLInputElement;
  const files = input.files;
  if (files && files.length > 0) {
    const file = files[0] as File;
    appState.loading = true;
    try {
      const result = await window.electronAPI.processFile(file);

      if (result) {
        result.videoData.objectUrl = URL.createObjectURL(file);
        emit("change", result);
      }
    } catch (e: any) {
      error.value = e?.message || String(e);
    }
    appState.loading = false;
  }
};
</script>

<style scoped>
.file-loader {
  width: 100%;
  max-width: 500px;
  margin: 0 auto;
}

.drop-zone {
  border: 2px dashed #ccc;
  border-radius: 8px;
  padding: 40px 20px;
  text-align: center;
  cursor: pointer;
  transition: all 0.3s ease;
  background-color: #fafafa;
  position: relative;
}

.drop-zone:hover {
  border-color: #007acc;
  background-color: #f0f8ff;
}

.drop-zone.drag-over {
  border-color: #007acc;
  background-color: #e6f3ff;
  transform: scale(1.02);
}

.drop-zone.has-error {
  border-color: #dc3545;
  background-color: #fff5f5;
}

.drop-zone-content {
  display: flex;
  flex-direction: column;
  align-items: center;
  gap: 16px;
}

.icon {
  color: #666;
}

.drop-zone.drag-over .icon {
  color: #007acc;
}

.drop-zone.has-error .icon {
  color: #dc3545;
}

h3 {
  margin: 0;
  font-size: 1.5rem;
  font-weight: 600;
  color: #333;
}

p {
  margin: 0;
  color: #666;
  line-height: 1.5;
}

.supported-formats {
  font-size: 0.9rem;
  color: #888;
}

.error-message {
  color: #dc3545;
  font-weight: 500;
}

.browse-button {
  background-color: #007acc;
  color: white;
  border: none;
  padding: 12px 24px;
  border-radius: 6px;
  font-size: 1rem;
  font-weight: 500;
  cursor: pointer;
  transition: background-color 0.2s ease;
}

.browse-button:after {
  content: "";
  position: absolute;
  inset: 0;
}

.browse-button:hover {
  background-color: #005a9e;
}

.drop-zone.has-error .browse-button {
  background-color: #dc3545;
}

.drop-zone.has-error .browse-button:hover {
  background-color: #c82333;
}

input[type="file"] {
  display: none;
}
</style>
