import React, { Component } from 'react';
import '../../constants/animate.css'
import _ from 'lodash';
import AnimaFactory, { AnimaElementsClassName} from '../../constants/animate';
import { Enum_LoginIdentifyType } from '../../model/account';
import { FontAwesomeIcon } from '@fortawesome/react-fontawesome';
import { faPhone } from '@fortawesome/free-solid-svg-icons';
import {faFacebookSquare, faGooglePlus} from '@fortawesome/free-brands-svg-icons';

class AtFirst extends Component {
  constructor(props) {
    super(props);
    this.state = {
      'animaDelay': props.animaDelay,
      'classList': [AnimaElementsClassName],
      'animaName': '',
      'onAnimationEnd': props.handleAnimationEnd,
    }
  }
  getStyle() {
    return {
      'animationDelay': this.state.animaDelay + 's',
      'fontSize': '2.5rem',
      'marginBottom': '.5rem',
    }
  }
  getClassName() {
    return this.state.classList.join(' ');
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
  render() {
    return(
      <h1 className={this.getClassName()} style={this.getStyle()}
      onAnimationEnd={(evt)=>this.onAnimationEnd(evt)}>@First</h1>
    );
  }
}
class WhoRU extends Component {
  constructor(props) {
    super(props);
    this.state = {
      'animaDelay': props.animaDelay,
      'classList': [AnimaElementsClassName],
      'animaName': '',
      'onAnimationEnd': props.handleAnimationEnd,
    }
  }
  getStyle() {
    return {
      'animationDelay': this.state.animaDelay + 's',
      'fontSize': '1.2rem',
    }
  }
  getClassName() {
    return this.state.classList.join(' ');
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
  render() {
    return(
      <strong className={this.getClassName()} style={this.getStyle()}
      onAnimationEnd={(evt)=>this.onAnimationEnd(evt)}>Plz let me know who r u</strong>
    );
  }
}
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
    if(false === this.state.disable) {
      return {
        'float': 'left',
        'margin': '.25rem',
        'width': '2rem',
        'height': '2rem',
        'fontSize': '1.5rem',
        'cursor': 'pointer',
        'animationDelay': this.state.animaDelay +'s',
      }
    } else {
      return {
        'float': 'left',
        'margin': '.25rem',
        'width': '2rem',
        'height': '2rem',
        'fontSize': '1.5rem',
        'backgroundColor': '#808080',
        'color': '#FFFFFF',
        'animationDelay': this.state.animaDelay +'s',
      }
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

class LandingPage extends Component {
  constructor(props) {
    super(props);
    this.state = {
      'animaDelay': 0,
      'animaName': '',
      'classList': [AnimaElementsClassName],
      'err': props.err,
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
    return (
      <div style={this.getStyle()} className={this.getClassName()}
        onAnimationEnd={(evt)=>{this.onAnimationEnd(evt)}}>
      <AtFirst animaDelay={this.state.animaDelay} >        
      </AtFirst>
      <WhoRU animaDelay={this.state.animaDelay}>        
      </WhoRU>
        <LandingHr animaDelay={this.state.animaDelay+1} />            
        <LongInBtn animaDelay={this.state.animaDelay+2}
          identifyType={Enum_LoginIdentifyType.Facebook}
          handleClickOnLogin={this.props.onBtnLoginClick}>            
        </LongInBtn>
        <LongInBtn animaDelay={this.state.animaDelay+2.5}
          identifyType={Enum_LoginIdentifyType.Google} isDisable={true}>            
        </LongInBtn>
        <LongInBtn animaDelay={this.state.animaDelay+3}
          identifyType={Enum_LoginIdentifyType.Phone} isDisable={true}>            
        </LongInBtn>
      </div>
    );
  }
}

export default LandingPage;
