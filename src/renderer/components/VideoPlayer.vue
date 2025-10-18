<template>
  <div class="wrapper">
    <div
      class="video-container"
      :style="`width: ${displayWidth}px; height: ${displayHeight}px;`"
    >
      <video
        muted
        ref="videoElement"
        :src="props.videoData.objectUrl"
        @play="isPlaying = true"
        @pause="isPlaying = false"
        @timeupdate="onTimeUpdate"
        @loadedmetadata="onVideoLoaded"
      ></video>
      <CropperContainer
        v-if="showCrop"
        :scale-factor="scaleFactor"
        @crop-change="handleCropChange"
      />
    </div>

    <!-- Custom Video Controls -->
    <div class="video-controls">
      <button @click="togglePlayPause" class="play-pause-btn">
        {{ isPlaying ? "⏸️" : "▶️" }}
      </button>
      <div>
        <label>
          <input type="checkbox" v-model="showCrop" />
        </label>
      </div>
      <div class="progress-bar" @click="seekToPosition">
        <div
          class="progress-fill"
          :style="{ width: progressPercentage + '%' }"
        ></div>
      </div>
    </div>

    <div ref="timeLine" class="thumb-container" @mousedown.stop>
      <img v-for="thumb in props.thumbnails" :src="thumb" />
      <div
        class="slider"
        :style="{ left: sliderLeftPx + 'px', width: sliderWidthPx + 'px' }"
        @mousedown.stop.prevent="onSliderMouseDown($event)"
      >
        <div
          class="handle handle-left"
          @mousedown.stop.prevent="onHandleMouseDown($event, 'left')"
        ></div>
        <div
          class="handle handle-right"
          @mousedown.stop.prevent="onHandleMouseDown($event, 'right')"
        ></div>
      </div>
    </div>
  </div>
</template>

<script setup lang="ts">
import { VideoMetadata } from "../../main/video_utils";
import { onMounted, onBeforeUnmount, ref, computed, watch } from "vue";
import CropperContainer from "./CropperContainer.vue";

interface Props {
  videoData: VideoMetadata;
  thumbnails: string[];
}

interface Emits {
  (e: "selectionChange", payload: { startTime: number; endTime: number }): void;
  (
    e: "cropChange",
    payload: { x: number; y: number; width: number; height: number }
  ): void;
}

const props = defineProps<Props>();
const emit = defineEmits<Emits>();
const videoElement = ref<HTMLVideoElement>();
const timeLine = ref<HTMLElement>();

// Video playback state
const isPlaying = ref(false);
const currentTime = ref(0);
const showCrop = ref(false);

// Selection in pixels within the full scrollable width of the timeline
const selectionStartPx = ref(0);
const selectionEndPx = ref(0);
const minSelectionPx = 10;

const displayHeight = ref(480);
const displayWidth = ref(640);
const scaleFactor = ref(1);

const scrollableWidth = () => (timeLine.value ? timeLine.value.scrollWidth : 0);

const startSeconds = computed(() => pixelsToSeconds(selectionStartPx.value));
const endSeconds = computed(() => pixelsToSeconds(selectionEndPx.value));

const handleCropChange = (payload: any) => {
  emit("cropChange", payload);
};

watch([startSeconds, endSeconds], () => {
  if (videoElement.value?.currentTime) {
    videoElement.value.currentTime = startSeconds.value;
  }
  // Emit selection change for parent components
  emit("selectionChange", {
    startTime: startSeconds.value,
    endTime: endSeconds.value,
  });
});

const calculateHeightAndWidth = (maxWidth = 640, maxHeight = 480) => {
  let width = props.videoData.width;
  let height = props.videoData.height;
  if (width > height) {
    if (width > maxWidth) {
      scaleFactor.value = maxWidth / width;
      height *= scaleFactor.value;
      width = maxWidth;
    }
  } else {
    if (height > maxHeight) {
      scaleFactor.value = maxHeight / height;
      width *= scaleFactor.value;
      height = maxHeight;
    }
  }

  displayHeight.value = height;
  displayWidth.value = width;
};

// Drag state
type DragMode = "move" | "resize-left" | "resize-right" | null;
const dragMode = ref<DragMode>(null);
const dragStartClientX = ref(0);
const dragStartSelection = ref<{ start: number; end: number } | null>(null);
const grabOffsetWithinSliderPx = ref(0);
const lastMouseClientX = ref<number | null>(null);

const sliderLeftPx = computed(() =>
  Math.min(selectionStartPx.value, selectionEndPx.value)
);
const sliderRightPx = computed(() =>
  Math.max(selectionStartPx.value, selectionEndPx.value)
);
const sliderWidthPx = computed(() =>
  Math.max(minSelectionPx, sliderRightPx.value - sliderLeftPx.value)
);

