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
      'illustrations': props.illustrations,
      'curPage': (!isNullOrUndefined(props.page)) ? props.page : 0,
      'nextPage': -1,
      'classList': ['memoryBook', 'fadeInUp', 'animated'],
      'animaName': '',
    }
  }
  componentWillMount() {
    if(!this.props.chps || 0 === this.props.chps.length) {
      this.props.fetchStory(this.getStoryId(), this.props.accountData);
    } 
  }
  componentDidMount() {
    this.props.fetchIllustration(this.getStoryId(), this.props.accountData, 0);
  }
  componentWillReceiveProps(nextProps) {
    let nextPageNum = this.getPageNum(nextProps.location.pathname),
      curPageNum = this.getPageNum();
    if(curPageNum === nextPageNum) {
        let nextState = {};
        _.forEach(nextProps, (value, key)=>{
          if('chps' === key) {
            _.set(nextState, key, _.cloneDeep(value));
          } else if('illustrations' === key) {
            _.set(nextState, key, _.cloneDeep(value));
          }
        });
        this.setState({...nextState});
    } else {
      //翻頁了
      debugger;
      this.props.fetchIllustration(this.props.accountData, nextPageNum);
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
    //先Show Cover
    this.setState({
      'curPage': toNum,
      'nextPage': this.state.curPage,
    });    
    //再更新Page
    let timer = setTimeout(() => {   
      clearTimeout(timer);
      this.setState({
        'curPage': toNum,
        'illustrations': [],
        'nextPage': -1,
      });  
      this.props.history.push('/MemoryBook/'+ _.get(this.props, 'accountData.id') +'/' + toNum);
    }, 1800);
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
    return _.clone(chps[_index]).replace("{:nick}", this.getNick()).replace("{:mynick}", this.getMyNick());
  }
  getCurPageContent() {
    let _content = this.getContent();
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
    _content = this.getContent(_index);
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
    let _content = this.getContent();
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
    let curPage = this.getPageNum();
    if(-1 !== this.state.nextPage) {
      let _direction = (curPage > this.state.nextPage) ? 'right2left' : 
      (curPage < this.state.nextPage) ? 'left2right' : null;
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
