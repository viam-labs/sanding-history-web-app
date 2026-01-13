# Sanding Monitoring Web App

A React TypeScript application for monitoring and analyzing sanding pass history, integrated with the Viam platform.

## Features

- Sanding pass history visualization with expandable detail rows
- Video and image capture viewing per step
- Robot config download and comparison between passes
- Diagnosis tracking (symptoms/causes) for failed passes
- Daily aggregation with execution time metrics
- Log download per step for debugging

## Getting Started

1. Install dependencies:

   ```bash
   npm install
   ```

2. Start the development server:

   ```bash
   npm run dev
   ```

3. Start the viam proxy:
   ```bash
   viam module local-app-testing --app-url http://localhost:3000 --machine-id <machine-id>
   ```

## Available Scripts

- `npm run dev` - Start development server
- `npm run build` - Build for production
- `npm run preview` - Preview production build

## Project Structure

- `src/Root.tsx` - Sets up routing and Viam client context
- `src/App.tsx` - Fetches sanding pass data
- `src/AppInterface.tsx` - Legacy UI component (being refactored)
- `src/NewAppInterface.tsx` - Refactored UI component (uses modular components)
- `src/components/` - Reusable UI components
- `src/lib/` - Utilities, types, and contexts
- `src/index.tsx` - Application entry point
- `index.html` - HTML template
- `vite.config.ts` - Vite configuration

## Dependencies

- React 18.2.0
- React DOM 18.2.0
- React Router DOM 7.10.1
- @viamrobotics/sdk 0.57.0
- js-cookie 3.0.5
- Vite 4.4.0
- TypeScript 5.0.0
- @vitejs/plugin-react 4.0.0
- Type definitions for React, React DOM, React Router DOM, and js-cookie

# Making Changes

When making a change to this repo, please run `npx @changesets/cli` to properly update the package.json using semantic versioning.

run `npm run start` to run the production build of the app locally and also ensure you start a module proxy `viam module local-app-testing --app-url http://localhost:3000 --machine-id <MACHINE_ID>`

IMPORTANT: until there is proper CI for beta env deployment, please deploy the module to a beta env for prod like testing, to achieve this, simply change the `module_id` field in the `meta-beta.json` file to point to module that you own and then run `make module-beta`
