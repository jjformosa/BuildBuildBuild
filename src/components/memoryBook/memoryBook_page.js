import React, { Component } from 'react';
import _ from 'lodash';
import MyIllustration, { MyCoverIllustration } from './memoryBook_illustration';
import './memoryBook.css';

const MemoryBookPageContentBlur = ({className}) => (
  <span className={['myContent-blur', ...className].join(' ')}></span>
);

class MemoryBookPageContent extends Component{
  constructor(props) {
    super(props);
    this.state = {
      'topBlurClassList': ['top', 'hide'],
      'bottomBlurClassList': ['bottom'],
    }
  }
  onscroll(evt) {
    let target = evt.target,
    topblur = ['top'], bottomblur = ['bottom'];
    if(target.offsetHeight + target.scrollTop >= target.scrollHeight - 6) {
      bottomblur.push('hide');
    } else if(0 === target.scrollTop) {
      topblur.push('hide');
    } 
    this.setState({
      'topBlurClassList': topblur,
      'bottomBlurClassList': bottomblur,
    });
  }
  render() {
  return (
  <div className={'myContent'}>
    <p className={'myContent-inner'} onScroll={(evt)=>{this.onscroll(evt)}}
      dangerouslySetInnerHTML={{ __html: this.props.content }}>
    </p>
    <MemoryBookPageContentBlur className={this.state.topBlurClassList}></MemoryBookPageContentBlur>
    <MemoryBookPageContentBlur className={this.state.bottomBlurClassList}></MemoryBookPageContentBlur>
  </div>
  )}
};

class MemoryBookPage extends Component {
  constructor(props){
    super(props);   
    this.state = {
      'classList': ['memoryBookPage'],
    }
  }
  getContent() {
    return this.props.content;
  }
  getIllustrations() {
      return  _.cloneDeep(this.props.illustrations);
  }
  getIllustrationsParams() {
    let rtn = {
      'illustrations': this.getIllustrations(),
      'handleImgChanged': this.props.handleImgChanged
    }
    return rtn;
  }
  getStyle() {
    return {
    }
  }
  getClassName() {
    return this.state.classList.join(' ');
  }
  render() {
    if(true === this.props.iscover) {
      return (
        <div className={this.getClassName()} >
          <MyCoverIllustration {...this.getIllustrationsParams()}></MyCoverIllustration>
          <MemoryBookPageContent content={this.getContent()}></MemoryBookPageContent>
        </div>
      )
    } else {
      return (
        <div className={this.getClassName()} >
          <MyIllustration {...this.getIllustrationsParams()}></MyIllustration>
          <MemoryBookPageContent content={this.getContent()}></MemoryBookPageContent>
        </div>
      )
    }
  }
}

export default MemoryBookPage;