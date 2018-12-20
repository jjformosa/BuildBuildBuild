import React, { Component } from 'react';
import '../../constants/animate.css'
import _ from 'lodash';
import AnimaFactory, { AnimaElementsClassName} from '../../constants/animate';
import { FontAwesomeIcon } from '@fortawesome/react-fontawesome';
import { faPhone, faTimesCircle,faCheckCircle,faGift } from '@fortawesome/free-solid-svg-icons';
import {faFacebookSquare, faGooglePlus} from '@fortawesome/free-brands-svg-icons';
import AnimaItem from '../share/animaItem';
import { Enum_LoginIdentifyType } from '../../model/account';

class LongInBtn extends Component {
  constructor(props) {
    super(props);
    this.state = {
      'animaDelay': props.animaDelay,
      'classList': [AnimaElementsClassName],
      'animaName': '',
      'onAnimationEnd': props.handleAnimationEnd,
      'identifyType': props.identifyType,
      'onClick': props.handleClickOnLogin,
      'disable': (true === props.isDisable)
    }
  }
  getIcon() {
    if(Enum_LoginIdentifyType.Facebook === this.state.identifyType) {
      return faFacebookSquare;
    } else if(Enum_LoginIdentifyType.Google === this.state.identifyType) {
      return faGooglePlus;
    } else if(Enum_LoginIdentifyType.Phone === this.state.identifyType) {
      return faPhone;
    }
  }
  getClassName() {
    return this.state.classList.join(' ');
  }
  getStyle() {
    return {
      'margin': '.25rem',
      'width': '2rem',
      'height': '2rem',
      'fontSize': '1.5rem',
      'cursor': 'pointer',
      'animationDelay': this.state.animaDelay +'s',
      'color': 'royalblue',
    }
  }
  componentWillMount() {
    let _classList = _.clone(this.state.classList);
    let _animaName = AnimaFactory.randomInAnima();
      _classList.push(_animaName);
      this.setState({
        'classList': _.clone(_classList),
        'animaName': _animaName,
      });
  }
  onAnimationEnd(evt) {
    if(0 < this.state.animaName.length){
      let _classList = _.clone(this.state.classList);
      _.pull(_classList, this.state.animaName);
      this.setState({
        'classList': _.clone(_classList),
        'animaName': ''
      })
    }
    evt.preventDefault();
    evt.stopPropagation();
  }
  onClick(evt) {
    this.state.onClick(evt, this.props);
    evt.preventDefault();
    evt.stopPropagation();
  }
  render() {
    return(<span className={this.getClassName()} style={this.getStyle()}
      onAnimationEnd={(evt)=>this.onAnimationEnd(evt)}
      onClick={(evt)=>this.onClick(evt)}>
      <FontAwesomeIcon icon={this.getIcon()}></FontAwesomeIcon>
    </span>);
  }
}
class LandingHr extends Component {
  constructor(props) {
    super(props);
    this.state ={
      'classList': [AnimaElementsClassName, 'slideInLeft'],
    }
  }
  getClassName() {
    return this.state.classList.join(' ');
  }
  getStyle() {
    return {
      'animationDelay': this.props.animaDelay + 's',
      'width': '100%',
      'marginTop': '1rem',
      'marginBottom': '1rem',
      'border': 0,
      'borderTop': '1px solid darkblue',
    }
  }
  onAnimationEnd(evt) {
    this.setState({
      'classList': [AnimaElementsClassName],
    })
    evt.preventDefault();
    evt.stopPropagation();
  }
  render(){
    return(<hr className={this.getClassName()} style={this.getStyle()} 
      onAnimationEnd={(evt)=>this.onAnimationEnd(evt)}
    />);
  }
}

class BtnAllowWebCam extends Component {
  constructor(props) {
    super(props);
    this.state = {
      'animaDelay': props.animaDelay,
      'classList': [AnimaElementsClassName],
      'animaName': '',
      'onAnimationEnd': props.handleAnimationEnd,
      'onClick': props.handleClickOnLogin,
    }
  }
  getClassName() {
    return this.state.classList.join(' ');
  }
  getStyle() {
      return {
        'margin': '.25rem',
        'width': '2rem',
        'height': '2rem',
        'fontSize': '1.5rem',
        'cursor': 'pointer',
        'animationDelay': this.state.animaDelay +'s',
        'textAlign': 'center',
        'color': 'limegreen',
      }
    }
  componentWillMount() {
    let _classList = _.clone(this.state.classList);
    let _animaName = AnimaFactory.randomInAnima();
      _classList.push(_animaName);
      this.setState({
        'classList': _.clone(_classList),
        'animaName': _animaName,
      });
  }
  onAnimationEnd(evt) {
    if(0 < this.state.animaName.length){
      let _classList = _.clone(this.state.classList);
      _.pull(_classList, this.state.animaName);
      this.setState({
        'classList': _.clone(_classList),
        'animaName': ''
      })
    }
    evt.preventDefault();
    evt.stopPropagation();
  }
  onClick(evt) {
    navigator.mediaDevices.getUserMedia({'video': true}).then((stream)=>{
      if(stream) {
        stream.getVideoTracks().forEach(a_Track=>a_Track.stop());
        this.props.handleBtnWebCamClick(evt, true);
      }
    });
    evt.preventDefault();
    evt.stopPropagation();
  }
  render() {
    return(<span className={this.getClassName()} style={this.getStyle()}
      onAnimationEnd={(evt)=>this.onAnimationEnd(evt)}
      onClick={(evt)=>this.onClick(evt)}>
      <FontAwesomeIcon icon={faCheckCircle}></FontAwesomeIcon>
    </span>);
  }
}

