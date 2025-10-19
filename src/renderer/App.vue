<template>
  <LoadingSpinner v-if="appState.loading" />
  <FileLoader
    @change="handleFileSelected"
    v-show="!appState.loading && !videoData"
  />
  <div v-if="!appState.loading && videoData">
    <VideoPlayer
      :video-data="videoData.videoData"
      :thumbnails="videoData.thumbnails"
      @selection-change="handleSelectionChange"
      @crop-change="handleVideoCropChange"
    />
    <ExportControls
      :video-file-path="videoData.videoData.filePath"
      :start-time="selectionTimes.startTime"
      :end-time="selectionTimes.endTime"
      :video-width="videoData.videoData.width"
      :video-height="videoData.videoData.height"
      :crop-settings="cropState"
      @reset="videoData = null"
    />
  </div>
</template>

<script setup lang="ts">
import { ref } from "vue";
import FileLoader from "./components/FileLoader.vue";
import VideoPlayer from "./components/VideoPlayer.vue";
import ExportControls from "./components/ExportControls.vue";
import { VideoMetadata } from "../main/video_utils";
import { appState } from "./AppState";
import LoadingSpinner from "./components/LoadingSpinner.vue";

const videoData = ref<{
  videoData: VideoMetadata;
  thumbnails: string[];
} | null>(null);

const selectionTimes = ref({
  startTime: 0,
  endTime: 10,
});

const cropState = ref({
  enabled: false,
  x: 0,
  y: 0,
  width: 0,
  height: 0,
});

const handleFileSelected = (payload: {
  videoData: VideoMetadata;
  thumbnails: string[];
}) => {
  videoData.value = payload;
  // Reset selection times when new video is loaded
  selectionTimes.value = {
    startTime: 0,
    endTime: Math.min(10, payload.videoData.duration),
  };
  // Reset crop settings
  cropState.value = {
    enabled: false,
    x: 0,
    y: 0,
    width: payload.videoData.width,
    height: payload.videoData.height,
  };
};

const handleSelectionChange = (payload: {
  startTime: number;
  endTime: number;
}) => {
  selectionTimes.value = payload;
};

const handleVideoCropChange = (payload: {
  x: number;
  y: number;
  width: number;
  height: number;
}) => {
  cropState.value = {
    ...cropState.value,
    x: payload.x,
    y: payload.y,
    width: payload.width,
    height: payload.height,
  };
};
</script>

<style scoped></style>
