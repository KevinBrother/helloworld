import { createStore } from 'redux';
import countReducer from './reducers/count';
import personReducer from './reducers/person';
import { combineReducers } from 'redux';
import { composeWithDevTools } from 'redux-devtools-extension/developmentOnly';

let reducers = combineReducers({
  count: countReducer,
  person: personReducer
});

export default createStore(reducers, composeWithDevTools());
