import { createStore, applyMiddleware } from 'redux';
import thunk from 'redux-thunk';
import rootReducer from '../reducers/reducer';

const initialState = {};

const MyAppMiddleWare = applyMiddleware(thunk);

const MyAppStore = createStore(rootReducer, initialState, MyAppMiddleWare);

export default MyAppStore;