
import {updateStoryContents} from './AWS';
import {ACTIONTYPE_WAITING_START,ACTIONTYPE_WAITING_END,
  ACTIONTYPE_JUMPTOPAGE,
  ACTIONTYPE_UPDATECONTENTS_REJECT} from '../../constants/actionTypes'

export const updateStory = (accountData, contentId, newContents, newIllustrations) => (dispatch) => {  
  dispatch({
      'type': ACTIONTYPE_WAITING_START,
      'command': 'updateStory'
  }); 
  dispatch(updateStoryContents(accountData, contentId, newContents, newIllustrations));
}

export const onUpdateStorySuccess = (accountData, contentId, newContents, newIllustrations) => (dispatch) =>{
  dispatch({
    'type': ACTIONTYPE_JUMPTOPAGE,
    'pathname': '/MakeMemory',
    'page': contentId,
  });
  dispatch({
    'type': ACTIONTYPE_WAITING_END,
    'command': 'onUpdateStorySuccess'
  });
}
export const onUpdateStoryFail = (err) => (dispatch) =>{
  dispatch({
    'type': ACTIONTYPE_UPDATECONTENTS_REJECT,
    err,
  });
  dispatch({
    'type': ACTIONTYPE_WAITING_END,
    'command': 'onUpdateStoryFail'
  });
}