import type { Registry } from '@channel-green/shared';
import registryJson from '../generated/registry.json';

/** The merged, validated content registry (built by `npm run content:build`). */
export const registry = registryJson as unknown as Registry;
export { mergePacks, checkReferences, type RawPack } from './merge';
