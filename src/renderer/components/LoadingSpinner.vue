<template>
  <span class="loader"></span>
</template>

<style>
.loader {
  width: 96px;
  height: 96px;
  border-radius: 50%;
  display: inline-block;
  position: relative;
  border: 20px solid;
  border-color: rgba(255, 255, 255, 0.15) rgba(255, 255, 255, 0.25)
    rgba(255, 255, 255, 0.35) var(--color-primary);
  box-sizing: border-box;
  animation: rotation 1s linear infinite;
}

@keyframes rotation {
  0% {
    transform: rotate(0deg);
  }
  100% {
    transform: rotate(360deg);
  }
}
</style>
