import { useCallback, useEffect, useRef, useState, type ReactNode } from 'react';
import { ChevronLeft, ChevronRight } from 'lucide-react';
import { Button } from '@/components/ui/button';

export function ArrowRow({ children, className = '' }: { children: ReactNode; className?: string }) {
  const track = useRef<HTMLDivElement>(null);
  const [edges, setEdges] = useState({ left: true, right: true });
  const update = useCallback(() => {
    const node = track.current;
    if (!node) return;
    setEdges({ left: node.scrollLeft < 2, right: node.scrollLeft + node.clientWidth >= node.scrollWidth - 2 });
  }, []);
  useEffect(() => {
    const node = track.current;
    if (!node) return;
    const observer = new ResizeObserver(update);
    observer.observe(node);
    Array.from(node.children).forEach(child => observer.observe(child));
    update();
    return () => observer.disconnect();
  }, [children, update]);
  const move = (direction: number) => {
    const node = track.current;
    if (!node) return;
    node.scrollBy({ left: direction * Math.max(120, node.clientWidth * .7), behavior: window.matchMedia('(prefers-reduced-motion: reduce)').matches ? 'instant' : 'smooth' });
  };
  return <div className={`flex min-w-0 items-center gap-1 ${className}`}>
    {!edges.right || !edges.left ? <Button type="button" variant="ghost" size="icon" className="pill shrink-0" aria-label="Previous options" title="Previous options" disabled={edges.left} onClick={() => move(-1)}><ChevronLeft /></Button> : null}
    <div ref={track} onScroll={update} className="flex min-w-0 flex-1 gap-2 overflow-x-auto scrollbar-hidden scroll-smooth" tabIndex={0}>{children}</div>
    {!edges.right || !edges.left ? <Button type="button" variant="ghost" size="icon" className="pill shrink-0" aria-label="Next options" title="Next options" disabled={edges.right} onClick={() => move(1)}><ChevronRight /></Button> : null}
  </div>;
}