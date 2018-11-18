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
      'accountData': props.accountData,
      'onBtnNextClick': props.startMemo,
      'classList': [AnimaElementsClassName],
      'animaName': '',
      'animaDelay': props.animaDelay,
      'callName': props.callName,
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
      {this.state.callName}<br/></span>
  }
}

class WelcomePage extends Component {
  constructor(props){
    super(props);  
    this.state = {
      'animaDelay': 0,
      'animaName': '',
      'classList': [AnimaElementsClassName],
      'accountData': props.accountData,
      'onBtnNextClick': props.startMemo,
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
  getClassName() {
    return this.state.classList.join(' ');
  }
  getStyle(){
    return {
      'maxWidth': '75%',
      'maxHeight': '50%',
      'fontSize': '1.4rem',
      'animationDelay': this.state.animaDelay + 's',
      'visibility': this.state.visibility ? 'visible' : 'hidden',
    };
  }
  getCallName() {
    return (this.state.accountData.nick) ? this.state.accountData.nick :
      (this.state.accountData.mynick) ? this.state.accountData.mynick : 
      this.state.accountData.name;
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
        <p style={{'lineHeight': '2rem'}}>Deer<DeerSomeOne callName={this.getCallName()} animaDelay={.5}></DeerSomeOne>不知不覺也跟你/妳認識了這麼久時間，去過這麼多地方，為了對那些足以
        稱為紀念的珍貴光陰表達敬意，雖然接下來的遣詞僅有膚淺，留下的照片相較於回憶也僅是海灘上的幾片貝殼，
        我也是很努力地把這一切集結成
          <FontAwesomeIcon icon={faBook} onClick={(evt)=>{this.state.onBtnNextClick(evt)}} style={{
            'cursor': 'pointer'
          }}>            
          </FontAwesomeIcon>
        了呢！但是，我還要厚著臉皮的請你/妳再
        花點時間幫個忙── 一起完成紀念冊的最後一頁吧 ──，如果你/妳願意的話，請先翻下去吧！
        </p>
      </div>
    );
  }
}

export default WelcomePage;
