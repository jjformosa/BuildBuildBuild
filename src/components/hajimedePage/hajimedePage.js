import React, { Component } from 'react';
import '../../constants/animate.css';
import _ from 'lodash';
import { AnimaElementsClassName} from '../../constants/animate';
import AnimaItem from '../share/animaItem';
import { FontAwesomeIcon } from '@fortawesome/react-fontawesome';
import { faChevronCircleRight } from '@fortawesome/free-solid-svg-icons';

  class SayHi extends AnimaItem {
    constructor(props){
      super(props);    
      this.state = {
        'animaDelay': props.animaDelay,
        'classList': [AnimaElementsClassName],
        'animaName': '',
        'accountData': props.accountData,
      }
    }
    getStyle() {
      return {
        'animationDelay': this.state.animaDelay + 's',
        'fontSize': '1.2rem',
      }
    }
    render() {
      return (
        <i className={this.getClassName()} style={this.getStyle()} 
        onAnimationEnd={(evt)=>{this.onAnimationEnd(evt)}}>嗨吚~~
          <NameComponent animaDelay={this.state.animaDelay + 1} accountData={this.state.accountData}></NameComponent>
        </i>
      );
    }
  }

  class NameComponent extends AnimaItem {
    constructor(props){
      super(props);    
      this.state = {
        'animaDelay': props.animaDelay,
        'classList': [AnimaElementsClassName],
        'animaName': '',
        'accountData': props.accountData,
      }
    }
    getStyle() {
      return {
        'animationDelay': this.state.animaDelay + 's',
        'fontWeight': 'bold',
        'fontSize': '1.2rem',
      }
    }
    render() {
      return (
        <strong className={this.getClassName()} style={this.getStyle()} 
        onAnimationEnd={(evt)=>{this.onAnimationEnd(evt)}}>{this.props.accountData.name}
        </strong>
      )
    }
  }

  class MyNick extends AnimaItem {
    constructor(props){
      super(props);    
      this.state = {
        'animaDelay': props.animaDelay,
        'classList': [AnimaElementsClassName],
        'animaName': '',
        'accountData': props.accountData,
      }
    }
    getStyle() {
      return {
        'animationDelay': this.state.animaDelay + 's',
        'fontWeight': 'bold',
        'fontSize': '1.2rem',
        'textDecoration': 'underline',
        'color': '#FF44AA',
        'margin': '0 .3rem',
      }
    }
    render() {
      return (
        <label>我可以稱呼你/妳<strong className={this.getClassName()} style={this.getStyle()} 
        onAnimationEnd={(evt)=>{this.onAnimationEnd(evt)}}>{this.props.accountData.mynick}
        </strong>嗎?</label>
      )
    }
  }

  class InputNick extends AnimaItem {
    constructor(props){
      super(props);    
      this.state = {
        'animaDelay': props.animaDelay,
        'classList': [AnimaElementsClassName],
        'animaName': '',
        'accountData': props.accountData,
      }
    }
    getStyle() {
      return {
        'animationDelay': this.state.animaDelay + 's',
      }
    }
    getStyle2() {
      return {
        'margin': '.5rem .3rem',
        'width': '100%',
        'fontSize': '1.2rem',
        'border': 'none',
        'borderBottom': '2px solid',
      }
    }
    render() {
      if(_.has(this.state.accountData, 'mynick')) {
        return (
          <label className={this.getClassName()} style={this.getStyle()} 
          onAnimationEnd={(evt)=>{this.onAnimationEnd(evt)}}>或是你/妳希望我叫你/妳
              <input style={this.getStyle2()} onChange={this.props.onNickChanged}>
                {this.state.accountData.nick}
              </input>
          </label>
        );
      } else {
        return (<label className={this.getClassName()} style={this.getStyle()} 
        onAnimationEnd={(evt)=>{this.onAnimationEnd(evt)}}>如果你/妳願意，歡迎留個暱稱讓我們更親近：
            <input style={this.getStyle2()} onChange={this.props.onNickChanged} value={this.state.accountData.nick}>              
            </input>
        </label>
        );
      }
    }
  }

  const FormInputNick = (props) => (
    <form>
      <p style={{'margin': '.5rem'}}>
        <SayHi animaDelay={0} accountData={_.cloneDeep(props.accountData)}>
        </SayHi>
      </p>
      <p style={{'margin': '.5rem'}}>
        <InputNick animaDelay={1}  accountData={_.cloneDeep(props.accountData)}
        onNickChanged={props.onNickChanged}></InputNick>
      </p>              
    </form>
  );

  const FormWithMyNick = (props) => (
    <form>
      <p style={{'margin': '.5rem'}}>
      <SayHi animaDelay={0} accountData={_.cloneDeep(props.accountData)}>
      </SayHi>
      </p>       
      <p style={{'margin': '.5rem'}}>
        <MyNick animaDelay={2} accountData={_.cloneDeep(props.accountData)}></MyNick>
      </p>
      <p style={{'margin': '.5rem'}}>
        <InputNick animaDelay={3}  accountData={_.cloneDeep(props.accountData)}
          onNickChanged={props.onNickChanged}
        ></InputNick>
      </p>
    </form>
  );
  
  class SubmitForNick extends AnimaItem {
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
        'borderRadius': '100%',
        'color': '#0062cc',
        'display': 'inline-block',
        'float': 'right',
        'userSelect': 'none',
        'textAlign': 'center',
        'verticalAlign': 'middle',
        'cursor': 'pointer',
        'fontSize': '3rem',
      }
    }
    render() {
      return (
        <label className={this.getClassName()} style={this.getStyle()}>
          <input style={{'display':'none'}} type="submit" onClick={this.props.onNickConfirm}></input>
          <FontAwesomeIcon icon={faChevronCircleRight}></FontAwesomeIcon>
        </label>
      )
    }
  }

  class HaJiMeDePage extends Component {
    constructor(props){
      super(props);    
      this.state = {
        'animaDelay': 0,
        'animaName': '',
        'classList': [AnimaElementsClassName],
        'accountData': _.cloneDeep(props.accountData),
        'visibility': true
      }
    }
    componentWillReceiveProps(nextProps) {
      if(nextProps.nextpathname !== this.props.nextpathname){
        let _classList = _.clone(this.state.classList);
        _classList.push("fadeOutUp");
        this.setState({
          'classList': _.clone(_classList),
          'animaName': 'fadeOutUp'
        });
      }
    }
    getClassName() {
      return this.state.classList.join(' ');
    }
    getStyle(){
      return {
        'padding': '.5rem',
        'maxWidth': '50vmax',
        'width': 'auto',
        'overflow': 'hidden',
        'animationDelay': this.state.animaDelay + 's',
        'visibility': this.state.visibility ? 'visible' : 'hidden',
      }
    }
    getAccountData() {
      return _.cloneDeep(this.state.accountData);
    }
    handleNickChanged(evt) {
      let a_nick = evt.target.value, 
      _accountData = this.state.accountData;
      this.setState({
        'accountData': _.set(_accountData, 'nick', a_nick),
      })
    }
    handleNickConfirm(evt) {
      if(this.props.onNickConfirm) {
        this.props.onNickConfirm(evt, _.cloneDeep(this.state));
      }
    }
    onAnimationEnd(evt) {
      if(!this){
        return;
      }
      if(0 < this.state.animaName.length){
        // let _classList = _.clone(this.state.classList);
        // _.pull(_classList, this.state.animaName);
        // this.setState({
        //   'classList': _.clone(_classList),
        //   'animaName': ''
        // })
        this.setState({
          'visibility': false,
        })
      }
      evt.preventDefault();
      evt.stopPropagation();
    }
    render() {
      if(_.has(this.state.accountData, 'mynick')){
        return (
          <div className={this.getClassName()} style={this.getStyle()} 
            onAnimationEnd={(evt)=>{this.onAnimationEnd(evt)}}>
            <FormWithMyNick accountData={this.getAccountData()} onNickChanged={(evt)=>{this.handleNickChanged(evt)}}>  
            </FormWithMyNick>    
            <SubmitForNick animaDelay={3} onNickConfirm={(evt)=>{this.handleNickConfirm(evt)}}></SubmitForNick>
          </div>
        )
      } else {
        return (
          <div style={this.getStyle()} onAnimationEnd={(evt)=>{this.onAnimationEnd(evt)}}>
            <FormInputNick accountData={this.getAccountData()} onNickChanged={(evt)=>{this.handleNickChanged(evt)}}>
            </FormInputNick>
            <SubmitForNick animaDelay={3} onNickConfirm={(evt)=>{this.handleNickConfirm(evt)}}></SubmitForNick>
          </div>
        )
      } 
    }
  }
  export default HaJiMeDePage;