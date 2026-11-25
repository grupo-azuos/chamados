import { describe, expect, it } from 'vitest';

import { BRAND_CDN_URL, brandAssetUrl } from './brand-asset.util';

describe('brandAssetUrl', () => {
  // feliz
  it('points a brand file to the CDN of the group', () => {
    expect(brandAssetUrl('logo/png/azuos-logo-oficial-white.png')).toBe(
      'https://cdn.grupoazuos.com.br/logo/png/azuos-logo-oficial-white.png',
    );
  });

  // triste
  it('never points to a copy inside the app', () => {
    expect(brandAssetUrl('zuzu/zuzu-joinha.png').startsWith(BRAND_CDN_URL)).toBe(true);
  });
});
