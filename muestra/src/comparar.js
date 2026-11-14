// Une dos platos en un solo modelo, uno al lado del otro y a tamaño real, para
// verlos juntos sobre la mesa. Se arma en el teléfono cuando el cliente lo pide.

import * as THREE from 'three';
import { GLTFLoader } from 'three/addons/loaders/GLTFLoader.js';
import { GLTFExporter } from 'three/addons/exporters/GLTFExporter.js';

const SEPARACION = 0.04;

export async function combinar(urls) {
  const cargador = new GLTFLoader();
  const escenas = await Promise.all(urls.map((u) => cargador.loadAsync(u).then((g) => g.scene)));
  const grupo = new THREE.Group();
  const cajas = escenas.map((e) => new THREE.Box3().setFromObject(e));
  const anchos = cajas.map((c) => c.max.x - c.min.x);
  let cursor = -(anchos.reduce((a, b) => a + b, 0) + SEPARACION * (escenas.length - 1)) / 2;
  const etiquetas = [];
  escenas.forEach((escena, i) => {
    const caja = cajas[i];
    const centroZ = (caja.min.z + caja.max.z) / 2;
    escena.position.set(cursor - caja.min.x, -caja.min.y, -centroZ);
    etiquetas.push({ x: cursor + anchos[i] / 2, y: caja.max.y - caja.min.y + 0.02, z: 0 });
    cursor += anchos[i] + SEPARACION;
    grupo.add(escena);
  });
  const datos = await new GLTFExporter().parseAsync(grupo, { binary: true });
  return { url: URL.createObjectURL(new Blob([datos], { type: 'model/gltf-binary' })), etiquetas };
}
