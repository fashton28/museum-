import type * as THREE from 'three';

/** Live tile meshes by id — tiles sit inside rotating ring groups, so anything
 *  needing their world position (dive targeting, dev overlay) looks them up here. */
export const tileMeshes = new Map<string, THREE.Mesh>();
