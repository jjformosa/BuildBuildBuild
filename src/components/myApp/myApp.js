import React, {Component} from 'react';
import {Route,withRouter} from 'react-router-dom';
import { connect } from 'react-redux';
import _ from 'lodash';
import '../myApp.css';
//import LandingPage from '../landingPage/landingPage';
import LandingPage from '../../containers/landingContainer/landingContainer';
import WelcomePage from '../../containers/welcomeContainer/welcomeContainer';
import HaJiMeDePage from '../../containers/hajimedeContainer/hajimedeContainer';
import MemoryBook from '../../containers/memoryBookContainer/memoryBookContainer';
import MyWebCamPage from '../../components/webcamComponent/myWebcam';
import { isNullOrUndefined } from 'util';

const InitClassName_MyApp = ['flexbox','inline',
  'direct-col','justifyContent-center','alignItem-center','alignContent-center'];

const Waiting = (param) => (
  <div className={'myBlock'} style={{'display': param.isDisplay}} >
    <div className={'myBlock-waiting'} ></div>
  </div>
);

class MyApp extends Component{
  constructor(props){
    super(props);
    this.state = {
      'component': null,
    };
  }
  componentWillReceiveProps(nextProps) {
    let nextpathname = _.get(nextProps, 'nextpathname');
    if(!isNullOrUndefined(nextpathname)) {
      if(nextpathname !== this.props.location.pathname) {
          let itmer = setTimeout(() => {
          this.props.history.push(nextpathname);
          clearTimeout(itmer);
        }, 600);
      } else {
        this.setState({
          'component': this.getChild(this.props.location.pathname),
        })
      }
    } else {
      this.setState({
        'component': this.getChild(this.props.location.pathname),
      })
    }
    // if(nextProps.nextpathname !== this.props.nextpathname) {
    //   this.setState({
    //     'component': this.getChild(this.props.nextpathname),
    //   }, ()=>{
    //     setTimeout(()=>{
    //       this.setState({
    //         'component': this.getChild(nextProps.nextpathname),
    //       });
    //       this.props.history.push(this.props.nextpathname);
    //     }, 1000);
    //   })
    // }
  }
  componentDidMount() {
    //this.props.history.push('/LandingPage');
    this.props.history.push('/WebCamPage');
  }
  getChild() {
    let path = this.props.location.pathname;
    if('/LandingPage' === path) {
      return LandingPage;
    } else if('/WelcomePage' === path) {
      return WelcomePage;
    } else if('/HaJiMeDePage' === path) {
      return HaJiMeDePage;
    } else if('/MemoryBook' === path) {
      return MemoryBook;
    } else if('/WebCamPage' === path) {
      return MyWebCamPage;
    }
  }
  isWaiting() {
    return this.props.waiting ? 'block' : 'none';
  }
  render() {
    return (
      <div>        
        <div id={'myApp'} className={InitClassName_MyApp.join(' ')}>
          <Route component={this.getChild()}/>
          <Waiting isDisplay={this.isWaiting()}></Waiting>
        </div>
      </div>
    );
  }
}

export default connect((state)=>{
  return {
  'nextpathname': _.get(state, ['accountReducer','nextpathname']),
  'waiting': _.get(state, ['dataReducer', 'waiting']),
}}, (dispatch)=>({  
}))(withRouter(MyApp));