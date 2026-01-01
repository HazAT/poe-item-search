/// <reference types="vite/client" />

// Build-time constants
declare const __DEV_MODE__: boolean;

// CSS module imports
declare module "*.css?inline" {
  const content: string;
  export default content;
}

declare module "*.css" {
  const content: Record<string, string>;
  export default content;
}
