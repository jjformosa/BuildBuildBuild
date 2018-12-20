import React, {Component} from 'react';
import {Route,withRouter} from 'react-router-dom';

const TestChild = (props) => (
  <div>
    {props.match.params.uid}
  </div>
);

class TestAp extends Component {
  render() {
    return (
      <div>
        <Route path='/:page/:uid' component={TestChild}></Route>
      </div>
    )
  }
}

export default withRouter(TestAp);