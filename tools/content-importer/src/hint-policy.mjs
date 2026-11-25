// Explanation prefixes can disclose answers. Only authored guidance belongs in hints.
export function learningHints(year, number, authored = []) {
  if (year !== 2009 || ![2, 4, 41, 42, 43, 44, 45, 46, 47].includes(number)) return [];
  if (number === 45) return [[{ type: 'text', text: '分别列出容量限制、不同消费者的等待条件，以及需要互斥的共享操作。' }]];
  if (number === 47) return [[{ type: 'text', text: '比较各子网主机数与可用地址数，再检查路由聚合的公共前缀。' }]];
  return authored.filter((blocks) => !blocks.some((block) => block.text?.includes('标出题干中的关键限制')));
}
