import React, {Component} from 'react';
import {Route,withRouter} from 'react-router-dom';
import { connect } from 'react-redux';
import _ from 'lodash';
import '../myApp.css';
import LandingPage from '../../containers/landingContainer/landingContainer';
import WelcomePage from '../../containers/welcomeContainer/welcomeContainer';
import HaJiMeDePage from '../../containers/hajimedeContainer/hajimedeContainer';
import MemoryBook from '../../containers/memoryBookContainer/memoryBookContainer';
import MyWebCamPage from '../../containers/webcamContainer/webcamContainer';
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
      let curPage = this.props.match.params.page; //this.props.location.pathname.split('/')[1];
      let nextPage = nextpathname.split('/')[1];
      if(nextPage !== curPage) {
          let itmer = setTimeout(() => {
            this.props.history.push(nextpathname);
            clearTimeout(itmer);
        }, 600);
      } else {
        this.setState({
          'component': this.getChild(),
        })
      }
    } else {
      this.setState({
        'component': this.getChild(),
      })
    }
  }
  getChild() {
    // let nodes = this.props.location.pathname.split('/');
    // let page = nodes[1];
    let page = this.props.match.params.page;
    if('WelcomePage' === page) {
      return WelcomePage;
    } else if('HaJiMeDePage' === page) {
      return HaJiMeDePage;
    } else if('MemoryBook' === page) {
      return MemoryBook;
    } else if('WebCamPage' === page) {
      return MyWebCamPage;
    } else {
      return LandingPage;
    }
  }
  isWaiting() {
    return this.props.waiting ? 'block' : 'none';
  }
  render() {
    return (
      <div>        
        <div id={'myApp'} className={InitClassName_MyApp.join(' ')}>
          <Route path='/:page/:uid' component={this.getChild()}/>
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