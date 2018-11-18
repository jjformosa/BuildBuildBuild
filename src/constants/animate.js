// @flow
import _ from 'lodash';
import {
  MyRandom ,
  MyError
} from './utility';

const AnimaElementsClassName = 'animated';
const inAnimaClassNames = ['bounceIn', 'bounceInDown', 'bounceInUp', 'bounceInLeft', 'bounceInRight',
  'fadeIn', 'fadeInDown', 'fadeInUp', 'fadeInLeft', 'fadeInRight',
  'flipInX', 'flipInY', 'rollIn',
  'rotateIn', 'rotateInDownLeft', 'rotateInDownRight', 'rotateInUpLeft', 'rotateInUpRight',
  'slideInUp', 'slideInDown', 'slideInLeft', 'slideInRight',
  'zoomIn', 'zoomInDown', 'zoomInUp', 'zoomInLeft', 'zoomInRight'
];
const outAnimaClassNames = ['bounceOut', 'bounceOutDown', 'bounceOutUp', 'bouncOutLeft', 'bounceOutRight',
  'fadeOut', 'fadeOutDown', 'fadeOutUp', 'fadeOutLeft', 'fadeOutRight',
  'flipOutX', 'flipOutY', 'rollOut',
  'rotateOut', 'rotateOutDownLeft', 'rotateOutDownRight', 'rotateOutUpLeft', 'rotateOutUpRight',
  'slideOutUp', 'slideOutDown', 'slideOutLeft', 'slideOutRight',
  'zoomOut', 'zoomOutDown', 'zoomOutUp', 'zoomOutLeft', 'zoomOutRight',
  'hinge' 
];
const triggerAnimaClassNames = ['bounce', 'rubberBrand', 'shake', 'swing', 'tada', 'wobble', 'jello'];
const Enum_AnimaType = {'TRIGGER': 0, 'IN': 1, 'OUT': 2};
const Style_AnimaItemActive = {
  'visibility': 'unset',
}
const Style_AnimaItemUnactive  = {
  'visibility': 'hidden',
}

let AnimaFactory = {};

(function (factory, r) {
  let error = function(a_Msg) {
    MyError('AnimaFactory ' + a_Msg);
  };

  let _r_inAnima = r.create(inAnimaClassNames),
      _r_outAnima = r.create(outAnimaClassNames),
      _r_triggerAnima = r.create(triggerAnimaClassNames);
   
  let randomInAnima = function randomInAnima() {
    return _r_inAnima.next();
  };
  let isInAnimaExist = function isInAnimaExist(a_name) {
    return _.indexOf(inAnimaClassNames, a_name) > -1;
  };

  let randomOutAnima = function randomOutAnima() {
    return _r_outAnima.next();
  };
  let isOutAnimaExist = function isOutAnimaExist(a_name) {
    return _.indexOf(outAnimaClassNames, a_name) > -1;
  };

  let ranodmTriggerAnima = function ranodmTriggerAnima() {
    return _r_triggerAnima.next();
  }
  let isTriggerAnimaExist = function isTriggerAnimaExist(a_name) {
    return _.indexOf(triggerAnimaClassNames, a_name) > -1;
  }; 

  let randomAnima = function(a_Type) {
    if(Enum_AnimaType.IN === a_Type) {
      return randomInAnima();
    } else if(Enum_AnimaType.OUT === a_Type){
      return randomOutAnima();
    } else {
      return ranodmTriggerAnima();
    }
  };
  
  _.set(factory, 'randomAnima', randomAnima);
  _.set(factory, 'randomInAnima', randomInAnima);
  _.set(factory, 'isInAnimaExist', isInAnimaExist);
  _.set(factory, 'randomOutAnima', randomOutAnima);
  _.set(factory, 'isOutAnimaExist', isOutAnimaExist);
  _.set(factory, 'ranodmTriggerAnima', ranodmTriggerAnima);
  _.set(factory, 'isTriggerAnimaExist', isTriggerAnimaExist);

}(AnimaFactory, MyRandom));

export default AnimaFactory;
export {AnimaElementsClassName, Enum_AnimaType, Style_AnimaItemActive, Style_AnimaItemUnactive};
