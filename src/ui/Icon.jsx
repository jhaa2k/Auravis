const P = {
  play: 'M7 4.5v15l12-7.5z', pause: 'M7 4h3.5v16H7zM13.5 4H17v16h-3.5z', prev: 'M6 5v14M19 5.5v13L8.5 12z', next: 'M18 5v14M5 5.5v13L15.5 12z',
  plus: 'M12 5v14M5 12h14', trash: 'M4 7h16M9 7V4h6v3M6 7l1 13h10l1-13M10 11v6M14 11v6', copy: 'M8 8h11v12H8zM5 16V4h11',
  up: 'M12 19V5M6 11l6-6 6 6', down: 'M12 5v14M6 13l6 6 6-6', eye: 'M2 12s4-7 10-7 10 7 10 7-4 7-10 7S2 12 2 12zM12 15a3 3 0 100-6 3 3 0 000 6z',
  eyeOff: 'M3 3l18 18M10.6 6.1A9.7 9.7 0 0112 6c6 0 10 6 10 6a17 17 0 01-3.2 3.7M6.6 6.7A17 17 0 002 12s4 7 10 7c1.6 0 3-.4 4.3-1M9.9 9.9a3 3 0 004.2 4.2',
  lock: 'M6 11h12v9H6zM8 11V8a4 4 0 018 0v3', unlock: 'M6 11h12v9H6zM8 11V8a4 4 0 017.5-2', undo: 'M9 14L4 9l5-5M4 9h10a6 6 0 010 12h-3',
  redo: 'M15 14l5-5-5-5M20 9H10a6 6 0 000 12h3', folder: 'M3 6h6l2 2h10v11H3z', save: 'M5 4h12l3 3v13H5zM8 4v5h8V4M8 20v-6h8v6',
  wave: 'M3 12h2M7 7v10M11 4v16M15 8v8M19 10v4M21 12h0', image: 'M4 5h16v14H4zM4 16l5-5 4 4 3-3 4 4M15 9.5h.01', split: 'M4 8h10M6 12h10M8 16h10',
  blur: 'M12 3c3 4 6 7 6 11a6 6 0 01-12 0c0-4 3-7 6-11z', bars: 'M5 20v-7M9 20V6M13 20v-10M17 20V9M21 20v-5', particles: 'M6 6h.01M12 4h.01M18 7h.01M4 13h.01M10 11h.01M16 14h.01M8 19h.01M14 20h.01M20 18h.01',
  text: 'M5 6V4h14v2M12 4v16M9 20h6', motion: 'M3 8h8M3 12h12M3 16h8M16 7l5 5-5 5', reset: 'M4 12a8 8 0 108-8M4 4v5h5', upload: 'M12 16V4M7 9l5-5 5 5M4 20h16',
  download: 'M12 4v12M7 11l5 5 5-5M4 20h16', shuffle: 'M3 7h4l10 10h4M3 17h4l3-3M14 10l3-3h4M18 4l3 3-3 3M18 14l3 3-3 3', repeat: 'M4 11V9a3 3 0 013-3h12l-3-3M20 13v2a3 3 0 01-3 3H5l3 3',
  volume: 'M4 9v6h4l5 4V5L8 9zM16.5 8.5a5 5 0 010 7', record: 'M12 7a5 5 0 100 10 5 5 0 000-10z', stop: 'M6 6h12v12H6z', settings: 'M12 9a3 3 0 100 6 3 3 0 000-6zM19 12l2-1-2-4-2 .5-1.5-1L15 4h-4l-.5 2.5-1.5 1L7 7l-2 4 2 1v1l-2 1 2 4 2-.5 1.5 1L11 20h4l.5-2.5 1.5-1 2 .5 2-4-2-1z',
  warn: 'M12 4l10 17H2zM12 10v5M12 18h.01', error: 'M12 3a9 9 0 100 18 9 9 0 000-18zM12 8v5M12 16h.01', close: 'M6 6l12 12M18 6L6 18', chevron: 'M9 6l6 6-6 6', music: 'M9 18V6l11-2v12M9 18a3 3 0 11-6 0 3 3 0 016 0zM20 16a3 3 0 11-6 0 3 3 0 016 0z',
  list: 'M4 6h16M4 12h16M4 18h16', check: 'M5 12l4 4L19 6', layers: 'M12 3l9 5-9 5-9-5 9-5zM3 12l9 5 9-5M3 16l9 5 9-5', demo: 'M5 3l14 9-14 9z', drag: 'M9 6h.01M15 6h.01M9 12h.01M15 12h.01M9 18h.01M15 18h.01', info: 'M12 3a9 9 0 100 18 9 9 0 000-18zM12 11v6M12 8h.01',
};
export default function Icon({ name, size = 18, fill = false, ...rest }) {
  return (
    <svg width={size} height={size} viewBox="0 0 24 24" fill={fill ? 'currentColor' : 'none'} stroke="currentColor" strokeWidth="1.8" strokeLinecap="round" strokeLinejoin="round" aria-hidden="true" {...rest}>
      <path d={P[name] || P.info} />
    </svg>
  );
}
