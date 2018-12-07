import React, {Component} from 'react';
import _ from 'lodash';
import './myWebCam.css';
import {BlobToDataURI} from '../../constants/utility';
import { isNullOrUndefined } from 'util';

class MyPhoto extends Component{
  constructor(props) {
    super(props);
    this.state = {
      'index': props.index,
      'classList': _.concat(['myPhoto'], props.classList),
      'imgData': null,
    }
  }
  componentWillReceiveProps(nextProps) {
    let classList = _.concat(['myPhoto'], nextProps.classList);
    this.setState({
      'classList': classList,
    });
  }
  componentDidMount() {
    if(!isNullOrUndefined(this.props.imgData)) {
      let imgData = this.props.imgData.body;
      BlobToDataURI(imgData, (dataUrl)=>{
        this.setState({
          'imgData': dataUrl,
        })
      });
    }
  }
  onPhotoClick(evt) {
    this.props.handleOnPhotoClick(evt,  this.state.index);
  }
  onMouseEnter(evt) {
    this.props.handleMouseEnterPhoto(evt,  this.state.index);
  }
  onBtnRemoveClick(evt) {
    this.props.handleBtnRemoveClick(evt,  this.state.index);
  }
  getClassName() { 
    return this.state.classList.join(' ');
  }
  render() {
    return(<div className={this.getClassName()} onClick={(evt)=>{this.onPhotoClick(evt)}} 
            onMouseEnter={(evt)=>{this.onMouseEnter(evt)}}>
    <img alt={''} src={this.state.imgData}></img>
    <label className={'btnRemove'} onClick={(evt)=>{this.onBtnRemoveClick(evt)}}>X</label>
  </div>);
  }
}

class MyWebCamAlbum extends Component {
  constructor(props) {
    super(props);
    this.state = {
      'myPhotos': [],
      'classList': ['myWebCamAlbum'],
      'style': {},
    }
    _.set(this, 'photos', props.photos);
    _.set('curPhotoIndex', null);
  }
  componentDidMount() {
    this.setState({
      'myPhotos': this.makeMyPhotos(),
    });
  }
  componentWillReceiveProps(nextProps) {
    if(!isNullOrUndefined(nextProps.curPhotoIndex) && nextProps.curPhotoIndex !== this.curPhotoIndex) {
      _.set(this, 'curPhotoIndex', nextProps.curPhotoIndex);
      _.set(this, 'photos', nextProps.photos);
      this.setState({
        'myPhotos': this.makeMyPhotos(),
      });
      this.moveToPhoto(this.photos.length -1);
    }
  }
  makeMyPhotos() {
    let myPhotos = [];
    for(let i = 0; i < this.photos.length ; i+= 1) {
      let _params = {
        'index': i,
        'handleOnPhotoClick': (evt, _index) => {this.onPhotoClick(evt, _index);},
        'handleMouseEnterPhoto': (evt, _index) => {this.onMouseEnterPhoto(evt, _index);},
        'imgData': this.photos[i],
        'classList': []
      }
      if(i === this.curPhotoIndex) {
        _params.classList.push('focus');
      }
      myPhotos.push(<MyPhoto key={i} {..._params}></MyPhoto>);
    }
    return myPhotos;
  }
  getStyle() {
    return _.cloneDeep(this.state.style);
  }
  getClassName() {
    return this.state.classList.join(' ');
  }
  moveToPhoto(_index) {    
    _index =  _index - 2;
    let offsetLeft = -340 * (_index + .5);
    this.setState({
      'style': {
        'left': offsetLeft + 'px'},
    });
    _.set(this, 'curPhotoIndex', _index);
  }
  onPhotoClick(evt, _index) {    
    this.props.handleOnPhotoClick(evt, _index);
    this.moveToPhoto(_index);
    evt.preventDefault();
    evt.stopPropagation();
  }
  onMouseEnterPhoto(evt, index) {
    let myPhotos = [];
    for (var i = 0; i < this.state.myPhotos.length; i += 1) {
        let d_index = Math.abs(index - i);
        let _params = {
          'index': i,
          'handleOnPhotoClick': (evt, _index) => {this.onPhotoClick(evt, _index);},
          'handleMouseEnterPhoto': (evt, _index) => {this.onMouseEnterPhoto(evt, _index);},
          'handleBtnRemoveClick': (evt, _index) => {this.onBtnRemoveClick(evt, _index);},
          'imgData': _.cloneDeep(this.photos[i]),
          'classList': []
        }
        if (2 === d_index) {
          _params.classList.push('focus3');
          myPhotos[i] = <MyPhoto key={i} {..._params}></MyPhoto>;
        } else if (1 === d_index) {
          _params.classList.push('focus2');
          myPhotos[i] = <MyPhoto key={i} {..._params}></MyPhoto>;
        } else if (0 === d_index) {
          _params.classList.push('focus');
          myPhotos[i] = <MyPhoto key={i} {..._params}></MyPhoto>;
        } else {
          myPhotos[i] = <MyPhoto key={i} {..._params}></MyPhoto>;
        }
    }
    this.setState({
      'myPhotos': myPhotos,
    });
    evt.preventDefault();
    evt.stopPropagation();
  }
  onBtnRemoveClick(evt, _index) {
    this.props.handleBtnRemovePhotoClick(evt, _index);
    evt.preventDefault();
    evt.stopPropagation();
  }
  render() {
    return (
      <div className={'myFlexRow'} style={{'width': '100%', 'height': '200px'}}>
        <div className={this.getClassName()} style={this.getStyle()}>
          {this.state.myPhotos}
        </div>
      </div>
    );
  }
}

export default MyWebCamAlbum;