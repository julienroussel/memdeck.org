import {
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
} from '../suits/clubs';
import {
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
} from '../suits/diamonds';
import {
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
} from '../suits/hearts';
import {
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
} from '../suits/spades';

export const aronson = {
  name: 'Aronson',
  order: [
    JackOfSpades,
    KingOfClubs,
    FiveOfClubs,
    TwoOfHearts,
    NineOfSpades,
    AceOfSpades,
    ThreeOfHearts,
    SixOfClubs,
    EightOfDiamonds,
    AceOfClubs,
    TenOfSpades,
    FiveOfHearts,
    TwoOfDiamonds,
    KingOfDiamonds,
    SevenOfDiamonds,
    EightOfClubs,
    ThreeOfSpades,
    AceOfDiamonds,
    SevenOfSpades,
    FiveOfSpades,
    QueenOfDiamonds,
    AceOfHearts,
    EightOfSpades,
    ThreeOfDiamonds,
    SevenOfHearts,
    QueenOfHearts,
    FiveOfDiamonds,
    SevenOfClubs,
    FourOfHearts,
    KingOfHearts,
    FourOfDiamonds,
    TenOfDiamonds,
    JackOfClubs,
    JackOfHearts,
    TenOfClubs,
    JackOfDiamonds,
    FourOfSpades,
    TenOfHearts,
    SixOfHearts,
    ThreeOfClubs,
    TwoOfSpades,
    NineOfHearts,
    KingOfSpades,
    SixOfSpades,
    FourOfClubs,
    EightOfHearts,
    NineOfClubs,
    QueenOfSpades,
    SixOfDiamonds,
    QueenOfClubs,
    TwoOfClubs,
    NineOfDiamonds,
  ] as const,
};
