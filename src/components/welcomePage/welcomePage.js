import React, { Component } from 'react';
import _ from 'lodash';
import { FontAwesomeIcon } from '@fortawesome/react-fontawesome';
import { faBook } from '@fortawesome/free-solid-svg-icons';
import { AnimaElementsClassName} from '../../constants/animate';
import AnimaItem from '../share/animaItem';
import '../../constants/animate.css';

class DeerSomeOne extends AnimaItem {
  constructor(props){
    super(props);  
    this.state = {
      'onBtnNextClick': props.startMemo,
      'classList': [AnimaElementsClassName],
      'animaName': '',
      'animaDelay': props.animaDelay,
    }  
  }
  getStyle() {
    return {
      'animationDelay': this.state.animaDelay + 's',
      'fontWeight': 'bold',
      'textDecoration': 'underline',
      'color': '#FF44AA',
      'margin': '0 .3rem',
    }
  }
  render() {
    return <span style={this.getStyle()} className={this.getClassName()}>
      {this.props.callName}</span>
  }
}

class BtnBook extends Component {
  constructor(props) {
    super(props);
    this.state = {
      'classList': [AnimaElementsClassName, 'heartBeat'],
      'animaName': '',
    }
  }
  getClassName() {
    return this.state.classList.join(' ');
  }
  getStyle() {
      return {
        'position': 'relative',
        'display': 'inline-block',
        'fontSize': '1.2rem',
        'cursor': 'pointer',
        'textAlign': 'center',
        'width': '1.5rem',
        'height': '1.5rem',
        'lineHeight': '1.5rem',
        'color': 'brown',
        'backgroundColor': 'transparent',
      }
    }
    componentDidMount() {
      let tmpTimer = setTimeout(() => {
        this.animatIt();
        clearTimeout(tmpTimer);
      }, 500);
    }
    componentWillUnmount() {
      clearInterval(this.animaTimer);
    }
    animatIt() {
      this.animaTimer = setInterval(()=>{
        this.setState({
          'classList': ['animated', 'heartBeat'],
        });
      }, 3000);
    }
    onAnimationEnd(evt) {
      this.setState({
        'classList': ['animated'],
      });
      evt.preventDefault();
      evt.stopPropagation();
    }
  onClick(evt) {
    this.props.onBtnBookClick(evt);
    evt.preventDefault();
    evt.stopPropagation();
  }
  render() {
    return(<span className={this.getClassName()} style={this.getStyle()}
      onAnimationEnd={(evt)=>this.onAnimationEnd(evt)}
      onClick={(evt)=>this.onClick(evt)}>
      <FontAwesomeIcon icon={faBook}></FontAwesomeIcon>
    </span>);
  }
}

class WelcomePage extends Component {
  constructor(props){
    super(props);  
    this.state = {
      'animaDelay': 0,
      'animaName': '',
      'classList': [AnimaElementsClassName],
      'visibility': true
    }  
  }
  componentWillReceiveProps(nextProps) {
    if(nextProps.nextpathname !== this.props.nextpathname){
      let _classList = _.clone(this.state.classList);
      _classList.push("fadeOutUp");
      this.setState({
        'classList': _.clone(_classList),
        'animaName': 'fadeOutUp'
      });
    }
  }
  onBtnNextClick (evt) { 
    this.props.startMemo(evt, this.props.accountData)
  }
  getClassName() {
    return this.state.classList.join(' ');
  }
  getStyle(){
    return {
      'maxWidth': '50vmax',
      'maxHeight': '50%',
      'fontSize': '1.4rem',
      'animationDelay': this.state.animaDelay + 's',
      'visibility': this.state.visibility ? 'visible' : 'hidden',
    };
  }
  getCallName() {
    return (this.props.accountData.nick) ? this.props.accountData.nick :
      (this.props.accountData.mynick) ? this.props.accountData.mynick : 
      this.props.accountData.name;
  }
  onAnimationEnd(evt) {
    if(!this){
      return;
    }
    if(0 < this.state.animaName.length){
      // let _classList = _.clone(this.state.classList);
      // _.pull(_classList, this.state.animaName);
      // this.setState({
      //   'classList': _.clone(_classList),
      //   'animaName': ''
      // })
      this.setState({
        'visibility': false,
      })
    }
    evt.preventDefault();
    evt.stopPropagation();
  }
  render() {
    if(true === this.props.accountData.storyReady) {
      return (
        <div className={this.getClassName()} style={this.getStyle()} 
          onAnimationEnd={(evt)=>{this.onAnimationEnd(evt)}}>
          <p style={{'lineHeight': '2rem'}}>Deer<DeerSomeOne callName={this.getCallName()} animaDelay={.5}></DeerSomeOne>
          <br/>不知不覺也浪費了你/妳這麼多時間跟我一起做這個做那個，
          關於那些堪稱回憶的點點滴滴，還有說不完的謝謝，
          我只能號稱努力地把這些都蒐集起來，用拙劣的文字和程式碼編成一本專屬你/妳的
            <BtnBook icon={faBook} onBtnBookClick={(evt)=>{this.onBtnNextClick(evt)}} >            
            </BtnBook>
          了！但是，到了這一步還要厚著臉皮的請你/妳再
          花點時間幫個忙── 就一路翻到最後一頁吧 ──
          </p>
        </div>
      );
    } else {
      return (
        <div className={this.getClassName()} style={this.getStyle()} 
          onAnimationEnd={(evt)=>{this.onAnimationEnd(evt)}}>
          <p style={{'lineHeight': '2rem'}}>
            謝謝你/妳在這裡暫停了腳步，<DeerSomeOne callName={this.getCallName()} animaDelay={.5}></DeerSomeOne>是第一次光臨吧！但是跟你/妳的回憶有好多，請再給我一點點時間整理一下你/妳的專屬紀念喔!!
          </p>
        </div>
      );
    }
  }
}

export default WelcomePage;
