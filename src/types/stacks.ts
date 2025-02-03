import {
  AceOfClubs,
  AceOfDiamonds,
  AceOfHeart,
  AceOfSpades,
  Clubs,
  Diamonds,
  EightOfClubs,
  EightOfDiamonds,
  EightOfHeart,
  EightOfSpades,
  Eights,
  FiveOfClubs,
  FiveOfDiamonds,
  FiveOfHeart,
  FiveOfSpades,
  Fives,
  FourOfClubs,
  FourOfDiamonds,
  FourOfHeart,
  FourOfSpades,
  Fours,
  Hearts,
  JackOfClubs,
  JackOfDiamonds,
  JackOfHeart,
  JackOfSpades,
  Jacks,
  KingOfClubs,
  KingOfDiamonds,
  KingOfHeart,
  KingOfSpades,
  Kings,
  NineOfClubs,
  NineOfDiamonds,
  NineOfHeart,
  NineOfSpades,
  Nines,
  Ones,
  PlayingCard,
  QueenOfClubs,
  QueenOfDiamonds,
  QueenOfHeart,
  QueenOfSpades,
  Queens,
  SevenOfClubs,
  SevenOfDiamonds,
  SevenOfHeart,
  SevenOfSpades,
  Sevens,
  Sixes,
  SixOfClubs,
  SixOfDiamonds,
  SixOfHeart,
  SixOfSpades,
  Spades,
  TenOfClubs,
  TenOfDiamonds,
  TenOfHeart,
  TenOfSpades,
  Tens,
  ThreeOfClubs,
  ThreeOfDiamonds,
  ThreeOfHeart,
  ThreeOfSpades,
  Threes,
  TwoOfClubs,
  TwoOfDiamonds,
  TwoOfHeart,
  TwoOfSpades,
  Twos,
} from './cards';

// from https://mstn.github.io/2018/06/08/fixed-size-arrays-in-typescript/
type FixedSizeArray<N extends number, T> = N extends 0
  ? never[]
  : {
      0: T;
      length: N;
    } & ReadonlyArray<T>;

export type MemDeck = FixedSizeArray<52, PlayingCard>;
type Stacks = {
  [key: string]: {
    name: string;
    order: MemDeck;
  };
};

