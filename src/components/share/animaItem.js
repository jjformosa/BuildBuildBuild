import React, { Component } from 'react';
import '../../constants/animate.css';
import _ from 'lodash';
import AnimaFactory, { AnimaElementsClassName} from '../../constants/animate';

export default class AnimaItem extends Component {
  constructor(props){
    super(props);    
    this.state = {
      'classList': [AnimaElementsClassName],
      'animaName': '',
    }
  }
  getStyle() {
    return {
      'animationDelay': this.props.animaDelay + 's',
    }
  }
  getClassName() {
    return this.state.classList.join(' ');
  }
  componentWillMount() {
    let _classList = _.clone(this.state.classList);
    let _animaName = this.props.animaName ? this.props.animaName : AnimaFactory.randomInAnima();
      _classList.push(_animaName);
      this.setState({
        'classList': _.clone(_classList),
        'animaName': _animaName,
      });
  }
  onAnimationEnd(evt) {
    if(!this){
      return;
    }
    // if(0 < this.state.animaName.length){
    //   let _classList = _.clone(this.state.classList);
    //   _.pull(_classList, this.state.animaName);
    //   this.setState({
    //     'classList': _.clone(_classList),
    //     'animaName': ''
    //   })
    // }
    evt.preventDefault();
    evt.stopPropagation();
  }
  render() {
    return (
      <div className={this.getClassName()} style={this.getStyle()} 
      onAnimationEnd={this.onAnimationEnd}>
      </div>
    );
  }
}

export class MyPulseItem extends Component {
  getClassName() {
    return 'myPulse';
  }
  getContentClassName() {
    return 'myPulseContent';
  }
  getAnimaClassName() {
    return 'myPulseAnima';
  }
  getStyle() {
    return {
      'animationDelay': this.props.animaDelay + 's',
    };
  }
  getFontStyle() {
    return this.props.fontStyleSetting;
  }
  getBackgroundStyle() {
    return this.props.backgroundStyleSetting;
  }
  render() {
    return <div className={this.getClassName()} style={this.getStyle()}>
      <div className={this.getAnimaClassName()} style={this.getBackgroundStyle()}></div>
      <div className={this.getContentClassName()} style={this.getFontStyle()}>{this.props.children}</div>
    </div>
  }
}