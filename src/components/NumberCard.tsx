import { CSSProperties, Image } from '@mantine/core';
import { BLANK_CARD_IMAGE } from '../constants';

const containerStyle: CSSProperties = {
  position: 'relative',
  textAlign: 'center',
  width: 120,
  boxShadow: '0 2px 5px rgba(0, 0, 0, 0.25)',
  borderRadius: '3%',
};

const topLeftStyle: CSSProperties = {
  position: 'absolute',
  top: '8px',
  left: '8px',
};

const centeredStyle: CSSProperties = {
  position: 'absolute',
  top: '50%',
  left: '50%',
  transform: 'translate(-50%, -50%)',
  color: 'black',
  fontSize: 60,
};

const bottomRightStyle: CSSProperties = {
  position: 'absolute',
  bottom: '8px',
  right: '8px',
  transform: 'scale(-1, -1)',
};

export const NumberCard = ({ number }: { number: number }) => {
  return (
    <div style={containerStyle}>
      <Image src={BLANK_CARD_IMAGE} style={{ width: '100%' }} />
      <div style={topLeftStyle}>{number}</div>
      <div style={centeredStyle}>{number}</div>
      <div style={bottomRightStyle}>{number}</div>
    </div>
  );
};
