# CLAUDE.md

This file provides guidance to Claude Code (claude.ai/code) when working with code in this repository.

## Commands
- `npm run dev` - Start development server
- `npm run build` - Build for production
- `npm run start` - Start production server
- `npm run lint` - Run ESLint

## Code Style Guidelines
- Use TypeScript for type safety with strict mode enabled
- Follow NextJS conventions for routing and components
- Use named exports for components and utilities
- Components should be React functional components with proper type annotations
- Import order: React, external libraries, internal modules (@/components, @/lib)
- Use destructuring for props
- CSS: Use Tailwind with class-variance-authority (cva) for variants
- Error handling: Use try/catch with specific error types
- Use the `cn()` utility from `@/lib/utils` for merging Tailwind classes
- 'use client' directive for client components
- Keep components focused on a single responsibility
- Use absolute imports with path aliases (@/components, @/lib, etc.)