// Progress bar calculation
const progressPercentage = computed(() => {
  const duration = endSeconds.value - startSeconds.value;
  if (duration <= 0) return 0;
  const relativeTime = currentTime.value - startSeconds.value;
  return Math.max(0, Math.min(100, (relativeTime / duration) * 100));
});

function clampToTimeline(px: number) {
  const max = Math.max(0, scrollableWidth() - 1);
  return Math.min(Math.max(0, px), max);
}

function pixelsToSeconds(px: number) {
  const totalPx = Math.max(1, scrollableWidth());
  const ratio = px / totalPx;
  return ratio * props.videoData.duration;
}

function secondsToPixels(seconds: number) {
  const totalPx = Math.max(1, scrollableWidth());
  const totalSec = Math.max(1e-6, props.videoData.duration);
  const ratio = seconds / totalSec;
  return ratio * totalPx;
}

// Video control functions
function togglePlayPause() {
  if (!videoElement.value) return;

  if (isPlaying.value) {
    videoElement.value.pause();
    isPlaying.value = false;
  } else {
    // If not within the selected range, start from the beginning of selection
    if (
      currentTime.value < startSeconds.value ||
      currentTime.value > endSeconds.value
    ) {
      videoElement.value.currentTime = startSeconds.value;
    }
    videoElement.value.play();
    isPlaying.value = true;
  }
}

function onTimeUpdate() {
  if (!videoElement.value) return;

  currentTime.value = videoElement.value.currentTime;

  // Loop back to start when reaching end of selection
  if (isPlaying.value && currentTime.value >= endSeconds.value) {
    videoElement.value.currentTime = startSeconds.value;
  }
}

function onVideoLoaded() {
  if (!videoElement.value) return;
  // Set initial position to start of selection
  videoElement.value.currentTime = startSeconds.value;
  currentTime.value = startSeconds.value;
}

function seekToPosition(event: MouseEvent) {
  if (!videoElement.value) return;

  const rect = (event.target as HTMLElement).getBoundingClientRect();
  const clickX = event.clientX - rect.left;
  const percentage = clickX / rect.width;
  const duration = endSeconds.value - startSeconds.value;
  const newTime = startSeconds.value + duration * percentage;

  videoElement.value.currentTime = Math.max(
    startSeconds.value,
    Math.min(endSeconds.value, newTime)
  );
}

function formatTime(seconds: number): string {
  const mins = Math.floor(seconds / 60);
  const secs = Math.floor(seconds % 60);
  return `${mins}:${secs.toString().padStart(2, "0")}`;
}

function beginDrag(e: MouseEvent, mode: DragMode) {
  dragMode.value = mode;
  dragStartClientX.value = e.clientX;
  dragStartSelection.value = {
    start: selectionStartPx.value,
    end: selectionEndPx.value,
  };
  lastMouseClientX.value = e.clientX;
  if (mode === "move" && timeLine.value) {
    const rect = timeLine.value.getBoundingClientRect();
    const worldX = timeLine.value.scrollLeft + (e.clientX - rect.left);
    grabOffsetWithinSliderPx.value = worldX - sliderLeftPx.value;
  } else {
    grabOffsetWithinSliderPx.value = 0;
  }
  window.addEventListener("mousemove", onMouseMove, true);
  window.addEventListener("mouseup", endDrag, true);
  startAutoScroll();
}

function onSliderMouseDown(e: MouseEvent) {
  beginDrag(e, "move");
}

function onHandleMouseDown(e: MouseEvent, which: "left" | "right") {
  beginDrag(e, which === "left" ? "resize-left" : "resize-right");
}

function onMouseMove(e: MouseEvent) {
  if (!dragMode.value || !dragStartSelection.value || !timeLine.value) return;
  lastMouseClientX.value = e.clientX;
  updateAutoScrollDirectionByMouse(e);
  updateSelectionFromClientX(e.clientX);
}

function worldXFromClientX(clientX: number): number {
  if (!timeLine.value) return 0;
  const rect = timeLine.value.getBoundingClientRect();
  return timeLine.value.scrollLeft + (clientX - rect.left);
}

function updateSelectionFromClientX(clientX: number) {
  if (!timeLine.value || !dragMode.value) return;
  const totalWidth = scrollableWidth();
  const worldX = worldXFromClientX(clientX);
  if (dragMode.value === "move") {
    const currentWidth = Math.max(minSelectionPx, sliderWidthPx.value);
    let newLeft = clampToTimeline(worldX - grabOffsetWithinSliderPx.value);
    newLeft = Math.min(newLeft, Math.max(0, totalWidth - currentWidth));
    selectionStartPx.value = newLeft;
    selectionEndPx.value = newLeft + currentWidth;
  } else if (dragMode.value === "resize-left") {
    const rightFixed = sliderRightPx.value;
    const proposedLeft = clampToTimeline(worldX);
    const left = Math.min(proposedLeft, rightFixed - minSelectionPx);
    selectionStartPx.value = Math.max(0, left);
  } else if (dragMode.value === "resize-right") {
    const leftFixed = sliderLeftPx.value;
    const proposedRight = clampToTimeline(worldX);
    const right = Math.max(proposedRight, leftFixed + minSelectionPx);
    selectionEndPx.value = Math.min(totalWidth, right);
  }
}

