<template>
  <cropper-canvas ref="cropperCanvas">
    <cropper-shade hidden></cropper-shade>
    <cropper-handle action="select" plain></cropper-handle>
    <cropper-selection
      initial-coverage="1.0"
      movable
      resizable
      @change="handleCropChange"
    >
      <cropper-grid role="grid" covered></cropper-grid>
      <cropper-crosshair centered></cropper-crosshair>
      <cropper-handle
        action="move"
        theme-color="rgba(255, 59, 48, 0.35)"
      ></cropper-handle>
      <cropper-handle action="n-resize"></cropper-handle>
      <cropper-handle action="e-resize"></cropper-handle>
      <cropper-handle action="s-resize"></cropper-handle>
      <cropper-handle action="w-resize"></cropper-handle>
      <cropper-handle action="ne-resize"></cropper-handle>
      <cropper-handle action="nw-resize"></cropper-handle>
      <cropper-handle action="se-resize"></cropper-handle>
      <cropper-handle action="sw-resize"></cropper-handle>
    </cropper-selection>
  </cropper-canvas>
</template>

<script setup lang="ts">
import "cropperjs";
import type CropperCanvas from "@cropper/element-canvas";
import type CropperSelection from "@cropper/element-selection";
import type { Selection } from "@cropper/element-selection";
import { ref } from "vue";

interface Props {
  scaleFactor: number;
}

interface Emits {
  (
    e: "cropChange",
    payload: { x: number; y: number; width: number; height: number }
  ): void;
}

const props = defineProps<Props>();
const emit = defineEmits<Emits>();

const cropperCanvas = ref<InstanceType<typeof CropperCanvas>>();

const inSelection = (selection: Selection, maxSelection: Selection) => {
  return (
    selection.x >= maxSelection.x &&
    selection.y >= maxSelection.y &&
    selection.x + selection.width <= maxSelection.x + maxSelection.width &&
    selection.y + selection.height <= maxSelection.y + maxSelection.height
  );
};

const handleCropChange = (event: CustomEvent) => {
  if (!cropperCanvas.value) {
    return;
  }

  const cropperCanvasRect = cropperCanvas.value.getBoundingClientRect();
  const selection = event.detail as Selection;

  const maxSelection: Selection = {
    x: 0,
    y: 0,
    width: cropperCanvasRect.width,
    height: cropperCanvasRect.height,
  };

  if (!inSelection(selection, maxSelection)) {
    event.preventDefault();
  }

  const payload = {
    x: event.detail.x / props.scaleFactor,
    y: event.detail.y / props.scaleFactor,
    width: event.detail.width / props.scaleFactor,
    height: event.detail.height / props.scaleFactor,
  };
  emit("cropChange", payload);
};
</script>

<style scoped>
cropper-canvas {
  position: absolute;
  inset: 0;
}
</style>
