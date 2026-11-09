import { sel, num, col, area, section } from '../../core/schema/dsl.js';
import { general } from '../shared/general.js';

export const sections = [
  general({ position: [0, 0] }),
  section('Appearance', [
    area('text', 'Text', '{ArtistOrTitle}', { hint: 'Placeholders: {ArtistOrTitle} {title} {artist} {time} {duration} {remaining} {progress} {date} {clock}' }),
    col('color', 'Color', '#ffffffff'),
    num('fontSize', 'Font Size', 30, 4, 600, 1, { unit: 'px' }),
    sel('typeFace', 'Type Face', 'Inter', [{ value: 'Inter', label: 'Inter' }], { dynamic: 'fonts' }),
    sel('fontWeight', 'Font Weight', 400, [100, 200, 300, 400, 500, 600, 700, 800, 900].map((v) => ({ value: v, label: String(v) }))),
    sel('fontStyle', 'Font Style', 'normal', [{ value: 'normal', label: 'Normal' }, { value: 'italic', label: 'Italic' }]),
    sel('textAlign', 'Text Align', 'center', [{ value: 'left', label: 'Left' }, { value: 'center', label: 'Center' }, { value: 'right', label: 'Right' }]),
  ]),
];