class BtnDenyWebCam extends Component {
  constructor(props) {
    super(props);
    this.state = {
      'animaDelay': props.animaDelay,
      'classList': [AnimaElementsClassName],
      'animaName': '',
      'onAnimationEnd': props.handleAnimationEnd,
      'onClick': props.handleClickOnLogin,
    }
  }
  getClassName() {
    return this.state.classList.join(' ');
  }
  getStyle() {
      return {
        'margin': '.25rem',
        'width': '2rem',
        'height': '2rem',
        'fontSize': '1.5rem',
        'cursor': 'pointer',
        'animationDelay': this.state.animaDelay +'s',
        'textAlign': 'center',
        'color': 'palevioletred'
      }
    }
  componentWillMount() {
    let _classList = _.clone(this.state.classList);
    let _animaName = AnimaFactory.randomInAnima();
      _classList.push(_animaName);
      this.setState({
        'classList': _.clone(_classList),
        'animaName': _animaName,
      });
  }
  onAnimationEnd(evt) {
    if(0 < this.state.animaName.length){
      let _classList = _.clone(this.state.classList);
      _.pull(_classList, this.state.animaName);
      this.setState({
        'classList': _.clone(_classList),
        'animaName': ''
      })
    }
    evt.preventDefault();
    evt.stopPropagation();
  }
  onClick(evt) {
    this.props.handleBtnWebCamClick(evt, false);
    evt.preventDefault();
    evt.stopPropagation();
  }
  render() {
    return(<span className={this.getClassName()} style={this.getStyle()}
      onAnimationEnd={(evt)=>this.onAnimationEnd(evt)}
      onClick={(evt)=>this.onClick(evt)}>
      <FontAwesomeIcon icon={faTimesCircle}></FontAwesomeIcon>
    </span>);
  }
}

class BtnGift extends Component {
  constructor(props) {
    super(props);
    this.state = {
      'animaDelay': props.animaDelay,
      'classList': [AnimaElementsClassName],
      'animaName': '',
      'onAnimationEnd': props.handleAnimationEnd,
    }
  }
  getClassName() {
    return this.state.classList.join(' ');
  }
  getStyle() {
      return {
        'margin': '.25rem',
        'width': '2rem',
        'height': '2rem',
        'fontSize': '1.5rem',
        'cursor': 'pointer',
        'animationDelay': this.state.animaDelay +'s',
        'textAlign': 'center',
        'color': 'limegreen',
        'backgroundColor': 'crimson',
      }
    }
  componentWillMount() {
    let _classList = _.clone(this.state.classList);
    let _animaName = AnimaFactory.randomInAnima();
      _classList.push(_animaName);
      this.setState({
        'classList': _.clone(_classList),
        'animaName': _animaName,
      });
  }
  onAnimationEnd(evt) {
    if(0 < this.state.animaName.length){
      let _classList = _.clone(this.state.classList);
      _.pull(_classList, this.state.animaName);
      this.setState({
        'classList': _.clone(_classList),
        'animaName': ''
      })
    }
    evt.preventDefault();
    evt.stopPropagation();
  }
  onClick(evt) {
    this.props.onBtnGoClick(evt);
    evt.preventDefault();
    evt.stopPropagation();
  }
  render() {
    return(<span className={this.getClassName()} style={this.getStyle()}
      onAnimationEnd={(evt)=>this.onAnimationEnd(evt)}
      onClick={(evt)=>this.onClick(evt)}>
      <FontAwesomeIcon icon={faGift}></FontAwesomeIcon>
    </span>);
  }
}

const Attention = ({children}) => (
  <b className={'attention'}>{children}</b>
);
 
class AttentionLogin extends AnimaItem {
  componentWillReceiveProps(props) {
    if(_.has(props, 'animaName')) {
      this.setState({
        'classList': _.concat(this.state.classList, [props.animaName]),
        'animaName': props.animaName,
      })
    }
  }
  render () {
    return (<div className={this.getClassName()}>
      首先，請您點一下<LongInBtn animaDelay={this.state.animaDelay+1}
          identifyType={Enum_LoginIdentifyType.Facebook}
          handleClickOnLogin={this.props.onBtnLoginClick}>            
          </LongInBtn>，並允許Facebook應用程式告訴我誰來光臨了。請不用擔心授權問題，我只會獲得您的<Attention>id</Attention>製作專屬禮物而已呦！
    </div>);
  }
}

