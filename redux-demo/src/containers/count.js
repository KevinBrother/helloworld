import { connect } from 'react-redux';
import CountUi from '../Count';
import {
  createIncreaseAction,
  createDecreaseAction
} from '../action/countAction';

/* function mapStateToProps(state) {
  return { count: state };
}

function mapDispatchToProps(dispatch) {
  return {
    increase: (value) => dispatch(createIncreaseAction(value)),
    decrease: (value) => dispatch(createDecreaseAction(value))
  };
}

export default connect(mapStateToProps, mapDispatchToProps)(CountUi);
 */

export default connect((state) => ({ count: state }), {
  increase: (value) => createIncreaseAction(value),
  decrease: (value) => createDecreaseAction(value)
})(CountUi);
