/*global YT*/
import _ from 'lodash';
import {connect} from 'react-redux';
import React, { Component } from 'react';
import Youtube from 'react-youtube';
import './ytPlayer.css';

class MyYouTubePlayer extends Component {
  componentWillReceiveProps(props) {
    if(!this._player) return ;
    let playindex = _.get(props, 'ytplayindex')[this.props.playindex],
      curplayindex = this.curplayindex;
    if(_.has(props, 'ytplaylist')) {
      let playlist = _.get(props, 'ytplaylist');
      if(playlist !== this.props.ytplaylist) {
        this._player.loadPlaylist({
          'list': playlist,
          'listType': 'playlist',
          'index': playindex > -1 ? playindex : 0,
          'autoplay': 1,
          'controls': 1,
          'loop': 1
        });
        this.curplayindex = playindex;
      }
      else if(playindex !== curplayindex && playindex > -1) {
        this._player.playVideoAt(playindex);
        this.curplayindex = playindex;
      }
    }
    else if(playindex !== curplayindex && playindex > -1) {
       this._player.playVideoAt(playindex);
       this.curplayindex = playindex;
    }
  }
  getClassName() {
    return ['myYtPlayer'].join(" ");
  }
  getOpt() {
    return {
      'playerVars': {
        'autoplay': 1,
        'controls': 1,
        'loop': 1
      }
    }
  }
  onReady(evt) {
    this.curplayindex = 0;
    this._player = evt.target;
    this._player.loadPlaylist({
      'list': _.get(this.props, 'ytplaylist'),
      'listType': 'playlist',
      'index': 0,
      'autoplay': 1,
      'controls': 1,
      'loop': 1
    });
  }
  onStateChange(evt) {
    if(evt.data === YT.PlayerState.PLAYING) 
      this.curplayindex = this._player.getPlaylistIndex();
    else if(evt.data === YT.PlayerState.ENDED) {
      this._player.playVideo();
    }
  }
  render() {  
    return (
      <Youtube className={this.getClassName()} onReady={evt=>{this.onReady(evt)}}
        onStateChange={evt=>{this.onStateChange(evt)}}
      ></Youtube>
  )}
}

export default connect((state) => {
  return state.storyReducer;
},
(dispatch) => ({

}))(MyYouTubePlayer);