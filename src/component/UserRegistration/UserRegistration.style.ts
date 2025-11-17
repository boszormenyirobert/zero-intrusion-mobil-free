import { StyleSheet } from 'react-native';
import { COLORS } from './../../Colors.style';

export default StyleSheet.create({
  container: {
    padding: 20,
    paddingBottom:50,
    marginTop: 0,
    marginBottom: 50,
    backgroundColor: COLORS.dark,
  },
  input: {
    borderWidth: 2,
    borderColor: COLORS.white,
    borderRadius: 5,
    padding: 12,
    paddingLeft: 16, 
    marginBottom: 15,
    backgroundColor: 'rgba(255,255,255,0.1)',
    color: COLORS.white    
  },
  switchContainer: {
    flexDirection: 'row',
    marginVertical: 10,
  },
  headLine: {
    fontSize: 24,
    marginBottom: 20,
    textAlign: 'center',
    color: COLORS.white
  },
  subLine: {
    fontSize: 24,
    marginBottom: 20,
    textAlign: 'justify',
    color:COLORS.white,
  },
  accept: {
    marginLeft: 8,
    color: COLORS.white,
  },
});
