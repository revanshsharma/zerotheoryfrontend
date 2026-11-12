import { useEffect, useRef } from 'react';
import { renderMapPicture } from '@cg/lib/art';
import { registry } from '@cg/lib/registry';

export function MapThumb({ id }: { id: string }) {
  const ref = useRef<HTMLCanvasElement>(null);
  useEffect(() => {
    const map = registry.maps[id];
    const c = ref.current;
    if (!map || !c) return;
    const pic = renderMapPicture(map, registry);
    c.width = pic.width;
    c.height = pic.height;
    c.getContext('2d')!.drawImage(pic, 0, 0);
  }, [id]);
  return <canvas ref={ref} className="pixelated block w-full h-auto" aria-hidden="true" />;
}
