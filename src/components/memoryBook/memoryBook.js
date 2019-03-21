import React, { Component } from 'react';
import _ from 'lodash';
import MemoryBookPage from './memoryBook_page';
import MemoryBookCover from './memoryBook_cover';
import './memoryBook.css';
import { isNullOrUndefined } from 'util';
import MyYouTubePlayer from '../ytPlayer/ytPlayer';

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
      'illustrations': props.illustrations,
      'nextPage': -1,
      'classList': ['memoryBook', 'fadeInUp', 'animated'],
      'animaName': '',
    }
    this.isFlip = false;
  }
  componentWillMount() {
    if(!this.props.chps || 0 === this.props.chps.length) {
      this.props.fetchStory(this.getStoryId(), this.props.accountData);
    } 
  }
  componentDidMount() {
    this.props.fetchIllustration(this.getStoryId(), this.props.accountData, this.getPageNum());
  }
  componentWillReceiveProps(nextProps) {
    let toNum = this.getPageNum(this.props.history.location.pathname);
    if(!this.isFlip) {
        let nextState = {};
        _.forEach(nextProps, (value, key)=>{
          if('chps' === key) {
            _.set(nextState, key, _.cloneDeep(value));
          } else if('illustrations' === key) {
            if(_.has(nextProps, 'thisIllustrationId') && toNum === _.get(nextProps, 'thisIllustrationId')) {
              _.set(nextState, key, _.cloneDeep(value));
            }
          }
        });
        this.setState({...nextState});
      } else {      
        this.isFlip = false;
        //翻頁了
        this.props.fetchIllustration(this.getStoryId(), this.props.accountData, toNum);
      }
    } 
  getStoryId(path) {
    // let pathname = isNullOrUndefined(path) ? this.props.location.pathname : path;
    // let nodes = pathname.split('/');
    // return nodes.length >= 3 ? nodes[2] : this.props.accountData.id;
    return this.props.match.params.uid ? this.props.match.params.uid : this.props.accountData.id;
  }
  getPageNum(path) {
    let pathname = isNullOrUndefined(path) ? this.props.location.pathname : path;
    let nodes = pathname.split('/');
    let curPage = Number.parseInt(nodes[3]);
    return Number.isNaN(curPage) ? 0 : curPage;
    //return this.state.curPage;
  }
  onBtnStepClick(evt, direction) {
    let target = evt.target;
    let toNum =  'next' === direction ? this.getPageNum() + 1:
    'prev' === direction ? this.getPageNum() -1 :
      Number.parseInt(target.innerText);
    let nextContent = this.props.chps[toNum];
    if('/WebCamPage' === nextContent) {
      this.props.jumpToPage({
        'pathname': '/WebCamPage/' + _.get(this.props, 'accountData.id'), 
        'contentId': toNum,
        'chps': _.cloneDeep(this.props.chps),
        'photos': _.cloneDeep(this.state.illustrations),
      });
    } else {
      this.flipIt(toNum);
    }
    evt.preventDefault();
    evt.stopPropagation();
  }
  onImageChanged(playIndex) {
    if( 0 <= playIndex && this.state.illustrations.length > 0
      && curIllustrationIndex !== playIndex) {
        curIllustrationIndex = playIndex;
    }
  }
  flipIt(toNum) {
    this.isFlip = true;
    //先Show Cover
    this.setState({
      'nextPage': toNum,
    });    
    //再更新Page
    let timer = setTimeout(() => {   
      clearTimeout(timer);
      this.setState({
        'illustrations': [],
        'nextPage': -1,
      }); 
      this.props.history.push('/MemoryBook/'+ _.get(this.props, 'accountData.id') +'/' + toNum);
    }, 1600);
  }
  getClassName() {
    return this.state.classList.join(' ');
  }
  getNick() {
    let nick = _.get(this.props.accountData, 'nick');
    return isNullOrUndefined(nick) ? this.props.accountData.name : nick;
  }
  getMyNick() {
    let myNick = _.get(this.props.accountData, 'myNick');
    return isNullOrUndefined(myNick) ? this.getNick() : myNick;
  }
  getContent(a_index) {
    let chps = this.props.chps;
    if(isNullOrUndefined(chps) || 0 === chps.length) return '';
    let _index = (Number.isInteger(a_index) && a_index >= 0 && a_index < chps.length) ? 
      a_index : this.getPageNum();
    let rtn = _.clone(chps[_index]).replace(/{:nick}/g, this.getNick()).replace(/{:mynick}/g, this.getMyNick());
    return rtn;
  }
  getCurPageContent() {
    let _content = (-1 < this.state.nextPage) ? this.getContent(this.state.nextPage) : this.getContent();
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
    let _content = this.getContent();
    if(isNullOrUndefined(_content)) {
      _content = '';
    }
    let _illustrations = _.cloneDeep(this.state.illustrations);
    if(!isNullOrUndefined(_illustrations) && _illustrations.length > 1) {
      _illustrations = _illustrations[curIllustrationIndex];
    }
    return {
      'content': _content,
      'illustrations': _illustrations,
      'handleImgChanged': (playIndex) => {this.onImageChanged(playIndex);}
    }
  }
  getNextPageContent() {
    let _content = this.getContent(this.state.nextPage);
    if(isNullOrUndefined(_content)) {
      _content = '';
    }
    return {
      'content': _content,
      'illustrations': [],
    }
  }
  getFlipCoverParam() {
    let curcontent = this.getCoverPageContent(),
    nextcontent = this.getNextPageContent();
    let rtn = {
      'curContent': curcontent,
    }
    if(!isNullOrUndefined(nextcontent)){
      _.set(rtn, 'nextContent', nextcontent);
    }
    let curPage = this.getPageNum();
    if(-1 !== this.state.nextPage) {
      let _direction = (curPage < this.state.nextPage) ? 'right2left' : 
      (curPage > this.state.nextPage) ? 'left2right' : null;
      if(!isNullOrUndefined(_direction)) {
        _.set(rtn, 'direction', _direction);
      }
    }
    return rtn;
  }
  getBtnPrevClassName() {
    let rtn = ['prev'];
    if(0 >= this.getPageNum()) {
      rtn.push('disable');
    }
    return rtn;
  }
  getBtnNextClassName() {
    let rtn = ['next'];
    if(this.props.chps.length -1 <= this.getPageNum()) {
      rtn.push('disable');
    }
    return rtn;
  }
  render() {
    return (
      <div className={this.getClassName()}>       
      <MyYouTubePlayer playindex={this.getPageNum()}></MyYouTubePlayer>
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
