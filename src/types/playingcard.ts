import type {
  AceOfClubs,
  EightOfClubs,
  FiveOfClubs,
  FourOfClubs,
  JackOfClubs,
  KingOfClubs,
  NineOfClubs,
  QueenOfClubs,
  SevenOfClubs,
  SixOfClubs,
  TenOfClubs,
  ThreeOfClubs,
  TwoOfClubs,
} from "./suits/clubs";
import type {
  AceOfDiamonds,
  EightOfDiamonds,
  FiveOfDiamonds,
  FourOfDiamonds,
  JackOfDiamonds,
  KingOfDiamonds,
  NineOfDiamonds,
  QueenOfDiamonds,
  SevenOfDiamonds,
  SixOfDiamonds,
  TenOfDiamonds,
  ThreeOfDiamonds,
  TwoOfDiamonds,
} from "./suits/diamonds";
import type {
  AceOfHearts,
  EightOfHearts,
  FiveOfHearts,
  FourOfHearts,
  JackOfHearts,
  KingOfHearts,
  NineOfHearts,
  QueenOfHearts,
  SevenOfHearts,
  SixOfHearts,
  TenOfHearts,
  ThreeOfHearts,
  TwoOfHearts,
} from "./suits/hearts";
import type {
  AceOfSpades,
  EightOfSpades,
  FiveOfSpades,
  FourOfSpades,
  JackOfSpades,
  KingOfSpades,
  NineOfSpades,
  QueenOfSpades,
  SevenOfSpades,
  SixOfSpades,
  TenOfSpades,
  ThreeOfSpades,
  TwoOfSpades,
} from "./suits/spades";

export type PlayingCard =
  | typeof AceOfHearts
  | typeof TwoOfHearts
  | typeof ThreeOfHearts
  | typeof FourOfHearts
  | typeof FiveOfHearts
  | typeof SixOfHearts
  | typeof SevenOfHearts
  | typeof EightOfHearts
  | typeof NineOfHearts
  | typeof TenOfHearts
  | typeof JackOfHearts
  | typeof QueenOfHearts
  | typeof KingOfHearts
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
  | typeof KingOfDiamonds
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
  | typeof KingOfSpades;