class AttentionWebCam extends AnimaItem {
  componentWillReceiveProps(props) {
    if(_.has(props, 'animaName')) {
      this.setState({
        'classList': _.concat(this.state.classList, [props.animaName]),
        'animaName': props.animaName,
      })
    }
  }
  render () {
    return (<div className={this.getClassName()}>
      接著，希望您使用有相機的裝置，並允許我借用您的鏡頭。請別擔心！
      <Attention>所有會使用相機的功能都會經過您的操作，並且您是唯一決定使用權的角色</Attention>！
      如果同意請您點一下<BtnAllowWebCam animaDelay={this.state.animaDelay+1}
          handleBtnWebCamClick={this.props.onBtnWebCamClick}></BtnAllowWebCam>
      ，不同意也可以繼續喔！<BtnDenyWebCam animaDelay={this.state.animaDelay+1.5}
          handleBtnWebCamClick={this.props.onBtnWebCamClick}></BtnDenyWebCam>
    </div>);
  }
}

class AttentionGo extends AnimaItem {
  componentWillReceiveProps(props) {
    if(_.has(props, 'animaName')) {
      this.setState({
        'classList': _.concat(this.state.classList, [props.animaName]),
        'animaName': props.animaName,
      })
    }
  }
  render () {
    return (<div className={this.getClassName()} style={{'lineHeight': '1.6rem'}}>
    <i style={{'fontStyle':'italic', 'textDecoration': 'underline'}}>
      {this.props.accountData.name}
    </i>,這是您的Facebook身分嗎？提醒您，最佳瀏覽裝置是
    <Attention>解析度1024*768，具備照相功能的螢幕</Attention>喔！都準備好了就打開
    <BtnGift onBtnGoClick={evt=>this.props.onBtnGoClick(evt)}></BtnGift>
    </div>);
  }
}

const Jumbotron = (props) => (
  <div className={'jumbotron'}>
    這裡有個小小的交換禮物活動，請您詳閱<Attention>注意內容</Attention>再決定是否繼續喔！
    <LandingHr></LandingHr>
    {props.children}
  </div>
);

class LandingPage extends Component {
  constructor(props) {
    super(props);
    this.state = {
      'animaDelay': 0,
      'animaName': '',
      'classList': [AnimaElementsClassName],
      'err': props.err,
      'step': props.step,
      'jumbotronContentTransition': false,
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
    } else if(nextProps.step !== this.state.step) {
      this.setState({
        'jumbotronContentTransition': true,
      });
      let timer = setTimeout(() => {
        this.setState({
          'step': nextProps.step,
          'jumbotronContentTransition': false,
        });
        clearTimeout(timer);
      }, 750);      
    }
  }
  getAttentionLoginParam() {
    return {
      'onBtnLoginClick': evt => this.props.onBtnLoginClick(evt),
      'animaDelay': 0,
      'animaName': (this.state.jumbotronContentTransition)? 'fadeOut' : '',
    }
  }
  getAttentionWebCamParam() {
    return {
      'onBtnWebCamClick': (evt, isAllow) => {
        if(isAllow) this.props.onBtnAllowWebCamClick(evt);
        else this.props.onBtnDenyWebCamClick(evt);
      },
      'animaDelay': 0,
      'animaName': (this.state.jumbotronContentTransition)? 'fadeOut' : '',
    }
  }
  getAttentionGoParam() {
    return {
      'onBtnGoClick': evt => this.props.onBtnGoClick(evt, _.get(this.props, 'accountData')),
      'animaDelay': 0,
      'animaName': (this.state.jumbotronContentTransition)? 'fadeOut' : '',
      'accountData': _.get(this.props, 'accountData'),
    }
  }
  getClassName() {
    return this.state.classList.join(' ');
  }
  getStyle() {
    return {
      'padding': '.5rem',
      'maxWidth': '50vmax',
      'width': 'auto',
      'overflow': 'hidden',
      'animationDelay': this.state.animaDelay + 's',
    }
  }
  onAnimationEnd(evt) {
    if(!this){
      return;
    }
    if(0 < this.state.animaName.length){
      let _classList = _.clone(this.state.classList);
      _.pull(_classList, this.state.animaName);
      this.setState({
        'classList': _.clone(_classList),
        'animaName': ''
      })
    }
    evt.preventDefault();
    evt.stopPropagation();
  }
  
  render() {
    let jumbotronContent = ('webcam' === this.state.step) ? <AttentionWebCam {...this.getAttentionWebCamParam()}></AttentionWebCam> : 
    ('go' === this.state.step) ? <AttentionGo {...this.getAttentionGoParam()}></AttentionGo> : 
    <AttentionLogin {...this.getAttentionLoginParam()}></AttentionLogin>;
    return (
      <div style={this.getStyle()} className={this.getClassName()}
        onAnimationEnd={(evt)=>{this.onAnimationEnd(evt)}}>
      <Jumbotron>
        {jumbotronContent}
      </Jumbotron>
      </div>
    );
  }
}

export default LandingPage;
