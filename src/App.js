import React, { Component } from 'react';
import logo from './logo.svg';
import './App.css';
import _ from 'lodash';
import Youtube from 'react-youtube';

let initstat = {"text": "welcome",
"log": logo};

class MyYTPlayer extends Component {
  onReady(evt) {
    evt.target.loadPlaylist({
      'list': "FLkG2neAz4Y6UVLFuZj_U6bw",
      'listType': "playlist",
      'index': 0
    });
  }
  render() {
    return (
      <div>
        <Youtube onReady={evt=>{this.onReady(evt)}}
          opts={{playerVars: { 'autoplay': 1, 'controls': 1 }}}
        ></Youtube>
      </div>
    )
  }
}

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
        {/* <header className="App-header">
          <img src={_.get(this.state, "log")} className="App-logo" alt="logo" />
          <p>
            Edit <code>src/App.js</code>.
          </p>
          <a
            className="App-link"
            href="https://reactjs.org"
            target="_blank"
            rel="noopener noreferrer"
          >
            {this.getProps("text")}
          </a>
        </header> */}
        <MyYTPlayer></MyYTPlayer>
      </div>
    );
  }
}

export default App;