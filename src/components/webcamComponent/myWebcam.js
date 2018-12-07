import React, {Component} from 'react';
import _ from 'lodash';
import './myWebCam.css';
import '../../constants/animate.css';
import MyWebCamComponent from './myWebCamera';
import MyWebCamAlbum from './myWebCamAlbum';
import {FontAwesomeIcon} from '@fortawesome/react-fontawesome';
import {faCloudUploadAlt} from '@fortawesome/free-solid-svg-icons';
import '../../constants/animate.css';
import {DataURItoBlob, GetToday} from '../../constants/utility';
import { isNullOrUndefined } from 'util';

class BtnUpdateIt extends Component {
  constructor(props) {
    super(props);
    this.state = {
      'classList': ['myWebCamBtn', 'btnUpdateIt']
    }
  }
  componentWillReceiveProps(nextProps) {
    if(true === _.get(nextProps, 'isDisable')) {
      this.setState({
        'classList': ['myWebCamBtn', 'btnUpdateIt', 'disable'],
      });
    } else {
      this.setState({
        'classList': ['myWebCamBtn', 'btnUpdateIt', 'animated'],
      });
    }
  }
  componentDidMount() {
    let tmpTimer = setTimeout(() => {
      this.animaIt();
      clearTimeout(tmpTimer);      
    }, 2500);
  }
  componentWillUnmount() {
    clearInterval(this.animaTimer);
  }
  animaIt() {
    this.animaTimer = setInterval(()=>{
    }, 5000);
  }
  onAnimaEnd(evt) {
    this.setState({
      'classList': ['myWebCamBtn btnUpdateIt animated'],
    });
    evt.preventDefault();
    evt.stopPropagation();
  }
  getClassName() {
    return this.state.classList.join(' ');
  }
  render() {
    return (
      <div className={this.getClassName()} onAnimationEnd={(evt)=>{this.onAnimaEnd(evt)}}
        onClick={evt=>{this.props.handleBtnUpdateItClick(evt)}}>
        <FontAwesomeIcon icon={faCloudUploadAlt}></FontAwesomeIcon>
      </div>
    );
  }
}

const PlaceholderLeaveMsg = ({ishide}) => {
  if(false === ishide) {
    return (<i className={'leaveMsgPlaceholder'}>想說些什麼嗎?......</i>);
  } else {
    return (<i className={'leaveMsgPlaceholder hide'}></i>);
  }
}

class TextAreaLeaveMsg extends Component {
  constructor(props) {
    super(props);
    this.state = {
      'needPlaceholder': true,
      'msg': ''
    }
  }
  onFocus(evt) {
    this.setState({
      'needPlaceholder': false,
    });
  }
  onBlur(evt) {
    let needPlaceholder = !isNullOrUndefined(this.state.msg) && 0 >= this.state.msg.length;
    this.setState({
      'needPlaceholder': needPlaceholder,
    });
  }
  onMsgChnaged(evt) {
    let msg = evt.target.value;
    this.props.handleLeaveMsgChanged(evt, msg);
    this.setState({
      'msg': msg,
    })
  }
  getPlaceholderParams(){
    return {
      'ishide': !this.state.needPlaceholder,
    }
  }
  render() {
    return (
      <div className ={'leaveMsg'} onFocus={evt=>{this.onFocus(evt)}} onBlur={evt=>{this.onBlur(evt)}}>
        <textarea onChange={evt=>{this.onMsgChnaged(evt)}}></textarea>
        <PlaceholderLeaveMsg {...this.getPlaceholderParams()}></PlaceholderLeaveMsg>
      </div>
    );
  }
}

const MyFlexRow = (props) => (
  <div className={'myFlexRow'}>
    {props.children}
  </div>
);

const MyAllocFileName = function () {
  let count = 0,
  today = GetToday();
  return function(_format) {
    let format = isNullOrUndefined(_format) ?　'jpg' : _format;
    return today + '_' + (count++) + '.' + format;
  }
}();