export const stacks: Stacks = {
  mnemonica: {
    name: 'Tamariz',
    order: [
      FourOfClubs,
      TwoOfHeart,
      SevenOfDiamonds,
      ThreeOfClubs,
      FourOfHeart,
      SixOfDiamonds,
      AceOfSpades,
      FiveOfHeart,
      NineOfSpades,
      TwoOfSpades,
      QueenOfHeart,
      ThreeOfDiamonds,
      QueenOfClubs,
      EightOfHeart,
      SixOfSpades,
      FiveOfSpades,
      NineOfHeart,
      KingOfClubs,
      TwoOfDiamonds,
      JackOfHeart,
      ThreeOfSpades,
      EightOfSpades,
      SixOfHeart,
      TenOfClubs,
      FiveOfDiamonds,
      KingOfDiamonds,
      TwoOfClubs,
      ThreeOfHeart,
      EightOfDiamonds,
      FiveOfClubs,
      KingOfSpades,
      JackOfDiamonds,
      EightOfClubs,
      TenOfSpades,
      KingOfHeart,
      JackOfClubs,
      SevenOfSpades,
      TenOfHeart,
      AceOfDiamonds,
      FourOfSpades,
      SevenOfHeart,
      FourOfDiamonds,
      AceOfClubs,
      NineOfClubs,
      JackOfSpades,
      QueenOfDiamonds,
      SevenOfClubs,
      QueenOfSpades,
      TenOfDiamonds,
      SixOfClubs,
      AceOfHeart,
      NineOfDiamonds,
    ] as const,
  },
  aronson: {
    name: 'Aronson',
    order: [
      JackOfSpades,
      KingOfClubs,
      FiveOfClubs,
      TwoOfHeart,
      NineOfSpades,
      AceOfSpades,
      ThreeOfHeart,
      SixOfClubs,
      EightOfDiamonds,
      AceOfClubs,
      TenOfSpades,
      FiveOfHeart,
      TwoOfDiamonds,
      KingOfDiamonds,
      SevenOfDiamonds,
      EightOfClubs,
      ThreeOfSpades,
      AceOfDiamonds,
      SevenOfSpades,
      FiveOfSpades,
      QueenOfDiamonds,
      AceOfHeart,
      EightOfSpades,
      ThreeOfDiamonds,
      SevenOfHeart,
      QueenOfHeart,
      FiveOfDiamonds,
      SevenOfClubs,
      FourOfHeart,
      KingOfHeart,
      FourOfDiamonds,
      TenOfDiamonds,
      JackOfClubs,
      JackOfHeart,
      TenOfClubs,
      JackOfDiamonds,
      FourOfSpades,
      TenOfHeart,
      SixOfHeart,
      ThreeOfClubs,
      TwoOfSpades,
      NineOfHeart,
      KingOfSpades,
      SixOfSpades,
      FourOfClubs,
      EightOfHeart,
      NineOfClubs,
      QueenOfSpades,
      SixOfDiamonds,
      QueenOfClubs,
      TwoOfClubs,
      NineOfDiamonds,
    ] as const,
  },
  memorandum: {
    name: 'Memorandum',
    order: [
      JackOfSpades,
      SevenOfClubs,
      TenOfHeart,
      AceOfDiamonds,
      FourOfClubs,
      SevenOfHeart,
      FourOfDiamonds,
      AceOfSpades,
      FourOfHeart,
      SevenOfDiamonds,
      FourOfSpades,
      AceOfHeart,
      TenOfDiamonds,
      SevenOfSpades,
      JackOfClubs,
      KingOfDiamonds,
      TenOfSpades,
      EightOfClubs,
      JackOfHeart,
      AceOfClubs,
      KingOfSpades,
      FiveOfClubs,
      EightOfHeart,
      ThreeOfDiamonds,
      QueenOfSpades,
      KingOfHeart,
      NineOfClubs,
      QueenOfHeart,
      SixOfClubs,
      NineOfHeart,
      TwoOfDiamonds,
      ThreeOfClubs,
      SixOfHeart,
      FiveOfDiamonds,
      TwoOfSpades,
      ThreeOfHeart,
      EightOfDiamonds,
      FiveOfSpades,
      KingOfClubs,
      JackOfDiamonds,
      EightOfSpades,
      TenOfClubs,
      TwoOfClubs,
      FiveOfHeart,
      SixOfDiamonds,
      ThreeOfSpades,
      TwoOfHeart,
      NineOfDiamonds,
      SixOfSpades,
      QueenOfClubs,
      QueenOfDiamonds,
      NineOfClubs,
    ] as const,
  },
  redford: {
    name: 'Redford Stack',
    order: [
      QueenOfHeart,
      TwoOfSpades,
      FiveOfDiamonds,
      EightOfClubs,
      JackOfHeart,
      KingOfSpades,
      TenOfHeart,
      SevenOfClubs,
      FourOfDiamonds,
      AceOfSpades,
      EightOfHeart,
      FiveOfClubs,
      TwoOfDiamonds,
      QueenOfSpades,
      NineOfHeart,
      SixOfClubs,
      ThreeOfDiamonds,
      TenOfSpades,
      SevenOfHeart,
      FourOfClubs,
      AceOfDiamonds,
      JackOfSpades,
      NineOfSpades,
      SixOfHeart,
      ThreeOfClubs,
      KingOfDiamonds,
      QueenOfDiamonds,
      TenOfDiamonds,
      SevenOfSpades,
      FourOfHeart,
      AceOfClubs,
      JackOfDiamonds,
      EightOfSpades,
      FiveOfHeart,
      TwoOfClubs,
      TwoOfHeart,
      QueenOfClubs,
      NineOfDiamonds,
      SixOfSpades,
      ThreeOfHeart,
      KingOfClubs,
      FourOfSpades,
      AceOfHeart,
      JackOfClubs,
      EightOfDiamonds,
      FiveOfSpades,
      ThreeOfSpades,
      KingOfHeart,
      TenOfClubs,
      SevenOfDiamonds,
      SixOfDiamonds,
      NineOfClubs,
    ] as const,
  },
  particle: {
    name: 'Particle System',
    order: [
      AceOfHeart,
      KingOfSpades,
      AceOfDiamonds,
      KingOfClubs,
      TwoOfHeart,
      QueenOfSpades,
      TwoOfDiamonds,
      QueenOfClubs,
      ThreeOfHeart,
      JackOfSpades,
      ThreeOfDiamonds,
      JackOfClubs,
      FourOfHeart,
      TenOfSpades,
      FourOfDiamonds,
      TenOfClubs,
      FiveOfHeart,
      NineOfSpades,
      FiveOfDiamonds,
      NineOfClubs,
      SixOfHeart,
      EightOfSpades,
      SixOfDiamonds,
      EightOfClubs,
      SevenOfHeart,
      SevenOfSpades,
      SevenOfDiamonds,
      SevenOfClubs,
      EightOfHeart,
      SixOfSpades,
      EightOfDiamonds,
      SixOfClubs,
      NineOfHeart,
      FiveOfSpades,
      NineOfDiamonds,
      FiveOfClubs,
      TenOfHeart,
      FourOfSpades,
      TenOfDiamonds,
      FourOfClubs,
      JackOfHeart,
      ThreeOfSpades,
      JackOfDiamonds,
      ThreeOfClubs,
      QueenOfHeart,
      TwoOfSpades,
      QueenOfDiamonds,
      TwoOfClubs,
      KingOfHeart,
      AceOfSpades,
      KingOfDiamonds,
      AceOfClubs,
    ] as const,
  },
};

