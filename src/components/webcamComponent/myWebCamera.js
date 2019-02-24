import React, {Component} from 'react';
import _ from 'lodash';
import './myWebCam.css';
import {FontAwesomeIcon} from '@fortawesome/react-fontawesome';
import {faFileImage, faCamera} from '@fortawesome/free-solid-svg-icons';

class BtnInputFile extends Component {
  constructor(props) {
    super(props);
    this.idForFile = 'inputMyPhoto';
    this.state = {
      'classList': ['myWebCamBtn btnInputFile animated'],
    }
  }
  componentDidMount() {
    this.animaIt();
  }
  componentWillUnmount() {
    clearInterval(this.animaTimer);
  }
  animaIt() {
    this.animaTimer = setInterval(()=>{
      this.setState({
        'classList': ['myWebCamBtn btnInputFile animated tada'],
      });
    }, 5000);
  }
  onAnimaEnd(evt) {
    this.setState({
      'classList': ['myWebCamBtn btnInputFile animated'],
    });
    evt.preventDefault();
    evt.stopPropagation();
  }
  getClassName() {
    return this.state.classList.join(' ');
  }
  render () {
    return (
    <div className={this.getClassName()} onAnimationEnd={evt=>{this.onAnimaEnd(evt)}}>
      <label htmlFor={this.idForFile}>
        <FontAwesomeIcon icon={faFileImage}></FontAwesomeIcon>
        <input id={this.idForFile} type={'file'} onChange={evt=>{this.props.handleInputFileChanged(evt)}}
          accept={'image/*'}></input>
      </label>
    </div>
  );
  }
}

class BtnCheese extends Component {
  constructor(props) {
    super(props);
    this.idForCamera = 'btnCheese';
    this.state = {
      'classList': ['myWebCamBtn', 'btnCheese', 'animated'],
    }
  }
  componentDidMount() {
    let tmpTimer = setTimeout(() => {
      this.animaIt();
      clearTimeout(tmpTimer);      
    }, 1000);
  }
  componentWillUnmount() {
    clearInterval(this.animaTimer);
  }
  animaIt() {
    this.animaTimer = setInterval(()=>{
      this.setState({
        'classList': ['myWebCamBtn', 'btnCheese', 'animated', 'rubberBand'],
      });
    }, 5000);
  }
  onAnimaEnd(evt) {
    this.setState({
      'classList': ['myWebCamBtn', 'btnCheese', 'animated'],
    });
    evt.preventDefault();
    evt.stopPropagation();
  }
  getClassName() {
    return this.state.classList.join(' ');
  }
  render () {
    return (<div className={this.getClassName()} onAnimationEnd={evt=>{this.onAnimaEnd(evt)}}>
      <label onClick={evt=>{this.props.handleBtnCheeseClick(evt)}} htmlFor={this.idForCamera}>
        <FontAwesomeIcon icon={faCamera}></FontAwesomeIcon>
        <input id={this.idForCamera} type={'button'} ></input>
      </label>
    </div>);
  }
}

class MyWebCamComponent extends Component {
  constructor(props) {
    super(props);
    this.state = {
      'classList': ['myWebCam']
    }
  }
  componentDidMount() {
    this.getMediaPermission();
  }
  getMediaPermission() {
    let the = this;
    navigator.mediaDevices.getUserMedia({'video': { width: 640, height: 480 }}).then(stream=>{
      if(_.has(the, 'p_Video')) {
        the.p_Video.srcObject = stream;
        the.p_Canvas.width = 320;
        the.p_Canvas.height = 240;
      }
    });
  }
  createVideoRef(el) {
    _.set(this, 'p_Video', el);
  }
  createCanvasRef(el) {
    _.set(this, 'p_Canvas', el);
  }
  onInputFileChange(evt) {
    if(!evt.target.files) return;
    if(0 === evt.target.files.length) return;
    let fileBlob = evt.target.files[0];
    this.props.handleInputFileChanged(evt, fileBlob);
  }
  onBtnCheeseClick(evt) {
    let dataurlImg = null;
    if(_.has(this, 'p_Video') && _.has(this, 'p_Canvas')) {
      let ctx = this.p_Canvas.getContext('2d');
      ctx.drawImage(this.p_Video, 0, 0, this.p_Video.videoWidth,this.p_Video.videoHeight,
        0, 0, 320, 240);
      dataurlImg = this.p_Canvas.toDataURL('image/jpeg');
    }
    this.props.handleBtnCheeseClick(evt, dataurlImg);
  }
  getClassName() {
    return this.state.classList.join(' ');
  }
  getBtnInputFileParams() {
    return {
      'handleInputFileChanged': evt=>{this.onInputFileChange(evt)},
    }
  }
  getBtnCheese() {
    return {
      'handleBtnCheeseClick': evt=>{this.onBtnCheeseClick(evt)},
    }
  }
  render() {
    return (
      <div className={'myFlexRow'}>
        <div className={this.getClassName()}>
          <video autoPlay ref={(el) => {this.createVideoRef(el)}}></video>
          <canvas ref={(el)=>{this.createCanvasRef(el)}}></canvas>
          <BtnInputFile {...this.getBtnInputFileParams()}></BtnInputFile>
          <BtnCheese {...this.getBtnCheese()}></BtnCheese>
        </div>
      </div>
    );
  }
}

export default MyWebCamComponent;