
import {updateStoryContents} from './AWS';
import {ACTIONTYPE_WAITING_END,
  ACTIONTYPE_JUMPTOPAGE,
  ACTIONTYPE_UPDATECONTENTS_SUCCESS,
  ACTIONTYPE_UPDATECONTENTS_REJECT} from '../../constants/actionTypes'

export const updateStory = (accountData, contentId, newContents, newIllustrations) => (dispatch) => {
  dispatch(updateStoryContents(accountData, contentId, newContents, newIllustrations));
}

export const onUpdateStorySuccess = (accountData, contentId, newContents, newIllustrations) => (dispatch) =>{
  dispatch({
    'type': ACTIONTYPE_UPDATECONTENTS_SUCCESS,
    'contentid': contentId,
    'newcontents': newContents,
    'newillustrations': newIllustrations
  });
  dispatch({
    'type': ACTIONTYPE_WAITING_END,
    'command': 'onUpdateStorySuccess'
  });
  dispatch({
    'type': ACTIONTYPE_JUMPTOPAGE,
    'pathname': '/MemoryBook/'+ accountData.id + '/' + contentId,
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