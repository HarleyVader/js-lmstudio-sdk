import { handleError, handleWarning, handleException } from './errorHandler';

export function handleError(err) {
  console.error('Error:', err);
}
export function handleWarning(warn) {
  console.warn('Warning:', warn);
}

export function handleException(ex) {
  console.error('Exception:', ex);
}

export function handleAll(type, message) {
  switch (type) {
    case 'error':
      handleError(message);
      break;
    case 'warning':
      handleWarning(message);
      break;
    case 'exception':
      handleException(message);
      break;
    default:
      console.log('Unknown type:', type, message);
  }
}