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
      {this.props.callName}<br/></span>
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
    return (
      <div className={this.getClassName()} style={this.getStyle()} 
        onAnimationEnd={(evt)=>{this.onAnimationEnd(evt)}}>
        <p style={{'lineHeight': '2rem'}}>Deer<DeerSomeOne callName={this.getCallName()} animaDelay={.5}></DeerSomeOne>不知不覺也跟你/妳認識了這麼久時間。
        關於對那些堪稱回憶的時光，如果回憶的總和像沙灘那樣綿延，那麼還記得的，只是幾片留在岸上的貝殼吧！如果所有的感謝像海那麼深，那麼文字能表達的，僅止於搖曳著粼粼波光的深度而已；
        但我也是很努力地把這些點點滴滴蒐集起來，成一本專屬你/妳的
          <FontAwesomeIcon icon={faBook} onClick={(evt)=>{this.onBtnNextClick(evt)}} style={{
            'cursor': 'pointer', 'color': 'brown'
          }}>            
          </FontAwesomeIcon>
        了呢！但是，我還要厚著臉皮的請你/妳再
        花點時間幫個忙── 一起完成紀念冊的最後一頁吧 ──
        </p>
      </div>
    );
  }
}

export default WelcomePage;
