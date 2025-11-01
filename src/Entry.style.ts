import { StyleSheet } from 'react-native';
import { COLORS } from './Colors.style';

export default StyleSheet.create({
  container: {
    padding: 16,
    backgroundColor: COLORS.dark,
    flex: 1,
    paddingVertical: 62,
  },
  headLine: {
    fontSize: 24,
    textAlign: 'center',
    padding: 15,
  },
  cardContainer: {
    color: COLORS.white,
    borderColor: COLORS.light_dark,
    padding: 16,
    borderRadius: 12,
    marginTop: 8,
    height: 100,
    marginBottom: 3,
    borderWidth: 2,
    backgroundColor: COLORS.light_dark,
    flexDirection: 'row',
    alignItems: 'center',
    gap: 8,
  },
  iconContainer: {
    width: 'auto',
    alignItems: 'center',
    justifyContent: 'center',
  },
  iconSize: {
    width: 50,
    height: 50,
  },
  icon: {
    tintColor: '#fff',
    marginRight: 15,
  },
  descriptionContainer: {
    flex: 1,
    paddingVertical: 10,
  },
  text: {
    fontSize: 14,
    color: COLORS.white,
  },
  capital: {
    fontSize: 18,
  },
  central: {
    textAlign: 'center',
  },
  justifyContent: {
    justifyContent: 'center',
    alignItems: 'center',
  },
  flex_01: {
    flex: 1,
  },
  splittedRow: {
    flexDirection: 'row',
    justifyContent: 'space-around',
    gap: 16,
  },
  left: {
    textAlign: 'left',
  },
  alert: {
    backgroundColor: COLORS.error,
  },
  opticalPadding: {
    paddingLeft: 35,
  },
  hr: {
    position: 'absolute',
    height: 1,
    backgroundColor: '#fff',
    width: '100%',
    bottom: 80,
  },
  rights: {
    position: 'absolute',
    color: '#fff',
    fontSize: 14,
    bottom: 40,
    paddingHorizontal: 10,
  },
});
