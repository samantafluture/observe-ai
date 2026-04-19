export type RGB = [number, number, number];
export type RGBA = [number, number, number, number];

// Phosphor-green CRT palette matching blog aesthetic.
export const PHOSPHOR = {
  bg: [0, 4, 2] as RGB,
  land: [8, 28, 18] as RGB,
  landStroke: [36, 110, 76] as RGB,
  border: [24, 80, 56] as RGB,
} as const;

// Per-operator accents — distinct but all within a green/teal family
// so data reads on top of the phosphor basemap.
export const OPERATOR_COLOR: Record<string, RGB> = {
  Google: [120, 255, 180],
  AWS: [255, 170, 80],
  Azure: [110, 190, 255],
  OpenAI: [200, 255, 160],
  Anthropic: [210, 155, 120],
  'Google DeepMind': [120, 255, 180],
  Meta: [130, 180, 255],
  Microsoft: [110, 190, 255],
  NVIDIA: [160, 255, 100],
  xAI: [230, 230, 230],
  'Mistral AI': [255, 150, 100],
  Cohere: [220, 120, 220],
  'Stability AI': [200, 200, 255],
  'Hugging Face': [255, 215, 0],
  'Inflection AI': [180, 220, 255],
  'Perplexity AI': [100, 220, 210],
  'Character.AI': [210, 140, 255],
  'Scale AI': [255, 110, 110],
  Databricks: [255, 110, 60],
  Runway: [210, 210, 210],
  'AI21 Labs': [140, 210, 255],
  'Sakana AI': [255, 190, 210],
  'Aleph Alpha': [190, 160, 255],
  Baidu: [80, 180, 255],
  Alibaba: [255, 130, 50],
  Tencent: [80, 180, 230],
  'Zhipu AI': [180, 130, 255],
  'Moonshot AI': [220, 220, 160],
  // Fab operators — muted amber/copper family, distinct from AI/compute greens
  TSMC: [255, 180, 90],
  Samsung: [230, 160, 110],
  Intel: [200, 150, 80],
  GlobalFoundries: [220, 190, 130],
  SMIC: [210, 130, 80],
  Micron: [240, 200, 120],
  UMC: [190, 140, 90],
  'Texas Instruments': [210, 165, 95],
  'SK Hynix': [230, 175, 120],
  Infineon: [195, 150, 100],
  STMicroelectronics: [225, 170, 105],
};

export const FALLBACK_ACCENT: RGB = [120, 255, 180];

export function operatorColor(operator: string): RGB {
  return OPERATOR_COLOR[operator] ?? FALLBACK_ACCENT;
}

export function withAlpha(rgb: RGB, alpha: number): RGBA {
  return [rgb[0], rgb[1], rgb[2], alpha];
}

// Regulatory regime palette. Cool blue (strict), dim yellow (exec-order),
// soft red (state-directed), violet (emerging), faded green (minimal).
// Fills render at low alpha (~40) so country tints sit under dots.
export const REGIME_COLOR = {
  strict: [90, 150, 220],
  'executive-order': [220, 200, 110],
  'state-directed': [220, 110, 110],
  emerging: [180, 140, 220],
  minimal: [120, 170, 130],
} as const satisfies Record<string, RGB>;

export const REGIME_LABEL: Record<keyof typeof REGIME_COLOR, string> = {
  strict: 'Strict',
  'executive-order': 'Executive order',
  'state-directed': 'State-directed',
  emerging: 'Emerging',
  minimal: 'Minimal',
};
