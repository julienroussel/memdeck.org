import { MemDeck, stacks } from './stacks';

export const shuffle = (stack: MemDeck) => {
  const array = [...stack];
  for (let i = array.length - 1; i > 0; i--) {
    const j = Math.floor(Math.random() * (i + 1));
    [array[i], array[j]] = [array[j], array[i]];
  }
  return array;
};

const shuffledStack = shuffle(stacks.mnemonica.order);
console.log(shuffledStack);
