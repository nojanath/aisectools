import type { Tool, PieSlice } from './types';

const LANGUAGE_COLORS: Record<string, string> = {
  JavaScript: '#a8a29e',
  Python: '#5eead4',
  Go: '#7dd3fc',
  'C++': '#a78bfa',
  Rust: '#fdba74',
  Java: '#fbbf24',
  TypeScript: '#3b82f6',
  PHP: '#a78bfa',
  HTML: '#fb923c',
  CSS: '#6366f1',
  Shell: '#84cc16',
  Ruby: '#fb7185',
  'C#': '#86efac',
  HCL: '#d8b4fe',
  PowerShell: '#93c5fd',
  Jupyter: '#fcd34d',
  'Jupyter Notebook': '#fcd34d',
  Unknown: '#71717a',
};

export function buildPieChart(tools: Tool[]): { slices: PieSlice[]; data: { label: string; value: number; color: string }[] } {
  const languageCounts = tools.reduce((acc: Record<string, number>, tool) => {
    const lang = tool.language || 'Unknown';
    acc[lang] = (acc[lang] || 0) + 1;
    return acc;
  }, {});

  const sortedLangs = Object.entries(languageCounts)
    .sort(([, a], [, b]) => b - a);
  const topLangs = sortedLangs.slice(0, 10);
  const othersCount = sortedLangs.slice(10).reduce((acc, [, count]) => acc + count, 0);

  const pieData = topLangs.map(([lang, count]) => ({
    label: lang,
    value: count,
    color: LANGUAGE_COLORS[lang] || '#71717a',
  }));
  if (othersCount > 0) pieData.push({ label: 'Others', value: othersCount, color: '#52525b' });

  const total = pieData.reduce((sum, d) => sum + d.value, 0);
  let currentAngle = 0;

  const slices: PieSlice[] = pieData.map((d) => {
    const sliceAngle = (d.value / total) * 2 * Math.PI;
    const x1 = Math.cos(currentAngle);
    const y1 = Math.sin(currentAngle);
    currentAngle += sliceAngle;
    const x2 = Math.cos(currentAngle);
    const y2 = Math.sin(currentAngle);
    const largeArc = sliceAngle > Math.PI ? 1 : 0;
    return {
      ...d,
      path: `M 0 0 L ${x1} ${y1} A 1 1 0 ${largeArc} 1 ${x2} ${y2} Z`,
    };
  });

  return { slices, data: pieData };
}
