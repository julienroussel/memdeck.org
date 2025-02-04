import { Title } from '@mantine/core';
import { VarCSSProperty } from '../utils/style';

export const Test = () => {
  return (
    <>
      <Title order={1}>TEST</Title>
      <div className="cardContainer">
        <img
          className="card"
          style={{ '--i': '-2' } as VarCSSProperty}
          src="/cards/diamonds_7.svg"
        />
        <img
          className="card"
          style={{ '--i': '-1' } as VarCSSProperty}
          src="/cards/clubs_queen.svg"
        />

        <img
          className="card"
          style={{ '--i': '0' } as VarCSSProperty}
          src="/cards/hearts_10.svg"
        />
        <img
          className="card"
          style={{ '--i': '1' } as VarCSSProperty}
          src="/cards/spades_jack.svg"
        />
        <img
          className="card"
          style={{ '--i': '2' } as VarCSSProperty}
          src="/cards/hearts_king.svg"
        />
      </div>
    </>
  );
};
