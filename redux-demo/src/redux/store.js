import { createStore } from 'redux';
import countReducer from './reducers/count';

export default createStore(countReducer);