export type PlayingCardPosition = {
  index: number;
  card: MemDeck[number];
};

export const getRandomPlayingCard = (stack: MemDeck): PlayingCardPosition => {
  const randomIndex = Math.floor(Math.random() * stacks.mnemonica.order.length);
  return {
    index: randomIndex + 1,
    card: stack[randomIndex] ?? stack[0],
  };
};

export const getRandomPlayingSuit = (stack: MemDeck): PlayingCardPosition[] => {
  const randomIndex = Math.floor(Math.random() * 4);
  const suit =
    randomIndex === 0
      ? Clubs
      : randomIndex === 1
        ? Diamonds
        : randomIndex === 2
          ? Hearts
          : Spades;
  return suit.map((card) => ({
    index: stack.indexOf(card) + 1,
    card: stack[stack.indexOf(card)] ?? stack[0],
  }));
};

export const getRandomPlayingValues = (
  stack: MemDeck,
): PlayingCardPosition[] => {
  const randomValue = Math.floor(Math.random() * 13);
  const suit =
    randomValue === 0
      ? Ones
      : randomValue === 1
        ? Twos
        : randomValue === 2
          ? Threes
          : randomValue === 3
            ? Fours
            : randomValue === 4
              ? Fives
              : randomValue === 5
                ? Sixes
                : randomValue === 6
                  ? Sevens
                  : randomValue === 7
                    ? Eights
                    : randomValue === 8
                      ? Nines
                      : randomValue === 9
                        ? Tens
                        : randomValue === 10
                          ? Jacks
                          : randomValue === 11
                            ? Queens
                            : Kings;
  return suit.map((card) => ({
    index: stack.indexOf(card) + 1,
    card: stack[stack.indexOf(card)] ?? stack[0],
  }));
};