function endDrag() {
  dragMode.value = null;
  dragStartSelection.value = null;
  lastMouseClientX.value = null;
  window.removeEventListener("mousemove", onMouseMove, true);
  window.removeEventListener("mouseup", endDrag, true);
  stopAutoScroll();
}

onMounted(() => {
  if (!timeLine.value) return;
  timeLine.value.scrollLeft = 0;
  const total = secondsToPixels(props.videoData.duration);
  const initialSelection = secondsToPixels(10);
  selectionStartPx.value = 0;
  selectionEndPx.value = Math.min(total, initialSelection);
  calculateHeightAndWidth();
});

onBeforeUnmount(() => {
  window.removeEventListener("mousemove", onMouseMove, true);
  window.removeEventListener("mouseup", endDrag, true);
  stopAutoScroll();
});

// -------- Auto-scroll when dragging near edges --------
const autoScrollDir = ref<"left" | "right" | null>(null);
let autoScrollRAF: number | null = null;

function updateAutoScrollDirectionByMouse(e: MouseEvent) {
  if (!timeLine.value) return;
  const rect = timeLine.value.getBoundingClientRect();
  const threshold = 16; // px from edge to start auto-scroll
  if (e.clientX < rect.left + threshold) {
    autoScrollDir.value = "left";
  } else if (e.clientX > rect.right - threshold) {
    autoScrollDir.value = "right";
  } else {
    autoScrollDir.value = null;
  }
}

function startAutoScroll() {
  if (autoScrollRAF != null) return;
  const step = () => {
    if (!dragMode.value || !timeLine.value) {
      autoScrollRAF = null;
      return;
    }
    const dir = autoScrollDir.value;
    if (dir) {
      const speed = 8; // px per frame baseline
      const delta = dir === "left" ? -speed : speed;
      const before = timeLine.value.scrollLeft;
      const maxScroll = timeLine.value.scrollWidth - timeLine.value.clientWidth;
      let nextScroll = Math.max(0, Math.min(maxScroll, before + delta));
      const applied = nextScroll - before;
      if (applied !== 0) {
        timeLine.value.scrollLeft = nextScroll;
        if (lastMouseClientX.value != null) {
          updateSelectionFromClientX(lastMouseClientX.value);
        }
      }
    }
    autoScrollRAF = window.requestAnimationFrame(step);
  };
  autoScrollRAF = window.requestAnimationFrame(step);
}

function stopAutoScroll() {
  if (autoScrollRAF != null) {
    window.cancelAnimationFrame(autoScrollRAF);
    autoScrollRAF = null;
  }
  autoScrollDir.value = null;
}
</script>

<style scoped>
.wrapper {
  width: 640px;
  background-color: var(--color-bg);
}

.video-container {
  position: relative;
  margin: 0 auto;
}

video {
  height: 100%;
  width: 100%;
  object-fit: contain;
  object-position: center;
  display: block;
}

.video-controls {
  display: flex;
  align-items: center;
  gap: 0.75rem;
  padding: 0.5rem;
  background: var(--color-panel-bg);
  border-radius: 0.25rem;
  margin: 0.5rem 0;
}

.play-pause-btn {
  background: none;
  border: none;
  font-size: 20px;
  cursor: pointer;
  padding: 0;
}

.progress-bar {
  flex: 1;
  height: 6px;
  background: var(--color-bg);
  border-radius: 100vh;
  cursor: pointer;
  position: relative;
  overflow: hidden;
}

.progress-fill {
  height: 100%;
  background: var(--color-accent);
  border-radius: 100vh;
  transition: width 0.1s ease;
}

.thumb-container {
  overflow: hidden;
  white-space: nowrap;
  height: 64px;
  position: relative;
}

.thumb-container img {
  height: 64px;
  display: inline-block;
  object-fit: contain;
}

.slider {
  position: absolute;
  top: 0;
  bottom: 0;
  border: 2px solid var(--color-accent);
  background-color: rgba(255, 59, 48, 0.15);
  box-sizing: border-box;
  cursor: grab;
}

.slider:active {
  cursor: grabbing;
}

.handle {
  position: absolute;
  top: 0;
  bottom: 0;
  width: 8px;
  background: rgba(255, 59, 48, 0.6);
}

.handle-left {
  left: -4px;
  cursor: ew-resize;
}

.handle-right {
  right: -4px;
  cursor: ew-resize;
}
</style>
