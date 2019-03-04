import React, { Component } from 'react';
import logo from './logo.svg';
import './App.css';
import _ from 'lodash';

let initstat = {"text": "welcome",
"log": logo};

class App extends Component {
  constructor(props){
    super(props);
    this.state = _.cloneDeep(initstat);
  }
  getProps(key) {
    if(!_.has(this.props, key)){
      _.assign(this.props, function(){
        return _.has(this.state, key) ? _.get(this.state, key) : null;
      })
    } else {
      return _.get(this.props, key);
    }
  } 
  render() {
    return (
      <div className="App">
        <header className="App-header">
          <img src={_.get(this.state, "log")} className="App-logo" alt="logo" />
          <p>
            Edit <code>src/App.js</code> and save to {this.props.match.params.page}}.
          </p>
          <a
            className="App-link"
            href="https://reactjs.org"
            target="_blank"
            rel="noopener noreferrer"
          >
            {this.getProps("text")}
          </a>
        </header>
      </div>
    );
  }
}

export default App;