class MyWebCamPage extends Component {
  constructor(props) {
    super(props);
    this.state = {
      'classList': ['myWebCamPage', 'animated', 'fadeInDown'],
      'photos': _.has(props, 'photos')? _.cloneDeep(props.photos): [],
    }
    _.set(this,'curPhotoIndex', null);
    let oriContent = _.get(props.chps, props.contentId);
    if('/WebCamPage' === oriContent || isNullOrUndefined(oriContent)) oriContent = '';
    _.set(this,'leaveMsg', oriContent);
  }
  newImg(_img, _format) {
    let photos = this.state.photos;
    let contenttype, filename;
    if('blob' === _format) {
      filename = _img.name;
      contenttype = _img.type;
      photos.push({
        'body': _img,
        contenttype,
        filename,
      });
    } else if('dataurl' === _format) {
      filename = MyAllocFileName();
      contenttype = 'image/jpeg';
      photos.push({
        'body': DataURItoBlob(_img),
        contenttype,
        filename
      });
    }
    _.set(this, 'curPhotoIndex', photos.length - 1);
    this.setState({
      'photos': photos,
    });
  }
  removeImg(_index) {
    let photos = _.cloneDeep(this.state.photos);
    if(0 < _index && _index < photos.length) {
      photos = _.pullAt(photos, _index);
    }
    _.set(this, 'curPhotoIndex', null);
    this.setState({
      'photos': photos,
    });
  }
  onInputFileChanged(evt, a_Img) {
    //加入新的圖片
    this.newImg(a_Img, 'blob');
    evt.preventDefault();
    evt.stopPropagation();
  }
  onBtnCheeseClick(evt, a_Img) {
    //加入新的圖片
    this.newImg(a_Img, 'dataurl');
    evt.preventDefault();
    evt.stopPropagation();
  }
  onBtnRemovePhotoClick(evt, a_Index) {
    //移除指定的圖片
    this.removeImg(a_Index);
    evt.preventDefault();
    evt.stopPropagation();
  }
  onPhotoClick(evt, a_Index) {
    _.set(this, 'curPhotoIndex', a_Index);
    evt.preventDefault();
    evt.stopPropagation();
  }
  onLeaveMsgChanged(evt, a_Msg) {
    _.set(this, 'leaveMsg', a_Msg);
    evt.preventDefault();
    evt.stopPropagation();
  }
  onBtnUpdateItClick(evt) {
    let accountData = _.cloneDeep(this.props.accountData),
      contentId = this.props.contentId,
      newContent = _.set(this.props.chps, contentId,  _.get(this, 'leaveMsg')),      
      illustrations = _.cloneDeep(this.state.photos);
    this.props.handleUpdateStory(evt, accountData, contentId, newContent, illustrations);
  }
  getClassName()  {
    return this.state.classList.join(' ');
  }
  getStyle() {
    return {

    }
  }
  getMyWebCamParams() {
    return {
      'handleInputFileChanged': (evt, a_Img)=>{this.onInputFileChanged(evt, a_Img)},
      'handleBtnCheeseClick': (evt, a_Img)=>{this.onBtnCheeseClick(evt, a_Img)}
    }
  }
  getMyAlbumParams() {
    return {
      'photos': _.cloneDeep(this.state.photos),
      'curPhotoIndex': this.curPhotoIndex,
      'handleOnPhotoClick': (evt, index) => {this.onPhotoClick(evt, index)},
      'handleBtnRemovePhotoClick': (evt, index)=> {this.onBtnRemovePhotoClick(evt, index)}
    }
  }
  render() {
    return (
      <div className={this.getClassName()} style={this.getStyle()}>
        <MyWebCamComponent {...this.getMyWebCamParams()}>          
        </MyWebCamComponent>
        <MyWebCamAlbum {...this.getMyAlbumParams()}>          
        </MyWebCamAlbum>
        <MyFlexRow>
          <TextAreaLeaveMsg handleLeaveMsgChanged={(evt, msg)=>{this.onLeaveMsgChanged(evt, msg)}}></TextAreaLeaveMsg>
        </MyFlexRow>
        <MyFlexRow>
          <BtnUpdateIt handleBtnUpdateItClick={(evt)=>{this.onBtnUpdateItClick(evt)}}></BtnUpdateIt>
        </MyFlexRow>
      </div>
    );
  }
}

export default MyWebCamPage;