/** «1 блок», «3 блока», «8 блоков». */
export function blocksCount(n: number) {
  const m10 = n % 10, m100 = n % 100;
  const word = m10 === 1 && m100 !== 11 ? 'блок' : m10 >= 2 && m10 <= 4 && (m100 < 12 || m100 > 14) ? 'блока' : 'блоков';
  return `${n} ${word}`;
}

export function timeAgo(t: number) {
  const m = Math.round((Date.now() - t) / 60000);
  if (m < 1) return 'только что';
  if (m < 60) return `${m} мин назад`;
  const h = Math.round(m / 60);
  if (h < 24) return `${h} ч назад`;
  return new Date(t).toLocaleDateString('ru-RU', { day: 'numeric', month: 'long' });
}
