import React, { Component } from 'react';
import _ from 'lodash';
import MemoryBookPage from './memoryBook_page';
import MemoryBookCover from './memoryBook_cover';
import './memoryBook.css';
import { isNullOrUndefined } from 'util';

const BtnStep = ({handleBtnStepClick, className, direction}) => (
  <div className={['btn-step', ...className].join(' ')} onClick={(evt)=>{handleBtnStepClick(evt, direction)}}>
    <div className={'arrow'}></div>
  </div>
);

let curIllustrationIndex = null;

class MemoryBook extends Component {
  constructor(props){
    super(props);    
    this.state = {
      'accountData': props.accountData,
      'chps': props.chps,
      'illustrations': props.illustrations,
      'curPage': 0,
      'nextPage': -1,
      'classList': ['memoryBook', 'fadeInUp', 'animated'],
      'animaName': '',
    }
  }
  componentWillMount() {
    if(!this.state.chps || 0 === this.state.chps.length) {
      this.props.fetchStory(this.state.accountData);
    } 
  }
  componentDidMount() {
    this.props.fetchIllustration(this.props.accountData, 0);
  }
  componentWillReceiveProps(nextProps) {
    let nextState = {};
    _.forEach(nextProps, (value, key)=>{
      if('chps' === key) {
        _.set(nextState, key, _.cloneDeep(value));
      } else if('illustrations' === key) {
        _.set(nextState, key, _.cloneDeep(value));
      }
    });
    this.setState({...nextState});
  }
  onBtnStepClick(evt, direction) {
    let target = evt.target;
    let toNum =  'next' === direction ? this.state.curPage + 1:
    'prev' === direction ? this.state.curPage -1 :
      Number.parseInt(target.innerText);
    this.flipIt(toNum);
    evt.preventDefault();
    evt.stopPropagation();
  }
  onImageChanged(playIndex) {
    // if( 0 <= playIndex && this.state.illustrations.length > 0
    //   && this.state.curIllustrationIndex !== playIndex) {
    //     this.setState({
    //       'curIllustrationIndex': playIndex
    //     });
    // }
    if( 0 <= playIndex && this.state.illustrations.length > 0
      && curIllustrationIndex !== playIndex) {
        curIllustrationIndex = playIndex;
    }
  }
  flipIt(toNum) {
    //先Show Cover
    this.setState({
      'curPage': toNum,
      'nextPage': this.state.curPage,
    });    
    //再更新Page
    let timer = setTimeout(() => {      
      this.setState({
        'curPage': toNum,
        'illustrations': [],
        'nextPage': -1,
      });
      this.props.fetchIllustration(this.state.accountData, toNum);
      clearTimeout(timer);
    }, 1800);
  }
  getClassName() {
    return this.state.classList.join(' ');
  }
  getCurPageContent() {
    let _index = this.state.curPage,
    _content = _.cloneDeep(this.state.chps[_index]);
    if(isNullOrUndefined(_content)) {
      _content = '';
    }
    let _illustrations = (-1 < this.state.nextPage) ? [] : _.cloneDeep(this.state.illustrations);
    return {
      'content': _content,
      'illustrations': _illustrations,
      'handleImgChanged': (playIndex) => {this.onImageChanged(playIndex);}
    }
  }
  getCoverPageContent() {
    let _index = this.state.nextPage,
    _content = _.cloneDeep(this.state.chps[_index]);
    if(isNullOrUndefined(_content)) {
      _content = '';
    }
    let illustration = isNullOrUndefined(this.state.illustrations) ? '' :
      isNullOrUndefined(curIllustrationIndex) ? '' : 
      this.state.illustrations[curIllustrationIndex];
    return {
      'content': _content,
      'illustrations': illustration,
    }
  }
  getNextPageContent() {
    let _index = this.state.curPage,
    _content = _.cloneDeep(this.state.chps[_index]);
    if(isNullOrUndefined(_content)) {
      _content = '';
    }
    if(-1 < this.state.nextPage) {
      return {
        'content': _content,
        'illustrations': [],
      }
    } else {
      return null;
    }
  }
  getFlipCoverParam() {
    let curcontent = this.getCoverPageContent(),
    nextcontent = this.getNextPageContent();
    let rtn = {
      'curContent': curcontent
    }
    if(!isNullOrUndefined(nextcontent)){
      _.set(rtn, 'nextContent', nextcontent);
    }
    if(-1 !== this.state.nextPage) {
      let _direction = (this.state.curPage > this.state.nextPage) ? 'right2left' : 
      (this.state.curPage < this.state.nextPage) ? 'left2right' : null;
      if(!isNullOrUndefined(_direction)) {
        _.set(rtn, 'direction', _direction);
      }
    }
    return rtn;
  }
  getBtnPrevClassName() {
    let rtn = ['prev'];
    if(0 >= this.state.curPage) {
      rtn.push('disable');
    }
    return rtn;
  }
  getBtnNextClassName() {
    let rtn = ['next'];
    if(this.state.chps.length -1 <= this.state.curPage) {
      rtn.push('disable');
    }
    return rtn;
  }
  render() {
    return (
      <div className={this.getClassName()}>
        <MemoryBookPage {...this.getCurPageContent()}></MemoryBookPage>
        <BtnStep handleBtnStepClick={(evt, toNum) => this.onBtnStepClick(evt, toNum)}
          direction={'prev'} className={this.getBtnPrevClassName()}>            
        </BtnStep>
        <BtnStep handleBtnStepClick={(evt, toNum) => this.onBtnStepClick(evt, toNum)}
          direction={'next'} className={this.getBtnNextClassName()}>          
        </BtnStep>
        <MemoryBookCover {...this.getFlipCoverParam()}></MemoryBookCover>
      </div>
    );
  }
};

export default MemoryBook;
