import React, { Component } from 'react';
import _ from 'lodash';
import MemoryBookPage from './memoryBook_page';
import './memoryBook.css';

const MemoryBookPageInner = ({content, illustrations, innerClassName}) => (
  <div className={['myContent-inner', ...innerClassName].join(' ')}>
    <div className={'container'}>
      <MemoryBookPage {...{content, illustrations, 'iscover': true}}></MemoryBookPage>
    </div>
  </div>
);

const MemoryBookCoverPage = ({pageClassName, curContent, nextContent }) => {
    return <div className={['memoryBookCoverPage', pageClassName].join(' ')}>
      <MemoryBookPageInner innerClassName={['front']} {...curContent}></MemoryBookPageInner>
      <MemoryBookPageInner innerClassName={['back']} {...nextContent}></MemoryBookPageInner>
    </div>;
};

class MemoryBookCover extends Component {
  constructor(props) {
    super(props);
    this.state = {
      'curContent': props.curContent,
      'nextContent': props.nextContent,
      'direction': props.direction,
      'classList': ['memoryBookCover'],
    }
  }
  componentWillReceiveProps(nextProps) {
    //有內容才更新，不然就讓Corver自己消失
    if(_.has(nextProps, 'nextContent') && _.has(nextProps, 'direction')) {
      this.setState({
        'curContent': _.cloneDeep(nextProps.curContent),
        'nextContent': _.cloneDeep(nextProps.nextContent),
        'direction': nextProps.direction,
        'classList': ['memoryBookCover', 'flip', nextProps.direction],
      })
    }
  }
  onAnimationEnd(evt) {
    if(this.state.direction) {
      this.clearIt();
    }
    evt.preventDefault();
    evt.stopPropagation();
  }
  getClassName() {
    return this.state.classList.join(' ');
  }
  getflipName() {
    return this.state.direction;
  }
  getPageParams() {
      return {
        'curContent': _.cloneDeep(this.state.curContent),
        'nextContent': _.cloneDeep(this.state.nextContent),
      }
  }
  clearIt() {
    //少了flip會讓display變none
    this.setState({
      'classList': ['memoryBookCover']
    });
    let timer = setTimeout(()=>{
      this.setState({
        'curContent': null,
        'nextContent': null,
        'direction': null
      });
      clearTimeout(timer);
    }, 200);
  }
  render() {
    return (
    <div className={this.getClassName()} onAnimationEnd={(evt)=>{this.onAnimationEnd(evt)}}>
      <MemoryBookCoverPage pageClassName= {'left'}  {...this.getPageParams()}></MemoryBookCoverPage>
      <MemoryBookCoverPage pageClassName= {'right'} {...this.getPageParams()}></MemoryBookCoverPage>
    </div>);
  }
}

export default MemoryBookCover;