import React from 'react';
import ReactDOM from 'react-dom';
import {BrowserRouter, Route} from 'react-router-dom';
import {Provider} from 'react-redux';
import MyAppStore from './store/store';
import './constants/reset.css';
import MyApp from './components/myApp/myApp';
import * as serviceWorker from './serviceWorker';

ReactDOM.render(
  <Provider store={MyAppStore}>
    <BrowserRouter>
      <Route path='/:page/:uid' render={(props) => <MyApp {...props} ></MyApp>}/>
    </BrowserRouter>
  </Provider>,
  document.getElementById('root'));

// If you want your app to work offline and load faster, you can change
// unregister() to register() below. Note this comes with some pitfalls.
// Learn more about service workers: http://bit.ly/CRA-PWA
serviceWorker.unregister();
