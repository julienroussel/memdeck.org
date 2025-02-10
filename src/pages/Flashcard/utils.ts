import { CSSProperties } from 'react';
import { NOTIFICATION_CLOSE_TIMEOUT } from '../../constants';

export const TOGGLE = ['card', 'index'] as const;

export const cardShadow: CSSProperties = {
  boxShadow: '0 2px 5px rgba(0, 0, 0, 0.25)',
  borderRadius: '3%',
};

export const wrongAnswerNotification = {
  color: 'red',
  title: 'Wrong answer',
  message: 'Try again!',
  autoClose: NOTIFICATION_CLOSE_TIMEOUT,
};
