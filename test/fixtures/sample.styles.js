export const styles = {
  container: {
    marginLeft: '8px',
    marginRight: direction === 'ltr' ? '4px' : '10px',
    padding: direction === 'ltr' ? '0 12px 0 8px' : '0 8px 0 12px',
    borderTopLeftRadius: '4px',
    left: '50%',
    right: direction === 'ltr' ? '10px' : '0px',
    textAlign: direction === 'ltr' ? 'left' : 'right',
    '&[dir="rtl"]': {
      marginLeft: '0px',
    },
  },
};
