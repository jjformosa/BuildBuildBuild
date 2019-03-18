import React, { Component } from 'react';
import _ from 'lodash';
import { FontAwesomeIcon } from '@fortawesome/react-fontawesome';
import { faAngleLeft, faAngleRight, faPlay, faPause } from '@fortawesome/free-solid-svg-icons';
import './memoryBook.css';
import '../../constants/animate.css';
import { isNullOrUndefined } from 'util';

class BtnIllustration extends Component {
  constructor(props){
    super(props);    
    this.state = {
      'iconname': props.iconname,
      'isDisable': props.isDisable,
      'classList': ['btnIllustration']
    }
  }
  componentWillReceiveProps(nextProps) {
    this.setState({
      'isDisable': nextProps.isDisable,
    })
  }
  getIcon() {
    let btnIconName = this.state.iconname;
    if('play' === btnIconName) {
      return faPlay;
    } else if('pause' === btnIconName) {
      return faPause;
    } else if('prev' === btnIconName) {
      return faAngleLeft;
    } else if('next' === btnIconName) {
      return faAngleRight;
    }
  }
  getClassName() {
    return this.state.classList.join(' ');
  }
  getStyle() {
    let _style = {};
    if(this.state.isDisable) {
      _.assign(_style, {
        'backgroundColor': 'lightcoral',
        'cursor': 'not-allowed'
      })
    }
    return _style;
  }
  onBtnIllustrationClick(evt) {
    let btnIconName = this.state.iconname;
    if(!this.state.isDisable) {
      this.props.handleBtnIllustrationClick(evt, btnIconName);
      if('play' === btnIconName) {
        this.setState({
          'iconname': 'pause'
        });
      } else if ('pause' === btnIconName) {
        this.setState({
          'iconname': 'play'
        });
      }
    }
    evt.preventDefault();
    evt.stopPropagation();
  }
  render() {
    return (
      <div className={this.getClassName()} style={this.getStyle()} onClick={(evt)=>{this.onBtnIllustrationClick(evt)}}>
        <i><FontAwesomeIcon icon={this.getIcon()}></FontAwesomeIcon></i>
      </div>
    )
  }
}

const MyIllustrationControlsBar = ({handleBtnIllustrationClick, btnPrevParam, btnNextParam}) =>(
  <fieldset className={'myIllustrationControlsBar'}>
    <BtnIllustration iconname= {'prev'} handleBtnIllustrationClick={handleBtnIllustrationClick} {...btnPrevParam}>      
    </BtnIllustration>
    <BtnIllustration iconname= {'pause'} handleBtnIllustrationClick={handleBtnIllustrationClick}>      
    </BtnIllustration>
    <BtnIllustration iconname= {'next'} handleBtnIllustrationClick={handleBtnIllustrationClick} {...btnNextParam}>      
    </BtnIllustration>
  </fieldset>
);

class MyImg extends Component {
  constructor(props) {
    super(props);
    this.state = {
      'imgSrc': props.imgSrc,
      'classList': ['myImg', 'animated'],
      'animaName': null,
    }
  }
  componentWillReceiveProps(nextProps) {
    if(nextProps.imgSrc !== this.state.imgSrc) {
      this.changeImg(nextProps.imgSrc, nextProps.direction);
    }
  }
  changeImg(nextImgSrc, direction) {
    let _src = nextImgSrc,
    _classList = _.clone(this.state.classList), _direction = null;
    if(direction) {
      _direction = direction;
      if('forward' === _direction) {
        let _animaName = 'fadeOutLeft';
        this.setState({
          'classList': _.concat(_classList, [_animaName]),
          'animaName': _animaName,
        });
        let _timer = setTimeout(() => {
          _animaName = 'fadeInRight';
          this.setState({
            'imgSrc': _src,
            'classList': _.concat(_classList, [_animaName]),
            'animaName': _animaName,
          });
          clearTimeout(_timer);
        }, 1200);
      } else if('backward' === _direction) {
        let _animaName = 'fadeOutRight';
        this.setState({
          'classList': _.concat(_classList, [_animaName]),
          'animaName': _animaName,
        });
        let _timer = setTimeout(() => {
          _animaName = 'fadeInLeft';
          this.setState({
            'imgSrc': _src,
            'classList': _.concat(_classList, [_animaName]),
            'animaName': _animaName
          });
          clearTimeout(_timer);
        }, 1200);
      }
    } else {
      this.setState({
        'imgSrc': _src
      });
      this.props.handleImgChanged();
    }
  }
  onAnimationEnd(evt) {
    let _animaName = this.state.animaName;
    if(0 ===_animaName.indexOf('fadeIn')) {
      this.setState({
        'classList': ['myImg', 'animated'],
        'animaName': null
      })  
    } else if (this.state.classList.length > 4) {
      this.setState({
        'classList': ['myImg', 'animated'],
        'animaName': null
      });
    } else {
      if('fadeOutLeft' === _animaName || 'fadeOutRight' === _animaName) {
        this.props.handleImgChanged();
      }
    }
    evt.preventDefault();
    evt.stopPropagation();
  }
  getClassName() {
    return this.state.classList.join(' ');
  }
  render() {
    return (
      <img src={this.state.imgSrc} className={this.getClassName()} onAnimationEnd={(evt)=>{this.onAnimationEnd(evt)}}
        alt=''
      ></img>
    )
  }
}

