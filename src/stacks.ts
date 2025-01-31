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

export const mnemonica = [
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
] as const;

export type PlayingCardPosition = {
  index: number;
  card: (typeof mnemonica)[number];
};

export const getRandomMnemonicaPlayingCard = (): PlayingCardPosition => {
  const randomIndex = Math.floor(Math.random() * mnemonica.length);
  return {
    index: randomIndex + 1,
    card: mnemonica[randomIndex] ?? mnemonica[0],
  };
};

export const getRandomMnemonicaPlayingSuit = (): PlayingCardPosition[] => {
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
    index: mnemonica.indexOf(card) + 1,
    card: mnemonica[mnemonica.indexOf(card)] ?? mnemonica[0],
  }));
};

export const getRandomMnemonicaPlayingValues = (): PlayingCardPosition[] => {
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
    index: mnemonica.indexOf(card) + 1,
    card: mnemonica[mnemonica.indexOf(card)] ?? mnemonica[0],
  }));
};
