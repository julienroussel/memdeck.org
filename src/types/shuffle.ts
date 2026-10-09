export const shuffle = <T>(items: T[]): T[] => {
  const shuffled = [...items];
  for (let i = shuffled.length - 1; i > 0; i -= 1) {
    const j = Math.floor(Math.random() * (i + 1));
    const a = shuffled[i];
    const b = shuffled[j];
    if (a === undefined || b === undefined) {
      throw new Error(`Invalid indices: ${i}, ${j}`);
    }
    [shuffled[i], shuffled[j]] = [b, a];
  }
  return shuffled;
};
