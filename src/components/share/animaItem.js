import React, { Component } from 'react';
import '../../constants/animate.css';
import _ from 'lodash';
import AnimaFactory, { AnimaElementsClassName} from '../../constants/animate';

export default class AnimaItem extends Component {
  constructor(props){
    super(props);    
    this.state = {
      'animaDelay': props.animaDelay,
      'classList': [AnimaElementsClassName],
      'animaName': '',
    }
  }
  getStyle() {
    return {
      'animationDelay': this.state.animaDelay + 's',
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
      <div className={this.getClassName()} style={this.getStyle()} 
      onAnimationEnd={this.onAnimationEnd}>測試動畫父類別
      </div>
    );
  }
}