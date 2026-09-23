/**
 * Regenerates src/features/trip/lr-assets.ts from the two LR images.
 *
 * Run after changing either image:  node scripts/build-lr-assets.mjs
 *
 * The images are inlined as `data:` URIs at source because a release build on
 * Android cannot read a bundled image's bytes: with no Metro server,
 * expo-asset leaves `Asset.localUri` as the bare drawable resource name, which
 * is neither a file path nor a URL. See the generated file's own comment.
 */
import { readFileSync, writeFileSync } from 'node:fs';
import { dirname, resolve } from 'node:path';
import { fileURLToPath } from 'node:url';

const root = resolve(dirname(fileURLToPath(import.meta.url)), '..');

const IMAGES = [
  ['LR_LOGO_DATA_URI', 'assets/images/lr-company-logo.png'],
  ['LR_SIGNATURE_DATA_URI', 'assets/images/lr-signature.png'],
];

const header = `/**
 * The LR's two fixed images, inlined as \`data:\` URIs at source.
 *
 * Generated from assets/images/lr-company-logo.png and lr-signature.png by
 * scripts/build-lr-assets.mjs — re-run it if either image changes.
 *
 * They are checked in rather than read at runtime because there is no reliable
 * way to read a bundled image's bytes on Android in a release build: with no
 * Metro server, expo-asset leaves \`Asset.localUri\` as the bare drawable
 * resource name ("assets_images_lrcompanylogo"), which is neither a file path
 * nor a URL — reading it as a file throws, and fetching it fails with
 * MalformedURLException: no protocol. A string in the bundle sidesteps the
 * whole problem, and the print WebView needs these as \`data:\` URIs anyway.
 */
`;

const body = IMAGES.map(([name, file]) => {
  const base64 = readFileSync(resolve(root, file)).toString('base64');
  return `export const ${name} =\n  'data:image/png;base64,${base64}';\n`;
}).join('\n');

const target = resolve(root, 'src/features/trip/lr-assets.ts');
writeFileSync(target, `${header}\n${body}`);
console.log(`wrote ${target}`);