class MyIllustration extends Component {
  constructor(props) {
    super(props);
    this.state = {
      'illustrations': props.illustrations,
      'curIndex': 0,
      'nextIndex': 1,
      'classList': ['myIllustartion', 'animated'],
      'isAutoPlay': false,
      'autoPlayTimer': null, 
    }
  }
  componentDidMount() {    
    this.initAutoPlay();
  }
  componentWillReceiveProps(nextProps) {
    let _classList = ['myIllustartion', 'animated'],
    _illustrations = [];
    if(isNullOrUndefined(nextProps.illustrations) || 0 === nextProps.illustrations.length) {
      _classList.push('hide');
      _illustrations = [];
    } else {
      _classList.push('fadeInDown');
      _illustrations = _.clone(nextProps.illustrations);
    }
    this.setState({
      'classList': _classList,
      'illustrations': _illustrations,
      'curIndex': 0,
      'nextIndex': 0,
      'isAutoPlay': true
    });
  }
  componentWillUnmount() {
    if(this.state.autoPlayTimer) {
      clearInterval(this.state.autoPlayTimer);
    }
  }
  initAutoPlay()  {
    if(this.state.autoPlayTimer) {
      return;
    } else {
      let the = this;
      let timer = setInterval(()=>{
        if(the.state.isAutoPlay && 1 < the.state.illustrations.length) {
          let next = the.state.curIndex + 1;
          if(next === the.state.nextIndex) {
            next +=1;
          }
          if(next >= the.state.illustrations.length) {
            next = 0;
          }
          the.setState({
            'nextIndex': next
          })
        }
      }, 5000);
      this.setState({
        'autoPlayTimer': timer
      })
    }
  }
  pauseAutoPlay() {
    this.setState({
      'isAutoPlay': false,
    })
  }
  resumeAutoPlay() {
    this.setState({
      'isAutoPlay': true,
    })
  }
  backward() {
    if(!this.state.isAutoPlay) {
      let _next = Math.max(this.state.curIndex -1, 0);
      if(_next === this.state.nextIndex) {
        //有bug
        this.forward();
      } else {
        this.setState({
          'nextIndex': _next,
        });
      }
    }
  }
  forward() {
    if(!this.state.isAutoPlay) {
      let _next = Math.min(this.state.curIndex + 1, this.state.illustrations.length -1);
      if(_next === this.state.nextIndex) {
        //有bug
        this.backward();
      } else {
      this.setState({
          'nextIndex': _next,
        });
      }
    }
  }
  getImgParams() {
    let _direction = null, _src = null; 
    if(this.state.illustrations && 0 < this.state.illustrations.length) {
      _src = this.state.illustrations[this.state.nextIndex];
    }
    if(this.state.nextIndex > this.state.curIndex) {
      _direction = 'forward';
    } else if(this.state.nextIndex < this.state.curIndex) {
      _direction = 'backward';
    } 
    return {
      'imgSrc': _src,
      'direction': _direction,
      'handleImgChanged': () => {this.onImgChanged()},
    };
  }
  getBtnPrevParams() {
    let rtn = {
      'isDisable': this.state.isAutoPlay || 0 === this.state.illustrations.length || 0 >= this.state.curIndex,
    }
    return rtn;
  }
  getBtnNextParams() {
    let rtn = {
      'isDisable' : this.state.isAutoPlay || 0 === this.state.illustrations.length || this.state.illustrations.length -1 <= this.state.curIndex,
    }
    return rtn;
  }
  getIllustrationControlsParams() {
    return {
      'btnPrevParam': this.getBtnPrevParams(),
      'btnNextParam': this.getBtnNextParams(),
      'handleBtnIllustrationClick': (evt, iconname) => {this.onBtnIllustrationClick(evt, iconname)}
    }
  }
  getClassName() {
    return this.state.classList.join(' ');
  }
  onBtnIllustrationClick(evt, iconname) {
    if('pause' === iconname) {
      this.pauseAutoPlay();
    } else if('play' === iconname) {
      this.resumeAutoPlay();
    } else if('prev' === iconname) {
      this.backward();
    } else if('next' === iconname) {
      this.forward();
    }
  }
  onAnimationEnd(evt) {
    this.setState({
      'classList': ['myIllustartion', 'animated']
    });
  }
  onImgChanged() {
    this.props.handleImgChanged(this.state.nextIndex);
    this.setState({
      'curIndex': this.state.nextIndex,
    });
  }
  render() {
    return(
      <div className={this.getClassName()} onAnimationEnd={(evt=>{this.onAnimationEnd(evt)})}>
        <MyImg {...this.getImgParams()}></MyImg>
        <MyIllustrationControlsBar {...this.getIllustrationControlsParams()}>        
        </MyIllustrationControlsBar>
      </div>
    );
  }
}

const MyCoverIllustration = ({illustrations}) => { 
  let className = ['myIllustartion'];
  if(!illustrations || illustrations.length === 0) className.push('hide');
return <div className={className.join(' ')}>
  <img className={'myImg'} src={illustrations} alt=''></img>
</div>};

export default MyIllustration;
export {MyCoverIllustration};