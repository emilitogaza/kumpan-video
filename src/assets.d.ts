// Lets TypeScript accept font imports. Remotion's bundler turns them into URLs.
declare module "*.ttf" {
  const url: string;
  export default url;
}
declare module "*.woff2" {
  const url: string;
  export default url;
}
