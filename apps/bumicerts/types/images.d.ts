// Static image module declarations for tsc
// next/image-types/global provides these at runtime, but tsc needs them
// available before .next/ is generated (e.g. in CI typecheck step).
declare module "*.png" {
  const content: import("next/dist/shared/lib/image-external").StaticImageData;
  export default content;
}
declare module "*.jpg" {
  const content: import("next/dist/shared/lib/image-external").StaticImageData;
  export default content;
}
declare module "*.jpeg" {
  const content: import("next/dist/shared/lib/image-external").StaticImageData;
  export default content;
}
declare module "*.webp" {
  const content: import("next/dist/shared/lib/image-external").StaticImageData;
  export default content;
}
declare module "*.svg" {
  const content: string;
  export default content;
}
