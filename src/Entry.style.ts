import { StyleSheet } from 'react-native';
import { COLORS } from './Colors.style';
import { Button } from 'react-native/types_generated/index';

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
    tintColor: COLORS.white,
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
    backgroundColor: COLORS.white,
    width: '100%',
    bottom: 80,
  },
  rights: {
    position: 'absolute',
    color: COLORS.white,
    fontSize: 14,
    bottom: 40,
    paddingHorizontal: 10,
  },
  notificationActive: {
    borderColor: COLORS.yellow,
    borderWidth: 2,
  },
  disabled: {
    opacity: 0.5,
  },
  scannerContainer: {
    flex: 1,
  },
  button: {
    padding: 10,
    width: 150,
    marginHorizontal: 'auto',
    marginTop: 20,
    backgroundColor: '#0055b9',
    borderRadius: 8             
  },
  btnText:{
    color: '#fff',
    fontSize: 16,
    textAlign: 'center',
  },
  qrBorder:{
     backgroundColor: '#fff', 
     padding: 20, 
     borderRadius: 12
  }
});
