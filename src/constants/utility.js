import _ from 'lodash';

const CreateMyRandomParam = {
  'values': [],
  'maxvalue': null,
  'minvalue': null,
};

function MyRandom () {
  this._initBuffer = [];
  this._buffer = [];
  this._minvalue = null;
  this._maxvalue = null;
}

MyRandom.prototype.init = function(a_Array, a_Max, a_Min = 0) {
  this.clear();  
  if(!_.isArray(a_Array)) {
    return false;
  }
  this._initBuffer = _.clone(a_Array);
  this._maxvalue = Number.isInteger(a_Max) ?
    Math.min(this._initBuffer.length, a_Max) : this._initBuffer.length;
  this._minvalue = Number.isInteger(a_Min) ?
    Math.max(0, a_Min) : 0;
  this.reset();
  return true;
};

MyRandom.prototype.clear = function() {
  this._initBuffer = [];
  this._buffer = [];
  this._minvalue = null;
  this._maxvalue = null;
};

MyRandom.prototype.reset = function() {
  this._buffer = [];
  let tmpBuffer = [], _i_tmpBuffer = this._minvalue;
  while(_i_tmpBuffer <= this._maxvalue) {
    this._buffer.push(_i_tmpBuffer);
    tmpBuffer.push(_i_tmpBuffer);
    _i_tmpBuffer += 1;
  }
  let _r, _i_buffer = 0, _legnth_buffer = tmpBuffer.length;
  while(_i_buffer <= _legnth_buffer) {
    _r = _.random(0, tmpBuffer.length, false);
    _.set(this._buffer, _i_buffer, _r);
    _.pullAt(tmpBuffer, [_r]);
    _i_buffer += 1;
  }
};

MyRandom.prototype.isEmpty = function() {
  return 0 === this._buffer.length;
};

MyRandom.prototype.next = function() {
  let index = this._buffer.pop();
  if(this.isEmpty()) {
    this.reset();
   }
  return this._initBuffer[index];
};

MyRandom.prototype.nextIndex = function () {
  let index = this._buffer.pop();
  if(this.isEmpty()) {
    this.reset();
  }
  return index;
};

MyRandom.prototype.getByIdex = function (a_Index) {
  let value = null;
  if(_.isInteger(a_Index) && _.has(this._initBuffer, a_Index)) {
    value = this._initBuffer[a_Index];
  }
  return value;
};

MyRandom.create = function (a_Param, a_Max, a_Min) {
  let inputParam = _.cloneDeep(CreateMyRandomParam);
  if(_.isArray(a_Param)) {
    inputParam.values = _.union(inputParam.values, a_Param);
  } else {
    _.forEach(a_Param, function(v, k) {
      if(_.has(inputParam, k)) {
        _.set(inputParam, k, v);
      }
    });
  }
  let _r = new MyRandom();
  return _r.init(inputParam.values, inputParam.maxvalue, inputParam.minvalue) ? _r : null;
};

function MyError(a_Msg) {
  console.error(a_Msg);
  throw a_Msg;
}

const VendorPrefixNames = ['O','ms','Moz',"Webkit"];
function MyVendorPrefix(a_style) {
  let rtn = {    
  }
  rtn[a_style] = a_style;
  let _firstChar = a_style[0].toUpperCase(),
    _style = _firstChar + a_style.substr(1);
  _.each(VendorPrefixNames, (prefix)=>{
    rtn[prefix + _style] = (prefix + _style);
  })
  return rtn;
}

function EncodeByteArrayToDataUrl(data)
{
    var str = data.reduce(function(a,b){ return a+String.fromCharCode(b) },'');
    return btoa(str).replace(/.{76}(?=.)/g,'$&\n');
}

function DataURItoBlob(dataURI) {
  // convert base64/URLEncoded data component to raw binary data held in a string
  var byteString;

  if (dataURI.split(',')[0].indexOf('base64') >= 0)
      byteString = atob(dataURI.split(',')[1]);
  else
      byteString = unescape(dataURI.split(',')[1]);

  // separate out the mime component
  var mimeString = dataURI.split(',')[0].split(':')[1].split(';')[0];

  // write the bytes of the string to a typed array
  var ia = new Uint8Array(byteString.length);

  for (var i = 0; i < byteString.length; i++) {
      ia[i] = byteString.charCodeAt(i);
  }
  return new Blob([ia], {type:mimeString});
}

function BlobToDataURI(blob, callback) {
  var fr = new FileReader();
    fr.onload = function(e) {
        callback(e.target.result);
    };
    fr.readAsDataURL(blob);
}

export {MyRandom, MyError, CreateMyRandomParam, MyVendorPrefix, EncodeByteArrayToDataUrl, DataURItoBlob, BlobToDataURI};