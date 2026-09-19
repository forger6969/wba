export const up = (pgm) => pgm.addColumns('org_announcements', { image_url: { type: 'text' }, image_key: { type: 'text' } });
export const down = (pgm) => pgm.dropColumns('org_announcements', ['image_url', 'image_key']);
