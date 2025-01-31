// From https://en.wikipedia.org/wiki/Playing_cards_in_Unicode
// Unicode characters for playing cards

export const AceOfSpades = '🂡' as const;
export const TwoOfSpades = '🂢' as const;
export const ThreeOfSpades = '🂣' as const;
export const FourOfSpades = '🂤' as const;
export const FiveOfSpades = '🂥' as const;
export const SixOfSpades = '🂦' as const;
export const SevenOfSpades = '🂧' as const;
export const EightOfSpades = '🂨' as const;
export const NineOfSpades = '🂩' as const;
export const TenOfSpades = '🂪' as const;
export const JackOfSpades = '🂫' as const;
export const QueenOfSpades = '🂭' as const;
export const KingOfSpades = '🂮' as const;

export const AceOfHeart = '🂱' as const;
export const TwoOfHeart = '🂲' as const;
export const ThreeOfHeart = '🂳' as const;
export const FourOfHeart = '🂴' as const;
export const FiveOfHeart = '🂵' as const;
export const SixOfHeart = '🂶' as const;
export const SevenOfHeart = '🂷' as const;
export const EightOfHeart = '🂸' as const;
export const NineOfHeart = '🂹' as const;
export const TenOfHeart = '🂺' as const;
export const JackOfHeart = '🂻' as const;
export const QueenOfHeart = '🂽' as const;
export const KingOfHeart = '🂾' as const;

export const AceOfClubs = '🃑' as const;
export const TwoOfClubs = '🃒' as const;
export const ThreeOfClubs = '🃓' as const;
export const FourOfClubs = '🃔' as const;
export const FiveOfClubs = '🃕' as const;
export const SixOfClubs = '🃖' as const;
export const SevenOfClubs = '🃗' as const;
export const EightOfClubs = '🃘' as const;
export const NineOfClubs = '🃙' as const;
export const TenOfClubs = '🃚' as const;
export const JackOfClubs = '🃛' as const;
export const QueenOfClubs = '🃝' as const;
export const KingOfClubs = '🃞' as const;

export const AceOfDiamonds = '🃁' as const;
export const TwoOfDiamonds = '🃂' as const;
export const ThreeOfDiamonds = '🃃' as const;
export const FourOfDiamonds = '🃄' as const;
export const FiveOfDiamonds = '🃅' as const;
export const SixOfDiamonds = '🃆' as const;
export const SevenOfDiamonds = '🃇' as const;
export const EightOfDiamonds = '🃈' as const;
export const NineOfDiamonds = '🃉' as const;
export const TenOfDiamonds = '🃊' as const;
export const JackOfDiamonds = '🃋' as const;
export const QueenOfDiamonds = '🃍' as const;
export const KingOfDiamonds = '🃎' as const;

export const Hearts = [
  AceOfHeart,
  TwoOfHeart,
  ThreeOfHeart,
  FourOfHeart,
  FiveOfHeart,
  SixOfHeart,
  SevenOfHeart,
  EightOfHeart,
  NineOfHeart,
  TenOfHeart,
  JackOfHeart,
  QueenOfHeart,
  KingOfHeart,
];
export const Diamonds = [
  AceOfDiamonds,
  TwoOfDiamonds,
  ThreeOfDiamonds,
  FourOfDiamonds,
  FiveOfDiamonds,
  SixOfDiamonds,
  SevenOfDiamonds,
  EightOfDiamonds,
  NineOfDiamonds,
  TenOfDiamonds,
  JackOfDiamonds,
  QueenOfDiamonds,
  KingOfDiamonds,
];
export const Clubs = [
  AceOfClubs,
  TwoOfClubs,
  ThreeOfClubs,
  FourOfClubs,
  FiveOfClubs,
  SixOfClubs,
  SevenOfClubs,
  EightOfClubs,
  NineOfClubs,
  TenOfClubs,
  JackOfClubs,
  QueenOfClubs,
  KingOfClubs,
];
export const Spades = [
  AceOfSpades,
  TwoOfSpades,
  ThreeOfSpades,
  FourOfSpades,
  FiveOfSpades,
  SixOfSpades,
  SevenOfSpades,
  EightOfSpades,
  NineOfSpades,
  TenOfSpades,
  JackOfSpades,
  QueenOfSpades,
  KingOfSpades,
];

export const Ones = [AceOfSpades, AceOfHeart, AceOfClubs, AceOfDiamonds];
export const Twos = [TwoOfSpades, TwoOfHeart, TwoOfClubs, TwoOfDiamonds];
export const Threes = [
  ThreeOfSpades,
  ThreeOfHeart,
  ThreeOfClubs,
  ThreeOfDiamonds,
];
export const Fours = [FourOfSpades, FourOfHeart, FourOfClubs, FourOfDiamonds];
export const Fives = [FiveOfSpades, FiveOfHeart, FiveOfClubs, FiveOfDiamonds];
export const Sixes = [SixOfSpades, SixOfHeart, SixOfClubs, SixOfDiamonds];
export const Sevens = [
  SevenOfSpades,
  SevenOfHeart,
  SevenOfClubs,
  SevenOfDiamonds,
];
export const Eights = [
  EightOfSpades,
  EightOfHeart,
  EightOfClubs,
  EightOfDiamonds,
];
export const Nines = [NineOfSpades, NineOfHeart, NineOfClubs, NineOfDiamonds];
export const Tens = [TenOfSpades, TenOfHeart, TenOfClubs, TenOfDiamonds];
export const Jacks = [JackOfSpades, JackOfHeart, JackOfClubs, JackOfDiamonds];
export const Queens = [
  QueenOfSpades,
  QueenOfHeart,
  QueenOfClubs,
  QueenOfDiamonds,
];
export const Kings = [KingOfSpades, KingOfHeart, KingOfClubs, KingOfDiamonds];

export type PlayingCard =
  | typeof AceOfSpades
  | typeof TwoOfSpades
  | typeof ThreeOfSpades
  | typeof FourOfSpades
  | typeof FiveOfSpades
  | typeof SixOfSpades
  | typeof SevenOfSpades
  | typeof EightOfSpades
  | typeof NineOfSpades
  | typeof TenOfSpades
  | typeof JackOfSpades
  | typeof QueenOfSpades
  | typeof KingOfSpades
  | typeof AceOfHeart
  | typeof TwoOfHeart
  | typeof ThreeOfHeart
  | typeof FourOfHeart
  | typeof FiveOfHeart
  | typeof SixOfHeart
  | typeof SevenOfHeart
  | typeof EightOfHeart
  | typeof NineOfHeart
  | typeof TenOfHeart
  | typeof JackOfHeart
  | typeof QueenOfHeart
  | typeof KingOfHeart
  | typeof AceOfClubs
  | typeof TwoOfClubs
  | typeof ThreeOfClubs
  | typeof FourOfClubs
  | typeof FiveOfClubs
  | typeof SixOfClubs
  | typeof SevenOfClubs
  | typeof EightOfClubs
  | typeof NineOfClubs
  | typeof TenOfClubs
  | typeof JackOfClubs
  | typeof QueenOfClubs
  | typeof KingOfClubs
  | typeof AceOfDiamonds
  | typeof TwoOfDiamonds
  | typeof ThreeOfDiamonds
  | typeof FourOfDiamonds
  | typeof FiveOfDiamonds
  | typeof SixOfDiamonds
  | typeof SevenOfDiamonds
  | typeof EightOfDiamonds
  | typeof NineOfDiamonds
  | typeof TenOfDiamonds
  | typeof JackOfDiamonds
  | typeof QueenOfDiamonds
  | typeof KingOfDiamonds;
