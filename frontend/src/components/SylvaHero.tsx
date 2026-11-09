import React, { useCallback, useEffect, useRef, useState } from 'react';
import { LoaderOne } from './ui/loader';

const SOURCE_URL = '/landing-pages/inner-green-3d.html';
const FRAME_SANDBOX =
  'allow-downloads allow-forms allow-modals allow-popups allow-same-origin allow-scripts';

/**
 * Hosts the authored Sylva document as a same-project full-page iframe. Keeping
 * the renderer in its own document preserves its native controls and lets the
 * browser release all WebGL resources when the route unmounts.
 */
export const SylvaHero: React.FC = () => {
  const frameRef = useRef<HTMLIFrameElement>(null);
  const [ready, setReady] = useState(false);
  const [contextLost, setContextLost] = useState(false);
  const [loadFailed, setLoadFailed] = useState(false);
  const [reloadKey, setReloadKey] = useState(0);

  const handleLoad = useCallback(() => {
    setReady(true);
    setLoadFailed(false);
    setContextLost(false);
  }, []);

  useEffect(() => {
    if (!ready) return;

    const frameDocument = frameRef.current?.contentDocument;
    if (!frameDocument || typeof MutationObserver === 'undefined') return;

    const attached = new Map<HTMLCanvasElement, { lost: EventListener; restored: EventListener }>();
    const attachCanvasListeners = () => {
      frameDocument.querySelectorAll('canvas').forEach((canvas) => {
        if (attached.has(canvas)) return;

        const lost: EventListener = (event) => {
          event.preventDefault();
          setContextLost(true);
        };
        const restored: EventListener = () => setContextLost(false);
        canvas.addEventListener('webglcontextlost', lost);
        canvas.addEventListener('webglcontextrestored', restored);
        attached.set(canvas, { lost, restored });
      });
    };

    attachCanvasListeners();
    const observer = new MutationObserver(attachCanvasListeners);
    if (frameDocument.documentElement) {
      observer.observe(frameDocument.documentElement, { childList: true, subtree: true });
    }

    return () => {
      observer.disconnect();
      attached.forEach(({ lost, restored }, canvas) => {
        canvas.removeEventListener('webglcontextlost', lost);
        canvas.removeEventListener('webglcontextrestored', restored);
      });
    };
  }, [ready, reloadKey]);

  const retry = () => {
    setReady(false);
    setContextLost(false);
    setLoadFailed(false);
    setReloadKey((key) => key + 1);
  };

  return (
    <div className="sylva-frame" data-state={ready ? 'ready' : 'loading'} aria-busy={!ready}>
      {!ready && !loadFailed && (
        <div className="sylva-frame__loading" role="status" aria-live="polite">
          <LoaderOne />
          <span>Entering the living world…</span>
        </div>
      )}

      {loadFailed && (
        <div className="sylva-frame__message" role="alert">
          <p>The Sylva experience could not be loaded.</p>
          <button type="button" onClick={retry}>Try again</button>
        </div>
      )}

      {contextLost && !loadFailed && (
        <div className="sylva-frame__message" role="alert">
          <p>The graphics context was interrupted.</p>
          <button type="button" onClick={retry}>Restart the experience</button>
        </div>
      )}

      <iframe
        key={reloadKey}
        ref={frameRef}
        src={SOURCE_URL}
        title="Sylva — Into the living world"
        sandbox={FRAME_SANDBOX}
        allow="autoplay; fullscreen; picture-in-picture"
        loading="eager"
        onLoad={handleLoad}
        onError={() => setLoadFailed(true)}
        className="sylva-frame__document"
      />
    </div>
  );
};

export default SylvaHero;
