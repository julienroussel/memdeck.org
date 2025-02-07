import { CSSProperties, Image } from '@mantine/core';
import { BLANK_CARD_IMAGE } from '../constants';

const containerStyle = (width: number): CSSProperties => ({
  position: 'relative',
  textAlign: 'center',
  width,
  boxShadow: '0 2px 5px rgba(0, 0, 0, 0.25)',
  borderRadius: '3%',
});

const topLeftStyle: CSSProperties = {
  position: 'absolute',
  top: '8px',
  left: '8px',
};

const centeredStyle = (fontSize: number): CSSProperties => ({
  position: 'absolute',
  top: '50%',
  left: '50%',
  transform: 'translate(-50%, -50%)',
  color: 'black',
  fontStyle: 'bold',
  fontSize,
});

const bottomRightStyle: CSSProperties = {
  position: 'absolute',
  bottom: '8px',
  right: '8px',
  transform: 'scale(-1, -1)',
};

export const NumberCard = ({
  number,
  width = 80,
  fontSize = 35,
}: {
  number: number;
  width?: number;
  fontSize?: number;
}) => {
  return (
    <div style={containerStyle(width)}>
      <Image src={BLANK_CARD_IMAGE} style={{ width: '100%' }} />
      <div style={topLeftStyle}>{number}</div>
      <div style={centeredStyle(fontSize)}>{number}</div>
      <div style={bottomRightStyle}>{number}</div>
    </div>
  );
};
