import {connect} from 'react-redux';
import _ from 'lodash';
import MyWebCamPage from '../../components/webcamComponent/myWebcam';
import {updateStory} from '../../actions/webcam/webcam';
import {
  ACTIONTYPE_WAITING_START
} from '../../constants/actionTypes';

export default connect((state)=>{
  let nextState = {};
  let accountData = state.accountReducer.accountData;
  _.set(nextState, 'accountData', _.cloneDeep(accountData));  
  let chps = state.storyReducer.chps;
  _.set(nextState, 'contentId', chps.length -1);
  _.set(nextState, 'chps', _.cloneDeep(chps));
  return nextState;
},  (dispatch)=>({
  'handleUpdateStory': function(evt, accountData, a_id, a_newContents, a_illustrations) {
    if('/WebCamPage' !== _.last(a_newContents)) a_newContents.push('/WebCamPage');
    dispatch({
      'type': ACTIONTYPE_WAITING_START,
      'command': 'handleUpdateStory'
    });
    dispatch(updateStory(accountData, a_id, a_newContents, a_illustrations));
  },
}))(MyWebCamPage);