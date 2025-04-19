# Dudel: AI-Powered Doodle Generator

<div align="center">
  <img src="public/dudel-logo.svg" alt="Dudel Logo" width="150" height="150" />
  <h3><em>Transform your simple doodles into beautiful artwork with AI</em></h3>
</div>

Dudel is an interactive web application that allows you to draw simple sketches and transform them into beautiful, detailed images using AI. Just draw, describe, and generate!

## Features

- 🎨 **Intuitive Drawing Tools**: Brushes, shapes, fill tool, eraser, and more
- 🤖 **AI-Powered Transformation**: Turn simple doodles into detailed artwork
- 🔄 **Optional Descriptions**: Let AI interpret your drawing or guide it with a description
- 📱 **Responsive Design**: Works on desktop and mobile devices
- ⚡ **Fast Processing**: Quick image generation with real-time status updates

## How to Use

1. **Draw**: Use the various tools to create a sketch on the canvas
2. **Describe** (Optional): Add a text description of what you're drawing
3. **Generate**: Click the Generate button to transform your doodle
4. **View and Save**: See your AI-generated artwork and save it if you like

## Technologies Used

- **Frontend**: Next.js, React, TypeScript, Tailwind CSS
- **AI Integration**: fal.ai's FLUX image-to-image model
- **Animations**: CSS animations for smooth transitions
- **Design**: Responsive layout with mobile optimizations

## Getting Started

### Prerequisites

- Node.js 16+ or Bun
- A fal.ai API key (for the image generation)

### Environment Setup

Create a `.env.local` file in the root directory with:

```
FAL_KEY=your_fal_ai_api_key
```

### Installation

```bash
# Install dependencies
npm install
# or
bun install

# Start the development server
npm run dev
# or
bun dev
```

Open [http://localhost:3000](http://localhost:3000) to see the app in your browser.

## How It Works

1. The drawing canvas captures your doodle and converts it to a base64 image
2. Your image and optional description are sent to fal.ai's image-to-image API
3. The AI processes your doodle and generates a detailed image based on your input
4. The result image is displayed with a smooth transition animation

## Customization

You can modify various aspects of the generation process:

- Adjust the `strength` parameter (currently 0.95) to control how much the AI transforms your image
- Change the `num_inference_steps` (currently 40) to balance quality vs. speed
- Modify the `guidance_scale` (currently 3.5) to adjust how closely the model follows the text prompt

## License

MIT

## Acknowledgements

- AI image generation powered by [fal.ai](https://fal.ai)
- Built with [Next.js](https://nextjs.org) and [React](https://reactjs.org)
- UI components styled with [Tailwind CSS](https://tailwindcss.com)