import { StyleSheet } from 'react-native';
import { COLORS } from './../../Colors.style';

export default StyleSheet.create({
  container: {
    padding: 20,
    paddingBottom:50,
    marginTop: 0,
    marginBottom: 50,
    backgroundColor: COLORS.white,
  },
  input: {
    borderWidth: 2,
    borderColor: COLORS.black,
    borderRadius: 5,
    padding: 12,
    marginBottom: 15,
  },
  switchContainer: {
    flexDirection: 'row',
    marginVertical: 10,
  },
  headLine: {
    fontSize: 24,
    marginBottom: 20,
    textAlign: 'center',
    color: COLORS.weight_dark
  },
  subLine: {
    fontSize: 24,
    marginBottom: 20,
    textAlign: 'justify',
    color:COLORS.weight_dark
  },
  accept: {
    marginLeft: 8,
    color: COLORS.weight_dark,
  },
});
