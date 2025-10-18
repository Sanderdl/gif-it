# Video to GIF Converter

A desktop application for converting video segments to high-quality GIFs with interactive cropping and timeline selection. Built with Electron, Vue 3, and TypeScript using the [electron-vue-template](https://github.com/Deluze/electron-vue-template).

## Features

- Load videos (MP4, M4V, MOV, WebM) and select segments with an interactive timeline
- Interactive cropping with drag-to-move and resizable handles
- Customizable export settings (quality, dimensions, frame rate)
- Two-pass FFmpeg encoding for optimal GIF quality

## Requirements

**FFmpeg** must be installed and available in your system PATH:
- **Windows**: Download from [ffmpeg.org](https://ffmpeg.org/download.html)
- **macOS**: `brew install ffmpeg`
- **Linux**: `sudo apt install ffmpeg`

## Development

This project is built on the [electron-vue-template](https://github.com/Deluze/electron-vue-template) which provides:
- Vue 3 + TypeScript for the renderer process
- Vite for fast development with HMR
- Electron Builder for cross-platform distribution

### Setup

```bash
# Install dependencies
npm install

# Start development server with hot reload
npm run dev

# Build for production
npm run build
```

## Usage

1. Launch the application
2. Click "Select Video File" to load a video
3. Use the timeline to select the segment you want to export by dragging the selection handles
4. Adjust export settings:
   - **Quality**: High (256 colors), Medium (128 colors), or Low (64 colors)
   - **Width**: Output width in pixels (height auto-calculated)
   - **FPS**: Frame rate for the GIF
   - **Interactive Cropping** (optional): Enable cropping to focus on specific areas:
     - **Drag the crop area** to move it around the video
     - **Drag the handles** on corners and edges to resize the crop area
     - Use manual number inputs for precise positioning
     - Choose from preset ratios (Center Square, 16:9, 4:3)
     - Real-time visual overlay shows exactly what will be exported
5. Click "🎬 Export as GIF" and choose save location
6. Wait for the export to complete

## Technical Details

The GIF export uses a two-pass FFmpeg process for optimal quality:

1. **Palette Generation**: Creates an optimized color palette for the video segment
2. **GIF Creation**: Uses the generated palette with dithering for high-quality output

This approach produces significantly better quality GIFs compared to direct conversion methods.

## Additional Commands

```bash
npm run dev # starts application with hot reload
npm run build # builds application, distributable files can be found in "dist" folder

# OR

npm run build:win # uses windows as build target
npm run build:mac # uses mac as build target
npm run build:linux # uses linux as build target
```

Optional configuration options can be found in the [Electron Builder CLI docs](https://www.electron.build/cli.html).

## Project Structure

```bash
- scripts/ # all the scripts used to build or serve your application, change as you like.
- src/
  - main/ # Main thread (Electron application source)
  - renderer/ # Renderer thread (VueJS application source)
```

