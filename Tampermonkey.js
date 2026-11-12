// ==UserScript==
// @name         ChatGPT Universal Exporter (Markdown Support)
// @name:zh-CN   ChatGPT 通用导出器（Markdown 支持）
// @name:zh-TW   ChatGPT 通用匯出器（Markdown 支援）
// @namespace    https://greasyfork.org/users/1616937-owlct
// @version      1.3.8
// @description  Export ChatGPT conversations from personal, project, and team workspaces to local ZIP archives with JSON, Markdown, assets, and an offline reader.
// @description:zh-CN  将 ChatGPT 个人、项目和团队空间对话导出为本地 ZIP，包含 JSON、Markdown、资源文件和离线阅读器。
// @description:zh-TW  將 ChatGPT 個人、專案和團隊工作區對話匯出為本機 ZIP，包含 JSON、Markdown、資源檔案和離線閱讀器。
// @author       OwlCt
// @license      MIT
// @match        https://chatgpt.com/*
// @match        https://chat.openai.com/*
// @grant        none
// @homepageURL  https://github.com/OwlCt/ChatGPT-Export
// @supportURL   https://github.com/OwlCt/ChatGPT-Export/issues
// @source       https://github.com/OwlCt/ChatGPT-Export
// ==/UserScript==

/* Vendored JSZip 3.10.1. Keep in sync with reader/vendor/jszip.min.js. */
(function installBundledJSZip() {
    // Force the browser-global UMD branch even if the host page exposes an AMD/CommonJS loader.
    const define = undefined;
    const module = undefined;
    const exports = undefined;
    /*!
    
    JSZip v3.10.1 - A JavaScript class for generating and reading zip files
    <http://stuartk.com/jszip>
    
    (c) 2009-2016 Stuart Knightley <stuart [at] stuartk.com>
    Dual licenced under the MIT license or GPLv3. See https://raw.github.com/Stuk/jszip/main/LICENSE.markdown.
    
    JSZip uses the library pako released under the MIT license :
    https://github.com/nodeca/pako/blob/main/LICENSE
    */
    
    !function(e){if("object"==typeof exports&&"undefined"!=typeof module)module.exports=e();else if("function"==typeof define&&define.amd)define([],e);else{("undefined"!=typeof window?window:"undefined"!=typeof global?global:"undefined"!=typeof self?self:this).JSZip=e()}}(function(){return function s(a,o,h){function u(r,e){if(!o[r]){if(!a[r]){var t="function"==typeof require&&require;if(!e&&t)return t(r,!0);if(l)return l(r,!0);var n=new Error("Cannot find module '"+r+"'");throw n.code="MODULE_NOT_FOUND",n}var i=o[r]={exports:{}};a[r][0].call(i.exports,function(e){var t=a[r][1][e];return u(t||e)},i,i.exports,s,a,o,h)}return o[r].exports}for(var l="function"==typeof require&&require,e=0;e<h.length;e++)u(h[e]);return u}({1:[function(e,t,r){"use strict";var d=e("./utils"),c=e("./support"),p="ABCDEFGHIJKLMNOPQRSTUVWXYZabcdefghijklmnopqrstuvwxyz0123456789+/=";r.encode=function(e){for(var t,r,n,i,s,a,o,h=[],u=0,l=e.length,f=l,c="string"!==d.getTypeOf(e);u<e.length;)f=l-u,n=c?(t=e[u++],r=u<l?e[u++]:0,u<l?e[u++]:0):(t=e.charCodeAt(u++),r=u<l?e.charCodeAt(u++):0,u<l?e.charCodeAt(u++):0),i=t>>2,s=(3&t)<<4|r>>4,a=1<f?(15&r)<<2|n>>6:64,o=2<f?63&n:64,h.push(p.charAt(i)+p.charAt(s)+p.charAt(a)+p.charAt(o));return h.join("")},r.decode=function(e){var t,r,n,i,s,a,o=0,h=0,u="data:";if(e.substr(0,u.length)===u)throw new Error("Invalid base64 input, it looks like a data url.");var l,f=3*(e=e.replace(/[^A-Za-z0-9+/=]/g,"")).length/4;if(e.charAt(e.length-1)===p.charAt(64)&&f--,e.charAt(e.length-2)===p.charAt(64)&&f--,f%1!=0)throw new Error("Invalid base64 input, bad content length.");for(l=c.uint8array?new Uint8Array(0|f):new Array(0|f);o<e.length;)t=p.indexOf(e.charAt(o++))<<2|(i=p.indexOf(e.charAt(o++)))>>4,r=(15&i)<<4|(s=p.indexOf(e.charAt(o++)))>>2,n=(3&s)<<6|(a=p.indexOf(e.charAt(o++))),l[h++]=t,64!==s&&(l[h++]=r),64!==a&&(l[h++]=n);return l}},{"./support":30,"./utils":32}],2:[function(e,t,r){"use strict";var n=e("./external"),i=e("./stream/DataWorker"),s=e("./stream/Crc32Probe"),a=e("./stream/DataLengthProbe");function o(e,t,r,n,i){this.compressedSize=e,this.uncompressedSize=t,this.crc32=r,this.compression=n,this.compressedContent=i}o.prototype={getContentWorker:function(){var e=new i(n.Promise.resolve(this.compressedContent)).pipe(this.compression.uncompressWorker()).pipe(new a("data_length")),t=this;return e.on("end",function(){if(this.streamInfo.data_length!==t.uncompressedSize)throw new Error("Bug : uncompressed data size mismatch")}),e},getCompressedWorker:function(){return new i(n.Promise.resolve(this.compressedContent)).withStreamInfo("compressedSize",this.compressedSize).withStreamInfo("uncompressedSize",this.uncompressedSize).withStreamInfo("crc32",this.crc32).withStreamInfo("compression",this.compression)}},o.createWorkerFrom=function(e,t,r){return e.pipe(new s).pipe(new a("uncompressedSize")).pipe(t.compressWorker(r)).pipe(new a("compressedSize")).withStreamInfo("compression",t)},t.exports=o},{"./external":6,"./stream/Crc32Probe":25,"./stream/DataLengthProbe":26,"./stream/DataWorker":27}],3:[function(e,t,r){"use strict";var n=e("./stream/GenericWorker");r.STORE={magic:"\0\0",compressWorker:function(){return new n("STORE compression")},uncompressWorker:function(){return new n("STORE decompression")}},r.DEFLATE=e("./flate")},{"./flate":7,"./stream/GenericWorker":28}],4:[function(e,t,r){"use strict";var n=e("./utils");var o=function(){for(var e,t=[],r=0;r<256;r++){e=r;for(var n=0;n<8;n++)e=1&e?3988292384^e>>>1:e>>>1;t[r]=e}return t}();t.exports=function(e,t){return void 0!==e&&e.length?"string"!==n.getTypeOf(e)?function(e,t,r,n){var i=o,s=n+r;e^=-1;for(var a=n;a<s;a++)e=e>>>8^i[255&(e^t[a])];return-1^e}(0|t,e,e.length,0):function(e,t,r,n){var i=o,s=n+r;e^=-1;for(var a=n;a<s;a++)e=e>>>8^i[255&(e^t.charCodeAt(a))];return-1^e}(0|t,e,e.length,0):0}},{"./utils":32}],5:[function(e,t,r){"use strict";r.base64=!1,r.binary=!1,r.dir=!1,r.createFolders=!0,r.date=null,r.compression=null,r.compressionOptions=null,r.comment=null,r.unixPermissions=null,r.dosPermissions=null},{}],6:[function(e,t,r){"use strict";var n=null;n="undefined"!=typeof Promise?Promise:e("lie"),t.exports={Promise:n}},{lie:37}],7:[function(e,t,r){"use strict";var n="undefined"!=typeof Uint8Array&&"undefined"!=typeof Uint16Array&&"undefined"!=typeof Uint32Array,i=e("pako"),s=e("./utils"),a=e("./stream/GenericWorker"),o=n?"uint8array":"array";function h(e,t){a.call(this,"FlateWorker/"+e),this._pako=null,this._pakoAction=e,this._pakoOptions=t,this.meta={}}r.magic="\b\0",s.inherits(h,a),h.prototype.processChunk=function(e){this.meta=e.meta,null===this._pako&&this._createPako(),this._pako.push(s.transformTo(o,e.data),!1)},h.prototype.flush=function(){a.prototype.flush.call(this),null===this._pako&&this._createPako(),this._pako.push([],!0)},h.prototype.cleanUp=function(){a.prototype.cleanUp.call(this),this._pako=null},h.prototype._createPako=function(){this._pako=new i[this._pakoAction]({raw:!0,level:this._pakoOptions.level||-1});var t=this;this._pako.onData=function(e){t.push({data:e,meta:t.meta})}},r.compressWorker=function(e){return new h("Deflate",e)},r.uncompressWorker=function(){return new h("Inflate",{})}},{"./stream/GenericWorker":28,"./utils":32,pako:38}],8:[function(e,t,r){"use strict";function A(e,t){var r,n="";for(r=0;r<t;r++)n+=String.fromCharCode(255&e),e>>>=8;return n}function n(e,t,r,n,i,s){var a,o,h=e.file,u=e.compression,l=s!==O.utf8encode,f=I.transformTo("string",s(h.name)),c=I.transformTo("string",O.utf8encode(h.name)),d=h.comment,p=I.transformTo("string",s(d)),m=I.transformTo("string",O.utf8encode(d)),_=c.length!==h.name.length,g=m.length!==d.length,b="",v="",y="",w=h.dir,k=h.date,x={crc32:0,compressedSize:0,uncompressedSize:0};t&&!r||(x.crc32=e.crc32,x.compressedSize=e.compressedSize,x.uncompressedSize=e.uncompressedSize);var S=0;t&&(S|=8),l||!_&&!g||(S|=2048);var z=0,C=0;w&&(z|=16),"UNIX"===i?(C=798,z|=function(e,t){var r=e;return e||(r=t?16893:33204),(65535&r)<<16}(h.unixPermissions,w)):(C=20,z|=function(e){return 63&(e||0)}(h.dosPermissions)),a=k.getUTCHours(),a<<=6,a|=k.getUTCMinutes(),a<<=5,a|=k.getUTCSeconds()/2,o=k.getUTCFullYear()-1980,o<<=4,o|=k.getUTCMonth()+1,o<<=5,o|=k.getUTCDate(),_&&(v=A(1,1)+A(B(f),4)+c,b+="up"+A(v.length,2)+v),g&&(y=A(1,1)+A(B(p),4)+m,b+="uc"+A(y.length,2)+y);var E="";return E+="\n\0",E+=A(S,2),E+=u.magic,E+=A(a,2),E+=A(o,2),E+=A(x.crc32,4),E+=A(x.compressedSize,4),E+=A(x.uncompressedSize,4),E+=A(f.length,2),E+=A(b.length,2),{fileRecord:R.LOCAL_FILE_HEADER+E+f+b,dirRecord:R.CENTRAL_FILE_HEADER+A(C,2)+E+A(p.length,2)+"\0\0\0\0"+A(z,4)+A(n,4)+f+b+p}}var I=e("../utils"),i=e("../stream/GenericWorker"),O=e("../utf8"),B=e("../crc32"),R=e("../signature");function s(e,t,r,n){i.call(this,"ZipFileWorker"),this.bytesWritten=0,this.zipComment=t,this.zipPlatform=r,this.encodeFileName=n,this.streamFiles=e,this.accumulate=!1,this.contentBuffer=[],this.dirRecords=[],this.currentSourceOffset=0,this.entriesCount=0,this.currentFile=null,this._sources=[]}I.inherits(s,i),s.prototype.push=function(e){var t=e.meta.percent||0,r=this.entriesCount,n=this._sources.length;this.accumulate?this.contentBuffer.push(e):(this.bytesWritten+=e.data.length,i.prototype.push.call(this,{data:e.data,meta:{currentFile:this.currentFile,percent:r?(t+100*(r-n-1))/r:100}}))},s.prototype.openedSource=function(e){this.currentSourceOffset=this.bytesWritten,this.currentFile=e.file.name;var t=this.streamFiles&&!e.file.dir;if(t){var r=n(e,t,!1,this.currentSourceOffset,this.zipPlatform,this.encodeFileName);this.push({data:r.fileRecord,meta:{percent:0}})}else this.accumulate=!0},s.prototype.closedSource=function(e){this.accumulate=!1;var t=this.streamFiles&&!e.file.dir,r=n(e,t,!0,this.currentSourceOffset,this.zipPlatform,this.encodeFileName);if(this.dirRecords.push(r.dirRecord),t)this.push({data:function(e){return R.DATA_DESCRIPTOR+A(e.crc32,4)+A(e.compressedSize,4)+A(e.uncompressedSize,4)}(e),meta:{percent:100}});else for(this.push({data:r.fileRecord,meta:{percent:0}});this.contentBuffer.length;)this.push(this.contentBuffer.shift());this.currentFile=null},s.prototype.flush=function(){for(var e=this.bytesWritten,t=0;t<this.dirRecords.length;t++)this.push({data:this.dirRecords[t],meta:{percent:100}});var r=this.bytesWritten-e,n=function(e,t,r,n,i){var s=I.transformTo("string",i(n));return R.CENTRAL_DIRECTORY_END+"\0\0\0\0"+A(e,2)+A(e,2)+A(t,4)+A(r,4)+A(s.length,2)+s}(this.dirRecords.length,r,e,this.zipComment,this.encodeFileName);this.push({data:n,meta:{percent:100}})},s.prototype.prepareNextSource=function(){this.previous=this._sources.shift(),this.openedSource(this.previous.streamInfo),this.isPaused?this.previous.pause():this.previous.resume()},s.prototype.registerPrevious=function(e){this._sources.push(e);var t=this;return e.on("data",function(e){t.processChunk(e)}),e.on("end",function(){t.closedSource(t.previous.streamInfo),t._sources.length?t.prepareNextSource():t.end()}),e.on("error",function(e){t.error(e)}),this},s.prototype.resume=function(){return!!i.prototype.resume.call(this)&&(!this.previous&&this._sources.length?(this.prepareNextSource(),!0):this.previous||this._sources.length||this.generatedError?void 0:(this.end(),!0))},s.prototype.error=function(e){var t=this._sources;if(!i.prototype.error.call(this,e))return!1;for(var r=0;r<t.length;r++)try{t[r].error(e)}catch(e){}return!0},s.prototype.lock=function(){i.prototype.lock.call(this);for(var e=this._sources,t=0;t<e.length;t++)e[t].lock()},t.exports=s},{"../crc32":4,"../signature":23,"../stream/GenericWorker":28,"../utf8":31,"../utils":32}],9:[function(e,t,r){"use strict";var u=e("../compressions"),n=e("./ZipFileWorker");r.generateWorker=function(e,a,t){var o=new n(a.streamFiles,t,a.platform,a.encodeFileName),h=0;try{e.forEach(function(e,t){h++;var r=function(e,t){var r=e||t,n=u[r];if(!n)throw new Error(r+" is not a valid compression method !");return n}(t.options.compression,a.compression),n=t.options.compressionOptions||a.compressionOptions||{},i=t.dir,s=t.date;t._compressWorker(r,n).withStreamInfo("file",{name:e,dir:i,date:s,comment:t.comment||"",unixPermissions:t.unixPermissions,dosPermissions:t.dosPermissions}).pipe(o)}),o.entriesCount=h}catch(e){o.error(e)}return o}},{"../compressions":3,"./ZipFileWorker":8}],10:[function(e,t,r){"use strict";function n(){if(!(this instanceof n))return new n;if(arguments.length)throw new Error("The constructor with parameters has been removed in JSZip 3.0, please check the upgrade guide.");this.files=Object.create(null),this.comment=null,this.root="",this.clone=function(){var e=new n;for(var t in this)"function"!=typeof this[t]&&(e[t]=this[t]);return e}}(n.prototype=e("./object")).loadAsync=e("./load"),n.support=e("./support"),n.defaults=e("./defaults"),n.version="3.10.1",n.loadAsync=function(e,t){return(new n).loadAsync(e,t)},n.external=e("./external"),t.exports=n},{"./defaults":5,"./external":6,"./load":11,"./object":15,"./support":30}],11:[function(e,t,r){"use strict";var u=e("./utils"),i=e("./external"),n=e("./utf8"),s=e("./zipEntries"),a=e("./stream/Crc32Probe"),l=e("./nodejsUtils");function f(n){return new i.Promise(function(e,t){var r=n.decompressed.getContentWorker().pipe(new a);r.on("error",function(e){t(e)}).on("end",function(){r.streamInfo.crc32!==n.decompressed.crc32?t(new Error("Corrupted zip : CRC32 mismatch")):e()}).resume()})}t.exports=function(e,o){var h=this;return o=u.extend(o||{},{base64:!1,checkCRC32:!1,optimizedBinaryString:!1,createFolders:!1,decodeFileName:n.utf8decode}),l.isNode&&l.isStream(e)?i.Promise.reject(new Error("JSZip can't accept a stream when loading a zip file.")):u.prepareContent("the loaded zip file",e,!0,o.optimizedBinaryString,o.base64).then(function(e){var t=new s(o);return t.load(e),t}).then(function(e){var t=[i.Promise.resolve(e)],r=e.files;if(o.checkCRC32)for(var n=0;n<r.length;n++)t.push(f(r[n]));return i.Promise.all(t)}).then(function(e){for(var t=e.shift(),r=t.files,n=0;n<r.length;n++){var i=r[n],s=i.fileNameStr,a=u.resolve(i.fileNameStr);h.file(a,i.decompressed,{binary:!0,optimizedBinaryString:!0,date:i.date,dir:i.dir,comment:i.fileCommentStr.length?i.fileCommentStr:null,unixPermissions:i.unixPermissions,dosPermissions:i.dosPermissions,createFolders:o.createFolders}),i.dir||(h.file(a).unsafeOriginalName=s)}return t.zipComment.length&&(h.comment=t.zipComment),h})}},{"./external":6,"./nodejsUtils":14,"./stream/Crc32Probe":25,"./utf8":31,"./utils":32,"./zipEntries":33}],12:[function(e,t,r){"use strict";var n=e("../utils"),i=e("../stream/GenericWorker");function s(e,t){i.call(this,"Nodejs stream input adapter for "+e),this._upstreamEnded=!1,this._bindStream(t)}n.inherits(s,i),s.prototype._bindStream=function(e){var t=this;(this._stream=e).pause(),e.on("data",function(e){t.push({data:e,meta:{percent:0}})}).on("error",function(e){t.isPaused?this.generatedError=e:t.error(e)}).on("end",function(){t.isPaused?t._upstreamEnded=!0:t.end()})},s.prototype.pause=function(){return!!i.prototype.pause.call(this)&&(this._stream.pause(),!0)},s.prototype.resume=function(){return!!i.prototype.resume.call(this)&&(this._upstreamEnded?this.end():this._stream.resume(),!0)},t.exports=s},{"../stream/GenericWorker":28,"../utils":32}],13:[function(e,t,r){"use strict";var i=e("readable-stream").Readable;function n(e,t,r){i.call(this,t),this._helper=e;var n=this;e.on("data",function(e,t){n.push(e)||n._helper.pause(),r&&r(t)}).on("error",function(e){n.emit("error",e)}).on("end",function(){n.push(null)})}e("../utils").inherits(n,i),n.prototype._read=function(){this._helper.resume()},t.exports=n},{"../utils":32,"readable-stream":16}],14:[function(e,t,r){"use strict";t.exports={isNode:"undefined"!=typeof Buffer,newBufferFrom:function(e,t){if(Buffer.from&&Buffer.from!==Uint8Array.from)return Buffer.from(e,t);if("number"==typeof e)throw new Error('The "data" argument must not be a number');return new Buffer(e,t)},allocBuffer:function(e){if(Buffer.alloc)return Buffer.alloc(e);var t=new Buffer(e);return t.fill(0),t},isBuffer:function(e){return Buffer.isBuffer(e)},isStream:function(e){return e&&"function"==typeof e.on&&"function"==typeof e.pause&&"function"==typeof e.resume}}},{}],15:[function(e,t,r){"use strict";function s(e,t,r){var n,i=u.getTypeOf(t),s=u.extend(r||{},f);s.date=s.date||new Date,null!==s.compression&&(s.compression=s.compression.toUpperCase()),"string"==typeof s.unixPermissions&&(s.unixPermissions=parseInt(s.unixPermissions,8)),s.unixPermissions&&16384&s.unixPermissions&&(s.dir=!0),s.dosPermissions&&16&s.dosPermissions&&(s.dir=!0),s.dir&&(e=g(e)),s.createFolders&&(n=_(e))&&b.call(this,n,!0);var a="string"===i&&!1===s.binary&&!1===s.base64;r&&void 0!==r.binary||(s.binary=!a),(t instanceof c&&0===t.uncompressedSize||s.dir||!t||0===t.length)&&(s.base64=!1,s.binary=!0,t="",s.compression="STORE",i="string");var o=null;o=t instanceof c||t instanceof l?t:p.isNode&&p.isStream(t)?new m(e,t):u.prepareContent(e,t,s.binary,s.optimizedBinaryString,s.base64);var h=new d(e,o,s);this.files[e]=h}var i=e("./utf8"),u=e("./utils"),l=e("./stream/GenericWorker"),a=e("./stream/StreamHelper"),f=e("./defaults"),c=e("./compressedObject"),d=e("./zipObject"),o=e("./generate"),p=e("./nodejsUtils"),m=e("./nodejs/NodejsStreamInputAdapter"),_=function(e){"/"===e.slice(-1)&&(e=e.substring(0,e.length-1));var t=e.lastIndexOf("/");return 0<t?e.substring(0,t):""},g=function(e){return"/"!==e.slice(-1)&&(e+="/"),e},b=function(e,t){return t=void 0!==t?t:f.createFolders,e=g(e),this.files[e]||s.call(this,e,null,{dir:!0,createFolders:t}),this.files[e]};function h(e){return"[object RegExp]"===Object.prototype.toString.call(e)}var n={load:function(){throw new Error("This method has been removed in JSZip 3.0, please check the upgrade guide.")},forEach:function(e){var t,r,n;for(t in this.files)n=this.files[t],(r=t.slice(this.root.length,t.length))&&t.slice(0,this.root.length)===this.root&&e(r,n)},filter:function(r){var n=[];return this.forEach(function(e,t){r(e,t)&&n.push(t)}),n},file:function(e,t,r){if(1!==arguments.length)return e=this.root+e,s.call(this,e,t,r),this;if(h(e)){var n=e;return this.filter(function(e,t){return!t.dir&&n.test(e)})}var i=this.files[this.root+e];return i&&!i.dir?i:null},folder:function(r){if(!r)return this;if(h(r))return this.filter(function(e,t){return t.dir&&r.test(e)});var e=this.root+r,t=b.call(this,e),n=this.clone();return n.root=t.name,n},remove:function(r){r=this.root+r;var e=this.files[r];if(e||("/"!==r.slice(-1)&&(r+="/"),e=this.files[r]),e&&!e.dir)delete this.files[r];else for(var t=this.filter(function(e,t){return t.name.slice(0,r.length)===r}),n=0;n<t.length;n++)delete this.files[t[n].name];return this},generate:function(){throw new Error("This method has been removed in JSZip 3.0, please check the upgrade guide.")},generateInternalStream:function(e){var t,r={};try{if((r=u.extend(e||{},{streamFiles:!1,compression:"STORE",compressionOptions:null,type:"",platform:"DOS",comment:null,mimeType:"application/zip",encodeFileName:i.utf8encode})).type=r.type.toLowerCase(),r.compression=r.compression.toUpperCase(),"binarystring"===r.type&&(r.type="string"),!r.type)throw new Error("No output type specified.");u.checkSupport(r.type),"darwin"!==r.platform&&"freebsd"!==r.platform&&"linux"!==r.platform&&"sunos"!==r.platform||(r.platform="UNIX"),"win32"===r.platform&&(r.platform="DOS");var n=r.comment||this.comment||"";t=o.generateWorker(this,r,n)}catch(e){(t=new l("error")).error(e)}return new a(t,r.type||"string",r.mimeType)},generateAsync:function(e,t){return this.generateInternalStream(e).accumulate(t)},generateNodeStream:function(e,t){return(e=e||{}).type||(e.type="nodebuffer"),this.generateInternalStream(e).toNodejsStream(t)}};t.exports=n},{"./compressedObject":2,"./defaults":5,"./generate":9,"./nodejs/NodejsStreamInputAdapter":12,"./nodejsUtils":14,"./stream/GenericWorker":28,"./stream/StreamHelper":29,"./utf8":31,"./utils":32,"./zipObject":35}],16:[function(e,t,r){"use strict";t.exports=e("stream")},{stream:void 0}],17:[function(e,t,r){"use strict";var n=e("./DataReader");function i(e){n.call(this,e);for(var t=0;t<this.data.length;t++)e[t]=255&e[t]}e("../utils").inherits(i,n),i.prototype.byteAt=function(e){return this.data[this.zero+e]},i.prototype.lastIndexOfSignature=function(e){for(var t=e.charCodeAt(0),r=e.charCodeAt(1),n=e.charCodeAt(2),i=e.charCodeAt(3),s=this.length-4;0<=s;--s)if(this.data[s]===t&&this.data[s+1]===r&&this.data[s+2]===n&&this.data[s+3]===i)return s-this.zero;return-1},i.prototype.readAndCheckSignature=function(e){var t=e.charCodeAt(0),r=e.charCodeAt(1),n=e.charCodeAt(2),i=e.charCodeAt(3),s=this.readData(4);return t===s[0]&&r===s[1]&&n===s[2]&&i===s[3]},i.prototype.readData=function(e){if(this.checkOffset(e),0===e)return[];var t=this.data.slice(this.zero+this.index,this.zero+this.index+e);return this.index+=e,t},t.exports=i},{"../utils":32,"./DataReader":18}],18:[function(e,t,r){"use strict";var n=e("../utils");function i(e){this.data=e,this.length=e.length,this.index=0,this.zero=0}i.prototype={checkOffset:function(e){this.checkIndex(this.index+e)},checkIndex:function(e){if(this.length<this.zero+e||e<0)throw new Error("End of data reached (data length = "+this.length+", asked index = "+e+"). Corrupted zip ?")},setIndex:function(e){this.checkIndex(e),this.index=e},skip:function(e){this.setIndex(this.index+e)},byteAt:function(){},readInt:function(e){var t,r=0;for(this.checkOffset(e),t=this.index+e-1;t>=this.index;t--)r=(r<<8)+this.byteAt(t);return this.index+=e,r},readString:function(e){return n.transformTo("string",this.readData(e))},readData:function(){},lastIndexOfSignature:function(){},readAndCheckSignature:function(){},readDate:function(){var e=this.readInt(4);return new Date(Date.UTC(1980+(e>>25&127),(e>>21&15)-1,e>>16&31,e>>11&31,e>>5&63,(31&e)<<1))}},t.exports=i},{"../utils":32}],19:[function(e,t,r){"use strict";var n=e("./Uint8ArrayReader");function i(e){n.call(this,e)}e("../utils").inherits(i,n),i.prototype.readData=function(e){this.checkOffset(e);var t=this.data.slice(this.zero+this.index,this.zero+this.index+e);return this.index+=e,t},t.exports=i},{"../utils":32,"./Uint8ArrayReader":21}],20:[function(e,t,r){"use strict";var n=e("./DataReader");function i(e){n.call(this,e)}e("../utils").inherits(i,n),i.prototype.byteAt=function(e){return this.data.charCodeAt(this.zero+e)},i.prototype.lastIndexOfSignature=function(e){return this.data.lastIndexOf(e)-this.zero},i.prototype.readAndCheckSignature=function(e){return e===this.readData(4)},i.prototype.readData=function(e){this.checkOffset(e);var t=this.data.slice(this.zero+this.index,this.zero+this.index+e);return this.index+=e,t},t.exports=i},{"../utils":32,"./DataReader":18}],21:[function(e,t,r){"use strict";var n=e("./ArrayReader");function i(e){n.call(this,e)}e("../utils").inherits(i,n),i.prototype.readData=function(e){if(this.checkOffset(e),0===e)return new Uint8Array(0);var t=this.data.subarray(this.zero+this.index,this.zero+this.index+e);return this.index+=e,t},t.exports=i},{"../utils":32,"./ArrayReader":17}],22:[function(e,t,r){"use strict";var n=e("../utils"),i=e("../support"),s=e("./ArrayReader"),a=e("./StringReader"),o=e("./NodeBufferReader"),h=e("./Uint8ArrayReader");t.exports=function(e){var t=n.getTypeOf(e);return n.checkSupport(t),"string"!==t||i.uint8array?"nodebuffer"===t?new o(e):i.uint8array?new h(n.transformTo("uint8array",e)):new s(n.transformTo("array",e)):new a(e)}},{"../support":30,"../utils":32,"./ArrayReader":17,"./NodeBufferReader":19,"./StringReader":20,"./Uint8ArrayReader":21}],23:[function(e,t,r){"use strict";r.LOCAL_FILE_HEADER="PK",r.CENTRAL_FILE_HEADER="PK",r.CENTRAL_DIRECTORY_END="PK",r.ZIP64_CENTRAL_DIRECTORY_LOCATOR="PK",r.ZIP64_CENTRAL_DIRECTORY_END="PK",r.DATA_DESCRIPTOR="PK\b"},{}],24:[function(e,t,r){"use strict";var n=e("./GenericWorker"),i=e("../utils");function s(e){n.call(this,"ConvertWorker to "+e),this.destType=e}i.inherits(s,n),s.prototype.processChunk=function(e){this.push({data:i.transformTo(this.destType,e.data),meta:e.meta})},t.exports=s},{"../utils":32,"./GenericWorker":28}],25:[function(e,t,r){"use strict";var n=e("./GenericWorker"),i=e("../crc32");function s(){n.call(this,"Crc32Probe"),this.withStreamInfo("crc32",0)}e("../utils").inherits(s,n),s.prototype.processChunk=function(e){this.streamInfo.crc32=i(e.data,this.streamInfo.crc32||0),this.push(e)},t.exports=s},{"../crc32":4,"../utils":32,"./GenericWorker":28}],26:[function(e,t,r){"use strict";var n=e("../utils"),i=e("./GenericWorker");function s(e){i.call(this,"DataLengthProbe for "+e),this.propName=e,this.withStreamInfo(e,0)}n.inherits(s,i),s.prototype.processChunk=function(e){if(e){var t=this.streamInfo[this.propName]||0;this.streamInfo[this.propName]=t+e.data.length}i.prototype.processChunk.call(this,e)},t.exports=s},{"../utils":32,"./GenericWorker":28}],27:[function(e,t,r){"use strict";var n=e("../utils"),i=e("./GenericWorker");function s(e){i.call(this,"DataWorker");var t=this;this.dataIsReady=!1,this.index=0,this.max=0,this.data=null,this.type="",this._tickScheduled=!1,e.then(function(e){t.dataIsReady=!0,t.data=e,t.max=e&&e.length||0,t.type=n.getTypeOf(e),t.isPaused||t._tickAndRepeat()},function(e){t.error(e)})}n.inherits(s,i),s.prototype.cleanUp=function(){i.prototype.cleanUp.call(this),this.data=null},s.prototype.resume=function(){return!!i.prototype.resume.call(this)&&(!this._tickScheduled&&this.dataIsReady&&(this._tickScheduled=!0,n.delay(this._tickAndRepeat,[],this)),!0)},s.prototype._tickAndRepeat=function(){this._tickScheduled=!1,this.isPaused||this.isFinished||(this._tick(),this.isFinished||(n.delay(this._tickAndRepeat,[],this),this._tickScheduled=!0))},s.prototype._tick=function(){if(this.isPaused||this.isFinished)return!1;var e=null,t=Math.min(this.max,this.index+16384);if(this.index>=this.max)return this.end();switch(this.type){case"string":e=this.data.substring(this.index,t);break;case"uint8array":e=this.data.subarray(this.index,t);break;case"array":case"nodebuffer":e=this.data.slice(this.index,t)}return this.index=t,this.push({data:e,meta:{percent:this.max?this.index/this.max*100:0}})},t.exports=s},{"../utils":32,"./GenericWorker":28}],28:[function(e,t,r){"use strict";function n(e){this.name=e||"default",this.streamInfo={},this.generatedError=null,this.extraStreamInfo={},this.isPaused=!0,this.isFinished=!1,this.isLocked=!1,this._listeners={data:[],end:[],error:[]},this.previous=null}n.prototype={push:function(e){this.emit("data",e)},end:function(){if(this.isFinished)return!1;this.flush();try{this.emit("end"),this.cleanUp(),this.isFinished=!0}catch(e){this.emit("error",e)}return!0},error:function(e){return!this.isFinished&&(this.isPaused?this.generatedError=e:(this.isFinished=!0,this.emit("error",e),this.previous&&this.previous.error(e),this.cleanUp()),!0)},on:function(e,t){return this._listeners[e].push(t),this},cleanUp:function(){this.streamInfo=this.generatedError=this.extraStreamInfo=null,this._listeners=[]},emit:function(e,t){if(this._listeners[e])for(var r=0;r<this._listeners[e].length;r++)this._listeners[e][r].call(this,t)},pipe:function(e){return e.registerPrevious(this)},registerPrevious:function(e){if(this.isLocked)throw new Error("The stream '"+this+"' has already been used.");this.streamInfo=e.streamInfo,this.mergeStreamInfo(),this.previous=e;var t=this;return e.on("data",function(e){t.processChunk(e)}),e.on("end",function(){t.end()}),e.on("error",function(e){t.error(e)}),this},pause:function(){return!this.isPaused&&!this.isFinished&&(this.isPaused=!0,this.previous&&this.previous.pause(),!0)},resume:function(){if(!this.isPaused||this.isFinished)return!1;var e=this.isPaused=!1;return this.generatedError&&(this.error(this.generatedError),e=!0),this.previous&&this.previous.resume(),!e},flush:function(){},processChunk:function(e){this.push(e)},withStreamInfo:function(e,t){return this.extraStreamInfo[e]=t,this.mergeStreamInfo(),this},mergeStreamInfo:function(){for(var e in this.extraStreamInfo)Object.prototype.hasOwnProperty.call(this.extraStreamInfo,e)&&(this.streamInfo[e]=this.extraStreamInfo[e])},lock:function(){if(this.isLocked)throw new Error("The stream '"+this+"' has already been used.");this.isLocked=!0,this.previous&&this.previous.lock()},toString:function(){var e="Worker "+this.name;return this.previous?this.previous+" -> "+e:e}},t.exports=n},{}],29:[function(e,t,r){"use strict";var h=e("../utils"),i=e("./ConvertWorker"),s=e("./GenericWorker"),u=e("../base64"),n=e("../support"),a=e("../external"),o=null;if(n.nodestream)try{o=e("../nodejs/NodejsStreamOutputAdapter")}catch(e){}function l(e,o){return new a.Promise(function(t,r){var n=[],i=e._internalType,s=e._outputType,a=e._mimeType;e.on("data",function(e,t){n.push(e),o&&o(t)}).on("error",function(e){n=[],r(e)}).on("end",function(){try{var e=function(e,t,r){switch(e){case"blob":return h.newBlob(h.transformTo("arraybuffer",t),r);case"base64":return u.encode(t);default:return h.transformTo(e,t)}}(s,function(e,t){var r,n=0,i=null,s=0;for(r=0;r<t.length;r++)s+=t[r].length;switch(e){case"string":return t.join("");case"array":return Array.prototype.concat.apply([],t);case"uint8array":for(i=new Uint8Array(s),r=0;r<t.length;r++)i.set(t[r],n),n+=t[r].length;return i;case"nodebuffer":return Buffer.concat(t);default:throw new Error("concat : unsupported type '"+e+"'")}}(i,n),a);t(e)}catch(e){r(e)}n=[]}).resume()})}function f(e,t,r){var n=t;switch(t){case"blob":case"arraybuffer":n="uint8array";break;case"base64":n="string"}try{this._internalType=n,this._outputType=t,this._mimeType=r,h.checkSupport(n),this._worker=e.pipe(new i(n)),e.lock()}catch(e){this._worker=new s("error"),this._worker.error(e)}}f.prototype={accumulate:function(e){return l(this,e)},on:function(e,t){var r=this;return"data"===e?this._worker.on(e,function(e){t.call(r,e.data,e.meta)}):this._worker.on(e,function(){h.delay(t,arguments,r)}),this},resume:function(){return h.delay(this._worker.resume,[],this._worker),this},pause:function(){return this._worker.pause(),this},toNodejsStream:function(e){if(h.checkSupport("nodestream"),"nodebuffer"!==this._outputType)throw new Error(this._outputType+" is not supported by this method");return new o(this,{objectMode:"nodebuffer"!==this._outputType},e)}},t.exports=f},{"../base64":1,"../external":6,"../nodejs/NodejsStreamOutputAdapter":13,"../support":30,"../utils":32,"./ConvertWorker":24,"./GenericWorker":28}],30:[function(e,t,r){"use strict";if(r.base64=!0,r.array=!0,r.string=!0,r.arraybuffer="undefined"!=typeof ArrayBuffer&&"undefined"!=typeof Uint8Array,r.nodebuffer="undefined"!=typeof Buffer,r.uint8array="undefined"!=typeof Uint8Array,"undefined"==typeof ArrayBuffer)r.blob=!1;else{var n=new ArrayBuffer(0);try{r.blob=0===new Blob([n],{type:"application/zip"}).size}catch(e){try{var i=new(self.BlobBuilder||self.WebKitBlobBuilder||self.MozBlobBuilder||self.MSBlobBuilder);i.append(n),r.blob=0===i.getBlob("application/zip").size}catch(e){r.blob=!1}}}try{r.nodestream=!!e("readable-stream").Readable}catch(e){r.nodestream=!1}},{"readable-stream":16}],31:[function(e,t,s){"use strict";for(var o=e("./utils"),h=e("./support"),r=e("./nodejsUtils"),n=e("./stream/GenericWorker"),u=new Array(256),i=0;i<256;i++)u[i]=252<=i?6:248<=i?5:240<=i?4:224<=i?3:192<=i?2:1;u[254]=u[254]=1;function a(){n.call(this,"utf-8 decode"),this.leftOver=null}function l(){n.call(this,"utf-8 encode")}s.utf8encode=function(e){return h.nodebuffer?r.newBufferFrom(e,"utf-8"):function(e){var t,r,n,i,s,a=e.length,o=0;for(i=0;i<a;i++)55296==(64512&(r=e.charCodeAt(i)))&&i+1<a&&56320==(64512&(n=e.charCodeAt(i+1)))&&(r=65536+(r-55296<<10)+(n-56320),i++),o+=r<128?1:r<2048?2:r<65536?3:4;for(t=h.uint8array?new Uint8Array(o):new Array(o),i=s=0;s<o;i++)55296==(64512&(r=e.charCodeAt(i)))&&i+1<a&&56320==(64512&(n=e.charCodeAt(i+1)))&&(r=65536+(r-55296<<10)+(n-56320),i++),r<128?t[s++]=r:(r<2048?t[s++]=192|r>>>6:(r<65536?t[s++]=224|r>>>12:(t[s++]=240|r>>>18,t[s++]=128|r>>>12&63),t[s++]=128|r>>>6&63),t[s++]=128|63&r);return t}(e)},s.utf8decode=function(e){return h.nodebuffer?o.transformTo("nodebuffer",e).toString("utf-8"):function(e){var t,r,n,i,s=e.length,a=new Array(2*s);for(t=r=0;t<s;)if((n=e[t++])<128)a[r++]=n;else if(4<(i=u[n]))a[r++]=65533,t+=i-1;else{for(n&=2===i?31:3===i?15:7;1<i&&t<s;)n=n<<6|63&e[t++],i--;1<i?a[r++]=65533:n<65536?a[r++]=n:(n-=65536,a[r++]=55296|n>>10&1023,a[r++]=56320|1023&n)}return a.length!==r&&(a.subarray?a=a.subarray(0,r):a.length=r),o.applyFromCharCode(a)}(e=o.transformTo(h.uint8array?"uint8array":"array",e))},o.inherits(a,n),a.prototype.processChunk=function(e){var t=o.transformTo(h.uint8array?"uint8array":"array",e.data);if(this.leftOver&&this.leftOver.length){if(h.uint8array){var r=t;(t=new Uint8Array(r.length+this.leftOver.length)).set(this.leftOver,0),t.set(r,this.leftOver.length)}else t=this.leftOver.concat(t);this.leftOver=null}var n=function(e,t){var r;for((t=t||e.length)>e.length&&(t=e.length),r=t-1;0<=r&&128==(192&e[r]);)r--;return r<0?t:0===r?t:r+u[e[r]]>t?r:t}(t),i=t;n!==t.length&&(h.uint8array?(i=t.subarray(0,n),this.leftOver=t.subarray(n,t.length)):(i=t.slice(0,n),this.leftOver=t.slice(n,t.length))),this.push({data:s.utf8decode(i),meta:e.meta})},a.prototype.flush=function(){this.leftOver&&this.leftOver.length&&(this.push({data:s.utf8decode(this.leftOver),meta:{}}),this.leftOver=null)},s.Utf8DecodeWorker=a,o.inherits(l,n),l.prototype.processChunk=function(e){this.push({data:s.utf8encode(e.data),meta:e.meta})},s.Utf8EncodeWorker=l},{"./nodejsUtils":14,"./stream/GenericWorker":28,"./support":30,"./utils":32}],32:[function(e,t,a){"use strict";var o=e("./support"),h=e("./base64"),r=e("./nodejsUtils"),u=e("./external");function n(e){return e}function l(e,t){for(var r=0;r<e.length;++r)t[r]=255&e.charCodeAt(r);return t}e("setimmediate"),a.newBlob=function(t,r){a.checkSupport("blob");try{return new Blob([t],{type:r})}catch(e){try{var n=new(self.BlobBuilder||self.WebKitBlobBuilder||self.MozBlobBuilder||self.MSBlobBuilder);return n.append(t),n.getBlob(r)}catch(e){throw new Error("Bug : can't construct the Blob.")}}};var i={stringifyByChunk:function(e,t,r){var n=[],i=0,s=e.length;if(s<=r)return String.fromCharCode.apply(null,e);for(;i<s;)"array"===t||"nodebuffer"===t?n.push(String.fromCharCode.apply(null,e.slice(i,Math.min(i+r,s)))):n.push(String.fromCharCode.apply(null,e.subarray(i,Math.min(i+r,s)))),i+=r;return n.join("")},stringifyByChar:function(e){for(var t="",r=0;r<e.length;r++)t+=String.fromCharCode(e[r]);return t},applyCanBeUsed:{uint8array:function(){try{return o.uint8array&&1===String.fromCharCode.apply(null,new Uint8Array(1)).length}catch(e){return!1}}(),nodebuffer:function(){try{return o.nodebuffer&&1===String.fromCharCode.apply(null,r.allocBuffer(1)).length}catch(e){return!1}}()}};function s(e){var t=65536,r=a.getTypeOf(e),n=!0;if("uint8array"===r?n=i.applyCanBeUsed.uint8array:"nodebuffer"===r&&(n=i.applyCanBeUsed.nodebuffer),n)for(;1<t;)try{return i.stringifyByChunk(e,r,t)}catch(e){t=Math.floor(t/2)}return i.stringifyByChar(e)}function f(e,t){for(var r=0;r<e.length;r++)t[r]=e[r];return t}a.applyFromCharCode=s;var c={};c.string={string:n,array:function(e){return l(e,new Array(e.length))},arraybuffer:function(e){return c.string.uint8array(e).buffer},uint8array:function(e){return l(e,new Uint8Array(e.length))},nodebuffer:function(e){return l(e,r.allocBuffer(e.length))}},c.array={string:s,array:n,arraybuffer:function(e){return new Uint8Array(e).buffer},uint8array:function(e){return new Uint8Array(e)},nodebuffer:function(e){return r.newBufferFrom(e)}},c.arraybuffer={string:function(e){return s(new Uint8Array(e))},array:function(e){return f(new Uint8Array(e),new Array(e.byteLength))},arraybuffer:n,uint8array:function(e){return new Uint8Array(e)},nodebuffer:function(e){return r.newBufferFrom(new Uint8Array(e))}},c.uint8array={string:s,array:function(e){return f(e,new Array(e.length))},arraybuffer:function(e){return e.buffer},uint8array:n,nodebuffer:function(e){return r.newBufferFrom(e)}},c.nodebuffer={string:s,array:function(e){return f(e,new Array(e.length))},arraybuffer:function(e){return c.nodebuffer.uint8array(e).buffer},uint8array:function(e){return f(e,new Uint8Array(e.length))},nodebuffer:n},a.transformTo=function(e,t){if(t=t||"",!e)return t;a.checkSupport(e);var r=a.getTypeOf(t);return c[r][e](t)},a.resolve=function(e){for(var t=e.split("/"),r=[],n=0;n<t.length;n++){var i=t[n];"."===i||""===i&&0!==n&&n!==t.length-1||(".."===i?r.pop():r.push(i))}return r.join("/")},a.getTypeOf=function(e){return"string"==typeof e?"string":"[object Array]"===Object.prototype.toString.call(e)?"array":o.nodebuffer&&r.isBuffer(e)?"nodebuffer":o.uint8array&&e instanceof Uint8Array?"uint8array":o.arraybuffer&&e instanceof ArrayBuffer?"arraybuffer":void 0},a.checkSupport=function(e){if(!o[e.toLowerCase()])throw new Error(e+" is not supported by this platform")},a.MAX_VALUE_16BITS=65535,a.MAX_VALUE_32BITS=-1,a.pretty=function(e){var t,r,n="";for(r=0;r<(e||"").length;r++)n+="\\x"+((t=e.charCodeAt(r))<16?"0":"")+t.toString(16).toUpperCase();return n},a.delay=function(e,t,r){setImmediate(function(){e.apply(r||null,t||[])})},a.inherits=function(e,t){function r(){}r.prototype=t.prototype,e.prototype=new r},a.extend=function(){var e,t,r={};for(e=0;e<arguments.length;e++)for(t in arguments[e])Object.prototype.hasOwnProperty.call(arguments[e],t)&&void 0===r[t]&&(r[t]=arguments[e][t]);return r},a.prepareContent=function(r,e,n,i,s){return u.Promise.resolve(e).then(function(n){return o.blob&&(n instanceof Blob||-1!==["[object File]","[object Blob]"].indexOf(Object.prototype.toString.call(n)))&&"undefined"!=typeof FileReader?new u.Promise(function(t,r){var e=new FileReader;e.onload=function(e){t(e.target.result)},e.onerror=function(e){r(e.target.error)},e.readAsArrayBuffer(n)}):n}).then(function(e){var t=a.getTypeOf(e);return t?("arraybuffer"===t?e=a.transformTo("uint8array",e):"string"===t&&(s?e=h.decode(e):n&&!0!==i&&(e=function(e){return l(e,o.uint8array?new Uint8Array(e.length):new Array(e.length))}(e))),e):u.Promise.reject(new Error("Can't read the data of '"+r+"'. Is it in a supported JavaScript type (String, Blob, ArrayBuffer, etc) ?"))})}},{"./base64":1,"./external":6,"./nodejsUtils":14,"./support":30,setimmediate:54}],33:[function(e,t,r){"use strict";var n=e("./reader/readerFor"),i=e("./utils"),s=e("./signature"),a=e("./zipEntry"),o=e("./support");function h(e){this.files=[],this.loadOptions=e}h.prototype={checkSignature:function(e){if(!this.reader.readAndCheckSignature(e)){this.reader.index-=4;var t=this.reader.readString(4);throw new Error("Corrupted zip or bug: unexpected signature ("+i.pretty(t)+", expected "+i.pretty(e)+")")}},isSignature:function(e,t){var r=this.reader.index;this.reader.setIndex(e);var n=this.reader.readString(4)===t;return this.reader.setIndex(r),n},readBlockEndOfCentral:function(){this.diskNumber=this.reader.readInt(2),this.diskWithCentralDirStart=this.reader.readInt(2),this.centralDirRecordsOnThisDisk=this.reader.readInt(2),this.centralDirRecords=this.reader.readInt(2),this.centralDirSize=this.reader.readInt(4),this.centralDirOffset=this.reader.readInt(4),this.zipCommentLength=this.reader.readInt(2);var e=this.reader.readData(this.zipCommentLength),t=o.uint8array?"uint8array":"array",r=i.transformTo(t,e);this.zipComment=this.loadOptions.decodeFileName(r)},readBlockZip64EndOfCentral:function(){this.zip64EndOfCentralSize=this.reader.readInt(8),this.reader.skip(4),this.diskNumber=this.reader.readInt(4),this.diskWithCentralDirStart=this.reader.readInt(4),this.centralDirRecordsOnThisDisk=this.reader.readInt(8),this.centralDirRecords=this.reader.readInt(8),this.centralDirSize=this.reader.readInt(8),this.centralDirOffset=this.reader.readInt(8),this.zip64ExtensibleData={};for(var e,t,r,n=this.zip64EndOfCentralSize-44;0<n;)e=this.reader.readInt(2),t=this.reader.readInt(4),r=this.reader.readData(t),this.zip64ExtensibleData[e]={id:e,length:t,value:r}},readBlockZip64EndOfCentralLocator:function(){if(this.diskWithZip64CentralDirStart=this.reader.readInt(4),this.relativeOffsetEndOfZip64CentralDir=this.reader.readInt(8),this.disksCount=this.reader.readInt(4),1<this.disksCount)throw new Error("Multi-volumes zip are not supported")},readLocalFiles:function(){var e,t;for(e=0;e<this.files.length;e++)t=this.files[e],this.reader.setIndex(t.localHeaderOffset),this.checkSignature(s.LOCAL_FILE_HEADER),t.readLocalPart(this.reader),t.handleUTF8(),t.processAttributes()},readCentralDir:function(){var e;for(this.reader.setIndex(this.centralDirOffset);this.reader.readAndCheckSignature(s.CENTRAL_FILE_HEADER);)(e=new a({zip64:this.zip64},this.loadOptions)).readCentralPart(this.reader),this.files.push(e);if(this.centralDirRecords!==this.files.length&&0!==this.centralDirRecords&&0===this.files.length)throw new Error("Corrupted zip or bug: expected "+this.centralDirRecords+" records in central dir, got "+this.files.length)},readEndOfCentral:function(){var e=this.reader.lastIndexOfSignature(s.CENTRAL_DIRECTORY_END);if(e<0)throw!this.isSignature(0,s.LOCAL_FILE_HEADER)?new Error("Can't find end of central directory : is this a zip file ? If it is, see https://stuk.github.io/jszip/documentation/howto/read_zip.html"):new Error("Corrupted zip: can't find end of central directory");this.reader.setIndex(e);var t=e;if(this.checkSignature(s.CENTRAL_DIRECTORY_END),this.readBlockEndOfCentral(),this.diskNumber===i.MAX_VALUE_16BITS||this.diskWithCentralDirStart===i.MAX_VALUE_16BITS||this.centralDirRecordsOnThisDisk===i.MAX_VALUE_16BITS||this.centralDirRecords===i.MAX_VALUE_16BITS||this.centralDirSize===i.MAX_VALUE_32BITS||this.centralDirOffset===i.MAX_VALUE_32BITS){if(this.zip64=!0,(e=this.reader.lastIndexOfSignature(s.ZIP64_CENTRAL_DIRECTORY_LOCATOR))<0)throw new Error("Corrupted zip: can't find the ZIP64 end of central directory locator");if(this.reader.setIndex(e),this.checkSignature(s.ZIP64_CENTRAL_DIRECTORY_LOCATOR),this.readBlockZip64EndOfCentralLocator(),!this.isSignature(this.relativeOffsetEndOfZip64CentralDir,s.ZIP64_CENTRAL_DIRECTORY_END)&&(this.relativeOffsetEndOfZip64CentralDir=this.reader.lastIndexOfSignature(s.ZIP64_CENTRAL_DIRECTORY_END),this.relativeOffsetEndOfZip64CentralDir<0))throw new Error("Corrupted zip: can't find the ZIP64 end of central directory");this.reader.setIndex(this.relativeOffsetEndOfZip64CentralDir),this.checkSignature(s.ZIP64_CENTRAL_DIRECTORY_END),this.readBlockZip64EndOfCentral()}var r=this.centralDirOffset+this.centralDirSize;this.zip64&&(r+=20,r+=12+this.zip64EndOfCentralSize);var n=t-r;if(0<n)this.isSignature(t,s.CENTRAL_FILE_HEADER)||(this.reader.zero=n);else if(n<0)throw new Error("Corrupted zip: missing "+Math.abs(n)+" bytes.")},prepareReader:function(e){this.reader=n(e)},load:function(e){this.prepareReader(e),this.readEndOfCentral(),this.readCentralDir(),this.readLocalFiles()}},t.exports=h},{"./reader/readerFor":22,"./signature":23,"./support":30,"./utils":32,"./zipEntry":34}],34:[function(e,t,r){"use strict";var n=e("./reader/readerFor"),s=e("./utils"),i=e("./compressedObject"),a=e("./crc32"),o=e("./utf8"),h=e("./compressions"),u=e("./support");function l(e,t){this.options=e,this.loadOptions=t}l.prototype={isEncrypted:function(){return 1==(1&this.bitFlag)},useUTF8:function(){return 2048==(2048&this.bitFlag)},readLocalPart:function(e){var t,r;if(e.skip(22),this.fileNameLength=e.readInt(2),r=e.readInt(2),this.fileName=e.readData(this.fileNameLength),e.skip(r),-1===this.compressedSize||-1===this.uncompressedSize)throw new Error("Bug or corrupted zip : didn't get enough information from the central directory (compressedSize === -1 || uncompressedSize === -1)");if(null===(t=function(e){for(var t in h)if(Object.prototype.hasOwnProperty.call(h,t)&&h[t].magic===e)return h[t];return null}(this.compressionMethod)))throw new Error("Corrupted zip : compression "+s.pretty(this.compressionMethod)+" unknown (inner file : "+s.transformTo("string",this.fileName)+")");this.decompressed=new i(this.compressedSize,this.uncompressedSize,this.crc32,t,e.readData(this.compressedSize))},readCentralPart:function(e){this.versionMadeBy=e.readInt(2),e.skip(2),this.bitFlag=e.readInt(2),this.compressionMethod=e.readString(2),this.date=e.readDate(),this.crc32=e.readInt(4),this.compressedSize=e.readInt(4),this.uncompressedSize=e.readInt(4);var t=e.readInt(2);if(this.extraFieldsLength=e.readInt(2),this.fileCommentLength=e.readInt(2),this.diskNumberStart=e.readInt(2),this.internalFileAttributes=e.readInt(2),this.externalFileAttributes=e.readInt(4),this.localHeaderOffset=e.readInt(4),this.isEncrypted())throw new Error("Encrypted zip are not supported");e.skip(t),this.readExtraFields(e),this.parseZIP64ExtraField(e),this.fileComment=e.readData(this.fileCommentLength)},processAttributes:function(){this.unixPermissions=null,this.dosPermissions=null;var e=this.versionMadeBy>>8;this.dir=!!(16&this.externalFileAttributes),0==e&&(this.dosPermissions=63&this.externalFileAttributes),3==e&&(this.unixPermissions=this.externalFileAttributes>>16&65535),this.dir||"/"!==this.fileNameStr.slice(-1)||(this.dir=!0)},parseZIP64ExtraField:function(){if(this.extraFields[1]){var e=n(this.extraFields[1].value);this.uncompressedSize===s.MAX_VALUE_32BITS&&(this.uncompressedSize=e.readInt(8)),this.compressedSize===s.MAX_VALUE_32BITS&&(this.compressedSize=e.readInt(8)),this.localHeaderOffset===s.MAX_VALUE_32BITS&&(this.localHeaderOffset=e.readInt(8)),this.diskNumberStart===s.MAX_VALUE_32BITS&&(this.diskNumberStart=e.readInt(4))}},readExtraFields:function(e){var t,r,n,i=e.index+this.extraFieldsLength;for(this.extraFields||(this.extraFields={});e.index+4<i;)t=e.readInt(2),r=e.readInt(2),n=e.readData(r),this.extraFields[t]={id:t,length:r,value:n};e.setIndex(i)},handleUTF8:function(){var e=u.uint8array?"uint8array":"array";if(this.useUTF8())this.fileNameStr=o.utf8decode(this.fileName),this.fileCommentStr=o.utf8decode(this.fileComment);else{var t=this.findExtraFieldUnicodePath();if(null!==t)this.fileNameStr=t;else{var r=s.transformTo(e,this.fileName);this.fileNameStr=this.loadOptions.decodeFileName(r)}var n=this.findExtraFieldUnicodeComment();if(null!==n)this.fileCommentStr=n;else{var i=s.transformTo(e,this.fileComment);this.fileCommentStr=this.loadOptions.decodeFileName(i)}}},findExtraFieldUnicodePath:function(){var e=this.extraFields[28789];if(e){var t=n(e.value);return 1!==t.readInt(1)?null:a(this.fileName)!==t.readInt(4)?null:o.utf8decode(t.readData(e.length-5))}return null},findExtraFieldUnicodeComment:function(){var e=this.extraFields[25461];if(e){var t=n(e.value);return 1!==t.readInt(1)?null:a(this.fileComment)!==t.readInt(4)?null:o.utf8decode(t.readData(e.length-5))}return null}},t.exports=l},{"./compressedObject":2,"./compressions":3,"./crc32":4,"./reader/readerFor":22,"./support":30,"./utf8":31,"./utils":32}],35:[function(e,t,r){"use strict";function n(e,t,r){this.name=e,this.dir=r.dir,this.date=r.date,this.comment=r.comment,this.unixPermissions=r.unixPermissions,this.dosPermissions=r.dosPermissions,this._data=t,this._dataBinary=r.binary,this.options={compression:r.compression,compressionOptions:r.compressionOptions}}var s=e("./stream/StreamHelper"),i=e("./stream/DataWorker"),a=e("./utf8"),o=e("./compressedObject"),h=e("./stream/GenericWorker");n.prototype={internalStream:function(e){var t=null,r="string";try{if(!e)throw new Error("No output type specified.");var n="string"===(r=e.toLowerCase())||"text"===r;"binarystring"!==r&&"text"!==r||(r="string"),t=this._decompressWorker();var i=!this._dataBinary;i&&!n&&(t=t.pipe(new a.Utf8EncodeWorker)),!i&&n&&(t=t.pipe(new a.Utf8DecodeWorker))}catch(e){(t=new h("error")).error(e)}return new s(t,r,"")},async:function(e,t){return this.internalStream(e).accumulate(t)},nodeStream:function(e,t){return this.internalStream(e||"nodebuffer").toNodejsStream(t)},_compressWorker:function(e,t){if(this._data instanceof o&&this._data.compression.magic===e.magic)return this._data.getCompressedWorker();var r=this._decompressWorker();return this._dataBinary||(r=r.pipe(new a.Utf8EncodeWorker)),o.createWorkerFrom(r,e,t)},_decompressWorker:function(){return this._data instanceof o?this._data.getContentWorker():this._data instanceof h?this._data:new i(this._data)}};for(var u=["asText","asBinary","asNodeBuffer","asUint8Array","asArrayBuffer"],l=function(){throw new Error("This method has been removed in JSZip 3.0, please check the upgrade guide.")},f=0;f<u.length;f++)n.prototype[u[f]]=l;t.exports=n},{"./compressedObject":2,"./stream/DataWorker":27,"./stream/GenericWorker":28,"./stream/StreamHelper":29,"./utf8":31}],36:[function(e,l,t){(function(t){"use strict";var r,n,e=t.MutationObserver||t.WebKitMutationObserver;if(e){var i=0,s=new e(u),a=t.document.createTextNode("");s.observe(a,{characterData:!0}),r=function(){a.data=i=++i%2}}else if(t.setImmediate||void 0===t.MessageChannel)r="document"in t&&"onreadystatechange"in t.document.createElement("script")?function(){var e=t.document.createElement("script");e.onreadystatechange=function(){u(),e.onreadystatechange=null,e.parentNode.removeChild(e),e=null},t.document.documentElement.appendChild(e)}:function(){setTimeout(u,0)};else{var o=new t.MessageChannel;o.port1.onmessage=u,r=function(){o.port2.postMessage(0)}}var h=[];function u(){var e,t;n=!0;for(var r=h.length;r;){for(t=h,h=[],e=-1;++e<r;)t[e]();r=h.length}n=!1}l.exports=function(e){1!==h.push(e)||n||r()}}).call(this,"undefined"!=typeof global?global:"undefined"!=typeof self?self:"undefined"!=typeof window?window:{})},{}],37:[function(e,t,r){"use strict";var i=e("immediate");function u(){}var l={},s=["REJECTED"],a=["FULFILLED"],n=["PENDING"];function o(e){if("function"!=typeof e)throw new TypeError("resolver must be a function");this.state=n,this.queue=[],this.outcome=void 0,e!==u&&d(this,e)}function h(e,t,r){this.promise=e,"function"==typeof t&&(this.onFulfilled=t,this.callFulfilled=this.otherCallFulfilled),"function"==typeof r&&(this.onRejected=r,this.callRejected=this.otherCallRejected)}function f(t,r,n){i(function(){var e;try{e=r(n)}catch(e){return l.reject(t,e)}e===t?l.reject(t,new TypeError("Cannot resolve promise with itself")):l.resolve(t,e)})}function c(e){var t=e&&e.then;if(e&&("object"==typeof e||"function"==typeof e)&&"function"==typeof t)return function(){t.apply(e,arguments)}}function d(t,e){var r=!1;function n(e){r||(r=!0,l.reject(t,e))}function i(e){r||(r=!0,l.resolve(t,e))}var s=p(function(){e(i,n)});"error"===s.status&&n(s.value)}function p(e,t){var r={};try{r.value=e(t),r.status="success"}catch(e){r.status="error",r.value=e}return r}(t.exports=o).prototype.finally=function(t){if("function"!=typeof t)return this;var r=this.constructor;return this.then(function(e){return r.resolve(t()).then(function(){return e})},function(e){return r.resolve(t()).then(function(){throw e})})},o.prototype.catch=function(e){return this.then(null,e)},o.prototype.then=function(e,t){if("function"!=typeof e&&this.state===a||"function"!=typeof t&&this.state===s)return this;var r=new this.constructor(u);this.state!==n?f(r,this.state===a?e:t,this.outcome):this.queue.push(new h(r,e,t));return r},h.prototype.callFulfilled=function(e){l.resolve(this.promise,e)},h.prototype.otherCallFulfilled=function(e){f(this.promise,this.onFulfilled,e)},h.prototype.callRejected=function(e){l.reject(this.promise,e)},h.prototype.otherCallRejected=function(e){f(this.promise,this.onRejected,e)},l.resolve=function(e,t){var r=p(c,t);if("error"===r.status)return l.reject(e,r.value);var n=r.value;if(n)d(e,n);else{e.state=a,e.outcome=t;for(var i=-1,s=e.queue.length;++i<s;)e.queue[i].callFulfilled(t)}return e},l.reject=function(e,t){e.state=s,e.outcome=t;for(var r=-1,n=e.queue.length;++r<n;)e.queue[r].callRejected(t);return e},o.resolve=function(e){if(e instanceof this)return e;return l.resolve(new this(u),e)},o.reject=function(e){var t=new this(u);return l.reject(t,e)},o.all=function(e){var r=this;if("[object Array]"!==Object.prototype.toString.call(e))return this.reject(new TypeError("must be an array"));var n=e.length,i=!1;if(!n)return this.resolve([]);var s=new Array(n),a=0,t=-1,o=new this(u);for(;++t<n;)h(e[t],t);return o;function h(e,t){r.resolve(e).then(function(e){s[t]=e,++a!==n||i||(i=!0,l.resolve(o,s))},function(e){i||(i=!0,l.reject(o,e))})}},o.race=function(e){var t=this;if("[object Array]"!==Object.prototype.toString.call(e))return this.reject(new TypeError("must be an array"));var r=e.length,n=!1;if(!r)return this.resolve([]);var i=-1,s=new this(u);for(;++i<r;)a=e[i],t.resolve(a).then(function(e){n||(n=!0,l.resolve(s,e))},function(e){n||(n=!0,l.reject(s,e))});var a;return s}},{immediate:36}],38:[function(e,t,r){"use strict";var n={};(0,e("./lib/utils/common").assign)(n,e("./lib/deflate"),e("./lib/inflate"),e("./lib/zlib/constants")),t.exports=n},{"./lib/deflate":39,"./lib/inflate":40,"./lib/utils/common":41,"./lib/zlib/constants":44}],39:[function(e,t,r){"use strict";var a=e("./zlib/deflate"),o=e("./utils/common"),h=e("./utils/strings"),i=e("./zlib/messages"),s=e("./zlib/zstream"),u=Object.prototype.toString,l=0,f=-1,c=0,d=8;function p(e){if(!(this instanceof p))return new p(e);this.options=o.assign({level:f,method:d,chunkSize:16384,windowBits:15,memLevel:8,strategy:c,to:""},e||{});var t=this.options;t.raw&&0<t.windowBits?t.windowBits=-t.windowBits:t.gzip&&0<t.windowBits&&t.windowBits<16&&(t.windowBits+=16),this.err=0,this.msg="",this.ended=!1,this.chunks=[],this.strm=new s,this.strm.avail_out=0;var r=a.deflateInit2(this.strm,t.level,t.method,t.windowBits,t.memLevel,t.strategy);if(r!==l)throw new Error(i[r]);if(t.header&&a.deflateSetHeader(this.strm,t.header),t.dictionary){var n;if(n="string"==typeof t.dictionary?h.string2buf(t.dictionary):"[object ArrayBuffer]"===u.call(t.dictionary)?new Uint8Array(t.dictionary):t.dictionary,(r=a.deflateSetDictionary(this.strm,n))!==l)throw new Error(i[r]);this._dict_set=!0}}function n(e,t){var r=new p(t);if(r.push(e,!0),r.err)throw r.msg||i[r.err];return r.result}p.prototype.push=function(e,t){var r,n,i=this.strm,s=this.options.chunkSize;if(this.ended)return!1;n=t===~~t?t:!0===t?4:0,"string"==typeof e?i.input=h.string2buf(e):"[object ArrayBuffer]"===u.call(e)?i.input=new Uint8Array(e):i.input=e,i.next_in=0,i.avail_in=i.input.length;do{if(0===i.avail_out&&(i.output=new o.Buf8(s),i.next_out=0,i.avail_out=s),1!==(r=a.deflate(i,n))&&r!==l)return this.onEnd(r),!(this.ended=!0);0!==i.avail_out&&(0!==i.avail_in||4!==n&&2!==n)||("string"===this.options.to?this.onData(h.buf2binstring(o.shrinkBuf(i.output,i.next_out))):this.onData(o.shrinkBuf(i.output,i.next_out)))}while((0<i.avail_in||0===i.avail_out)&&1!==r);return 4===n?(r=a.deflateEnd(this.strm),this.onEnd(r),this.ended=!0,r===l):2!==n||(this.onEnd(l),!(i.avail_out=0))},p.prototype.onData=function(e){this.chunks.push(e)},p.prototype.onEnd=function(e){e===l&&("string"===this.options.to?this.result=this.chunks.join(""):this.result=o.flattenChunks(this.chunks)),this.chunks=[],this.err=e,this.msg=this.strm.msg},r.Deflate=p,r.deflate=n,r.deflateRaw=function(e,t){return(t=t||{}).raw=!0,n(e,t)},r.gzip=function(e,t){return(t=t||{}).gzip=!0,n(e,t)}},{"./utils/common":41,"./utils/strings":42,"./zlib/deflate":46,"./zlib/messages":51,"./zlib/zstream":53}],40:[function(e,t,r){"use strict";var c=e("./zlib/inflate"),d=e("./utils/common"),p=e("./utils/strings"),m=e("./zlib/constants"),n=e("./zlib/messages"),i=e("./zlib/zstream"),s=e("./zlib/gzheader"),_=Object.prototype.toString;function a(e){if(!(this instanceof a))return new a(e);this.options=d.assign({chunkSize:16384,windowBits:0,to:""},e||{});var t=this.options;t.raw&&0<=t.windowBits&&t.windowBits<16&&(t.windowBits=-t.windowBits,0===t.windowBits&&(t.windowBits=-15)),!(0<=t.windowBits&&t.windowBits<16)||e&&e.windowBits||(t.windowBits+=32),15<t.windowBits&&t.windowBits<48&&0==(15&t.windowBits)&&(t.windowBits|=15),this.err=0,this.msg="",this.ended=!1,this.chunks=[],this.strm=new i,this.strm.avail_out=0;var r=c.inflateInit2(this.strm,t.windowBits);if(r!==m.Z_OK)throw new Error(n[r]);this.header=new s,c.inflateGetHeader(this.strm,this.header)}function o(e,t){var r=new a(t);if(r.push(e,!0),r.err)throw r.msg||n[r.err];return r.result}a.prototype.push=function(e,t){var r,n,i,s,a,o,h=this.strm,u=this.options.chunkSize,l=this.options.dictionary,f=!1;if(this.ended)return!1;n=t===~~t?t:!0===t?m.Z_FINISH:m.Z_NO_FLUSH,"string"==typeof e?h.input=p.binstring2buf(e):"[object ArrayBuffer]"===_.call(e)?h.input=new Uint8Array(e):h.input=e,h.next_in=0,h.avail_in=h.input.length;do{if(0===h.avail_out&&(h.output=new d.Buf8(u),h.next_out=0,h.avail_out=u),(r=c.inflate(h,m.Z_NO_FLUSH))===m.Z_NEED_DICT&&l&&(o="string"==typeof l?p.string2buf(l):"[object ArrayBuffer]"===_.call(l)?new Uint8Array(l):l,r=c.inflateSetDictionary(this.strm,o)),r===m.Z_BUF_ERROR&&!0===f&&(r=m.Z_OK,f=!1),r!==m.Z_STREAM_END&&r!==m.Z_OK)return this.onEnd(r),!(this.ended=!0);h.next_out&&(0!==h.avail_out&&r!==m.Z_STREAM_END&&(0!==h.avail_in||n!==m.Z_FINISH&&n!==m.Z_SYNC_FLUSH)||("string"===this.options.to?(i=p.utf8border(h.output,h.next_out),s=h.next_out-i,a=p.buf2string(h.output,i),h.next_out=s,h.avail_out=u-s,s&&d.arraySet(h.output,h.output,i,s,0),this.onData(a)):this.onData(d.shrinkBuf(h.output,h.next_out)))),0===h.avail_in&&0===h.avail_out&&(f=!0)}while((0<h.avail_in||0===h.avail_out)&&r!==m.Z_STREAM_END);return r===m.Z_STREAM_END&&(n=m.Z_FINISH),n===m.Z_FINISH?(r=c.inflateEnd(this.strm),this.onEnd(r),this.ended=!0,r===m.Z_OK):n!==m.Z_SYNC_FLUSH||(this.onEnd(m.Z_OK),!(h.avail_out=0))},a.prototype.onData=function(e){this.chunks.push(e)},a.prototype.onEnd=function(e){e===m.Z_OK&&("string"===this.options.to?this.result=this.chunks.join(""):this.result=d.flattenChunks(this.chunks)),this.chunks=[],this.err=e,this.msg=this.strm.msg},r.Inflate=a,r.inflate=o,r.inflateRaw=function(e,t){return(t=t||{}).raw=!0,o(e,t)},r.ungzip=o},{"./utils/common":41,"./utils/strings":42,"./zlib/constants":44,"./zlib/gzheader":47,"./zlib/inflate":49,"./zlib/messages":51,"./zlib/zstream":53}],41:[function(e,t,r){"use strict";var n="undefined"!=typeof Uint8Array&&"undefined"!=typeof Uint16Array&&"undefined"!=typeof Int32Array;r.assign=function(e){for(var t=Array.prototype.slice.call(arguments,1);t.length;){var r=t.shift();if(r){if("object"!=typeof r)throw new TypeError(r+"must be non-object");for(var n in r)r.hasOwnProperty(n)&&(e[n]=r[n])}}return e},r.shrinkBuf=function(e,t){return e.length===t?e:e.subarray?e.subarray(0,t):(e.length=t,e)};var i={arraySet:function(e,t,r,n,i){if(t.subarray&&e.subarray)e.set(t.subarray(r,r+n),i);else for(var s=0;s<n;s++)e[i+s]=t[r+s]},flattenChunks:function(e){var t,r,n,i,s,a;for(t=n=0,r=e.length;t<r;t++)n+=e[t].length;for(a=new Uint8Array(n),t=i=0,r=e.length;t<r;t++)s=e[t],a.set(s,i),i+=s.length;return a}},s={arraySet:function(e,t,r,n,i){for(var s=0;s<n;s++)e[i+s]=t[r+s]},flattenChunks:function(e){return[].concat.apply([],e)}};r.setTyped=function(e){e?(r.Buf8=Uint8Array,r.Buf16=Uint16Array,r.Buf32=Int32Array,r.assign(r,i)):(r.Buf8=Array,r.Buf16=Array,r.Buf32=Array,r.assign(r,s))},r.setTyped(n)},{}],42:[function(e,t,r){"use strict";var h=e("./common"),i=!0,s=!0;try{String.fromCharCode.apply(null,[0])}catch(e){i=!1}try{String.fromCharCode.apply(null,new Uint8Array(1))}catch(e){s=!1}for(var u=new h.Buf8(256),n=0;n<256;n++)u[n]=252<=n?6:248<=n?5:240<=n?4:224<=n?3:192<=n?2:1;function l(e,t){if(t<65537&&(e.subarray&&s||!e.subarray&&i))return String.fromCharCode.apply(null,h.shrinkBuf(e,t));for(var r="",n=0;n<t;n++)r+=String.fromCharCode(e[n]);return r}u[254]=u[254]=1,r.string2buf=function(e){var t,r,n,i,s,a=e.length,o=0;for(i=0;i<a;i++)55296==(64512&(r=e.charCodeAt(i)))&&i+1<a&&56320==(64512&(n=e.charCodeAt(i+1)))&&(r=65536+(r-55296<<10)+(n-56320),i++),o+=r<128?1:r<2048?2:r<65536?3:4;for(t=new h.Buf8(o),i=s=0;s<o;i++)55296==(64512&(r=e.charCodeAt(i)))&&i+1<a&&56320==(64512&(n=e.charCodeAt(i+1)))&&(r=65536+(r-55296<<10)+(n-56320),i++),r<128?t[s++]=r:(r<2048?t[s++]=192|r>>>6:(r<65536?t[s++]=224|r>>>12:(t[s++]=240|r>>>18,t[s++]=128|r>>>12&63),t[s++]=128|r>>>6&63),t[s++]=128|63&r);return t},r.buf2binstring=function(e){return l(e,e.length)},r.binstring2buf=function(e){for(var t=new h.Buf8(e.length),r=0,n=t.length;r<n;r++)t[r]=e.charCodeAt(r);return t},r.buf2string=function(e,t){var r,n,i,s,a=t||e.length,o=new Array(2*a);for(r=n=0;r<a;)if((i=e[r++])<128)o[n++]=i;else if(4<(s=u[i]))o[n++]=65533,r+=s-1;else{for(i&=2===s?31:3===s?15:7;1<s&&r<a;)i=i<<6|63&e[r++],s--;1<s?o[n++]=65533:i<65536?o[n++]=i:(i-=65536,o[n++]=55296|i>>10&1023,o[n++]=56320|1023&i)}return l(o,n)},r.utf8border=function(e,t){var r;for((t=t||e.length)>e.length&&(t=e.length),r=t-1;0<=r&&128==(192&e[r]);)r--;return r<0?t:0===r?t:r+u[e[r]]>t?r:t}},{"./common":41}],43:[function(e,t,r){"use strict";t.exports=function(e,t,r,n){for(var i=65535&e|0,s=e>>>16&65535|0,a=0;0!==r;){for(r-=a=2e3<r?2e3:r;s=s+(i=i+t[n++]|0)|0,--a;);i%=65521,s%=65521}return i|s<<16|0}},{}],44:[function(e,t,r){"use strict";t.exports={Z_NO_FLUSH:0,Z_PARTIAL_FLUSH:1,Z_SYNC_FLUSH:2,Z_FULL_FLUSH:3,Z_FINISH:4,Z_BLOCK:5,Z_TREES:6,Z_OK:0,Z_STREAM_END:1,Z_NEED_DICT:2,Z_ERRNO:-1,Z_STREAM_ERROR:-2,Z_DATA_ERROR:-3,Z_BUF_ERROR:-5,Z_NO_COMPRESSION:0,Z_BEST_SPEED:1,Z_BEST_COMPRESSION:9,Z_DEFAULT_COMPRESSION:-1,Z_FILTERED:1,Z_HUFFMAN_ONLY:2,Z_RLE:3,Z_FIXED:4,Z_DEFAULT_STRATEGY:0,Z_BINARY:0,Z_TEXT:1,Z_UNKNOWN:2,Z_DEFLATED:8}},{}],45:[function(e,t,r){"use strict";var o=function(){for(var e,t=[],r=0;r<256;r++){e=r;for(var n=0;n<8;n++)e=1&e?3988292384^e>>>1:e>>>1;t[r]=e}return t}();t.exports=function(e,t,r,n){var i=o,s=n+r;e^=-1;for(var a=n;a<s;a++)e=e>>>8^i[255&(e^t[a])];return-1^e}},{}],46:[function(e,t,r){"use strict";var h,c=e("../utils/common"),u=e("./trees"),d=e("./adler32"),p=e("./crc32"),n=e("./messages"),l=0,f=4,m=0,_=-2,g=-1,b=4,i=2,v=8,y=9,s=286,a=30,o=19,w=2*s+1,k=15,x=3,S=258,z=S+x+1,C=42,E=113,A=1,I=2,O=3,B=4;function R(e,t){return e.msg=n[t],t}function T(e){return(e<<1)-(4<e?9:0)}function D(e){for(var t=e.length;0<=--t;)e[t]=0}function F(e){var t=e.state,r=t.pending;r>e.avail_out&&(r=e.avail_out),0!==r&&(c.arraySet(e.output,t.pending_buf,t.pending_out,r,e.next_out),e.next_out+=r,t.pending_out+=r,e.total_out+=r,e.avail_out-=r,t.pending-=r,0===t.pending&&(t.pending_out=0))}function N(e,t){u._tr_flush_block(e,0<=e.block_start?e.block_start:-1,e.strstart-e.block_start,t),e.block_start=e.strstart,F(e.strm)}function U(e,t){e.pending_buf[e.pending++]=t}function P(e,t){e.pending_buf[e.pending++]=t>>>8&255,e.pending_buf[e.pending++]=255&t}function L(e,t){var r,n,i=e.max_chain_length,s=e.strstart,a=e.prev_length,o=e.nice_match,h=e.strstart>e.w_size-z?e.strstart-(e.w_size-z):0,u=e.window,l=e.w_mask,f=e.prev,c=e.strstart+S,d=u[s+a-1],p=u[s+a];e.prev_length>=e.good_match&&(i>>=2),o>e.lookahead&&(o=e.lookahead);do{if(u[(r=t)+a]===p&&u[r+a-1]===d&&u[r]===u[s]&&u[++r]===u[s+1]){s+=2,r++;do{}while(u[++s]===u[++r]&&u[++s]===u[++r]&&u[++s]===u[++r]&&u[++s]===u[++r]&&u[++s]===u[++r]&&u[++s]===u[++r]&&u[++s]===u[++r]&&u[++s]===u[++r]&&s<c);if(n=S-(c-s),s=c-S,a<n){if(e.match_start=t,o<=(a=n))break;d=u[s+a-1],p=u[s+a]}}}while((t=f[t&l])>h&&0!=--i);return a<=e.lookahead?a:e.lookahead}function j(e){var t,r,n,i,s,a,o,h,u,l,f=e.w_size;do{if(i=e.window_size-e.lookahead-e.strstart,e.strstart>=f+(f-z)){for(c.arraySet(e.window,e.window,f,f,0),e.match_start-=f,e.strstart-=f,e.block_start-=f,t=r=e.hash_size;n=e.head[--t],e.head[t]=f<=n?n-f:0,--r;);for(t=r=f;n=e.prev[--t],e.prev[t]=f<=n?n-f:0,--r;);i+=f}if(0===e.strm.avail_in)break;if(a=e.strm,o=e.window,h=e.strstart+e.lookahead,u=i,l=void 0,l=a.avail_in,u<l&&(l=u),r=0===l?0:(a.avail_in-=l,c.arraySet(o,a.input,a.next_in,l,h),1===a.state.wrap?a.adler=d(a.adler,o,l,h):2===a.state.wrap&&(a.adler=p(a.adler,o,l,h)),a.next_in+=l,a.total_in+=l,l),e.lookahead+=r,e.lookahead+e.insert>=x)for(s=e.strstart-e.insert,e.ins_h=e.window[s],e.ins_h=(e.ins_h<<e.hash_shift^e.window[s+1])&e.hash_mask;e.insert&&(e.ins_h=(e.ins_h<<e.hash_shift^e.window[s+x-1])&e.hash_mask,e.prev[s&e.w_mask]=e.head[e.ins_h],e.head[e.ins_h]=s,s++,e.insert--,!(e.lookahead+e.insert<x)););}while(e.lookahead<z&&0!==e.strm.avail_in)}function Z(e,t){for(var r,n;;){if(e.lookahead<z){if(j(e),e.lookahead<z&&t===l)return A;if(0===e.lookahead)break}if(r=0,e.lookahead>=x&&(e.ins_h=(e.ins_h<<e.hash_shift^e.window[e.strstart+x-1])&e.hash_mask,r=e.prev[e.strstart&e.w_mask]=e.head[e.ins_h],e.head[e.ins_h]=e.strstart),0!==r&&e.strstart-r<=e.w_size-z&&(e.match_length=L(e,r)),e.match_length>=x)if(n=u._tr_tally(e,e.strstart-e.match_start,e.match_length-x),e.lookahead-=e.match_length,e.match_length<=e.max_lazy_match&&e.lookahead>=x){for(e.match_length--;e.strstart++,e.ins_h=(e.ins_h<<e.hash_shift^e.window[e.strstart+x-1])&e.hash_mask,r=e.prev[e.strstart&e.w_mask]=e.head[e.ins_h],e.head[e.ins_h]=e.strstart,0!=--e.match_length;);e.strstart++}else e.strstart+=e.match_length,e.match_length=0,e.ins_h=e.window[e.strstart],e.ins_h=(e.ins_h<<e.hash_shift^e.window[e.strstart+1])&e.hash_mask;else n=u._tr_tally(e,0,e.window[e.strstart]),e.lookahead--,e.strstart++;if(n&&(N(e,!1),0===e.strm.avail_out))return A}return e.insert=e.strstart<x-1?e.strstart:x-1,t===f?(N(e,!0),0===e.strm.avail_out?O:B):e.last_lit&&(N(e,!1),0===e.strm.avail_out)?A:I}function W(e,t){for(var r,n,i;;){if(e.lookahead<z){if(j(e),e.lookahead<z&&t===l)return A;if(0===e.lookahead)break}if(r=0,e.lookahead>=x&&(e.ins_h=(e.ins_h<<e.hash_shift^e.window[e.strstart+x-1])&e.hash_mask,r=e.prev[e.strstart&e.w_mask]=e.head[e.ins_h],e.head[e.ins_h]=e.strstart),e.prev_length=e.match_length,e.prev_match=e.match_start,e.match_length=x-1,0!==r&&e.prev_length<e.max_lazy_match&&e.strstart-r<=e.w_size-z&&(e.match_length=L(e,r),e.match_length<=5&&(1===e.strategy||e.match_length===x&&4096<e.strstart-e.match_start)&&(e.match_length=x-1)),e.prev_length>=x&&e.match_length<=e.prev_length){for(i=e.strstart+e.lookahead-x,n=u._tr_tally(e,e.strstart-1-e.prev_match,e.prev_length-x),e.lookahead-=e.prev_length-1,e.prev_length-=2;++e.strstart<=i&&(e.ins_h=(e.ins_h<<e.hash_shift^e.window[e.strstart+x-1])&e.hash_mask,r=e.prev[e.strstart&e.w_mask]=e.head[e.ins_h],e.head[e.ins_h]=e.strstart),0!=--e.prev_length;);if(e.match_available=0,e.match_length=x-1,e.strstart++,n&&(N(e,!1),0===e.strm.avail_out))return A}else if(e.match_available){if((n=u._tr_tally(e,0,e.window[e.strstart-1]))&&N(e,!1),e.strstart++,e.lookahead--,0===e.strm.avail_out)return A}else e.match_available=1,e.strstart++,e.lookahead--}return e.match_available&&(n=u._tr_tally(e,0,e.window[e.strstart-1]),e.match_available=0),e.insert=e.strstart<x-1?e.strstart:x-1,t===f?(N(e,!0),0===e.strm.avail_out?O:B):e.last_lit&&(N(e,!1),0===e.strm.avail_out)?A:I}function M(e,t,r,n,i){this.good_length=e,this.max_lazy=t,this.nice_length=r,this.max_chain=n,this.func=i}function H(){this.strm=null,this.status=0,this.pending_buf=null,this.pending_buf_size=0,this.pending_out=0,this.pending=0,this.wrap=0,this.gzhead=null,this.gzindex=0,this.method=v,this.last_flush=-1,this.w_size=0,this.w_bits=0,this.w_mask=0,this.window=null,this.window_size=0,this.prev=null,this.head=null,this.ins_h=0,this.hash_size=0,this.hash_bits=0,this.hash_mask=0,this.hash_shift=0,this.block_start=0,this.match_length=0,this.prev_match=0,this.match_available=0,this.strstart=0,this.match_start=0,this.lookahead=0,this.prev_length=0,this.max_chain_length=0,this.max_lazy_match=0,this.level=0,this.strategy=0,this.good_match=0,this.nice_match=0,this.dyn_ltree=new c.Buf16(2*w),this.dyn_dtree=new c.Buf16(2*(2*a+1)),this.bl_tree=new c.Buf16(2*(2*o+1)),D(this.dyn_ltree),D(this.dyn_dtree),D(this.bl_tree),this.l_desc=null,this.d_desc=null,this.bl_desc=null,this.bl_count=new c.Buf16(k+1),this.heap=new c.Buf16(2*s+1),D(this.heap),this.heap_len=0,this.heap_max=0,this.depth=new c.Buf16(2*s+1),D(this.depth),this.l_buf=0,this.lit_bufsize=0,this.last_lit=0,this.d_buf=0,this.opt_len=0,this.static_len=0,this.matches=0,this.insert=0,this.bi_buf=0,this.bi_valid=0}function G(e){var t;return e&&e.state?(e.total_in=e.total_out=0,e.data_type=i,(t=e.state).pending=0,t.pending_out=0,t.wrap<0&&(t.wrap=-t.wrap),t.status=t.wrap?C:E,e.adler=2===t.wrap?0:1,t.last_flush=l,u._tr_init(t),m):R(e,_)}function K(e){var t=G(e);return t===m&&function(e){e.window_size=2*e.w_size,D(e.head),e.max_lazy_match=h[e.level].max_lazy,e.good_match=h[e.level].good_length,e.nice_match=h[e.level].nice_length,e.max_chain_length=h[e.level].max_chain,e.strstart=0,e.block_start=0,e.lookahead=0,e.insert=0,e.match_length=e.prev_length=x-1,e.match_available=0,e.ins_h=0}(e.state),t}function Y(e,t,r,n,i,s){if(!e)return _;var a=1;if(t===g&&(t=6),n<0?(a=0,n=-n):15<n&&(a=2,n-=16),i<1||y<i||r!==v||n<8||15<n||t<0||9<t||s<0||b<s)return R(e,_);8===n&&(n=9);var o=new H;return(e.state=o).strm=e,o.wrap=a,o.gzhead=null,o.w_bits=n,o.w_size=1<<o.w_bits,o.w_mask=o.w_size-1,o.hash_bits=i+7,o.hash_size=1<<o.hash_bits,o.hash_mask=o.hash_size-1,o.hash_shift=~~((o.hash_bits+x-1)/x),o.window=new c.Buf8(2*o.w_size),o.head=new c.Buf16(o.hash_size),o.prev=new c.Buf16(o.w_size),o.lit_bufsize=1<<i+6,o.pending_buf_size=4*o.lit_bufsize,o.pending_buf=new c.Buf8(o.pending_buf_size),o.d_buf=1*o.lit_bufsize,o.l_buf=3*o.lit_bufsize,o.level=t,o.strategy=s,o.method=r,K(e)}h=[new M(0,0,0,0,function(e,t){var r=65535;for(r>e.pending_buf_size-5&&(r=e.pending_buf_size-5);;){if(e.lookahead<=1){if(j(e),0===e.lookahead&&t===l)return A;if(0===e.lookahead)break}e.strstart+=e.lookahead,e.lookahead=0;var n=e.block_start+r;if((0===e.strstart||e.strstart>=n)&&(e.lookahead=e.strstart-n,e.strstart=n,N(e,!1),0===e.strm.avail_out))return A;if(e.strstart-e.block_start>=e.w_size-z&&(N(e,!1),0===e.strm.avail_out))return A}return e.insert=0,t===f?(N(e,!0),0===e.strm.avail_out?O:B):(e.strstart>e.block_start&&(N(e,!1),e.strm.avail_out),A)}),new M(4,4,8,4,Z),new M(4,5,16,8,Z),new M(4,6,32,32,Z),new M(4,4,16,16,W),new M(8,16,32,32,W),new M(8,16,128,128,W),new M(8,32,128,256,W),new M(32,128,258,1024,W),new M(32,258,258,4096,W)],r.deflateInit=function(e,t){return Y(e,t,v,15,8,0)},r.deflateInit2=Y,r.deflateReset=K,r.deflateResetKeep=G,r.deflateSetHeader=function(e,t){return e&&e.state?2!==e.state.wrap?_:(e.state.gzhead=t,m):_},r.deflate=function(e,t){var r,n,i,s;if(!e||!e.state||5<t||t<0)return e?R(e,_):_;if(n=e.state,!e.output||!e.input&&0!==e.avail_in||666===n.status&&t!==f)return R(e,0===e.avail_out?-5:_);if(n.strm=e,r=n.last_flush,n.last_flush=t,n.status===C)if(2===n.wrap)e.adler=0,U(n,31),U(n,139),U(n,8),n.gzhead?(U(n,(n.gzhead.text?1:0)+(n.gzhead.hcrc?2:0)+(n.gzhead.extra?4:0)+(n.gzhead.name?8:0)+(n.gzhead.comment?16:0)),U(n,255&n.gzhead.time),U(n,n.gzhead.time>>8&255),U(n,n.gzhead.time>>16&255),U(n,n.gzhead.time>>24&255),U(n,9===n.level?2:2<=n.strategy||n.level<2?4:0),U(n,255&n.gzhead.os),n.gzhead.extra&&n.gzhead.extra.length&&(U(n,255&n.gzhead.extra.length),U(n,n.gzhead.extra.length>>8&255)),n.gzhead.hcrc&&(e.adler=p(e.adler,n.pending_buf,n.pending,0)),n.gzindex=0,n.status=69):(U(n,0),U(n,0),U(n,0),U(n,0),U(n,0),U(n,9===n.level?2:2<=n.strategy||n.level<2?4:0),U(n,3),n.status=E);else{var a=v+(n.w_bits-8<<4)<<8;a|=(2<=n.strategy||n.level<2?0:n.level<6?1:6===n.level?2:3)<<6,0!==n.strstart&&(a|=32),a+=31-a%31,n.status=E,P(n,a),0!==n.strstart&&(P(n,e.adler>>>16),P(n,65535&e.adler)),e.adler=1}if(69===n.status)if(n.gzhead.extra){for(i=n.pending;n.gzindex<(65535&n.gzhead.extra.length)&&(n.pending!==n.pending_buf_size||(n.gzhead.hcrc&&n.pending>i&&(e.adler=p(e.adler,n.pending_buf,n.pending-i,i)),F(e),i=n.pending,n.pending!==n.pending_buf_size));)U(n,255&n.gzhead.extra[n.gzindex]),n.gzindex++;n.gzhead.hcrc&&n.pending>i&&(e.adler=p(e.adler,n.pending_buf,n.pending-i,i)),n.gzindex===n.gzhead.extra.length&&(n.gzindex=0,n.status=73)}else n.status=73;if(73===n.status)if(n.gzhead.name){i=n.pending;do{if(n.pending===n.pending_buf_size&&(n.gzhead.hcrc&&n.pending>i&&(e.adler=p(e.adler,n.pending_buf,n.pending-i,i)),F(e),i=n.pending,n.pending===n.pending_buf_size)){s=1;break}s=n.gzindex<n.gzhead.name.length?255&n.gzhead.name.charCodeAt(n.gzindex++):0,U(n,s)}while(0!==s);n.gzhead.hcrc&&n.pending>i&&(e.adler=p(e.adler,n.pending_buf,n.pending-i,i)),0===s&&(n.gzindex=0,n.status=91)}else n.status=91;if(91===n.status)if(n.gzhead.comment){i=n.pending;do{if(n.pending===n.pending_buf_size&&(n.gzhead.hcrc&&n.pending>i&&(e.adler=p(e.adler,n.pending_buf,n.pending-i,i)),F(e),i=n.pending,n.pending===n.pending_buf_size)){s=1;break}s=n.gzindex<n.gzhead.comment.length?255&n.gzhead.comment.charCodeAt(n.gzindex++):0,U(n,s)}while(0!==s);n.gzhead.hcrc&&n.pending>i&&(e.adler=p(e.adler,n.pending_buf,n.pending-i,i)),0===s&&(n.status=103)}else n.status=103;if(103===n.status&&(n.gzhead.hcrc?(n.pending+2>n.pending_buf_size&&F(e),n.pending+2<=n.pending_buf_size&&(U(n,255&e.adler),U(n,e.adler>>8&255),e.adler=0,n.status=E)):n.status=E),0!==n.pending){if(F(e),0===e.avail_out)return n.last_flush=-1,m}else if(0===e.avail_in&&T(t)<=T(r)&&t!==f)return R(e,-5);if(666===n.status&&0!==e.avail_in)return R(e,-5);if(0!==e.avail_in||0!==n.lookahead||t!==l&&666!==n.status){var o=2===n.strategy?function(e,t){for(var r;;){if(0===e.lookahead&&(j(e),0===e.lookahead)){if(t===l)return A;break}if(e.match_length=0,r=u._tr_tally(e,0,e.window[e.strstart]),e.lookahead--,e.strstart++,r&&(N(e,!1),0===e.strm.avail_out))return A}return e.insert=0,t===f?(N(e,!0),0===e.strm.avail_out?O:B):e.last_lit&&(N(e,!1),0===e.strm.avail_out)?A:I}(n,t):3===n.strategy?function(e,t){for(var r,n,i,s,a=e.window;;){if(e.lookahead<=S){if(j(e),e.lookahead<=S&&t===l)return A;if(0===e.lookahead)break}if(e.match_length=0,e.lookahead>=x&&0<e.strstart&&(n=a[i=e.strstart-1])===a[++i]&&n===a[++i]&&n===a[++i]){s=e.strstart+S;do{}while(n===a[++i]&&n===a[++i]&&n===a[++i]&&n===a[++i]&&n===a[++i]&&n===a[++i]&&n===a[++i]&&n===a[++i]&&i<s);e.match_length=S-(s-i),e.match_length>e.lookahead&&(e.match_length=e.lookahead)}if(e.match_length>=x?(r=u._tr_tally(e,1,e.match_length-x),e.lookahead-=e.match_length,e.strstart+=e.match_length,e.match_length=0):(r=u._tr_tally(e,0,e.window[e.strstart]),e.lookahead--,e.strstart++),r&&(N(e,!1),0===e.strm.avail_out))return A}return e.insert=0,t===f?(N(e,!0),0===e.strm.avail_out?O:B):e.last_lit&&(N(e,!1),0===e.strm.avail_out)?A:I}(n,t):h[n.level].func(n,t);if(o!==O&&o!==B||(n.status=666),o===A||o===O)return 0===e.avail_out&&(n.last_flush=-1),m;if(o===I&&(1===t?u._tr_align(n):5!==t&&(u._tr_stored_block(n,0,0,!1),3===t&&(D(n.head),0===n.lookahead&&(n.strstart=0,n.block_start=0,n.insert=0))),F(e),0===e.avail_out))return n.last_flush=-1,m}return t!==f?m:n.wrap<=0?1:(2===n.wrap?(U(n,255&e.adler),U(n,e.adler>>8&255),U(n,e.adler>>16&255),U(n,e.adler>>24&255),U(n,255&e.total_in),U(n,e.total_in>>8&255),U(n,e.total_in>>16&255),U(n,e.total_in>>24&255)):(P(n,e.adler>>>16),P(n,65535&e.adler)),F(e),0<n.wrap&&(n.wrap=-n.wrap),0!==n.pending?m:1)},r.deflateEnd=function(e){var t;return e&&e.state?(t=e.state.status)!==C&&69!==t&&73!==t&&91!==t&&103!==t&&t!==E&&666!==t?R(e,_):(e.state=null,t===E?R(e,-3):m):_},r.deflateSetDictionary=function(e,t){var r,n,i,s,a,o,h,u,l=t.length;if(!e||!e.state)return _;if(2===(s=(r=e.state).wrap)||1===s&&r.status!==C||r.lookahead)return _;for(1===s&&(e.adler=d(e.adler,t,l,0)),r.wrap=0,l>=r.w_size&&(0===s&&(D(r.head),r.strstart=0,r.block_start=0,r.insert=0),u=new c.Buf8(r.w_size),c.arraySet(u,t,l-r.w_size,r.w_size,0),t=u,l=r.w_size),a=e.avail_in,o=e.next_in,h=e.input,e.avail_in=l,e.next_in=0,e.input=t,j(r);r.lookahead>=x;){for(n=r.strstart,i=r.lookahead-(x-1);r.ins_h=(r.ins_h<<r.hash_shift^r.window[n+x-1])&r.hash_mask,r.prev[n&r.w_mask]=r.head[r.ins_h],r.head[r.ins_h]=n,n++,--i;);r.strstart=n,r.lookahead=x-1,j(r)}return r.strstart+=r.lookahead,r.block_start=r.strstart,r.insert=r.lookahead,r.lookahead=0,r.match_length=r.prev_length=x-1,r.match_available=0,e.next_in=o,e.input=h,e.avail_in=a,r.wrap=s,m},r.deflateInfo="pako deflate (from Nodeca project)"},{"../utils/common":41,"./adler32":43,"./crc32":45,"./messages":51,"./trees":52}],47:[function(e,t,r){"use strict";t.exports=function(){this.text=0,this.time=0,this.xflags=0,this.os=0,this.extra=null,this.extra_len=0,this.name="",this.comment="",this.hcrc=0,this.done=!1}},{}],48:[function(e,t,r){"use strict";t.exports=function(e,t){var r,n,i,s,a,o,h,u,l,f,c,d,p,m,_,g,b,v,y,w,k,x,S,z,C;r=e.state,n=e.next_in,z=e.input,i=n+(e.avail_in-5),s=e.next_out,C=e.output,a=s-(t-e.avail_out),o=s+(e.avail_out-257),h=r.dmax,u=r.wsize,l=r.whave,f=r.wnext,c=r.window,d=r.hold,p=r.bits,m=r.lencode,_=r.distcode,g=(1<<r.lenbits)-1,b=(1<<r.distbits)-1;e:do{p<15&&(d+=z[n++]<<p,p+=8,d+=z[n++]<<p,p+=8),v=m[d&g];t:for(;;){if(d>>>=y=v>>>24,p-=y,0===(y=v>>>16&255))C[s++]=65535&v;else{if(!(16&y)){if(0==(64&y)){v=m[(65535&v)+(d&(1<<y)-1)];continue t}if(32&y){r.mode=12;break e}e.msg="invalid literal/length code",r.mode=30;break e}w=65535&v,(y&=15)&&(p<y&&(d+=z[n++]<<p,p+=8),w+=d&(1<<y)-1,d>>>=y,p-=y),p<15&&(d+=z[n++]<<p,p+=8,d+=z[n++]<<p,p+=8),v=_[d&b];r:for(;;){if(d>>>=y=v>>>24,p-=y,!(16&(y=v>>>16&255))){if(0==(64&y)){v=_[(65535&v)+(d&(1<<y)-1)];continue r}e.msg="invalid distance code",r.mode=30;break e}if(k=65535&v,p<(y&=15)&&(d+=z[n++]<<p,(p+=8)<y&&(d+=z[n++]<<p,p+=8)),h<(k+=d&(1<<y)-1)){e.msg="invalid distance too far back",r.mode=30;break e}if(d>>>=y,p-=y,(y=s-a)<k){if(l<(y=k-y)&&r.sane){e.msg="invalid distance too far back",r.mode=30;break e}if(S=c,(x=0)===f){if(x+=u-y,y<w){for(w-=y;C[s++]=c[x++],--y;);x=s-k,S=C}}else if(f<y){if(x+=u+f-y,(y-=f)<w){for(w-=y;C[s++]=c[x++],--y;);if(x=0,f<w){for(w-=y=f;C[s++]=c[x++],--y;);x=s-k,S=C}}}else if(x+=f-y,y<w){for(w-=y;C[s++]=c[x++],--y;);x=s-k,S=C}for(;2<w;)C[s++]=S[x++],C[s++]=S[x++],C[s++]=S[x++],w-=3;w&&(C[s++]=S[x++],1<w&&(C[s++]=S[x++]))}else{for(x=s-k;C[s++]=C[x++],C[s++]=C[x++],C[s++]=C[x++],2<(w-=3););w&&(C[s++]=C[x++],1<w&&(C[s++]=C[x++]))}break}}break}}while(n<i&&s<o);n-=w=p>>3,d&=(1<<(p-=w<<3))-1,e.next_in=n,e.next_out=s,e.avail_in=n<i?i-n+5:5-(n-i),e.avail_out=s<o?o-s+257:257-(s-o),r.hold=d,r.bits=p}},{}],49:[function(e,t,r){"use strict";var I=e("../utils/common"),O=e("./adler32"),B=e("./crc32"),R=e("./inffast"),T=e("./inftrees"),D=1,F=2,N=0,U=-2,P=1,n=852,i=592;function L(e){return(e>>>24&255)+(e>>>8&65280)+((65280&e)<<8)+((255&e)<<24)}function s(){this.mode=0,this.last=!1,this.wrap=0,this.havedict=!1,this.flags=0,this.dmax=0,this.check=0,this.total=0,this.head=null,this.wbits=0,this.wsize=0,this.whave=0,this.wnext=0,this.window=null,this.hold=0,this.bits=0,this.length=0,this.offset=0,this.extra=0,this.lencode=null,this.distcode=null,this.lenbits=0,this.distbits=0,this.ncode=0,this.nlen=0,this.ndist=0,this.have=0,this.next=null,this.lens=new I.Buf16(320),this.work=new I.Buf16(288),this.lendyn=null,this.distdyn=null,this.sane=0,this.back=0,this.was=0}function a(e){var t;return e&&e.state?(t=e.state,e.total_in=e.total_out=t.total=0,e.msg="",t.wrap&&(e.adler=1&t.wrap),t.mode=P,t.last=0,t.havedict=0,t.dmax=32768,t.head=null,t.hold=0,t.bits=0,t.lencode=t.lendyn=new I.Buf32(n),t.distcode=t.distdyn=new I.Buf32(i),t.sane=1,t.back=-1,N):U}function o(e){var t;return e&&e.state?((t=e.state).wsize=0,t.whave=0,t.wnext=0,a(e)):U}function h(e,t){var r,n;return e&&e.state?(n=e.state,t<0?(r=0,t=-t):(r=1+(t>>4),t<48&&(t&=15)),t&&(t<8||15<t)?U:(null!==n.window&&n.wbits!==t&&(n.window=null),n.wrap=r,n.wbits=t,o(e))):U}function u(e,t){var r,n;return e?(n=new s,(e.state=n).window=null,(r=h(e,t))!==N&&(e.state=null),r):U}var l,f,c=!0;function j(e){if(c){var t;for(l=new I.Buf32(512),f=new I.Buf32(32),t=0;t<144;)e.lens[t++]=8;for(;t<256;)e.lens[t++]=9;for(;t<280;)e.lens[t++]=7;for(;t<288;)e.lens[t++]=8;for(T(D,e.lens,0,288,l,0,e.work,{bits:9}),t=0;t<32;)e.lens[t++]=5;T(F,e.lens,0,32,f,0,e.work,{bits:5}),c=!1}e.lencode=l,e.lenbits=9,e.distcode=f,e.distbits=5}function Z(e,t,r,n){var i,s=e.state;return null===s.window&&(s.wsize=1<<s.wbits,s.wnext=0,s.whave=0,s.window=new I.Buf8(s.wsize)),n>=s.wsize?(I.arraySet(s.window,t,r-s.wsize,s.wsize,0),s.wnext=0,s.whave=s.wsize):(n<(i=s.wsize-s.wnext)&&(i=n),I.arraySet(s.window,t,r-n,i,s.wnext),(n-=i)?(I.arraySet(s.window,t,r-n,n,0),s.wnext=n,s.whave=s.wsize):(s.wnext+=i,s.wnext===s.wsize&&(s.wnext=0),s.whave<s.wsize&&(s.whave+=i))),0}r.inflateReset=o,r.inflateReset2=h,r.inflateResetKeep=a,r.inflateInit=function(e){return u(e,15)},r.inflateInit2=u,r.inflate=function(e,t){var r,n,i,s,a,o,h,u,l,f,c,d,p,m,_,g,b,v,y,w,k,x,S,z,C=0,E=new I.Buf8(4),A=[16,17,18,0,8,7,9,6,10,5,11,4,12,3,13,2,14,1,15];if(!e||!e.state||!e.output||!e.input&&0!==e.avail_in)return U;12===(r=e.state).mode&&(r.mode=13),a=e.next_out,i=e.output,h=e.avail_out,s=e.next_in,n=e.input,o=e.avail_in,u=r.hold,l=r.bits,f=o,c=h,x=N;e:for(;;)switch(r.mode){case P:if(0===r.wrap){r.mode=13;break}for(;l<16;){if(0===o)break e;o--,u+=n[s++]<<l,l+=8}if(2&r.wrap&&35615===u){E[r.check=0]=255&u,E[1]=u>>>8&255,r.check=B(r.check,E,2,0),l=u=0,r.mode=2;break}if(r.flags=0,r.head&&(r.head.done=!1),!(1&r.wrap)||(((255&u)<<8)+(u>>8))%31){e.msg="incorrect header check",r.mode=30;break}if(8!=(15&u)){e.msg="unknown compression method",r.mode=30;break}if(l-=4,k=8+(15&(u>>>=4)),0===r.wbits)r.wbits=k;else if(k>r.wbits){e.msg="invalid window size",r.mode=30;break}r.dmax=1<<k,e.adler=r.check=1,r.mode=512&u?10:12,l=u=0;break;case 2:for(;l<16;){if(0===o)break e;o--,u+=n[s++]<<l,l+=8}if(r.flags=u,8!=(255&r.flags)){e.msg="unknown compression method",r.mode=30;break}if(57344&r.flags){e.msg="unknown header flags set",r.mode=30;break}r.head&&(r.head.text=u>>8&1),512&r.flags&&(E[0]=255&u,E[1]=u>>>8&255,r.check=B(r.check,E,2,0)),l=u=0,r.mode=3;case 3:for(;l<32;){if(0===o)break e;o--,u+=n[s++]<<l,l+=8}r.head&&(r.head.time=u),512&r.flags&&(E[0]=255&u,E[1]=u>>>8&255,E[2]=u>>>16&255,E[3]=u>>>24&255,r.check=B(r.check,E,4,0)),l=u=0,r.mode=4;case 4:for(;l<16;){if(0===o)break e;o--,u+=n[s++]<<l,l+=8}r.head&&(r.head.xflags=255&u,r.head.os=u>>8),512&r.flags&&(E[0]=255&u,E[1]=u>>>8&255,r.check=B(r.check,E,2,0)),l=u=0,r.mode=5;case 5:if(1024&r.flags){for(;l<16;){if(0===o)break e;o--,u+=n[s++]<<l,l+=8}r.length=u,r.head&&(r.head.extra_len=u),512&r.flags&&(E[0]=255&u,E[1]=u>>>8&255,r.check=B(r.check,E,2,0)),l=u=0}else r.head&&(r.head.extra=null);r.mode=6;case 6:if(1024&r.flags&&(o<(d=r.length)&&(d=o),d&&(r.head&&(k=r.head.extra_len-r.length,r.head.extra||(r.head.extra=new Array(r.head.extra_len)),I.arraySet(r.head.extra,n,s,d,k)),512&r.flags&&(r.check=B(r.check,n,d,s)),o-=d,s+=d,r.length-=d),r.length))break e;r.length=0,r.mode=7;case 7:if(2048&r.flags){if(0===o)break e;for(d=0;k=n[s+d++],r.head&&k&&r.length<65536&&(r.head.name+=String.fromCharCode(k)),k&&d<o;);if(512&r.flags&&(r.check=B(r.check,n,d,s)),o-=d,s+=d,k)break e}else r.head&&(r.head.name=null);r.length=0,r.mode=8;case 8:if(4096&r.flags){if(0===o)break e;for(d=0;k=n[s+d++],r.head&&k&&r.length<65536&&(r.head.comment+=String.fromCharCode(k)),k&&d<o;);if(512&r.flags&&(r.check=B(r.check,n,d,s)),o-=d,s+=d,k)break e}else r.head&&(r.head.comment=null);r.mode=9;case 9:if(512&r.flags){for(;l<16;){if(0===o)break e;o--,u+=n[s++]<<l,l+=8}if(u!==(65535&r.check)){e.msg="header crc mismatch",r.mode=30;break}l=u=0}r.head&&(r.head.hcrc=r.flags>>9&1,r.head.done=!0),e.adler=r.check=0,r.mode=12;break;case 10:for(;l<32;){if(0===o)break e;o--,u+=n[s++]<<l,l+=8}e.adler=r.check=L(u),l=u=0,r.mode=11;case 11:if(0===r.havedict)return e.next_out=a,e.avail_out=h,e.next_in=s,e.avail_in=o,r.hold=u,r.bits=l,2;e.adler=r.check=1,r.mode=12;case 12:if(5===t||6===t)break e;case 13:if(r.last){u>>>=7&l,l-=7&l,r.mode=27;break}for(;l<3;){if(0===o)break e;o--,u+=n[s++]<<l,l+=8}switch(r.last=1&u,l-=1,3&(u>>>=1)){case 0:r.mode=14;break;case 1:if(j(r),r.mode=20,6!==t)break;u>>>=2,l-=2;break e;case 2:r.mode=17;break;case 3:e.msg="invalid block type",r.mode=30}u>>>=2,l-=2;break;case 14:for(u>>>=7&l,l-=7&l;l<32;){if(0===o)break e;o--,u+=n[s++]<<l,l+=8}if((65535&u)!=(u>>>16^65535)){e.msg="invalid stored block lengths",r.mode=30;break}if(r.length=65535&u,l=u=0,r.mode=15,6===t)break e;case 15:r.mode=16;case 16:if(d=r.length){if(o<d&&(d=o),h<d&&(d=h),0===d)break e;I.arraySet(i,n,s,d,a),o-=d,s+=d,h-=d,a+=d,r.length-=d;break}r.mode=12;break;case 17:for(;l<14;){if(0===o)break e;o--,u+=n[s++]<<l,l+=8}if(r.nlen=257+(31&u),u>>>=5,l-=5,r.ndist=1+(31&u),u>>>=5,l-=5,r.ncode=4+(15&u),u>>>=4,l-=4,286<r.nlen||30<r.ndist){e.msg="too many length or distance symbols",r.mode=30;break}r.have=0,r.mode=18;case 18:for(;r.have<r.ncode;){for(;l<3;){if(0===o)break e;o--,u+=n[s++]<<l,l+=8}r.lens[A[r.have++]]=7&u,u>>>=3,l-=3}for(;r.have<19;)r.lens[A[r.have++]]=0;if(r.lencode=r.lendyn,r.lenbits=7,S={bits:r.lenbits},x=T(0,r.lens,0,19,r.lencode,0,r.work,S),r.lenbits=S.bits,x){e.msg="invalid code lengths set",r.mode=30;break}r.have=0,r.mode=19;case 19:for(;r.have<r.nlen+r.ndist;){for(;g=(C=r.lencode[u&(1<<r.lenbits)-1])>>>16&255,b=65535&C,!((_=C>>>24)<=l);){if(0===o)break e;o--,u+=n[s++]<<l,l+=8}if(b<16)u>>>=_,l-=_,r.lens[r.have++]=b;else{if(16===b){for(z=_+2;l<z;){if(0===o)break e;o--,u+=n[s++]<<l,l+=8}if(u>>>=_,l-=_,0===r.have){e.msg="invalid bit length repeat",r.mode=30;break}k=r.lens[r.have-1],d=3+(3&u),u>>>=2,l-=2}else if(17===b){for(z=_+3;l<z;){if(0===o)break e;o--,u+=n[s++]<<l,l+=8}l-=_,k=0,d=3+(7&(u>>>=_)),u>>>=3,l-=3}else{for(z=_+7;l<z;){if(0===o)break e;o--,u+=n[s++]<<l,l+=8}l-=_,k=0,d=11+(127&(u>>>=_)),u>>>=7,l-=7}if(r.have+d>r.nlen+r.ndist){e.msg="invalid bit length repeat",r.mode=30;break}for(;d--;)r.lens[r.have++]=k}}if(30===r.mode)break;if(0===r.lens[256]){e.msg="invalid code -- missing end-of-block",r.mode=30;break}if(r.lenbits=9,S={bits:r.lenbits},x=T(D,r.lens,0,r.nlen,r.lencode,0,r.work,S),r.lenbits=S.bits,x){e.msg="invalid literal/lengths set",r.mode=30;break}if(r.distbits=6,r.distcode=r.distdyn,S={bits:r.distbits},x=T(F,r.lens,r.nlen,r.ndist,r.distcode,0,r.work,S),r.distbits=S.bits,x){e.msg="invalid distances set",r.mode=30;break}if(r.mode=20,6===t)break e;case 20:r.mode=21;case 21:if(6<=o&&258<=h){e.next_out=a,e.avail_out=h,e.next_in=s,e.avail_in=o,r.hold=u,r.bits=l,R(e,c),a=e.next_out,i=e.output,h=e.avail_out,s=e.next_in,n=e.input,o=e.avail_in,u=r.hold,l=r.bits,12===r.mode&&(r.back=-1);break}for(r.back=0;g=(C=r.lencode[u&(1<<r.lenbits)-1])>>>16&255,b=65535&C,!((_=C>>>24)<=l);){if(0===o)break e;o--,u+=n[s++]<<l,l+=8}if(g&&0==(240&g)){for(v=_,y=g,w=b;g=(C=r.lencode[w+((u&(1<<v+y)-1)>>v)])>>>16&255,b=65535&C,!(v+(_=C>>>24)<=l);){if(0===o)break e;o--,u+=n[s++]<<l,l+=8}u>>>=v,l-=v,r.back+=v}if(u>>>=_,l-=_,r.back+=_,r.length=b,0===g){r.mode=26;break}if(32&g){r.back=-1,r.mode=12;break}if(64&g){e.msg="invalid literal/length code",r.mode=30;break}r.extra=15&g,r.mode=22;case 22:if(r.extra){for(z=r.extra;l<z;){if(0===o)break e;o--,u+=n[s++]<<l,l+=8}r.length+=u&(1<<r.extra)-1,u>>>=r.extra,l-=r.extra,r.back+=r.extra}r.was=r.length,r.mode=23;case 23:for(;g=(C=r.distcode[u&(1<<r.distbits)-1])>>>16&255,b=65535&C,!((_=C>>>24)<=l);){if(0===o)break e;o--,u+=n[s++]<<l,l+=8}if(0==(240&g)){for(v=_,y=g,w=b;g=(C=r.distcode[w+((u&(1<<v+y)-1)>>v)])>>>16&255,b=65535&C,!(v+(_=C>>>24)<=l);){if(0===o)break e;o--,u+=n[s++]<<l,l+=8}u>>>=v,l-=v,r.back+=v}if(u>>>=_,l-=_,r.back+=_,64&g){e.msg="invalid distance code",r.mode=30;break}r.offset=b,r.extra=15&g,r.mode=24;case 24:if(r.extra){for(z=r.extra;l<z;){if(0===o)break e;o--,u+=n[s++]<<l,l+=8}r.offset+=u&(1<<r.extra)-1,u>>>=r.extra,l-=r.extra,r.back+=r.extra}if(r.offset>r.dmax){e.msg="invalid distance too far back",r.mode=30;break}r.mode=25;case 25:if(0===h)break e;if(d=c-h,r.offset>d){if((d=r.offset-d)>r.whave&&r.sane){e.msg="invalid distance too far back",r.mode=30;break}p=d>r.wnext?(d-=r.wnext,r.wsize-d):r.wnext-d,d>r.length&&(d=r.length),m=r.window}else m=i,p=a-r.offset,d=r.length;for(h<d&&(d=h),h-=d,r.length-=d;i[a++]=m[p++],--d;);0===r.length&&(r.mode=21);break;case 26:if(0===h)break e;i[a++]=r.length,h--,r.mode=21;break;case 27:if(r.wrap){for(;l<32;){if(0===o)break e;o--,u|=n[s++]<<l,l+=8}if(c-=h,e.total_out+=c,r.total+=c,c&&(e.adler=r.check=r.flags?B(r.check,i,c,a-c):O(r.check,i,c,a-c)),c=h,(r.flags?u:L(u))!==r.check){e.msg="incorrect data check",r.mode=30;break}l=u=0}r.mode=28;case 28:if(r.wrap&&r.flags){for(;l<32;){if(0===o)break e;o--,u+=n[s++]<<l,l+=8}if(u!==(4294967295&r.total)){e.msg="incorrect length check",r.mode=30;break}l=u=0}r.mode=29;case 29:x=1;break e;case 30:x=-3;break e;case 31:return-4;case 32:default:return U}return e.next_out=a,e.avail_out=h,e.next_in=s,e.avail_in=o,r.hold=u,r.bits=l,(r.wsize||c!==e.avail_out&&r.mode<30&&(r.mode<27||4!==t))&&Z(e,e.output,e.next_out,c-e.avail_out)?(r.mode=31,-4):(f-=e.avail_in,c-=e.avail_out,e.total_in+=f,e.total_out+=c,r.total+=c,r.wrap&&c&&(e.adler=r.check=r.flags?B(r.check,i,c,e.next_out-c):O(r.check,i,c,e.next_out-c)),e.data_type=r.bits+(r.last?64:0)+(12===r.mode?128:0)+(20===r.mode||15===r.mode?256:0),(0==f&&0===c||4===t)&&x===N&&(x=-5),x)},r.inflateEnd=function(e){if(!e||!e.state)return U;var t=e.state;return t.window&&(t.window=null),e.state=null,N},r.inflateGetHeader=function(e,t){var r;return e&&e.state?0==(2&(r=e.state).wrap)?U:((r.head=t).done=!1,N):U},r.inflateSetDictionary=function(e,t){var r,n=t.length;return e&&e.state?0!==(r=e.state).wrap&&11!==r.mode?U:11===r.mode&&O(1,t,n,0)!==r.check?-3:Z(e,t,n,n)?(r.mode=31,-4):(r.havedict=1,N):U},r.inflateInfo="pako inflate (from Nodeca project)"},{"../utils/common":41,"./adler32":43,"./crc32":45,"./inffast":48,"./inftrees":50}],50:[function(e,t,r){"use strict";var D=e("../utils/common"),F=[3,4,5,6,7,8,9,10,11,13,15,17,19,23,27,31,35,43,51,59,67,83,99,115,131,163,195,227,258,0,0],N=[16,16,16,16,16,16,16,16,17,17,17,17,18,18,18,18,19,19,19,19,20,20,20,20,21,21,21,21,16,72,78],U=[1,2,3,4,5,7,9,13,17,25,33,49,65,97,129,193,257,385,513,769,1025,1537,2049,3073,4097,6145,8193,12289,16385,24577,0,0],P=[16,16,16,16,17,17,18,18,19,19,20,20,21,21,22,22,23,23,24,24,25,25,26,26,27,27,28,28,29,29,64,64];t.exports=function(e,t,r,n,i,s,a,o){var h,u,l,f,c,d,p,m,_,g=o.bits,b=0,v=0,y=0,w=0,k=0,x=0,S=0,z=0,C=0,E=0,A=null,I=0,O=new D.Buf16(16),B=new D.Buf16(16),R=null,T=0;for(b=0;b<=15;b++)O[b]=0;for(v=0;v<n;v++)O[t[r+v]]++;for(k=g,w=15;1<=w&&0===O[w];w--);if(w<k&&(k=w),0===w)return i[s++]=20971520,i[s++]=20971520,o.bits=1,0;for(y=1;y<w&&0===O[y];y++);for(k<y&&(k=y),b=z=1;b<=15;b++)if(z<<=1,(z-=O[b])<0)return-1;if(0<z&&(0===e||1!==w))return-1;for(B[1]=0,b=1;b<15;b++)B[b+1]=B[b]+O[b];for(v=0;v<n;v++)0!==t[r+v]&&(a[B[t[r+v]]++]=v);if(d=0===e?(A=R=a,19):1===e?(A=F,I-=257,R=N,T-=257,256):(A=U,R=P,-1),b=y,c=s,S=v=E=0,l=-1,f=(C=1<<(x=k))-1,1===e&&852<C||2===e&&592<C)return 1;for(;;){for(p=b-S,_=a[v]<d?(m=0,a[v]):a[v]>d?(m=R[T+a[v]],A[I+a[v]]):(m=96,0),h=1<<b-S,y=u=1<<x;i[c+(E>>S)+(u-=h)]=p<<24|m<<16|_|0,0!==u;);for(h=1<<b-1;E&h;)h>>=1;if(0!==h?(E&=h-1,E+=h):E=0,v++,0==--O[b]){if(b===w)break;b=t[r+a[v]]}if(k<b&&(E&f)!==l){for(0===S&&(S=k),c+=y,z=1<<(x=b-S);x+S<w&&!((z-=O[x+S])<=0);)x++,z<<=1;if(C+=1<<x,1===e&&852<C||2===e&&592<C)return 1;i[l=E&f]=k<<24|x<<16|c-s|0}}return 0!==E&&(i[c+E]=b-S<<24|64<<16|0),o.bits=k,0}},{"../utils/common":41}],51:[function(e,t,r){"use strict";t.exports={2:"need dictionary",1:"stream end",0:"","-1":"file error","-2":"stream error","-3":"data error","-4":"insufficient memory","-5":"buffer error","-6":"incompatible version"}},{}],52:[function(e,t,r){"use strict";var i=e("../utils/common"),o=0,h=1;function n(e){for(var t=e.length;0<=--t;)e[t]=0}var s=0,a=29,u=256,l=u+1+a,f=30,c=19,_=2*l+1,g=15,d=16,p=7,m=256,b=16,v=17,y=18,w=[0,0,0,0,0,0,0,0,1,1,1,1,2,2,2,2,3,3,3,3,4,4,4,4,5,5,5,5,0],k=[0,0,0,0,1,1,2,2,3,3,4,4,5,5,6,6,7,7,8,8,9,9,10,10,11,11,12,12,13,13],x=[0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,2,3,7],S=[16,17,18,0,8,7,9,6,10,5,11,4,12,3,13,2,14,1,15],z=new Array(2*(l+2));n(z);var C=new Array(2*f);n(C);var E=new Array(512);n(E);var A=new Array(256);n(A);var I=new Array(a);n(I);var O,B,R,T=new Array(f);function D(e,t,r,n,i){this.static_tree=e,this.extra_bits=t,this.extra_base=r,this.elems=n,this.max_length=i,this.has_stree=e&&e.length}function F(e,t){this.dyn_tree=e,this.max_code=0,this.stat_desc=t}function N(e){return e<256?E[e]:E[256+(e>>>7)]}function U(e,t){e.pending_buf[e.pending++]=255&t,e.pending_buf[e.pending++]=t>>>8&255}function P(e,t,r){e.bi_valid>d-r?(e.bi_buf|=t<<e.bi_valid&65535,U(e,e.bi_buf),e.bi_buf=t>>d-e.bi_valid,e.bi_valid+=r-d):(e.bi_buf|=t<<e.bi_valid&65535,e.bi_valid+=r)}function L(e,t,r){P(e,r[2*t],r[2*t+1])}function j(e,t){for(var r=0;r|=1&e,e>>>=1,r<<=1,0<--t;);return r>>>1}function Z(e,t,r){var n,i,s=new Array(g+1),a=0;for(n=1;n<=g;n++)s[n]=a=a+r[n-1]<<1;for(i=0;i<=t;i++){var o=e[2*i+1];0!==o&&(e[2*i]=j(s[o]++,o))}}function W(e){var t;for(t=0;t<l;t++)e.dyn_ltree[2*t]=0;for(t=0;t<f;t++)e.dyn_dtree[2*t]=0;for(t=0;t<c;t++)e.bl_tree[2*t]=0;e.dyn_ltree[2*m]=1,e.opt_len=e.static_len=0,e.last_lit=e.matches=0}function M(e){8<e.bi_valid?U(e,e.bi_buf):0<e.bi_valid&&(e.pending_buf[e.pending++]=e.bi_buf),e.bi_buf=0,e.bi_valid=0}function H(e,t,r,n){var i=2*t,s=2*r;return e[i]<e[s]||e[i]===e[s]&&n[t]<=n[r]}function G(e,t,r){for(var n=e.heap[r],i=r<<1;i<=e.heap_len&&(i<e.heap_len&&H(t,e.heap[i+1],e.heap[i],e.depth)&&i++,!H(t,n,e.heap[i],e.depth));)e.heap[r]=e.heap[i],r=i,i<<=1;e.heap[r]=n}function K(e,t,r){var n,i,s,a,o=0;if(0!==e.last_lit)for(;n=e.pending_buf[e.d_buf+2*o]<<8|e.pending_buf[e.d_buf+2*o+1],i=e.pending_buf[e.l_buf+o],o++,0===n?L(e,i,t):(L(e,(s=A[i])+u+1,t),0!==(a=w[s])&&P(e,i-=I[s],a),L(e,s=N(--n),r),0!==(a=k[s])&&P(e,n-=T[s],a)),o<e.last_lit;);L(e,m,t)}function Y(e,t){var r,n,i,s=t.dyn_tree,a=t.stat_desc.static_tree,o=t.stat_desc.has_stree,h=t.stat_desc.elems,u=-1;for(e.heap_len=0,e.heap_max=_,r=0;r<h;r++)0!==s[2*r]?(e.heap[++e.heap_len]=u=r,e.depth[r]=0):s[2*r+1]=0;for(;e.heap_len<2;)s[2*(i=e.heap[++e.heap_len]=u<2?++u:0)]=1,e.depth[i]=0,e.opt_len--,o&&(e.static_len-=a[2*i+1]);for(t.max_code=u,r=e.heap_len>>1;1<=r;r--)G(e,s,r);for(i=h;r=e.heap[1],e.heap[1]=e.heap[e.heap_len--],G(e,s,1),n=e.heap[1],e.heap[--e.heap_max]=r,e.heap[--e.heap_max]=n,s[2*i]=s[2*r]+s[2*n],e.depth[i]=(e.depth[r]>=e.depth[n]?e.depth[r]:e.depth[n])+1,s[2*r+1]=s[2*n+1]=i,e.heap[1]=i++,G(e,s,1),2<=e.heap_len;);e.heap[--e.heap_max]=e.heap[1],function(e,t){var r,n,i,s,a,o,h=t.dyn_tree,u=t.max_code,l=t.stat_desc.static_tree,f=t.stat_desc.has_stree,c=t.stat_desc.extra_bits,d=t.stat_desc.extra_base,p=t.stat_desc.max_length,m=0;for(s=0;s<=g;s++)e.bl_count[s]=0;for(h[2*e.heap[e.heap_max]+1]=0,r=e.heap_max+1;r<_;r++)p<(s=h[2*h[2*(n=e.heap[r])+1]+1]+1)&&(s=p,m++),h[2*n+1]=s,u<n||(e.bl_count[s]++,a=0,d<=n&&(a=c[n-d]),o=h[2*n],e.opt_len+=o*(s+a),f&&(e.static_len+=o*(l[2*n+1]+a)));if(0!==m){do{for(s=p-1;0===e.bl_count[s];)s--;e.bl_count[s]--,e.bl_count[s+1]+=2,e.bl_count[p]--,m-=2}while(0<m);for(s=p;0!==s;s--)for(n=e.bl_count[s];0!==n;)u<(i=e.heap[--r])||(h[2*i+1]!==s&&(e.opt_len+=(s-h[2*i+1])*h[2*i],h[2*i+1]=s),n--)}}(e,t),Z(s,u,e.bl_count)}function X(e,t,r){var n,i,s=-1,a=t[1],o=0,h=7,u=4;for(0===a&&(h=138,u=3),t[2*(r+1)+1]=65535,n=0;n<=r;n++)i=a,a=t[2*(n+1)+1],++o<h&&i===a||(o<u?e.bl_tree[2*i]+=o:0!==i?(i!==s&&e.bl_tree[2*i]++,e.bl_tree[2*b]++):o<=10?e.bl_tree[2*v]++:e.bl_tree[2*y]++,s=i,u=(o=0)===a?(h=138,3):i===a?(h=6,3):(h=7,4))}function V(e,t,r){var n,i,s=-1,a=t[1],o=0,h=7,u=4;for(0===a&&(h=138,u=3),n=0;n<=r;n++)if(i=a,a=t[2*(n+1)+1],!(++o<h&&i===a)){if(o<u)for(;L(e,i,e.bl_tree),0!=--o;);else 0!==i?(i!==s&&(L(e,i,e.bl_tree),o--),L(e,b,e.bl_tree),P(e,o-3,2)):o<=10?(L(e,v,e.bl_tree),P(e,o-3,3)):(L(e,y,e.bl_tree),P(e,o-11,7));s=i,u=(o=0)===a?(h=138,3):i===a?(h=6,3):(h=7,4)}}n(T);var q=!1;function J(e,t,r,n){P(e,(s<<1)+(n?1:0),3),function(e,t,r,n){M(e),n&&(U(e,r),U(e,~r)),i.arraySet(e.pending_buf,e.window,t,r,e.pending),e.pending+=r}(e,t,r,!0)}r._tr_init=function(e){q||(function(){var e,t,r,n,i,s=new Array(g+1);for(n=r=0;n<a-1;n++)for(I[n]=r,e=0;e<1<<w[n];e++)A[r++]=n;for(A[r-1]=n,n=i=0;n<16;n++)for(T[n]=i,e=0;e<1<<k[n];e++)E[i++]=n;for(i>>=7;n<f;n++)for(T[n]=i<<7,e=0;e<1<<k[n]-7;e++)E[256+i++]=n;for(t=0;t<=g;t++)s[t]=0;for(e=0;e<=143;)z[2*e+1]=8,e++,s[8]++;for(;e<=255;)z[2*e+1]=9,e++,s[9]++;for(;e<=279;)z[2*e+1]=7,e++,s[7]++;for(;e<=287;)z[2*e+1]=8,e++,s[8]++;for(Z(z,l+1,s),e=0;e<f;e++)C[2*e+1]=5,C[2*e]=j(e,5);O=new D(z,w,u+1,l,g),B=new D(C,k,0,f,g),R=new D(new Array(0),x,0,c,p)}(),q=!0),e.l_desc=new F(e.dyn_ltree,O),e.d_desc=new F(e.dyn_dtree,B),e.bl_desc=new F(e.bl_tree,R),e.bi_buf=0,e.bi_valid=0,W(e)},r._tr_stored_block=J,r._tr_flush_block=function(e,t,r,n){var i,s,a=0;0<e.level?(2===e.strm.data_type&&(e.strm.data_type=function(e){var t,r=4093624447;for(t=0;t<=31;t++,r>>>=1)if(1&r&&0!==e.dyn_ltree[2*t])return o;if(0!==e.dyn_ltree[18]||0!==e.dyn_ltree[20]||0!==e.dyn_ltree[26])return h;for(t=32;t<u;t++)if(0!==e.dyn_ltree[2*t])return h;return o}(e)),Y(e,e.l_desc),Y(e,e.d_desc),a=function(e){var t;for(X(e,e.dyn_ltree,e.l_desc.max_code),X(e,e.dyn_dtree,e.d_desc.max_code),Y(e,e.bl_desc),t=c-1;3<=t&&0===e.bl_tree[2*S[t]+1];t--);return e.opt_len+=3*(t+1)+5+5+4,t}(e),i=e.opt_len+3+7>>>3,(s=e.static_len+3+7>>>3)<=i&&(i=s)):i=s=r+5,r+4<=i&&-1!==t?J(e,t,r,n):4===e.strategy||s===i?(P(e,2+(n?1:0),3),K(e,z,C)):(P(e,4+(n?1:0),3),function(e,t,r,n){var i;for(P(e,t-257,5),P(e,r-1,5),P(e,n-4,4),i=0;i<n;i++)P(e,e.bl_tree[2*S[i]+1],3);V(e,e.dyn_ltree,t-1),V(e,e.dyn_dtree,r-1)}(e,e.l_desc.max_code+1,e.d_desc.max_code+1,a+1),K(e,e.dyn_ltree,e.dyn_dtree)),W(e),n&&M(e)},r._tr_tally=function(e,t,r){return e.pending_buf[e.d_buf+2*e.last_lit]=t>>>8&255,e.pending_buf[e.d_buf+2*e.last_lit+1]=255&t,e.pending_buf[e.l_buf+e.last_lit]=255&r,e.last_lit++,0===t?e.dyn_ltree[2*r]++:(e.matches++,t--,e.dyn_ltree[2*(A[r]+u+1)]++,e.dyn_dtree[2*N(t)]++),e.last_lit===e.lit_bufsize-1},r._tr_align=function(e){P(e,2,3),L(e,m,z),function(e){16===e.bi_valid?(U(e,e.bi_buf),e.bi_buf=0,e.bi_valid=0):8<=e.bi_valid&&(e.pending_buf[e.pending++]=255&e.bi_buf,e.bi_buf>>=8,e.bi_valid-=8)}(e)}},{"../utils/common":41}],53:[function(e,t,r){"use strict";t.exports=function(){this.input=null,this.next_in=0,this.avail_in=0,this.total_in=0,this.output=null,this.next_out=0,this.avail_out=0,this.total_out=0,this.msg="",this.state=null,this.data_type=2,this.adler=0}},{}],54:[function(e,t,r){(function(e){!function(r,n){"use strict";if(!r.setImmediate){var i,s,t,a,o=1,h={},u=!1,l=r.document,e=Object.getPrototypeOf&&Object.getPrototypeOf(r);e=e&&e.setTimeout?e:r,i="[object process]"==={}.toString.call(r.process)?function(e){process.nextTick(function(){c(e)})}:function(){if(r.postMessage&&!r.importScripts){var e=!0,t=r.onmessage;return r.onmessage=function(){e=!1},r.postMessage("","*"),r.onmessage=t,e}}()?(a="setImmediate$"+Math.random()+"$",r.addEventListener?r.addEventListener("message",d,!1):r.attachEvent("onmessage",d),function(e){r.postMessage(a+e,"*")}):r.MessageChannel?((t=new MessageChannel).port1.onmessage=function(e){c(e.data)},function(e){t.port2.postMessage(e)}):l&&"onreadystatechange"in l.createElement("script")?(s=l.documentElement,function(e){var t=l.createElement("script");t.onreadystatechange=function(){c(e),t.onreadystatechange=null,s.removeChild(t),t=null},s.appendChild(t)}):function(e){setTimeout(c,0,e)},e.setImmediate=function(e){"function"!=typeof e&&(e=new Function(""+e));for(var t=new Array(arguments.length-1),r=0;r<t.length;r++)t[r]=arguments[r+1];var n={callback:e,args:t};return h[o]=n,i(o),o++},e.clearImmediate=f}function f(e){delete h[e]}function c(e){if(u)setTimeout(c,0,e);else{var t=h[e];if(t){u=!0;try{!function(e){var t=e.callback,r=e.args;switch(r.length){case 0:t();break;case 1:t(r[0]);break;case 2:t(r[0],r[1]);break;case 3:t(r[0],r[1],r[2]);break;default:t.apply(n,r)}}(t)}finally{f(e),u=!1}}}}function d(e){e.source===r&&"string"==typeof e.data&&0===e.data.indexOf(a)&&c(+e.data.slice(a.length))}}("undefined"==typeof self?void 0===e?this:e:self)}).call(this,"undefined"!=typeof global?global:"undefined"!=typeof self?self:"undefined"!=typeof window?window:{})},{}]},{},[10])(10)});
})();

/* ============================================================
    v1.3.7 安全加固
    ------------------------------------------------------------
    • 内置 JSZip，移除运行时第三方 CDN 依赖
    • 仅观察同源 ChatGPT API 的 Workspace ID，不再捕获 Authorization
    • 移除无效的 XMLHttpRequest 请求头拦截
    • 限制附件下载目标，跨域资源不携带 Cookie、Bearer Token 或 Referer
    ========================================================== */

(function () {
    'use strict';

    // --- 配置与全局变量 ---
    const BASE_DELAY = 600;
    const JITTER = 400;
    const PAGE_LIMIT = 100;
    const PROJECT_SIDEBAR_PREVIEW = 5;
    const PROJECT_SIDEBAR_LIMIT = 50;
    const LIST_CACHE_VERSION = 1;
    const LIST_CACHE_FRESH_MS = 2 * 60 * 1000;
    const LIST_CACHE_PROJECT_FRESH_MS = 30 * 60 * 1000;
    const LIST_CACHE_MAX_AGE_MS = 7 * 24 * 60 * 60 * 1000;
    const LIST_CACHE_MAX_ENTRIES = 12000;
    const PROJECT_LIST_CONCURRENCY = 4;
    let accessToken = null;
    let capturedWorkspaceIds = new Set(); // 仅缓存 Workspace ID，不保存 Authorization Token
    const conversationListCaches = new Map();

    const SCRIPT_FALLBACK_LOCALE = 'en-US';
    const SCRIPT_LOCALES = {
        'en-US': {
            'button.export': 'Export Conversations',
            'button.exportAll': 'Export all',
            'button.exportAllZip': 'Export all (ZIP)',
            'button.selectConversationsExport': 'Select chats',
            'button.cancel': 'Cancel',
            'button.back': 'Back',
            'button.clear': 'Clear',
            'button.selectAll': 'Select all',
            'button.clearDates': 'Clear dates',
            'button.exportSelected': 'Export selected ({count})',
            'button.loadMore': 'Load more ({count} remaining)',
            'button.done': 'Done',
            'button.error': 'Error',
            'fallback.conversation': 'Conversation',
            'fallback.untitledConversation': 'Untitled Conversation',
            'fallback.unknown': 'Unknown',
            'fallback.untitledProject': 'Untitled Project',
            'fallback.file': 'File',
            'mode.personal': 'Personal space',
            'mode.project': 'Project space',
            'mode.team': 'Team space',
            'dialog.selectSpaceTitle': 'Choose export space',
            'dialog.personalTitle': 'Personal space',
            'dialog.personalCopy': 'Export conversations from your personal account.',
            'dialog.projectTitle': 'Project space',
            'dialog.projectCopy': 'Export project-space conversations, grouped by project.',
            'dialog.teamTitle': 'Team space',
            'dialog.teamCopy': 'Export team-space conversations. The Workspace ID is detected automatically.',
            'dialog.exportTeamTitle': 'Export team space',
            'dialog.multipleWorkspace': 'Multiple workspaces detected. Choose one:',
            'dialog.workspaceDetected': 'Workspace ID detected automatically:',
            'dialog.workspaceMissing': 'Could not detect a Workspace ID.',
            'dialog.workspaceMissingHint': 'Refresh the page, open a team conversation, or enter one manually below.',
            'dialog.manualWorkspaceLabel': 'Team Workspace ID:',
            'dialog.workspacePlaceholder': 'Paste your Workspace ID (ws-...)',
            'dialog.selectConversationsTitle': 'Choose conversations to export',
            'dialog.space': 'Space: {mode}{workspace}',
            'dialog.searchPlaceholder': 'Search title/project/ID',
            'dialog.projectScopeLocked': 'Project space only includes project conversations',
            'filter.scopeAll': 'All scopes',
            'filter.scopeProject': 'Projects only',
            'filter.scopeRoot': 'Root only',
            'filter.statusAll': 'All statuses',
            'filter.statusActive': 'Active only',
            'filter.statusArchived': 'Archived only',
            'filter.timeUpdate': 'By updated time',
            'filter.timeCreate': 'By created time',
            'filter.dateTo': 'to',
            'status.loadingList': 'Loading list...',
            'status.localSyncing': 'Showing {count} local entries; refreshing the list in the background...',
            'status.localFallback': 'Showing {count} local entries. Online refresh failed: {message}',
            'status.projectPartial': 'Some project lists could not be refreshed; sidebar previews are shown.',
            'status.listSummary': '{total} total, {filtered} filtered, showing {visible}, selected {selected}',
            'status.noMatches': 'No matching conversations.',
            'status.loadFailed': 'Load failed: {message}',
            'status.fetchingOrphanConversations': 'Fetching root conversations...',
            'status.rootProgress': 'Root ({current}/{total})',
            'status.fetchingProjectList': 'Fetching project list...',
            'status.project': 'Project: {title}',
            'status.projectProgress': '{title}... ({current}/{total})',
            'status.generatingZip': 'Generating ZIP...',
            'status.rootPage': 'Root conversations ({state} p{page})',
            'status.active': 'Active',
            'status.archived': 'Archived',
            'picker.timeCreated': 'Created',
            'picker.timeUpdated': 'Updated',
            'picker.unknownTime': 'Unknown',
            'picker.projectTag': 'Project: {title}',
            'picker.archivedTag': 'Archived',
            'alert.accessTokenUnavailable': 'Could not get Access Token. Refresh the page or open any conversation and try again.',
            'alert.exportCompletedWithFailures': 'Export complete, but {count} conversations failed and were skipped:\n\n{list}',
            'alert.exportSuccess': 'Export complete.',
            'alert.exportFailed': 'Export failed: {message}. See the console for details (F12 -> Console).',
            'alert.noProjectConversations': 'No project-space conversations found.',
            'alert.projectExportFailed': 'Project-space export failed: {message}',
            'alert.invalidWorkspaceId': 'Choose or enter a valid Team Workspace ID.',
            'confirm.scheduledExport': 'Chrome extension requested exporting {mode} conversations (source: {source}). Start now?',
            'error.deviceIdUnavailable': 'Could not get oai-device-id. Make sure you are signed in and refresh the page.',
            'error.projectSpaceListFailed': 'Failed to fetch project-space list ({status})',
            'error.projectConversationListFailed': 'Failed to list project conversations ({status})',
            'error.rootConversationListFailed': 'Failed to list root conversations ({status})',
            'error.conversationListFailed': 'Failed to list conversations ({status})',
            'error.projectSpaceConversationListFailed': 'Failed to list project-space conversations ({status})',
            'error.conversationDetailFailed': 'Failed to fetch conversation {id} ({status})',
            'error.fileDownloadUrlFailed': 'Failed to get file download URL ({status})',
            'error.imageDownloadFailed': 'Image download failed ({status})',
            'error.fileDownloadFailed': 'File download failed ({status})',
            'error.noDownloadUrl': 'No available download URL'
        },
        'zh-CN': {
            'button.export': '导出对话',
            'button.exportAll': '导出全部',
            'button.exportAllZip': '导出全部 (ZIP)',
            'button.selectConversationsExport': '选择对话导出',
            'button.cancel': '取消',
            'button.back': '返回',
            'button.clear': '清空',
            'button.selectAll': '全选',
            'button.clearDates': '清空日期',
            'button.exportSelected': '导出选中 ({count})',
            'button.loadMore': '加载更多（剩余 {count} 条）',
            'button.done': '完成',
            'button.error': '错误',
            'fallback.conversation': '对话',
            'fallback.untitledConversation': '未命名对话',
            'fallback.unknown': '未知',
            'fallback.untitledProject': '未命名项目',
            'fallback.file': '文件',
            'mode.personal': '个人空间',
            'mode.project': '项目空间',
            'mode.team': '团队空间',
            'dialog.selectSpaceTitle': '选择要导出的空间',
            'dialog.personalTitle': '个人空间',
            'dialog.personalCopy': '导出您个人账户下的对话。',
            'dialog.projectTitle': '项目空间',
            'dialog.projectCopy': '导出项目空间下的对话，将按项目自动分组。',
            'dialog.teamTitle': '团队空间',
            'dialog.teamCopy': '导出团队空间下的对话，将自动检测 ID。',
            'dialog.exportTeamTitle': '导出团队空间',
            'dialog.multipleWorkspace': '检测到多个 Workspace，请选择一个：',
            'dialog.workspaceDetected': '已自动检测到 Workspace ID：',
            'dialog.workspaceMissing': '未能自动检测到 Workspace ID。',
            'dialog.workspaceMissingHint': '请尝试刷新页面或打开一个团队对话，或在下方手动输入。',
            'dialog.manualWorkspaceLabel': '手动输入 Team Workspace ID：',
            'dialog.workspacePlaceholder': '粘贴您的 Workspace ID (ws-...)',
            'dialog.selectConversationsTitle': '选择要导出的对话',
            'dialog.space': '空间：{mode}{workspace}',
            'dialog.searchPlaceholder': '搜索标题/项目名/ID',
            'dialog.projectScopeLocked': '项目空间仅包含项目对话',
            'filter.scopeAll': '全部范围',
            'filter.scopeProject': '仅项目',
            'filter.scopeRoot': '仅项目外',
            'filter.statusAll': '全部状态',
            'filter.statusActive': '仅未归档',
            'filter.statusArchived': '仅已归档',
            'filter.timeUpdate': '按更新时间',
            'filter.timeCreate': '按创建时间',
            'filter.dateTo': '至',
            'status.loadingList': '正在加载列表...',
            'status.localSyncing': '已显示本地缓存的 {count} 条记录，正在后台补充最新数据...',
            'status.localFallback': '当前显示本地缓存的 {count} 条记录，在线更新失败：{message}',
            'status.projectPartial': '部分项目列表更新失败，当前显示侧边栏中的预览记录。',
            'status.listSummary': '共 {total} 条，当前筛选 {filtered} 条，显示 {visible} 条，已选 {selected} 条',
            'status.noMatches': '没有匹配的对话。',
            'status.loadFailed': '加载失败: {message}',
            'status.fetchingOrphanConversations': '获取项目外对话...',
            'status.rootProgress': '根目录 ({current}/{total})',
            'status.fetchingProjectList': '获取项目列表...',
            'status.project': '项目: {title}',
            'status.projectProgress': '{title}... ({current}/{total})',
            'status.generatingZip': '生成 ZIP 文件...',
            'status.rootPage': '项目外对话 ({state} p{page})',
            'status.active': 'Active',
            'status.archived': 'Archived',
            'picker.timeCreated': '创建',
            'picker.timeUpdated': '更新',
            'picker.unknownTime': '未知',
            'picker.projectTag': '项目: {title}',
            'picker.archivedTag': '已归档',
            'alert.accessTokenUnavailable': '无法获取 Access Token。请刷新页面或打开任意一个对话后再试。',
            'alert.exportCompletedWithFailures': '导出完成，但有 {count} 个对话失败（已跳过）：\n\n{list}',
            'alert.exportSuccess': '导出完成！',
            'alert.exportFailed': '导出失败: {message}。详情请查看控制台（F12 -> Console）。',
            'alert.noProjectConversations': '未找到项目空间对话。',
            'alert.projectExportFailed': '导出项目空间失败: {message}',
            'alert.invalidWorkspaceId': '请选择或输入一个有效的 Team Workspace ID！',
            'confirm.scheduledExport': 'Chrome 扩展请求导出 {mode} 对话（来源: {source}）。是否开始？',
            'error.deviceIdUnavailable': '无法获取 oai-device-id，请确保已登录并刷新页面。',
            'error.projectSpaceListFailed': '获取项目空间列表失败 ({status})',
            'error.projectConversationListFailed': '列举项目对话列表失败 ({status})',
            'error.rootConversationListFailed': '列举项目外对话列表失败 ({status})',
            'error.conversationListFailed': '列举对话列表失败 ({status})',
            'error.projectSpaceConversationListFailed': '列举项目空间对话列表失败 ({status})',
            'error.conversationDetailFailed': '获取对话详情失败 conv {id} ({status})',
            'error.fileDownloadUrlFailed': '文件下载链接获取失败 ({status})',
            'error.imageDownloadFailed': '图片下载失败 ({status})',
            'error.fileDownloadFailed': '文件下载失败 ({status})',
            'error.noDownloadUrl': '没有可用下载链接'
        }
    };

    function makeTraditionalChineseScriptLocale(source) {
        const replacements = [
            ['导出', '匯出'], ['导入', '匯入'], ['选择', '選擇'], ['对话', '對話'], ['设置', '設定'],
            ['关闭', '關閉'], ['打开', '開啟'], ['边栏', '邊欄'], ['项目', '項目'], ['团队', '團隊'],
            ['空间', '空間'], ['个人', '個人'], ['检测', '偵測'], ['多个', '多個'], ['请输入', '請輸入'],
            ['输入', '輸入'], ['粘贴', '貼上'], ['标题', '標題'], ['范围', '範圍'], ['状态', '狀態'],
            ['归档', '封存'], ['创建', '建立'], ['更新', '更新'], ['清空', '清除'], ['加载', '載入'],
            ['列表', '清單'], ['筛选', '篩選'], ['显示', '顯示'], ['选中', '選取'], ['匹配', '符合'],
            ['时间', '時間'], ['未知', '未知'], ['全部', '全部'], ['取消', '取消'], ['返回', '返回'],
            ['完成', '完成'], ['错误', '錯誤'], ['未命名', '未命名'], ['文件', '檔案'], ['获取', '取得'],
            ['根目录', '根目錄'], ['生成', '產生'], ['失败', '失敗'], ['跳过', '略過'], ['无法', '無法'],
            ['刷新', '重新整理'], ['页面', '頁面'], ['任意', '任一'], ['成功', '成功'], ['图片', '圖片'],
            ['下载', '下載'], ['链接', '連結'], ['没有', '沒有'], ['可用', '可用'], ['详情', '詳細資訊'],
            ['控制台', '主控台'], ['发生', '發生'], ['严重', '嚴重'], ['自动', '自動'], ['列举', '列出'],
            ['有效', '有效'], ['请求', '要求'], ['来源', '來源'], ['开始', '開始'], ['确保', '確保'],
            ['登录', '登入'], ['侧边栏', '側邊欄'], ['预览', '預覽'], ['会话', '對話'], ['浏览器', '瀏覽器'],
            ['当前', '目前'], ['剩余', '剩餘'], ['仅', '僅'], ['按', '依'], ['个', '個'], ['条', '則'],
            ['请', '請'], ['这个', '這個'], ['一个', '一個']
        ];
        const converted = {};
        Object.entries(source).forEach(([key, value]) => {
            let text = value;
            replacements.forEach(([from, to]) => {
                text = text.split(from).join(to);
            });
            converted[key] = text;
        });
        return converted;
    }

    SCRIPT_LOCALES['zh-TW'] = makeTraditionalChineseScriptLocale(SCRIPT_LOCALES['zh-CN']);

    function normalizeScriptLocale(code) {
        return String(code || '').trim().replace(/_/g, '-');
    }

    function detectScriptLocale(languages = null) {
        const provided = Array.isArray(languages)
            ? languages
            : languages
                ? [languages]
                : null;
        const nav = window.navigator || (typeof navigator !== 'undefined' ? navigator : null);
        const candidates = provided || [
            ...(Array.isArray(nav?.languages) ? nav.languages : []),
            nav?.language,
            document.documentElement?.lang
        ].filter(Boolean);
        const normalized = candidates.map(normalizeScriptLocale).filter(Boolean);

        for (const code of normalized) {
            if (SCRIPT_LOCALES[code]) return code;
        }
        for (const code of normalized) {
            const lower = code.toLowerCase();
            if (['zh-tw', 'zh-hk', 'zh-mo', 'zh-hant'].some(locale => lower === locale || lower.startsWith(`${locale}-`))) return 'zh-TW';
            if (lower === 'zh' || lower.startsWith('zh-')) return 'zh-CN';
            if (lower === 'en' || lower.startsWith('en-')) return 'en-US';
        }
        return SCRIPT_FALLBACK_LOCALE;
    }

    const SCRIPT_LOCALE_CODE = detectScriptLocale();

    function getScriptTranslation(key, vars = {}, localeCode = SCRIPT_LOCALE_CODE) {
        const locale = SCRIPT_LOCALES[localeCode] || SCRIPT_LOCALES[SCRIPT_FALLBACK_LOCALE];
        const fallback = SCRIPT_LOCALES[SCRIPT_FALLBACK_LOCALE];
        const template = locale[key] ?? fallback[key] ?? key;
        return String(template).replace(/\{(\w+)\}/g, (_, name) => (
            Object.prototype.hasOwnProperty.call(vars, name) ? String(vars[name]) : `{${name}}`
        ));
    }

    const t = getScriptTranslation;

    // --- 观察同源列表请求：只缓存会话列表元数据，不读取 Authorization ---
    (function captureWorkspaceIdsAndLocalLists() {
        const rawFetch = window.fetch;
        window.fetch = function (resource, options) {
            let url;
            let workspaceId = null;
            try {
                const requestUrl = typeof Request !== 'undefined' && resource instanceof Request
                    ? resource.url
                    : String(resource);
                url = new URL(requestUrl, location.href);
                if (url.origin !== location.origin || !url.pathname.startsWith('/backend-api/')) {
                    return rawFetch.apply(this, arguments);
                }
                const headers = new Headers(
                    typeof Request !== 'undefined' && resource instanceof Request ? resource.headers : undefined
                );
                if (options?.headers) {
                    new Headers(options.headers).forEach((value, name) => headers.set(name, value));
                }
                workspaceId = headers.get('ChatGPT-Account-Id');
                if (workspaceId) capturedWorkspaceIds.add(workspaceId);
            } catch (_) {
                return rawFetch.apply(this, arguments);
            }

            const isListEndpoint = url.pathname === '/backend-api/conversations'
                || url.pathname === '/backend-api/gizmos/snorlax/sidebar'
                || /^\/backend-api\/gizmos\/[^/]+\/conversations$/.test(url.pathname);
            const responsePromise = rawFetch.apply(this, arguments);
            if (!isListEndpoint) return responsePromise;

            return responsePromise.then(response => {
                if (response?.ok) {
                    try {
                        response.clone().json()
                            .then(payload => captureConversationListResponse(url, workspaceId, payload))
                            .catch(() => {});
                    } catch (_) {}
                }
                return response;
            });
        };
    })();
    async function ensureAccessToken() {
        if (accessToken) return accessToken;
        try {
            const response = await fetch('/api/auth/session?unstable_client=true', {
                credentials: 'same-origin',
                referrerPolicy: 'same-origin'
            });
            if (!response.ok) throw new Error(`Session request failed (${response.status})`);
            const session = await response.json();
            if (session.accessToken) {
                accessToken = session.accessToken;
                return accessToken;
            }
        } catch (_) {}
        alert(t('alert.accessTokenUnavailable'));
        return null;
    }

    // --- 辅助函数 ---
    const MAX_SAFE_NAME_LENGTH = 120;
    const MAX_SAFE_ID_LENGTH = 64;
    const MAX_IMAGE_ID_LENGTH = 80;
    const LOCAL_FILE_REF_PREFIX = 'chatgpt-file:';
    const sleep = ms => new Promise(r => setTimeout(r, ms));
    const jitter = () => BASE_DELAY + Math.random() * JITTER;
    const sanitizeFilename = (name, fallback = 'untitled', maxLength = MAX_SAFE_NAME_LENGTH) => {
        const fallbackName = String(fallback || 'untitled')
            .replace(/[\x00-\x1f\x7f]/g, '')
            .replace(/[\/\\?%*:|"<>]/g, '-')
            .trim() || 'untitled';
        let safe = String(name ?? '')
            .replace(/[\x00-\x1f\x7f]/g, '')
            .replace(/[\/\\?%*:|"<>]/g, '-')
            .replace(/\s+/g, ' ')
            .trim()
            .replace(/^[. -]+|[. -]+$/g, '');
        if (!safe) safe = fallbackName;
        if (safe.length > maxLength) {
            safe = safe.slice(0, maxLength).replace(/[. -]+$/g, '');
        }
        return safe || fallbackName;
    };
    const sanitizeImageFilenamePart = (value, fallback = 'image') => {
        const safe = sanitizeFilename(value, fallback, MAX_IMAGE_ID_LENGTH)
            .replace(/[^A-Za-z0-9_.-]+/g, '-')
            .replace(/[-.]{2,}/g, '-')
            .replace(/^[.-]+|[.-]+$/g, '');
        return safe || fallback;
    };
    const splitFilename = (filename) => {
        const idx = filename.lastIndexOf('.');
        if (idx <= 0 || idx === filename.length - 1) return { stem: filename, ext: '' };
        return { stem: filename.slice(0, idx), ext: filename.slice(idx) };
    };
    const makeUniqueZipFilename = (filename, registry, scopeKey = '') => {
        if (!registry) return filename;
        const key = scopeKey || '';
        if (!registry.has(key)) registry.set(key, new Set());
        const used = registry.get(key);
        let candidate = filename;
        if (used.has(candidate)) {
            const { stem, ext } = splitFilename(filename);
            let index = 2;
            do {
                candidate = `${stem} (${index++})${ext}`;
            } while (used.has(candidate));
        }
        used.add(candidate);
        return candidate;
    };
    const normalizeEpochSeconds = (value) => {
        if (!value) return 0;
        if (typeof value === 'number' && Number.isFinite(value)) {
            return value > 1e12 ? Math.floor(value / 1000) : value;
        }
        if (typeof value === 'string') {
            const parsed = Date.parse(value);
            if (!Number.isNaN(parsed)) {
                return Math.floor(parsed / 1000);
            }
        }
        return 0;
    };
    const formatTimestamp = (value) => {
        const seconds = normalizeEpochSeconds(value);
        if (!seconds) return '';
        const date = new Date(seconds * 1000);
        return Number.isNaN(date.getTime()) ? '' : date.toLocaleString();
    };
    const parseDateInputToEpoch = (value, isEnd = false) => {
        if (!value) return null;
        const parts = value.split('-').map(Number);
        if (parts.length !== 3 || parts.some(Number.isNaN)) return null;
        const [year, month, day] = parts;
        const date = isEnd
            ? new Date(year, month - 1, day, 23, 59, 59, 999)
            : new Date(year, month - 1, day, 0, 0, 0, 0);
        const epochMs = date.getTime();
        return Number.isNaN(epochMs) ? null : Math.floor(epochMs / 1000);
    };

    /**
     * [新增] 从Cookie中获取 oai-device-id
     * @returns {string|null} - 返回设备ID或null
     */
    function getOaiDeviceId() {
        const cookieString = document.cookie;
        const match = cookieString.match(/oai-did=([^;]+)/);
        return match ? match[1] : null;
    }

    function generateUniqueFilename(convData) {
        const convId = convData.conversation_id || '';
        const shortId = convId.includes('-') ? convId.split('-').pop() : (convId || Date.now().toString(36));
        let baseName = convData.title;
        if (!baseName || baseName.trim().toLowerCase() === 'new chat') {
            baseName = t('fallback.untitledConversation');
        }
        const safeBaseName = sanitizeFilename(baseName, t('fallback.untitledConversation'), MAX_SAFE_NAME_LENGTH);
        const safeShortId = sanitizeImageFilenamePart(shortId, 'conversation').slice(0, MAX_SAFE_ID_LENGTH);
        return `${safeBaseName}_${safeShortId}.json`;
    }

    function generateMarkdownFilename(convData) {
        const jsonName = generateUniqueFilename(convData);
        return jsonName.endsWith('.json')
            ? `${jsonName.slice(0, -5)}.md`
            : `${jsonName}.md`;
    }

    function cleanMessageContent(text) {
        if (!text) return '';
        return text
            .replace(/\uE200cite(?:\uE202turn\d+[a-z_]+\d+)+\uE201/gi, '')
            .replace(/[\uE200-\uE202]?cite(?:[\uE200-\uE202]?turn\d+[a-z_]+\d+)+[\uE200-\uE202]?/gi, '')
            .trim();
    }

    function processContentReferences(text, contentReferences) {
        if (!text || !Array.isArray(contentReferences) || contentReferences.length === 0) {
            return { text, footnotes: [] };
        }

        const references = contentReferences.filter(ref => ref && typeof ref.matched_text === 'string' && ref.matched_text.length > 0);
        if (references.length === 0) {
            return { text, footnotes: [] };
        }

        const getReferenceInfo = (ref) => {
            const file = inspectReferenceFile(ref);
            if (file) {
                const label = file.label || file.filename || t('fallback.file');
                return {
                    url: `${LOCAL_FILE_REF_PREFIX}${encodeURIComponent(file.key)}`,
                    title: label,
                    label,
                    fileKey: file.key
                };
            }
            const item = Array.isArray(ref.items) ? ref.items[0] : null;
            const url = item?.url || (Array.isArray(ref.safe_urls) ? ref.safe_urls[0] : '') || '';
            const title = item?.title || '';
            let label = item?.attribution || '';
            if (!label && typeof ref.alt === 'string') {
                const match = ref.alt.match(/\[([^\]]+)\]\([^)]+\)/);
                if (match) label = match[1];
            }
            if (!label) label = title || url;
            return { url, title, label };
        };

        const footnotes = [];
        const footnoteIndexByKey = new Map();
        const citationRefs = references
            .filter(ref => ref.type === 'grouped_webpages' || inspectReferenceFile(ref))
            .sort((a, b) => {
                const aIdx = Number.isFinite(a.start_idx) ? a.start_idx : Number.MAX_SAFE_INTEGER;
                const bIdx = Number.isFinite(b.start_idx) ? b.start_idx : Number.MAX_SAFE_INTEGER;
                return aIdx - bIdx;
            });

        citationRefs.forEach(ref => {
            const info = getReferenceInfo(ref);
            if (!info.url) return;
            const key = `${info.url}|${info.title}`;
            if (footnoteIndexByKey.has(key)) return;
            const index = footnotes.length + 1;
            footnoteIndexByKey.set(key, index);
            footnotes.push({ index, url: info.url, title: info.title, label: info.label });
        });

        const sortedByReplacement = references
            .slice()
            .sort((a, b) => {
                const aIdx = Number.isFinite(a.start_idx) ? a.start_idx : -1;
                const bIdx = Number.isFinite(b.start_idx) ? b.start_idx : -1;
                if (aIdx !== -1 || bIdx !== -1) {
                    return bIdx - aIdx;
                }
                return (b.matched_text?.length || 0) - (a.matched_text?.length || 0);
            });

        let output = text;
        sortedByReplacement.forEach(ref => {
            if (!ref?.matched_text || ref.type === 'sources_footnote') return;
            let replacement = '';
            if (ref.type === 'grouped_webpages' || inspectReferenceFile(ref)) {
                const info = getReferenceInfo(ref);
                if (info.url) {
                    const key = `${info.url}|${info.title}`;
                    const index = footnoteIndexByKey.get(key);
                    replacement = index ? `([${markdownLinkLabel(info.label)}][${index}])` : (ref.alt || '');
                } else {
                    replacement = ref.alt || '';
                }
            } else {
                replacement = ref.alt || '';
            }

            if (Number.isFinite(ref.start_idx) && Number.isFinite(ref.end_idx)) {
                if (output.slice(ref.start_idx, ref.end_idx) === ref.matched_text) {
                    output = output.slice(0, ref.start_idx) + replacement + output.slice(ref.end_idx);
                    return;
                }
            }
            output = output.split(ref.matched_text).join(replacement);
        });

        return { text: output, footnotes };
    }

    // 从一个 image_asset 对象中尽可能提取可下载线索
    // 支持旧格式 (image_asset 嵌套对象) 和新格式 (image_asset_pointer 扁平对象)
    function inspectImageAsset(asset) {
        if (!asset || typeof asset !== 'object') return null;
        const pointer = asset.asset_pointer || asset.file_id || asset.id || null;
        if (!pointer) return null;
        let label = asset.disposition_label || asset.alt_text || asset.alt || '';
        if (!label && asset.metadata?.dalle?.prompt) {
            label = asset.metadata.dalle.prompt;
        }
        // 从 metadata 中提取 image_gen_title 作为备选标签
        if (!label && asset.metadata?.generation?.serialization_title) {
            label = asset.metadata.generation.serialization_title;
        }
        return {
            asset_pointer: pointer,
            url: asset.url || asset.download_url || asset.dalle_url || null,
            content_type: asset.content_type || asset.mime_type || null,
            file_id: asset.file_id || null,
            dispositionLabel: (typeof label === 'string' ? label : 'image').slice(0, 200),
        };
    }

    function isImageContentType(value) {
        const text = String(value || '').toLowerCase();
        return text === 'image_asset' ||
            text === 'image_asset_pointer' ||
            text.startsWith('image/') ||
            text.includes('image_asset');
    }

    function imageReferenceKeys(image) {
        if (!image || typeof image !== 'object') return [];
        return [
            image.asset_pointer,
            image.file_id,
            image.url,
            image.download_url,
            normalizeAssetId(image.asset_pointer || image.file_id || image.url || image.download_url || '')
        ].filter(Boolean);
    }

    function addImageIfMissing(images, image, source) {
        if (!image) return;
        const incoming = { ...image, source };
        const keys = imageReferenceKeys(incoming);
        const existingIndex = images.findIndex(existing => {
            const existingKeys = imageReferenceKeys(existing);
            return existingKeys.some(key => keys.includes(key));
        });
        if (existingIndex >= 0) {
            const existing = images[existingIndex];
            const sources = [existing.source, source]
                .flatMap(value => String(value || '').split(','))
                .filter(Boolean)
                .filter((value, index, list) => list.indexOf(value) === index);
            images[existingIndex] = { ...existing };
            [
                'asset_pointer',
                'url',
                'download_url',
                'content_type',
                'file_id',
                'dispositionLabel',
                'localUrl',
                'localPath',
                'filename'
            ].forEach(field => {
                if (!images[existingIndex][field] && incoming[field]) images[existingIndex][field] = incoming[field];
            });
            images[existingIndex].source = sources.join(',');
            return;
        }
        images.push(incoming);
    }

    function inspectFileAttachment(att) {
        if (!att || typeof att !== 'object') return null;
        const nested = att.file && typeof att.file === 'object' ? att.file : {};
        const contentType = att.mime_type || att.content_type || att.type ||
            nested.mime_type || nested.content_type || nested.type || '';
        if (isImageContentType(contentType) || att.image_asset || nested.image_asset) return null;
        const fileId = att.file_id || nested.file_id || att.id || nested.id ||
            att.asset_pointer || nested.asset_pointer || '';
        const url = att.download_url || att.url || nested.download_url || nested.url || '';
        const rawName = att.name || att.file_name || att.filename || att.title || att.display_name ||
            nested.name || nested.file_name || nested.filename || nested.title || '';
        const contentTypeText = String(contentType || '').toLowerCase();
        const hasFileSignal = contentTypeText.includes('file') ||
            contentTypeText.includes('attachment') ||
            (contentTypeText && contentTypeText !== 'text' && contentTypeText !== 'multimodal_text') ||
            Boolean(att.file || nested.file || rawName);
        if (!fileId && !url && !(rawName && hasFileSignal)) return null;
        const fallbackName = normalizeAssetId(fileId || url) || 'attachment';
        const filename = sanitizeFilename(rawName || fallbackName, fallbackName, MAX_SAFE_NAME_LENGTH);
        return {
            key: fileId || url || rawName || filename,
            file_id: fileId,
            url,
            download_url: att.download_url || nested.download_url || '',
            filename,
            label: rawName || filename,
            content_type: contentType,
            size: att.size || nested.size || null
        };
    }

    function addFileIfMissing(files, file, source) {
        if (!file) return;
        const keys = fileReferenceKeys(file);
        const existingIndex = files.findIndex(existing => {
            const existingKeys = fileReferenceKeys(existing);
            return existingKeys.some(key => keys.includes(key));
        });
        if (existingIndex >= 0) {
            files[existingIndex] = mergeFileAttachment(files[existingIndex], file, source);
            return;
        }
        files.push({
            ...file,
            aliases: keys,
            source
        });
    }

    function mergeFileAttachment(existing, incoming, source) {
        const aliases = [...fileReferenceKeys(existing), ...fileReferenceKeys(incoming)]
            .filter(Boolean)
            .filter((value, index, list) => list.indexOf(value) === index);
        const merged = { ...existing, aliases };
        [
            'key',
            'file_id',
            'url',
            'download_url',
            'filename',
            'label',
            'content_type',
            'size',
            'path',
            'file_path',
            'sandbox_path'
        ].forEach(field => {
            if (!merged[field] && incoming[field]) merged[field] = incoming[field];
        });
        merged.source = [existing.source, source].filter(Boolean).filter((value, index, list) => list.indexOf(value) === index).join(',');
        return merged;
    }

    function inspectReferenceFile(ref) {
        if (!ref || typeof ref !== 'object') return null;
        const refType = String(ref.type || ref.content_type || ref.mime_type || '').toLowerCase();
        if (refType === 'grouped_webpages' || refType === 'sources_footnote' || refType.includes('webpage')) return null;
        const nameOnlyFile = (item) => {
            const explicitName = item?.name || item?.file_name || item?.filename || item?.title || item?.display_name || '';
            const pathName = item?.path || item?.file_path || item?.sandbox_path || item?.matched_text || '';
            const rawName = explicitName || String(pathName).split(/[\\/]/).filter(Boolean).pop() || pathName;
            const key = item?.file_id || item?.asset_pointer || item?.url || item?.download_url ||
                item?.path || item?.file_path || item?.sandbox_path || rawName;
            if (!key && !rawName) return null;
            const fallbackName = normalizeAssetId(key) || 'attachment';
            const filename = sanitizeFilename(rawName || fallbackName, fallbackName, MAX_SAFE_NAME_LENGTH);
            return {
                key: key || filename,
                file_id: item?.file_id || item?.asset_pointer || '',
                url: item?.url || '',
                download_url: item?.download_url || '',
                filename,
                label: rawName || filename,
                content_type: item?.mime_type || item?.content_type || item?.type || '',
                size: item?.size || null
            };
        };
        const hasFileSignal = refType.includes('file') ||
            refType.includes('sandbox') ||
            refType.includes('attachment') ||
            Boolean(ref.file_id || ref.asset_pointer || ref.file || ref.file_path || ref.sandbox_path);
        const direct = inspectFileAttachment(ref);
        if (direct && hasFileSignal) return direct;
        const fallback = hasFileSignal ? nameOnlyFile(ref) : null;
        if (fallback) return fallback;
        const items = Array.isArray(ref.items) ? ref.items : [];
        for (const item of items) {
            const itemType = String(item?.type || item?.content_type || item?.mime_type || '').toLowerCase();
            const itemHasFileSignal = itemType.includes('file') ||
                itemType.includes('sandbox') ||
                itemType.includes('attachment') ||
                Boolean(item?.file_id || item?.asset_pointer || item?.file || item?.file_path || item?.sandbox_path);
            const inspected = inspectFileAttachment(item);
            if (inspected && itemHasFileSignal) return inspected;
            const itemFallback = itemHasFileSignal ? nameOnlyFile(item) : null;
            if (itemFallback) return itemFallback;
        }
        return null;
    }

    function extractConversationMessages(convData) {
        const mapping = convData?.mapping;
        if (!mapping) return [];

        const messages = [];
        const mappingKeys = Object.keys(mapping);
        const rootId = mapping['client-created-root']
            ? 'client-created-root'
            : mappingKeys.find(id => !mapping[id]?.parent) || mappingKeys[0];
        const visited = new Set();

        // Collect parts of a single message, capturing both text and image pointers.
        const collectParts = (content) => {
            let textParts = [];
            const images = [];
            const files = [];

            const contentType = content?.content_type;
            const parts = Array.isArray(content?.parts) ? content.parts : [];

            const handleImagePart = (imgAsset, source) => {
                const inspected = inspectImageAsset(imgAsset);
                if (!inspected) return;
                addImageIfMissing(images, inspected, source);
            };
            const handleFilePart = (fileAsset, source) => {
                const inspected = inspectFileAttachment(fileAsset?.file || fileAsset);
                if (!inspected) return;
                addFileIfMissing(files, inspected, source);
                textParts.push(`<!-- file:${encodeURIComponent(inspected.key)} -->`);
            };

            // 判断是否为图片类型的 content_type
            const isImageContentType = (ct) => ct === 'image_asset' || ct === 'image_asset_pointer';
            const isFileContentType = (ct) => {
                const text = String(ct || '').toLowerCase();
                return text.includes('file') || text.includes('attachment');
            };

            if (contentType === 'text') {
                parts.forEach(part => collectTextPart(part, textParts, images, files));
            } else if (isImageContentType(contentType)) {
                // 旧格式: content.image_asset 嵌套; 新格式: content 本身就是 asset
                handleImagePart(content.image_asset || content, 'image_asset');
            } else if (isFileContentType(contentType)) {
                handleFilePart(content.file || content, 'file_asset');
            } else if (contentType === 'multimodal_text') {
                parts.forEach(part => {
                    if (typeof part === 'string') {
                        collectTextPart(part, textParts, images, files);
                    } else if (part && isImageContentType(part.content_type || part.type)) {
                        // 新格式: part 自身就是 image_asset_pointer，无嵌套的 .image_asset
                        handleImagePart(part.image_asset || part, 'multimodal_text');
                    } else if (part && isFileContentType(part.content_type || part.type)) {
                        handleFilePart(part.file || part, 'multimodal_text');
                    } else if (part && typeof part === 'object' && part.text) {
                        collectTextPart(part.text, textParts, images, files);
                    } else {
                        collectTextPart(part, textParts, images, files);
                    }
                });
            } else if (contentType && Array.isArray(parts) && parts.length) {
                // Fallback: any content_type that still carries parts — gather text & be permissive about images.
                parts.forEach(part => collectTextPart(part, textParts, images, files));
            }

            const rawText = textParts.filter(Boolean).join('\n');
            return { rawText, images, files };
        };

        const collectTextPart = (part, textParts, images, files) => {
            if (typeof part === 'string') { textParts.push(part); return; }
            if (part && typeof part === 'object') {
                const inspectedFile = inspectFileAttachment(part.file || part);
                if (inspectedFile) {
                    addFileIfMissing(files, inspectedFile, 'text_part');
                    textParts.push(`<!-- file:${encodeURIComponent(inspectedFile.key)} -->`);
                    return;
                }
                if (typeof part.text === 'string') textParts.push(part.text);
                const isImg = part.content_type === 'image_asset' || part.content_type === 'image_asset_pointer' || part.image_asset;
                if (isImg) {
                    const inspected = inspectImageAsset(part.image_asset || part);
                    if (inspected) {
                        textParts.push(`<!-- image:${inspected.asset_pointer} -->`);
                        if (images) addImageIfMissing(images, inspected, 'text_part');
                    }
                }
            }
        };

        const traverse = (startNodeId) => {
            const stack = [startNodeId];
            while (stack.length) {
                const nodeId = stack.pop();
                if (!nodeId || visited.has(nodeId)) continue;
                visited.add(nodeId);
                const node = mapping[nodeId];
                if (!node) continue;

                const msg = node.message;
            if (msg) {
                const author = msg.author?.role;
                const isHidden = msg.metadata?.is_visually_hidden_from_conversation ||
                    msg.metadata?.is_contextual_answers_system_message;
                if (author && author !== 'system' && !isHidden) {
                    const content = msg.content;
                    const { rawText = '', images = [], files: partFiles = [] } = content ? (collectParts(content) || {}) : {};

                    const files = partFiles.slice();

                    // attachments may carry image pointers or downloadable files.
                    if (Array.isArray(msg.metadata?.attachments)) {
                        msg.metadata.attachments.forEach(att => {
                            if (!att) return;
                            if (isImageContentType(att.content_type || att.type || att.mime_type)) {
                                const inspected = inspectImageAsset(att.image_asset || att);
                                if (inspected) addImageIfMissing(images, inspected, 'attachment');
                                return;
                            }
                            const file = inspectFileAttachment(att);
                            addFileIfMissing(files, file, 'attachment');
                        });
                    }

                    const contentReferences = msg.metadata?.content_references || [];
                    if (Array.isArray(contentReferences)) {
                        contentReferences.forEach(ref => {
                            const file = inspectReferenceFile(ref);
                            if (!file) return;
                            addFileIfMissing(files, file, 'content_reference');
                        });
                    }
                    let processedText = rawText;
                    let footnotes = [];
                    if (Array.isArray(contentReferences) && contentReferences.length > 0) {
                        const processed = processContentReferences(rawText, contentReferences);
                        processedText = processed.text;
                        footnotes = processed.footnotes;
                    }
                    const cleaned = cleanMessageContent(processedText);

                    const hasText = cleaned && cleaned.length > 0;
                    const hasImages = images.length > 0;
                    const hasFiles = files.length > 0;
                    if (hasText || hasImages || hasFiles) {
                        messages.push({
                            messageId: msg.id || nodeId,
                            role: author,
                            content: cleaned || '',
                            create_time: msg.create_time || null,
                            footnotes,
                            images,
                            files
                        });
                    }
                }
            }

                if (Array.isArray(node.children)) {
                    for (let index = node.children.length - 1; index >= 0; index -= 1) {
                        stack.push(node.children[index]);
                    }
                }
            }
        };

        if (rootId) traverse(rootId);
        mappingKeys.forEach(nodeId => {
            if (!visited.has(nodeId)) traverse(nodeId);
        });

        return messages;
    }

    function markdownLinkLabel(value) {
        return String(value || 'file').replace(/([\\\[\]])/g, '\\$1');
    }

    function markdownExternalImageLink(image) {
        const rawUrl = String(image?.url || image?.download_url || '').trim();
        const label = markdownLinkLabel(image?.dispositionLabel || 'image');
        if (!/^https:\/\//i.test(rawUrl)) return label;
        const markdownUrl = rawUrl.replace(/[\s\\()<>"]/g, character => character === '(' ? '%28' : character === ')' ? '%29' : encodeURIComponent(character));
        return `[${label} (external image)](${markdownUrl})`;
    }

    function markdownPath(path) {
        return String(path || '')
            .split('/')
            .map(part => encodeURIComponent(part))
            .join('/');
    }

    function localFileRefKey(url) {
        const value = String(url || '');
        if (!value.startsWith(LOCAL_FILE_REF_PREFIX)) return '';
        try {
            return decodeURIComponent(value.slice(LOCAL_FILE_REF_PREFIX.length));
        } catch (_) {
            return value.slice(LOCAL_FILE_REF_PREFIX.length);
        }
    }

    function resolveFootnoteUrl(url, attachmentFiles) {
        const key = localFileRefKey(url);
        if (!key) return url;
        const file = localFileRefCandidates(key).map(candidate => attachmentFiles?.get(candidate)).find(Boolean);
        return file ? markdownPath(`files/${file.filename}`) : '';
    }

    function localFileRefCandidates(key) {
        const candidates = [
            key,
            normalizeAssetId(key),
            sanitizeFilename(key, key, MAX_SAFE_NAME_LENGTH),
            sanitizeFilename(String(key).split(/[\\/]/).filter(Boolean).pop() || key, key, MAX_SAFE_NAME_LENGTH)
        ].filter(Boolean);
        return candidates.filter((candidate, index) => candidates.indexOf(candidate) === index);
    }

    function fileReferenceKeys(file) {
        if (!file || typeof file !== 'object') return [];
        return [
            file.key,
            file.file_id,
            file.url,
            file.download_url,
            file.path,
            file.file_path,
            file.sandbox_path,
            file.filename,
            ...(Array.isArray(file.aliases) ? file.aliases : [])
        ].filter(Boolean);
    }

    function convertConversationToMarkdown(convData) {
        // imageFiles (optional): Map<asset_pointer, {filename, dispositionLabel}> — when passed,
        // image markers inside text are replaced with `![alt](images/filename)` and a
        // "生成图片" block is appended for any image that has no in-text marker.
        const imageFiles = (arguments.length > 1 && arguments[1] instanceof Map) ? arguments[1] : null;
        const attachmentFiles = (arguments.length > 2 && arguments[2] instanceof Map) ? arguments[2] : null;
        const messages = extractConversationMessages(convData);
        if (messages.length === 0) {
            return '# Conversation\nNo visible user or assistant messages were exported.\n';
        }

        const mdLines = [];
        messages.forEach((msg, msgIdx) => {
            const roleName = String(msg.role || 'unknown').replace(/[^A-Za-z0-9 _-]/g, '').trim() || 'unknown';
            const roleLabel = msg.role === 'user' ? '# User' : msg.role === 'assistant' ? '# Assistant' : '# ' + roleName;
            mdLines.push(roleLabel);

            let body = msg.content || '';

            // Collect which images are referenced inline so we can append the rest at the end.
            const referenced = new Set();
            if (imageFiles && Array.isArray(msg.images) && msg.images.length > 0) {
                msg.images.forEach(img => {
                    const entry = imageFiles.get(img.asset_pointer);
                    const placeholder = `<!-- image:${img.asset_pointer} -->`;
                    if (!body.includes(placeholder)) return;
                    const replacement = entry
                        ? `\n\n![${entry.dispositionLabel || 'image'}](images/${entry.filename})\n`
                        : `\n\n${markdownExternalImageLink(img)}\n`;
                    body = body.split(placeholder).join(replacement);
                    referenced.add(img.asset_pointer);
                });
            }

            const referencedFileEntries = new Set();
            if (Array.isArray(msg.files) && msg.files.length > 0) {
                msg.files.forEach(file => {
                    const entry = attachmentFiles
                        ? fileReferenceKeys(file).map(key => attachmentFiles.get(key)).find(Boolean)
                        : null;
                    const replacement = entry
                        ? `\n\n[${markdownLinkLabel(entry.label || entry.filename)}](${markdownPath(`files/${entry.filename}`)})\n\n`
                        : `\n\n${markdownLinkLabel(file.label || file.filename || t('fallback.file'))}\n\n`;
                    fileReferenceKeys(file).forEach(key => {
                        const placeholder = `<!-- file:${encodeURIComponent(key)} -->`;
                        if (body.includes(placeholder)) {
                            body = body.split(placeholder).join(replacement);
                            if (entry) referencedFileEntries.add(entry);
                        }
                    });
                });
            }

            mdLines.push(body);

            // Append any images that weren't referenced inline as a dedicated block.
            if (imageFiles && Array.isArray(msg.images) && msg.images.length > 0) {
                const leftover = msg.images.filter(img => !referenced.has(img.asset_pointer));
                if (leftover.length > 0) {
                    mdLines.push('');
                    mdLines.push(`<!-- 生成图片 (${leftover.length}) -->`);
                    leftover.forEach(img => {
                        const entry = imageFiles.get(img.asset_pointer);
                        if (entry) {
                            mdLines.push(`![${entry.dispositionLabel || 'image'}](images/${entry.filename})`);
                        } else {
                            mdLines.push(markdownExternalImageLink(img));
                        }
                    });
                }
            }

            if (attachmentFiles && Array.isArray(msg.files) && msg.files.length > 0) {
                const referencedFiles = new Set((msg.footnotes || [])
                    .map(note => localFileRefKey(note.url))
                    .filter(Boolean)
                    .flatMap(key => localFileRefCandidates(key))
                    .map(key => attachmentFiles.get(key))
                    .filter(Boolean));
                const linkedFiles = msg.files
                    .map(file => fileReferenceKeys(file).map(key => attachmentFiles.get(key)).find(Boolean))
                    .filter(Boolean)
                    .filter(file => !referencedFiles.has(file) && !referencedFileEntries.has(file));
                if (linkedFiles.length > 0) {
                    mdLines.push('');
                    mdLines.push(`<!-- 附件 (${linkedFiles.length}) -->`);
                    linkedFiles.forEach(file => {
                        mdLines.push(`- [${markdownLinkLabel(file.label || file.filename)}](${markdownPath(`files/${file.filename}`)})`);
                    });
                }
            }

            if (Array.isArray(msg.footnotes) && msg.footnotes.length > 0) {
                mdLines.push('');
                msg.footnotes
                    .slice()
                    .sort((a, b) => a.index - b.index)
                    .forEach(note => {
                        const url = resolveFootnoteUrl(note.url, attachmentFiles);
                        if (!url) return;
                        const title = note.title ? ` "${note.title}"` : '';
                        mdLines.push(`[${note.index}]: ${url}${title}`);
                    });
            }
            mdLines.push('');
        });

        return mdLines.join('\n').trim() + '\n';
    }

    function downloadFile(blob, filename) {
        const a = document.createElement('a');
        a.href = URL.createObjectURL(blob);
        a.download = filename;
        document.body.appendChild(a);
        a.click();
        document.body.removeChild(a);
        URL.revokeObjectURL(a.href);
    }

    // --- 导出流程核心逻辑 ---
    function getExportButton() {
        let btn = document.getElementById('gpt-rescue-btn');
        if (!btn) {
            btn = document.createElement('button');
            btn.id = 'gpt-rescue-btn';
            btn.style.display = 'none';
            btn.textContent = t('button.export');
            document.body.appendChild(btn);
        }
        return btn;
    }

    function makeZipScopeRegistry() {
        return new Map();
    }

    async function exportConversations(options = {}) {
        const { mode = 'personal', workspaceId = null, conversationEntries = null, exportType = null } = options;
        const btn = getExportButton();
        btn.disabled = true;

        if (!await ensureAccessToken()) {
            btn.disabled = false;
            btn.textContent = t('button.export');
            return;
        }

        try {
            const zip = new JSZip();
            const zipFilenameRegistry = makeZipScopeRegistry();
            const failedConversations = [];
            if (Array.isArray(conversationEntries) && conversationEntries.length > 0) {
                for (let i = 0; i < conversationEntries.length; i++) {
                    const entry = conversationEntries[i];
                    const label = entry?.title ? entry.title.slice(0, 12) : t('fallback.conversation');
                    btn.textContent = `📥 ${label} (${i + 1}/${conversationEntries.length})`;
                    try {
                        const convData = await getConversation(entry.id, workspaceId);
                        const target = entry?.projectTitle
                            ? zip.folder(sanitizeFilename(entry.projectTitle))
                            : zip;
                        await exportConversationIntoZip(convData, target, accessToken, zipFilenameRegistry);
                    } catch (convErr) {
                        console.error(`⚠️ 跳过对话 [${entry.title || entry.id}]: ${convErr.message}`);
                        failedConversations.push({ id: entry.id, title: entry.title || t('fallback.unknown'), error: convErr.message });
                    }
                    await sleep(jitter());
                }
            } else {
                btn.textContent = '📂 ' + t('status.fetchingOrphanConversations');
                const entries = await listConversations(workspaceId);
                for (let i = 0; i < entries.length; i++) {
                    const entry = entries[i];
                    const label = entry.title ? entry.title.slice(0, 12) : t('fallback.conversation');
                    btn.textContent = '📥 ' + label + ' (' + (i + 1) + '/' + entries.length + ')';
                    try {
                        const convData = await getConversation(entry.id, workspaceId);
                        const target = entry.projectTitle
                            ? zip.folder(sanitizeFilename(entry.projectTitle))
                            : zip;
                        await exportConversationIntoZip(convData, target, accessToken, zipFilenameRegistry);
                    } catch (convErr) {
                        console.error('⚠️ 跳过对话 [' + (entry.title || entry.id) + ']: ' + convErr.message);
                        failedConversations.push({
                            id: entry.id,
                            title: entry.title || t('fallback.unknown'),
                            error: convErr.message
                        });
                    }
                    await sleep(jitter());
                }

            }

            btn.textContent = `📦 ${t('status.generatingZip')}`;
            const blob = await zip.generateAsync({ type: "blob", compression: "DEFLATE" });
            const date = new Date().toISOString().slice(0, 10);
            const selectionType = exportType || ((Array.isArray(conversationEntries) && conversationEntries.length > 0) ? 'selected' : 'full');
            let filename = '';
            if (selectionType === 'selected') {
                filename = mode === 'team'
                    ? `chatgpt_team_selected_${workspaceId}_${date}.zip`
                    : mode === 'project'
                        ? `chatgpt_project_selected_${date}.zip`
                        : `chatgpt_personal_selected_${date}.zip`;
            } else {
                filename = mode === 'team'
                    ? `chatgpt_team_backup_${workspaceId}_${date}.zip`
                    : mode === 'project'
                        ? `chatgpt_project_backup_${date}.zip`
                        : `chatgpt_personal_backup_${date}.zip`;
            }
            downloadFile(blob, filename);
            if (failedConversations.length > 0) {
                const failList = failedConversations.map(f => `• ${f.title}: ${f.error}`).join('\n');
                alert(`⚠️ ${t('alert.exportCompletedWithFailures', { count: failedConversations.length, list: failList })}`);
                console.warn('导出中跳过的对话:', failedConversations);
            } else {
                alert(`✅ ${t('alert.exportSuccess')}`);
            }
            btn.textContent = `✅ ${t('button.done')}`;

        } catch (e) {
            console.error("导出过程中发生严重错误:", e);
            alert(t('alert.exportFailed', { message: e.message }));
            btn.textContent = `⚠️ ${t('button.error')}`;
        } finally {
            setTimeout(() => {
                btn.disabled = false;
                btn.textContent = t('button.export');
            }, 3000);
        }
    }

    async function startExportProcess(mode, workspaceId) {
        await exportConversations({ mode, workspaceId });
    }

    async function startProjectSpaceExportProcess(workspaceId = null) {
        try {
            const projectEntries = await listProjectSpaceConversations(workspaceId);
            if (projectEntries.length === 0) {
                alert(t('alert.noProjectConversations'));
                return;
            }
            await exportConversations({ mode: 'project', workspaceId, conversationEntries: projectEntries, exportType: 'full' });
        } catch (err) {
            console.error('导出项目空间失败:', err);
            alert(t('alert.projectExportFailed', { message: err.message }));
        }
    }

    async function startSelectiveExportProcess(mode, workspaceId, conversationEntries) {
        await exportConversations({ mode, workspaceId, conversationEntries });
    }

    function startScheduledExport(options = {}) {
        const { mode = 'personal', workspaceId = null, autoConfirm = false, source = 'schedule' } = options;
        const proceed = async () => {
            try {
                if (mode === 'project') {
                    await startProjectSpaceExportProcess(workspaceId);
                } else {
                    await startExportProcess(mode, workspaceId);
                }
            } catch (err) {
                console.error('[ChatGPT Exporter] 自动导出失败:', err);
            }
        };

        if (autoConfirm) {
            proceed();
            return;
        }

        const modeLabel = t(`mode.${mode === 'team' ? 'team' : mode === 'project' ? 'project' : 'personal'}`);
        if (confirm(t('confirm.scheduledExport', { mode: modeLabel, source }))) {
            proceed();
        }
    }

    // --- API 调用函数 ---
    function normalizeProjectSpaceItem(item) {
        const rawGizmo = item?.gizmo?.gizmo || item?.gizmo || item;
        const display = rawGizmo?.display || item?.gizmo?.display || item?.display;
        const id = rawGizmo?.id || item?.gizmo?.id || item?.id;
        const title = display?.name || rawGizmo?.name || t('fallback.untitledProject');
        if (!id) return null;
        return {
            id,
            title,
            conversations: item?.conversations?.items || []
        };
    }

    function resolveWorkspaceId(workspaceId) {
        if (workspaceId) return workspaceId;
        const match = document.cookie.match(/(?:^|; )_account=([^;]+)/);
        if (match?.[1]) return match[1];
        const detectedIds = detectAllWorkspaceIds();
        return detectedIds.length > 0 ? detectedIds[0] : null;
    }

    async function getProjectSpaces(workspaceId, options = {}) {
        const deviceId = getOaiDeviceId();
        if (!deviceId) {
            throw new Error(t('error.deviceIdUnavailable'));
        }
        const headers = {
            'Authorization': `Bearer ${accessToken}`,
            'oai-device-id': deviceId
        };
        const resolvedWorkspaceId = resolveWorkspaceId(workspaceId);
        if (resolvedWorkspaceId) { headers['ChatGPT-Account-Id'] = resolvedWorkspaceId; }

        const projects = new Map();
        let cursor = null;

        do {
            const query = new URLSearchParams();
            query.set('limit', String(PROJECT_SIDEBAR_LIMIT));
            if (options.conversationsPerGizmo !== undefined) {
                query.set('conversations_per_gizmo', String(options.conversationsPerGizmo));
            }
            if (options.ownedOnly !== undefined) {
                query.set('owned_only', options.ownedOnly ? 'true' : 'false');
            }
            if (cursor) {
                query.set('cursor', cursor);
            }

            const r = await fetch(`/backend-api/gizmos/snorlax/sidebar?${query.toString()}`, { headers });
            if (!r.ok) {
                throw new Error(t('error.projectSpaceListFailed', { status: r.status }));
            }
            const data = await r.json();
            data.items?.forEach(item => {
                const project = normalizeProjectSpaceItem(item);
                if (project) {
                    projects.set(project.id, project);
                }
            });
            cursor = data.cursor || null;
            if (cursor) {
            }
        } while (cursor);

        return Array.from(projects.values());
    }

    async function getProjects(workspaceId) {
        if (!workspaceId) return [];
        try {
            const projects = await getProjectSpaces(workspaceId);
            return projects.map(({ id, title }) => ({ id, title }));
        } catch (err) {
            console.warn(`获取项目(Gizmo)列表失败 (${err?.message || err})`);
            return [];
        }
    }

    async function collectIds(btn, workspaceId, gizmoId) {
        const all = new Set();
        const deviceId = getOaiDeviceId();
        if (!deviceId) {
            throw new Error(t('error.deviceIdUnavailable'));
        }
        const headers = {
            'Authorization': `Bearer ${accessToken}`,
            'oai-device-id': deviceId
        };
        if (workspaceId) { headers['ChatGPT-Account-Id'] = workspaceId; }

        if (gizmoId) {
            let cursor = '0';
            do {
                const r = await fetch(`/backend-api/gizmos/${gizmoId}/conversations?cursor=${cursor}`, { headers });
                if (!r.ok) throw new Error(t('error.projectConversationListFailed', { status: r.status }));
                const j = await r.json();
                j.items?.forEach(it => all.add(it.id));
                cursor = j.cursor;
                await sleep(jitter());
            } while (cursor);
        } else {
            for (const is_archived of [false, true]) {
                let offset = 0, has_more = true, page = 0;
                do {
                    btn.textContent = `📂 ${t('status.rootPage', {
                        state: is_archived ? t('status.archived') : t('status.active'),
                        page: ++page
                    })}`;
                    const r = await fetch(`/backend-api/conversations?offset=${offset}&limit=${PAGE_LIMIT}&order=updated${is_archived ? '&is_archived=true' : ''}`, { headers });
                    if (!r.ok) throw new Error(t('error.rootConversationListFailed', { status: r.status }));
                    const j = await r.json();
                    if (j.items && j.items.length > 0) {
                        j.items.forEach(it => all.add(it.id));
                        has_more = j.items.length === PAGE_LIMIT;
                        offset += j.items.length;
                    } else {
                        has_more = false;
                    }
                    await sleep(jitter());
                } while (has_more);
            }
        }
        return Array.from(all);
    }

    function upsertConversationEntry(map, item, extra = {}) {
        if (!item?.id) return null;
        const hasArchiveState = extra.is_archived !== undefined || item.is_archived !== undefined;
        const create_time = normalizeEpochSeconds(item.create_time || 0);
        const update_time = normalizeEpochSeconds(item.update_time || item.create_time || 0);
        const entry = {
            id: String(item.id),
            title: item.title || t('fallback.untitledConversation'),
            create_time,
            update_time,
            is_archived: extra.is_archived ?? item.is_archived ?? false,
            projectId: extra.projectId || item.projectId || null,
            projectTitle: extra.projectTitle || item.projectTitle || null
        };
        const existing = map.get(entry.id);
        if (!existing) {
            map.set(entry.id, entry);
            return entry;
        }
        if (entry.projectTitle) {
            existing.projectTitle = entry.projectTitle;
            existing.projectId = entry.projectId;
        }
        if (!existing.create_time && entry.create_time) existing.create_time = entry.create_time;
        if (hasArchiveState) existing.is_archived = entry.is_archived;
        if (entry.update_time > (existing.update_time || 0)) existing.update_time = entry.update_time;
        if (item.title) existing.title = item.title;
        return existing;
    }

    function getConversationCacheKey(workspaceId) {
        const scope = workspaceId ? String(workspaceId) : 'personal';
        return 'chatgpt-exporter:conversation-list:v' + LIST_CACHE_VERSION + ':' + encodeURIComponent(scope);
    }

    function createEmptyConversationListCache() {
        return {
            entries: new Map(),
            projects: new Map(),
            rootComplete: false,
            projectComplete: false,
            rootUpdatedAt: 0,
            projectUpdatedAt: 0,
            updatedAt: 0
        };
    }

    function loadConversationListCache(workspaceId) {
        const key = getConversationCacheKey(workspaceId);
        let cache = conversationListCaches.get(key);
        if (cache) {
            const latest = Math.max(cache.rootUpdatedAt || 0, cache.projectUpdatedAt || 0, cache.updatedAt || 0);
            if (latest && Date.now() - latest > LIST_CACHE_MAX_AGE_MS) {
                conversationListCaches.delete(key);
                try { sessionStorage.removeItem(key); } catch (_) {}
                cache = null;
            }
        }
        if (cache) return cache;

        cache = createEmptyConversationListCache();
        try {
            const raw = sessionStorage.getItem(key);
            if (raw) {
                const saved = JSON.parse(raw);
                const latest = Math.max(saved.rootUpdatedAt || 0, saved.projectUpdatedAt || 0, saved.updatedAt || 0);
                if (saved.version === LIST_CACHE_VERSION && Array.isArray(saved.entries)
                    && (!latest || Date.now() - latest <= LIST_CACHE_MAX_AGE_MS)) {
                    saved.entries.forEach(item => upsertConversationEntry(cache.entries, item));
                    (Array.isArray(saved.projects) ? saved.projects : []).forEach(project => {
                        if (project?.id) cache.projects.set(String(project.id), String(project.title || ''));
                    });
                    cache.rootComplete = Boolean(saved.rootComplete);
                    cache.projectComplete = Boolean(saved.projectComplete);
                    cache.rootUpdatedAt = Number(saved.rootUpdatedAt) || 0;
                    cache.projectUpdatedAt = Number(saved.projectUpdatedAt) || 0;
                    cache.updatedAt = Number(saved.updatedAt) || latest || 0;
                } else {
                    sessionStorage.removeItem(key);
                }
            }
        } catch (_) {}
        conversationListCaches.set(key, cache);
        return cache;
    }

    function persistConversationListCache(workspaceId, cache) {
        const key = getConversationCacheKey(workspaceId);
        cache.updatedAt = Date.now();
        conversationListCaches.set(key, cache);
        const sorted = Array.from(cache.entries.values())
            .sort((a, b) => (b.update_time || 0) - (a.update_time || 0));
        const truncated = sorted.length > LIST_CACHE_MAX_ENTRIES;
        const payload = {
            version: LIST_CACHE_VERSION,
            updatedAt: cache.updatedAt,
            rootUpdatedAt: cache.rootUpdatedAt,
            projectUpdatedAt: cache.projectUpdatedAt,
            rootComplete: cache.rootComplete && !truncated,
            projectComplete: cache.projectComplete && !truncated,
            projects: Array.from(cache.projects.entries()).map(([id, title]) => ({ id, title })),
            entries: sorted.slice(0, LIST_CACHE_MAX_ENTRIES)
        };
        try {
            sessionStorage.setItem(key, JSON.stringify(payload));
        } catch (_) {
            // sessionStorage may be unavailable or full; the in-memory cache remains usable.
        }
    }

    function clearConversationListCacheMemory() {
        conversationListCaches.clear();
    }

    function isConversationListCacheComplete(cache, workspaceId, projectOnly = false) {
        if (projectOnly) return Boolean(cache.projectComplete);
        return Boolean(cache.rootComplete && (!workspaceId || cache.projectComplete));
    }

    function isConversationListCacheFresh(cache, workspaceId, projectOnly = false) {
        const now = Date.now();
        if (projectOnly) {
            return Boolean(cache.projectComplete && cache.projectUpdatedAt
                && now - cache.projectUpdatedAt <= LIST_CACHE_PROJECT_FRESH_MS);
        }
        const rootFresh = Boolean(cache.rootComplete && cache.rootUpdatedAt
            && now - cache.rootUpdatedAt <= LIST_CACHE_FRESH_MS);
        const projectsFresh = !workspaceId || Boolean(cache.projectComplete && cache.projectUpdatedAt
            && now - cache.projectUpdatedAt <= LIST_CACHE_PROJECT_FRESH_MS);
        return rootFresh && projectsFresh;
    }

    function cloneConversationEntryMap(source, predicate = null) {
        const result = new Map();
        source.forEach((entry, id) => {
            if (!predicate || predicate(entry)) result.set(id, { ...entry });
        });
        return result;
    }

    function sortedConversationEntries(map, projectOnly = false) {
        return Array.from(map.values())
            .filter(entry => !projectOnly || Boolean(entry.projectId))
            .sort((a, b) => (b.update_time || 0) - (a.update_time || 0));
    }

    function emitConversationListUpdate(onUpdate, list, meta = {}) {
        if (typeof onUpdate !== 'function') return;
        try { onUpdate(list, meta); }
        catch (err) { console.warn('[ChatGPT Exporter] 列表界面更新失败:', err); }
    }

    function captureConversationListResponse(url, workspaceId, payload) {
        if (!url || !payload || typeof payload !== 'object') return;
        const path = url.pathname;
        const isRootList = path === '/backend-api/conversations';
        const isProjectSidebar = path === '/backend-api/gizmos/snorlax/sidebar';
        const projectMatch = path.match(/^\/backend-api\/gizmos\/([^/]+)\/conversations$/);
        if (!isRootList && !isProjectSidebar && !projectMatch) return;

        let resolvedWorkspaceId = workspaceId || null;
        if (!resolvedWorkspaceId && (projectMatch || isProjectSidebar)) {
            resolvedWorkspaceId = resolveWorkspaceId(null);
            if (!resolvedWorkspaceId) return;
        }
        const cache = loadConversationListCache(resolvedWorkspaceId);
        const items = Array.isArray(payload.items) ? payload.items : [];

        if (isRootList) {
            const archived = url.searchParams.get('is_archived') === 'true';
            items.forEach(item => upsertConversationEntry(cache.entries, item, { is_archived: archived }));
        } else if (isProjectSidebar) {
            items.forEach(rawProject => {
                const project = normalizeProjectSpaceItem(rawProject);
                if (!project) return;
                cache.projects.set(String(project.id), project.title);
                project.conversations.forEach(item => upsertConversationEntry(cache.entries, item, {
                    projectId: project.id,
                    projectTitle: project.title
                }));
            });
        } else if (projectMatch) {
            let projectId = projectMatch[1];
            try { projectId = decodeURIComponent(projectId); } catch (_) {}
            const projectTitle = cache.projects.get(String(projectId)) || null;
            items.forEach(item => upsertConversationEntry(cache.entries, item, {
                projectId,
                projectTitle
            }));
        }
        // Keep intercepted pages in memory; persist once a complete scan has been assembled.
        cache.updatedAt = Date.now();
        conversationListCaches.set(getConversationCacheKey(resolvedWorkspaceId), cache);
    }

    async function mapWithConcurrency(items, concurrency, worker) {
        let nextIndex = 0;
        const errors = [];
        const workers = Array.from({ length: Math.min(concurrency, items.length) }, async () => {
            while (nextIndex < items.length) {
                const index = nextIndex++;
                try { await worker(items[index], index); }
                catch (err) { errors.push(err); }
            }
        });
        await Promise.all(workers);
        if (errors.length) throw errors[0];
    }

    async function getConversationListHeaders(workspaceId) {
        if (!await ensureAccessToken()) throw new Error(t('alert.accessTokenUnavailable'));
        const deviceId = getOaiDeviceId();
        if (!deviceId) throw new Error(t('error.deviceIdUnavailable'));
        const headers = {
            'Authorization': 'Bearer ' + accessToken,
            'oai-device-id': deviceId
        };
        if (workspaceId) headers['ChatGPT-Account-Id'] = workspaceId;
        return headers;
    }

    async function fetchRootConversationPages(map, headers, firstPageOnly = false) {
        for (const isArchived of [false, true]) {
            let offset = 0;
            while (true) {
                const url = '/backend-api/conversations?offset=' + offset + '&limit=' + PAGE_LIMIT
                    + '&order=updated' + (isArchived ? '&is_archived=true' : '');
                const response = await fetch(url, { headers });
                if (!response.ok) throw new Error(t('error.conversationListFailed', { status: response.status }));
                const data = await response.json();
                const items = Array.isArray(data.items) ? data.items : [];
                items.forEach(item => upsertConversationEntry(map, item, { is_archived: isArchived }));
                if (firstPageOnly) break;
                const hasMore = typeof data.has_more === 'boolean' ? data.has_more : items.length === PAGE_LIMIT;
                if (!hasMore || items.length === 0) break;
                offset += items.length;
            }
        }
    }

    function addProjectPreviews(map, cache, projects) {
        const activeProjectIds = new Set(projects.map(project => String(project.id)));
        for (const [id, entry] of map) {
            if (entry.projectId && !activeProjectIds.has(String(entry.projectId))) {
                map.delete(id);
            }
        }
        cache.projects.clear();
        projects.forEach(project => {
            cache.projects.set(String(project.id), project.title);
            (project.conversations || []).forEach(item => upsertConversationEntry(map, item, {
                projectId: project.id,
                projectTitle: project.title
            }));
        });
    }

    async function fetchProjectConversationPages(map, projects, headers, options = {}) {
        const allowPreviewFallback = Boolean(options.allowPreviewFallback);
        const firstPageOnly = Boolean(options.firstPageOnly);
        let complete = true;
        await mapWithConcurrency(projects, PROJECT_LIST_CONCURRENCY, async project => {
            const preview = Array.isArray(project.conversations) ? project.conversations : [];
            preview.forEach(item => upsertConversationEntry(map, item, {
                projectId: project.id,
                projectTitle: project.title
            }));
            let cursor = '0';
            let fetched = false;
            try {
                do {
                    const response = await fetch('/backend-api/gizmos/' + encodeURIComponent(project.id)
                        + '/conversations?cursor=' + encodeURIComponent(cursor), { headers });
                    if (!response.ok) throw new Error(t('error.projectConversationListFailed', { status: response.status }));
                    const data = await response.json();
                    (Array.isArray(data.items) ? data.items : []).forEach(item => upsertConversationEntry(map, item, {
                        projectId: project.id,
                        projectTitle: project.title
                    }));
                    cursor = firstPageOnly ? null : (data.cursor || null);
                    fetched = true;
                } while (cursor);
            } catch (err) {
                if (allowPreviewFallback && !fetched && preview.length > 0) {
                    complete = false;
                    console.warn('项目空间列表请求失败，暂时使用侧边栏预览:', project.title, err.message);
                    return;
                }
                throw err;
            }
        });
        return complete;
    }

    async function listConversations(workspaceId, onUpdate = null) {
        const cache = loadConversationListCache(workspaceId);
        const map = cloneConversationEntryMap(cache.entries);
        const cacheComplete = isConversationListCacheComplete(cache, workspaceId);
        const cacheFresh = isConversationListCacheFresh(cache, workspaceId);
        const localList = sortedConversationEntries(map);
        if (localList.length || cacheComplete) {
            emitConversationListUpdate(onUpdate, localList, {
                source: 'local',
                complete: cacheComplete,
                refreshing: !cacheFresh
            });
        }
        if (cacheComplete && cacheFresh) {
            emitConversationListUpdate(onUpdate, localList, {
                source: 'cache',
                complete: true,
                refreshing: false
            });
            return localList;
        }

        const now = Date.now();
        const rootCacheReusable = cache.rootUpdatedAt > 0
            && now - cache.rootUpdatedAt <= LIST_CACHE_MAX_AGE_MS;
        const projectCacheReusable = !workspaceId || (cache.projectUpdatedAt > 0
            && now - cache.projectUpdatedAt <= LIST_CACHE_MAX_AGE_MS);
        const canIncrement = cacheComplete && rootCacheReusable && projectCacheReusable;

        let rootFetched = false;
        try {
            const headers = await getConversationListHeaders(workspaceId);
            if (canIncrement) {
                await fetchRootConversationPages(map, headers, true);
                rootFetched = true;
                if (workspaceId && !isConversationListCacheFresh(cache, workspaceId, true)) {
                    const projects = await getProjectSpaces(workspaceId, {
                        conversationsPerGizmo: PROJECT_SIDEBAR_PREVIEW
                    });
                    addProjectPreviews(map, cache, projects);
                    cache.projectComplete = await fetchProjectConversationPages(map, projects, headers, { allowPreviewFallback: true, firstPageOnly: true });
                    cache.projectUpdatedAt = Date.now();
                } else if (!workspaceId) {
                    cache.projectComplete = true;
                    cache.projectUpdatedAt = Date.now();
                }
                cache.entries = map;
                cache.rootComplete = true;
                cache.rootUpdatedAt = Date.now();
                persistConversationListCache(workspaceId, cache);
                const list = sortedConversationEntries(map);
                emitConversationListUpdate(onUpdate, list, {
                    source: 'api',
                    complete: cache.rootComplete && (!workspaceId || cache.projectComplete),
                    refreshing: false
                });
                return list;
            }

            await fetchRootConversationPages(map, headers, false);
            rootFetched = true;
            cache.rootComplete = true;
            cache.rootUpdatedAt = Date.now();

            let projectWarning = null;
            if (workspaceId) {
                try {
                    const projects = await getProjectSpaces(workspaceId, {
                        conversationsPerGizmo: PROJECT_SIDEBAR_PREVIEW
                    });
                    addProjectPreviews(map, cache, projects);
                    const projectsComplete = await fetchProjectConversationPages(map, projects, headers, { allowPreviewFallback: true });
                    cache.projectComplete = projectsComplete;
                    cache.projectUpdatedAt = Date.now();
                    if (!projectsComplete) projectWarning = t('status.projectPartial');
                } catch (err) {
                    cache.projectComplete = false;
                    projectWarning = err.message;
                    console.warn('[ChatGPT Exporter] 项目列表补充失败:', err);
                }
            } else {
                cache.projectComplete = true;
                cache.projectUpdatedAt = Date.now();
            }

            cache.entries = map;
            persistConversationListCache(workspaceId, cache);
            const list = sortedConversationEntries(map);
            emitConversationListUpdate(onUpdate, list, {
                source: 'api',
                complete: cache.rootComplete && (!workspaceId || cache.projectComplete),
                refreshing: false,
                warning: projectWarning
            });
            return list;
        } catch (err) {
            const list = sortedConversationEntries(map);
            if (list.length || cacheComplete) {
                if (rootFetched) {
                    cache.entries = map;
                    cache.rootComplete = true;
                    cache.rootUpdatedAt = Date.now();
                    persistConversationListCache(workspaceId, cache);
                }
                emitConversationListUpdate(onUpdate, list, {
                    source: 'local',
                    complete: cacheComplete,
                    refreshing: false,
                    warning: err.message
                });
                return list;
            }
            throw err;
        }
    }

    async function listProjectSpaceConversations(workspaceId, onUpdate = null) {
        const resolvedWorkspaceId = resolveWorkspaceId(workspaceId);
        const cache = loadConversationListCache(resolvedWorkspaceId);
        const cachedProjects = cloneConversationEntryMap(cache.entries, entry => Boolean(entry.projectId));
        const cachedList = sortedConversationEntries(cachedProjects, true);
        const cacheComplete = isConversationListCacheComplete(cache, resolvedWorkspaceId, true);
        const cacheFresh = isConversationListCacheFresh(cache, resolvedWorkspaceId, true);

        if (cachedList.length || cacheComplete) {
            emitConversationListUpdate(onUpdate, cachedList, {
                source: 'local',
                complete: cacheComplete,
                refreshing: !cacheFresh
            });
        }
        if (cacheComplete && cacheFresh) {
            emitConversationListUpdate(onUpdate, cachedList, {
                source: 'cache',
                complete: true,
                refreshing: false
            });
            return cachedList;
        }

        const canIncrement = cacheComplete && cache.projectUpdatedAt
            && Date.now() - cache.projectUpdatedAt <= LIST_CACHE_MAX_AGE_MS;
        try {
            const headers = await getConversationListHeaders(resolvedWorkspaceId);
            if (canIncrement) {
                const projects = await getProjectSpaces(resolvedWorkspaceId, {
                    conversationsPerGizmo: PROJECT_SIDEBAR_PREVIEW,
                    ownedOnly: true
                });
                const map = cloneConversationEntryMap(cachedProjects);
                addProjectPreviews(map, cache, projects);
                const projectsComplete = await fetchProjectConversationPages(map, projects, headers, { allowPreviewFallback: true, firstPageOnly: true });
                const combined = cloneConversationEntryMap(cache.entries, entry => !entry.projectId);
                map.forEach((entry, id) => combined.set(id, entry));
                cache.entries = combined;
                cache.projectComplete = projectsComplete;
                cache.projectUpdatedAt = Date.now();
                persistConversationListCache(resolvedWorkspaceId, cache);
                const list = sortedConversationEntries(map, true);
                emitConversationListUpdate(onUpdate, list, {
                    source: 'api',
                    complete: projectsComplete,
                    refreshing: false
                });
                return list;
            }

            const projects = await getProjectSpaces(resolvedWorkspaceId, {
                conversationsPerGizmo: PROJECT_SIDEBAR_PREVIEW,
                ownedOnly: true
            });
            const map = new Map();
            addProjectPreviews(map, cache, projects);
            const projectsComplete = await fetchProjectConversationPages(map, projects, headers, { allowPreviewFallback: true });
            const combined = cloneConversationEntryMap(cache.entries, entry => !entry.projectId);
            map.forEach((entry, id) => combined.set(id, entry));
            cache.entries = combined;
            cache.projectComplete = projectsComplete;
            cache.projectUpdatedAt = Date.now();
            persistConversationListCache(resolvedWorkspaceId, cache);
            const list = sortedConversationEntries(map, true);
            emitConversationListUpdate(onUpdate, list, {
                source: 'api',
                complete: projectsComplete,
                refreshing: false,
                warning: projectsComplete ? null : t('status.projectPartial')
            });
            return list;
        } catch (err) {
            if (cachedList.length || cacheComplete) {
                emitConversationListUpdate(onUpdate, cachedList, {
                    source: 'local',
                    complete: cacheComplete,
                    refreshing: false,
                    warning: err.message
                });
                return cachedList;
            }
            throw err;
        }
    }

    async function getConversation(id, workspaceId, retries = 3) {
        const deviceId = getOaiDeviceId();
        if (!deviceId) {
            throw new Error(t('error.deviceIdUnavailable'));
        }
        const headers = {
            'Authorization': `Bearer ${accessToken}`,
            'oai-device-id': deviceId
        };
        const resolvedWorkspaceId = resolveWorkspaceId(workspaceId);
        if (resolvedWorkspaceId) { headers['ChatGPT-Account-Id'] = resolvedWorkspaceId; }

        let lastError = null;
        for (let attempt = 1; attempt <= retries; attempt++) {
            try {
                const r = await fetch(`/backend-api/conversation/${id}`, { headers });
                if (r.ok) {
                    const j = await r.json();
                    j.__fetched_at = new Date().toISOString();
                    return j;
                }
                lastError = new Error(t('error.conversationDetailFailed', { id, status: r.status }));
                // 仅对 5xx 服务端错误重试
                if (r.status >= 500 && attempt < retries) {
                    const backoff = Math.pow(2, attempt) * 1000 + Math.random() * 500;
                    console.warn(`⚠️ 第 ${attempt} 次获取对话 ${id} 失败 (${r.status})，${Math.round(backoff / 1000)}s 后重试...`);
                    await sleep(backoff);
                    continue;
                }
                throw lastError;
            } catch (err) {
                lastError = err;
                if (attempt < retries && !(err.message && err.message.includes('(4'))) {
                    const backoff = Math.pow(2, attempt) * 1000 + Math.random() * 500;
                    console.warn(`⚠️ 第 ${attempt} 次获取对话 ${id} 异常: ${err.message}，${Math.round(backoff / 1000)}s 后重试...`);
                    await sleep(backoff);
                    continue;
                }
                throw err;
            }
        }
        throw lastError;
    }

    // --- 图片导出辅助函数 ---
    function normalizeAssetId(raw) {
        if (!raw) return '';
        if (typeof raw !== 'string') return '';
        const trimmed = raw.trim();
        // 处理 sediment://file_xxx 格式 (新格式)
        if (trimmed.startsWith('sediment://')) {
            const path = trimmed.replace('sediment://', '');
            // sediment://file_0000000066dc72099fe3a16ea00b7e51 → file_0000000066dc72099fe3a16ea00b7e51
            return path || trimmed.replace(/[^\w.-]/g, '_');
        }
        if (trimmed.startsWith('file://') || trimmed.startsWith('file-') || trimmed.startsWith('file_')) {
            const m = trimmed.match(/[a-z0-9]{8}-[a-z0-9]{4}-[a-z0-9]{4}-[a-z0-9]{4}-[a-z0-9]{12}/i);
            if (m) return m[0];
            // 也尝试匹配 file_xxxx 格式 (无连字符)
            const m2 = trimmed.match(/file[_-]([a-f0-9]+)/i);
            if (m2) return `file_${m2[1]}`;
        }
        if (trimmed.startsWith('https://') || trimmed.startsWith('http://')) {
            const u = new URL(trimmed);
            const path = u.pathname.split('/').filter(Boolean);
            const last = path[path.length - 1];
            if (last) return last.replace(/\.[a-z0-9]+$/i, '');
        }
        if (/^[a-f0-9]{8}-[a-f0-9]{4}-[a-f0-9]{4}-[a-f0-9]{4}-[a-f0-9]{12}$/i.test(trimmed)) {
            return trimmed.toLowerCase();
        }
        return trimmed.replace(/[^\w.-]/g, '_');
    }

    function guessImageExt(contentType, url) {
        if (typeof contentType === 'string') {
            const ct = contentType.toLowerCase();
            if (ct.includes('png')) return 'png';
            if (ct.includes('jpeg') || ct.includes('jpg')) return 'jpg';
            if (ct.includes('webp')) return 'webp';
            if (ct.includes('gif')) return 'gif';
            if (ct.includes('svg')) return 'svg';
            if (ct.includes('bmp')) return 'bmp';
        }
        if (typeof url === 'string') {
            const m = url.toLowerCase().match(/\.(png|jpe?g|webp|gif|svg|bmp)(?:\?|$)/);
            if (m) return m[1] === 'jpg' ? 'jpg' : m[1];
        }
        return 'png';
    }

    function guessFileExt(contentType, url, filename) {
        const byName = String(filename || url || '').toLowerCase().match(/\.([a-z0-9]{1,12})(?:\?|$)/);
        if (byName) return byName[1];
        const ct = String(contentType || '').toLowerCase();
        if (ct.includes('pdf')) return 'pdf';
        if (ct.includes('csv')) return 'csv';
        if (ct.includes('json')) return 'json';
        if (ct.includes('markdown')) return 'md';
        if (ct.includes('plain')) return 'txt';
        if (ct.includes('spreadsheet')) return 'xlsx';
        if (ct.includes('presentation')) return 'pptx';
        if (ct.includes('wordprocessing')) return 'docx';
        if (ct.includes('zip')) return 'zip';
        return '';
    }

    async function resolveFileDownloadUrl(fileId, accessToken) {
        const deviceId = getOaiDeviceId();
        const headers = {
            'Authorization': `Bearer ${accessToken}`,
        };
        if (deviceId) headers['oai-device-id'] = deviceId;
        const resolvedWs = resolveWorkspaceId(null);
        if (resolvedWs) headers['ChatGPT-Account-Id'] = resolvedWs;

        const r = await fetch(`/backend-api/files/${encodeURIComponent(String(fileId))}/download`, { headers });
        if (!r.ok) throw new Error(t('error.fileDownloadUrlFailed', { status: r.status }));
        const data = await r.json();
        return data.download_url || null;
    }

    async function resolveImageDownloadUrl(fileId, accessToken) {
        return resolveFileDownloadUrl(fileId, accessToken);
    }

    const TRUSTED_ASSET_DOMAINS = ['oaiusercontent.com', 'oaistatic.com', 'openai.com', 'chatgpt.com'];
    function isTrustedAssetHost(hostname) {
        const host = String(hostname || '').toLowerCase();
        return TRUSTED_ASSET_DOMAINS.some(domain => host === domain || host.endsWith(`.${domain}`));
    }
    function createAssetFetchRequest(rawUrl, token) {
        let url;
        try { url = new URL(String(rawUrl || ''), location.origin); }
        catch (_) { throw new Error('Invalid asset URL'); }
        if (url.protocol !== 'https:' || url.username || url.password) throw new Error('Blocked untrusted asset URL');
        const sameOrigin = url.origin === location.origin;
        if (!sameOrigin && !isTrustedAssetHost(url.hostname)) throw new Error('Blocked untrusted asset host');
        const options = { credentials: sameOrigin ? 'same-origin' : 'omit', referrerPolicy: 'no-referrer' };
        if (sameOrigin && token) options.headers = { 'Authorization': `Bearer ${token}` };
        return { url: url.href, options };
    }
    async function fetchImageBlob(image, accessToken) {
        let url = image.url || image.download_url;
        if (!url && image.asset_pointer) {
            const fileId = normalizeAssetId(image.asset_pointer);
            if (fileId) {
                try { url = await resolveImageDownloadUrl(fileId, accessToken); }
                catch (err) { console.warn(`⚠️ 无法解析图片下载链接 [${fileId}]:`, err.message); return null; }
            }
        }
        if (!url) return null;
        const request = createAssetFetchRequest(url, accessToken);
        const r = await fetch(request.url, request.options);
        if (!r.ok) throw new Error(t('error.imageDownloadFailed', { status: r.status }));
        return await r.blob();
    }
    async function fetchAttachmentBlob(file, accessToken) {
        let url = file.url || file.download_url;
        if (!url && file.file_id) {
            const fileId = normalizeAssetId(file.file_id);
            if (fileId) url = await resolveFileDownloadUrl(fileId, accessToken);
        }
        if (!url) return null;
        const request = createAssetFetchRequest(url, accessToken);
        const r = await fetch(request.url, request.options);
        if (!r.ok) throw new Error(t('error.fileDownloadFailed', { status: r.status }));
        return await r.blob();
    }
    async function downloadConversationAssets(convData, targetZip, generateMarkdown, accessToken, zipFilenameRegistry) {
        const messages = extractConversationMessages(convData);
        const seen = new Set();
        const pending = [];
        const seenFiles = new Set();
        const pendingFiles = [];
        const imageFiles = new Map(); // asset_pointer -> { filename, dispositionLabel }
        const attachmentFiles = new Map(); // attachment key -> { filename, label }

        for (const msg of messages) {
            if (Array.isArray(msg.images)) {
                for (let k = 0; k < msg.images.length; k++) {
                    const img = msg.images[k];
                    const key = img.asset_pointer || img.url || (img.asset_pointer + '_' + k);
                    if (seen.has(key)) continue;
                    seen.add(key);
                    pending.push({ image: img, msgIndex: pending.length, assetId: normalizeAssetId(img.asset_pointer) });
                }
            }
            if (Array.isArray(msg.files)) {
                for (let k = 0; k < msg.files.length; k++) {
                    const file = msg.files[k];
                    const key = file.key || file.file_id || file.url || `${file.filename}_${k}`;
                    if (seenFiles.has(key)) continue;
                    seenFiles.add(key);
                    pendingFiles.push({ file, key, assetId: normalizeAssetId(file.file_id || file.url || key) });
                }
            }
        }

        if (pending.length === 0 && pendingFiles.length === 0) {
            return generateMarkdown ? convertConversationToMarkdown(convData) : null;
        }
        let okCount = 0;
        if (pending.length > 0) {
            const ns = targetZip.folder('images');
            const imageScope = `${targetZip.root || ''}${targetZip.name || ''}images/`;
            for (let i = 0; i < pending.length; i++) {
                const { image, assetId } = pending[i];
                try {
                    const blob = await fetchImageBlob(image, accessToken);
                    const ext = guessImageExt(image.content_type, image.url);
                    const safeAssetId = sanitizeImageFilenamePart(assetId, `image_${i + 1}`);
                    const filename = makeUniqueZipFilename(
                        `img_${String(i + 1).padStart(2, '0')}_${safeAssetId}.${ext}`,
                        zipFilenameRegistry,
                        imageScope
                    );
                    ns.file(filename, blob);
                    imageFiles.set(image.asset_pointer, {
                        filename,
                        dispositionLabel: image.dispositionLabel || 'image'
                    });
                    okCount++;
                } catch (err) {
                    console.warn(`⚠️ 图片下载跳过 [${assetId}]:`, err.message, image);
                }
                await sleep(jitter());
            }
            console.log(`🖼️ 图片导出: ${okCount}/${pending.length} 张成功`);
        }

        let okFileCount = 0;
        if (pendingFiles.length > 0) {
            const ns = targetZip.folder('files');
            const fileScope = `${targetZip.root || ''}${targetZip.name || ''}files/`;
            for (let i = 0; i < pendingFiles.length; i++) {
                const { file, key, assetId } = pendingFiles[i];
                try {
                    const blob = await fetchAttachmentBlob(file, accessToken);
                    if (!blob) throw new Error(t('error.noDownloadUrl'));
                    let safeName = sanitizeFilename(file.filename || file.label || assetId, `file_${i + 1}`, MAX_SAFE_NAME_LENGTH);
                    if (!splitFilename(safeName).ext) {
                        const ext = guessFileExt(file.content_type, file.url, file.filename);
                        if (ext) safeName += `.${ext}`;
                    }
                    const filename = makeUniqueZipFilename(safeName, zipFilenameRegistry, fileScope);
                    ns.file(filename, blob);
                    const entry = {
                        filename,
                        label: file.label || file.filename || filename
                    };
                    fileReferenceKeys({ ...file, key }).forEach(alias => attachmentFiles.set(alias, entry));
                    okFileCount++;
                } catch (err) {
                    console.warn(`⚠️ 文件下载跳过 [${assetId}]:`, err.message, file);
                }
                await sleep(jitter());
            }
            console.log(`📎 文件导出: ${okFileCount}/${pendingFiles.length} 个成功`);
        }

        return generateMarkdown ? convertConversationToMarkdown(convData, imageFiles, attachmentFiles) : null;
    }

    /**
     * 将单个对话导出到 ZIP（同时写入 JSON 原始数据、Markdown（含图片引用）、以及图片文件）。
     * @returns {Promise<void>}
     */
    async function exportConversationIntoZip(convData, zip, accessToken, zipFilenameRegistry) {
        const scope = `${zip.root || ''}${zip.name || ''}`;
        const jsonFilename = makeUniqueZipFilename(generateUniqueFilename(convData), zipFilenameRegistry, scope);
        zip.file(jsonFilename, JSON.stringify(convData, null, 2));
        const markdown = await downloadConversationAssets(convData, zip, true, accessToken, zipFilenameRegistry);
        const markdownFilename = makeUniqueZipFilename(
            jsonFilename.endsWith('.json') ? `${jsonFilename.slice(0, -5)}.md` : generateMarkdownFilename(convData),
            zipFilenameRegistry,
            scope
        );
        zip.file(markdownFilename, markdown);
    }

    // --- UI 相关函数 ---
    // (UI部分无变动，此处省略以保持简洁)
    /**
     * [新增] 全面检测函数，返回所有找到的ID
     * @returns {string[]} - 返回包含所有唯一Workspace ID的数组
     */
    function detectAllWorkspaceIds() {
        const foundIds = new Set(capturedWorkspaceIds); // 从网络拦截的结果开始

        // 扫描 __NEXT_DATA__
        try {
            const data = JSON.parse(document.getElementById('__NEXT_DATA__').textContent);
            // 遍历所有账户信息
            const accounts = data?.props?.pageProps?.user?.accounts;
            if (accounts) {
                Object.values(accounts).forEach(acc => {
                    if (acc?.account?.id) {
                        foundIds.add(acc.account.id);
                    }
                });
            }
        } catch (e) {}

        // 扫描 localStorage
        try {
            for (let i = 0; i < localStorage.length; i++) {
                const key = localStorage.key(i);
                if (key && (key.includes('account') || key.includes('workspace'))) {
                    const value = localStorage.getItem(key);
                    if (value && /^[a-z0-9]{2,}-[a-f0-9]{8}-[a-f0-9]{4}-[a-f0-9]{4}-[a-f0-9]{4}-[a-f0-9]{12}$/i.test(value.replace(/"/g, ''))) {
                         const extractedId = value.match(/ws-[a-f0-9]{8}-[a-f0-9]{4}-[a-f0-9]{4}-[a-f0-9]{4}-[a-f0-9]{12}/i);
                         if(extractedId) foundIds.add(extractedId[0]);
                    } else if (value && /^[a-f0-9]{8}-[a-f0-9]{4}-[a-f0-9]{4}-[a-f0-9]{4}-[a-f0-9]{12}$/i.test(value.replace(/"/g, ''))) {
                         foundIds.add(value.replace(/"/g, ''));
                    }
                }
            }
        } catch(e) {}

        return Array.from(foundIds);
    }

    function showConversationPicker(options = {}) {
        const { mode = 'personal', workspaceId = null } = options;
        const existing = document.getElementById('export-dialog-overlay');
        if (existing) existing.remove();

        const overlay = document.createElement('div');
        overlay.id = 'export-dialog-overlay';
        Object.assign(overlay.style, {
            position: 'fixed', top: '0', left: '0', width: '100%', height: '100%',
            backgroundColor: 'rgba(0, 0, 0, 0.5)', zIndex: '99998',
            display: 'flex', alignItems: 'center', justifyContent: 'center'
        });

        const dialog = document.createElement('div');
        dialog.id = 'export-dialog';
        Object.assign(dialog.style, {
            background: '#fff', padding: '24px', borderRadius: '12px',
            boxShadow: '0 5px 15px rgba(0,0,0,.3)', width: '720px',
            fontFamily: 'sans-serif', color: '#333', boxSizing: 'border-box'
        });

        const closeDialog = () => document.body.removeChild(overlay);
        const state = {
            list: [],
            filtered: [],
            selected: new Set(),
            query: '',
            scope: mode === 'project' ? 'project' : 'all',
            scopeLocked: mode === 'project',
            archived: 'all',
            timeField: 'update',
            loading: true,
            refreshing: false,
            complete: false,
            warning: '',
            pageSize: 100,
            visibleCount: 100,
            startDate: '',
            endDate: ''
        };

        const renderBase = () => {
            const modeLabel = t(`mode.${mode === 'team' ? 'team' : mode === 'project' ? 'project' : 'personal'}`);
            const workspaceLabel = workspaceId ? ` (${escapeHtml(workspaceId)})` : '';
            dialog.innerHTML = `
                <h2 style="margin-top:0; margin-bottom: 12px; font-size: 18px;">${t('dialog.selectConversationsTitle')}</h2>
                <div style="margin-bottom: 12px; color: #666; font-size: 12px;">${t('dialog.space', { mode: modeLabel, workspace: workspaceLabel })}</div>
                <div style="display: flex; gap: 8px; margin-bottom: 8px;">
                    <input id="conv-search" type="text" placeholder="${t('dialog.searchPlaceholder')}"
                        style="flex: 1; padding: 8px; border-radius: 6px; border: 1px solid #ccc; box-sizing: border-box;">
                    <select id="filter-scope" style="padding: 8px 28px 8px 8px; border-radius: 6px; border: 1px solid #ccc;">
                        <option value="all">${t('filter.scopeAll')}</option>
                        <option value="project">${t('filter.scopeProject')}</option>
                        <option value="root">${t('filter.scopeRoot')}</option>
                    </select>
                    <select id="filter-archived" style="padding: 8px 28px 8px 8px; border-radius: 6px; border: 1px solid #ccc;">
                        <option value="all">${t('filter.statusAll')}</option>
                        <option value="active">${t('filter.statusActive')}</option>
                        <option value="archived">${t('filter.statusArchived')}</option>
                    </select>
                </div>
                <div style="display: flex; gap: 8px; margin-bottom: 8px; align-items: center;">
                    <select id="filter-time-field" style="padding: 8px 28px 8px 8px; border-radius: 6px; border: 1px solid #ccc;">
                        <option value="update">${t('filter.timeUpdate')}</option>
                        <option value="create">${t('filter.timeCreate')}</option>
                    </select>
                    <input id="filter-start-date" type="date" style="padding: 8px; border-radius: 6px; border: 1px solid #ccc;">
                    <span style="color: #666; font-size: 12px;">${t('filter.dateTo')}</span>
                    <input id="filter-end-date" type="date" style="padding: 8px; border-radius: 6px; border: 1px solid #ccc;">
                    <button id="clear-date-btn" style="padding: 8px 12px; border: 1px solid #ccc; border-radius: 6px; background: #fff; cursor: pointer;">${t('button.clearDates')}</button>
                </div>
                <div id="conv-status" style="margin-bottom: 8px; font-size: 12px; color: #666;">${t('status.loadingList')}</div>
                <div id="conv-list" style="max-height: 360px; overflow: auto; border: 1px solid #e5e7eb; border-radius: 8px; padding: 8px; background: #fff;"></div>
                <div style="display: flex; justify-content: space-between; align-items: center; margin-top: 16px;">
                    <div style="display: flex; gap: 8px;">
                        <button id="select-all-btn" style="padding: 8px 12px; border: 1px solid #ccc; border-radius: 6px; background: #fff; cursor: pointer;">${t('button.selectAll')}</button>
                        <button id="clear-all-btn" style="padding: 8px 12px; border: 1px solid #ccc; border-radius: 6px; background: #fff; cursor: pointer;">${t('button.clear')}</button>
                    </div>
                    <div style="display: flex; gap: 8px;">
                        <button id="back-btn" style="padding: 8px 12px; border: 1px solid #ccc; border-radius: 6px; background: #fff; cursor: pointer;">${t('button.back')}</button>
                        <button id="export-selected-btn" style="padding: 8px 12px; border: none; border-radius: 6px; background: #10a37f; color: #fff; cursor: pointer; font-weight: bold;" disabled>${t('button.exportSelected', { count: 0 })}</button>
                    </div>
                </div>
            `;

            const searchInput = dialog.querySelector('#conv-search');
            const scopeSelect = dialog.querySelector('#filter-scope');
            const archivedSelect = dialog.querySelector('#filter-archived');
            const timeFieldSelect = dialog.querySelector('#filter-time-field');
            const startDateInput = dialog.querySelector('#filter-start-date');
            const endDateInput = dialog.querySelector('#filter-end-date');
            const clearDateBtn = dialog.querySelector('#clear-date-btn');
            const selectAllBtn = dialog.querySelector('#select-all-btn');
            const clearAllBtn = dialog.querySelector('#clear-all-btn');
            const backBtn = dialog.querySelector('#back-btn');
            const exportBtn = dialog.querySelector('#export-selected-btn');

            if (state.scopeLocked && scopeSelect) {
                scopeSelect.value = 'project';
                scopeSelect.disabled = true;
                scopeSelect.style.opacity = '0.7';
                scopeSelect.style.cursor = 'not-allowed';
                scopeSelect.title = t('dialog.projectScopeLocked');
            }

            searchInput.oninput = (e) => {
                state.query = e.target.value || '';
                applyFilters();
                renderList();
            };
            scopeSelect.onchange = (e) => {
                state.scope = e.target.value;
                applyFilters();
                renderList();
            };
            archivedSelect.onchange = (e) => {
                state.archived = e.target.value;
                applyFilters();
                renderList();
            };
            timeFieldSelect.onchange = (e) => {
                state.timeField = e.target.value;
                applyFilters();
                renderList();
            };
            startDateInput.onchange = (e) => {
                state.startDate = e.target.value || '';
                applyFilters();
                renderList();
            };
            endDateInput.onchange = (e) => {
                state.endDate = e.target.value || '';
                applyFilters();
                renderList();
            };
            clearDateBtn.onclick = () => {
                state.startDate = '';
                state.endDate = '';
                startDateInput.value = '';
                endDateInput.value = '';
                applyFilters();
                renderList();
            };
            selectAllBtn.onclick = () => {
                state.filtered.forEach(item => state.selected.add(item.id));
                renderList();
            };
            clearAllBtn.onclick = () => {
                state.selected.clear();
                renderList();
            };
            backBtn.onclick = () => {
                closeDialog();
                showExportDialog();
            };
            exportBtn.onclick = async () => {
                if (state.selected.size === 0) return;
                const selectedList = state.list.filter(item => state.selected.has(item.id));
                closeDialog();
                await startSelectiveExportProcess(mode, workspaceId, selectedList);
            };
        };

        const applyFilters = () => {
            const query = state.query.trim().toLowerCase();
            const startBound = parseDateInputToEpoch(state.startDate, false);
            const endBound = parseDateInputToEpoch(state.endDate, true);
            state.filtered = state.list.filter(item => {
                const text = `${item.title || ''} ${item.projectTitle || ''} ${item.id || ''}`.toLowerCase();
                if (query && !text.includes(query)) return false;
                if (state.scope === 'project' && !item.projectTitle) return false;
                if (state.scope === 'root' && item.projectTitle) return false;
                if (state.archived === 'active' && item.is_archived) return false;
                if (state.archived === 'archived' && !item.is_archived) return false;
                if (startBound || endBound) {
                    const sourceTime = state.timeField === 'create'
                        ? item.create_time
                        : item.update_time;
                    const ts = normalizeEpochSeconds(sourceTime || 0);
                    if (!ts) return false;
                    if (startBound && ts < startBound) return false;
                    if (endBound && ts > endBound) return false;
                }
                return true;
            });
            state.visibleCount = state.pageSize;
        };

        const renderList = () => {
            const statusEl = dialog.querySelector('#conv-status');
            const listEl = dialog.querySelector('#conv-list');
            const exportBtn = dialog.querySelector('#export-selected-btn');
            const selectAllBtn = dialog.querySelector('#select-all-btn');
            const clearAllBtn = dialog.querySelector('#clear-all-btn');
            const controlsDisabled = state.loading;

            if (selectAllBtn) selectAllBtn.disabled = controlsDisabled || state.refreshing || !state.complete;
            if (clearAllBtn) clearAllBtn.disabled = controlsDisabled;
            if (exportBtn) exportBtn.disabled = controlsDisabled || state.selected.size === 0;

            listEl.innerHTML = '';
            if (state.loading) {
                statusEl.textContent = t('status.loadingList');
                return;
            }

            const visibleCount = Math.min(state.visibleCount, state.filtered.length);
            if (state.warning) {
                statusEl.textContent = t('status.localFallback', { count: state.list.length, message: state.warning });
            } else if (state.refreshing) {
                statusEl.textContent = t('status.localSyncing', { count: state.list.length });
            } else {
                statusEl.textContent = t('status.listSummary', {
                    total: state.list.length,
                    filtered: state.filtered.length,
                    visible: visibleCount,
                    selected: state.selected.size
                });
            }
            exportBtn.textContent = t('button.exportSelected', { count: state.selected.size });

            if (state.filtered.length === 0) {
                const empty = document.createElement('div');
                empty.textContent = t('status.noMatches');
                empty.style.color = '#999';
                empty.style.padding = '8px 4px';
                listEl.appendChild(empty);
                return;
            }

            const visibleItems = state.filtered.slice(0, state.visibleCount);
            visibleItems.forEach(item => {
                const label = document.createElement('label');
                Object.assign(label.style, {
                    display: 'flex', gap: '8px', padding: '8px',
                    border: '1px solid #e5e7eb', borderRadius: '6px',
                    marginBottom: '8px', cursor: 'pointer', alignItems: 'flex-start'
                });

                const checkbox = document.createElement('input');
                checkbox.type = 'checkbox';
                checkbox.checked = state.selected.has(item.id);
                checkbox.onchange = (e) => {
                    if (e.target.checked) {
                        state.selected.add(item.id);
                    } else {
                        state.selected.delete(item.id);
                    }
                    renderList();
                };

                const content = document.createElement('div');
                content.style.flex = '1';

                const title = document.createElement('div');
                title.textContent = item.title || t('fallback.untitledConversation');
                title.style.fontWeight = 'bold';
                title.style.fontSize = '14px';

                const meta = document.createElement('div');
                meta.style.fontSize = '12px';
                meta.style.color = '#666';
                const timeLabelPrefix = state.timeField === 'create' ? t('picker.timeCreated') : t('picker.timeUpdated');
                const timeValue = state.timeField === 'create' ? item.create_time : item.update_time;
                const timeLabel = formatTimestamp(timeValue) || t('picker.unknownTime');
                meta.textContent = `${timeLabelPrefix}: ${timeLabel}`;

                const tags = document.createElement('div');
                tags.style.marginTop = '6px';
                tags.style.display = 'flex';
                tags.style.gap = '6px';
                tags.style.flexWrap = 'wrap';

                if (item.projectTitle) {
                    const projectTag = document.createElement('span');
                    projectTag.textContent = t('picker.projectTag', { title: item.projectTitle });
                    Object.assign(projectTag.style, {
                        background: '#eef2ff', color: '#4338ca',
                        padding: '2px 6px', borderRadius: '999px', fontSize: '11px'
                    });
                    tags.appendChild(projectTag);
                }

                if (item.is_archived) {
                    const archivedTag = document.createElement('span');
                    archivedTag.textContent = t('picker.archivedTag');
                    Object.assign(archivedTag.style, {
                        background: '#fef3c7', color: '#92400e',
                        padding: '2px 6px', borderRadius: '999px', fontSize: '11px'
                    });
                    tags.appendChild(archivedTag);
                }

                content.appendChild(title);
                content.appendChild(meta);
                if (tags.childNodes.length > 0) content.appendChild(tags);

                label.appendChild(checkbox);
                label.appendChild(content);
                listEl.appendChild(label);
            });

            if (state.filtered.length > state.visibleCount) {
                const loadMore = document.createElement('button');
                loadMore.textContent = t('button.loadMore', { count: state.filtered.length - state.visibleCount });
                Object.assign(loadMore.style, {
                    width: '100%', padding: '8px 12px', border: '1px solid #ccc',
                    borderRadius: '6px', background: '#fff', cursor: 'pointer'
                });
                loadMore.onclick = () => {
                    state.visibleCount = Math.min(state.visibleCount + state.pageSize, state.filtered.length);
                    renderList();
                };
                listEl.appendChild(loadMore);
            }
        };

        renderBase();
        overlay.appendChild(dialog);
        document.body.appendChild(overlay);
        overlay.onclick = (e) => { if (e.target === overlay) closeDialog(); };

        const applyListUpdate = (list, meta = {}) => {
            if (!document.body.contains(overlay)) return;
            state.list = list;
            state.loading = false;
            state.refreshing = Boolean(meta.refreshing);
            state.complete = Boolean(meta.complete);
            state.warning = meta.warning || '';
            applyFilters();
            renderList();
        };
        const listPromise = mode === 'project'
            ? listProjectSpaceConversations(workspaceId, applyListUpdate)
            : listConversations(workspaceId, applyListUpdate);
        listPromise
            .then(list => {
                if (state.loading || state.refreshing) {
                    applyListUpdate(list, { complete: true, refreshing: false });
                }
            })
            .catch(err => {
                if (state.list.length) {
                    state.loading = false;
                    state.refreshing = false;
                    state.warning = err.message;
                    applyFilters();
                    renderList();
                    return;
                }
                const statusEl = dialog.querySelector('#conv-status');
                state.loading = false;
                state.list = [];
                state.filtered = [];
                statusEl.textContent = t('status.loadFailed', { message: err.message });
                renderList();
            });
    }

    /**
     * [重构] 多步骤、用户主导的导出对话框
     */
    function showExportDialog() {
        if (document.getElementById('export-dialog-overlay')) return;

        const overlay = document.createElement('div');
        overlay.id = 'export-dialog-overlay';
        Object.assign(overlay.style, {
            position: 'fixed', top: '0', left: '0', width: '100%', height: '100%',
            backgroundColor: 'rgba(0, 0, 0, 0.5)', zIndex: '99998',
            display: 'flex', alignItems: 'center', justifyContent: 'center'
        });

        const dialog = document.createElement('div');
        dialog.id = 'export-dialog';
        Object.assign(dialog.style, {
            background: '#fff', padding: '24px', borderRadius: '12px',
            boxShadow: '0 5px 15px rgba(0,0,0,.3)', width: '450px',
            fontFamily: 'sans-serif', color: '#333', boxSizing: 'border-box'
        });

        const closeDialog = () => document.body.removeChild(overlay);

        let pendingTeamAction = null;
        const renderStep = (step, action = null) => {
            pendingTeamAction = action;
            let html = '';
            switch (step) {
                case 'team': {
                    const detectedIds = detectAllWorkspaceIds();
                    html = `<h2 style="margin-top:0; margin-bottom: 20px; font-size: 18px;">${t('dialog.exportTeamTitle')}</h2>`;

                    if (detectedIds.length > 1) {
                        html += `<div style="background: #eef2ff; border: 1px solid #818cf8; border-radius: 8px; padding: 12px; margin-bottom: 20px;">
                                     <p style="margin: 0 0 12px 0; font-weight: bold; color: #4338ca;">🔎 ${t('dialog.multipleWorkspace')}</p>
                                     <div id="workspace-id-list">`;
                        detectedIds.forEach((id, index) => {
                            html += `<label style="display: block; margin-bottom: 8px; padding: 8px; border-radius: 6px; cursor: pointer; border: 1px solid #ddd; background: #fff;">
                                         <input type="radio" name="workspace_id" value="${id}" ${index === 0 ? 'checked' : ''}>
                                         <code style="margin-left: 8px; font-family: monospace; color: #555;">${id}</code>
                                      </label>`;
                        });
                        html += `</div></div>`;
                    } else if (detectedIds.length === 1) {
                        html += `<div style="background: #f0fdf4; border: 1px solid #4ade80; border-radius: 8px; padding: 12px; margin-bottom: 20px;">
                                     <p style="margin: 0 0 8px 0; font-weight: bold; color: #166534;">✅ ${t('dialog.workspaceDetected')}</p>
                                     <code id="workspace-id-code" style="background: #e0e7ff; padding: 4px 8px; border-radius: 4px; font-family: monospace; color: #4338ca; word-break: break-all;">${detectedIds[0]}</code>
                                   </div>`;
                    } else {
                        html += `<div style="background: #fffbeb; border: 1px solid #facc15; border-radius: 8px; padding: 12px; margin-bottom: 20px;">
                                     <p style="margin: 0; color: #92400e;">⚠️ ${t('dialog.workspaceMissing')}</p>
                                     <p style="margin: 8px 0 0 0; font-size: 12px; color: #92400e;">${t('dialog.workspaceMissingHint')}</p>
                                   </div>
                                   <label for="team-id-input" style="display: block; margin-bottom: 8px; font-weight: bold;">${t('dialog.manualWorkspaceLabel')}</label>
                                   <input type="text" id="team-id-input" placeholder="${t('dialog.workspacePlaceholder')}" style="width: 100%; padding: 8px; border-radius: 6px; border: 1px solid #ccc; box-sizing: border-box;">`;
                    }

                    let actionButtons = '';
                    if (pendingTeamAction === 'all') {
                        actionButtons = `<button id="start-team-export-btn" style="padding: 10px 16px; border: none; border-radius: 8px; background: #10a37f; color: #fff; cursor: pointer; font-weight: bold;">${t('button.exportAllZip')}</button>`;
                    } else if (pendingTeamAction === 'select') {
                        actionButtons = `<button id="start-team-picker-btn" style="padding: 10px 16px; border: 1px solid #ccc; border-radius: 8px; background: #fff; cursor: pointer;">${t('button.selectConversationsExport')}</button>`;
                    } else {
                        actionButtons = `<button id="start-team-export-btn" style="padding: 10px 16px; border: none; border-radius: 8px; background: #10a37f; color: #fff; cursor: pointer; font-weight: bold;">${t('button.exportAllZip')}</button>
                                     <button id="start-team-picker-btn" style="padding: 10px 16px; border: 1px solid #ccc; border-radius: 8px; background: #fff; cursor: pointer;">${t('button.selectConversationsExport')}</button>`;
                    }

                    html += `<div style="display: flex; justify-content: space-between; align-items: center; margin-top: 24px;">
                                 <button id="back-btn" style="padding: 10px 16px; border: 1px solid #ccc; border-radius: 8px; background: #fff; cursor: pointer;">${t('button.back')}</button>
                                 <div style="display: flex; gap: 8px;">
                                     ${actionButtons}
                                 </div>
                               </div>`;
                    break;
                }

                case 'initial':
                default:
                    html = `<h2 style="margin-top:0; margin-bottom: 20px; font-size: 18px;">${t('dialog.selectSpaceTitle')}</h2>
                                <div style="display: flex; flex-direction: column; gap: 16px;">
                                    <div style="padding: 16px; border: 1px solid #ccc; border-radius: 8px; background: #f9fafb;">
                                        <strong style="font-size: 16px;">${t('dialog.personalTitle')}</strong>
                                        <p style="margin: 4px 0 12px 0; color: #666;">${t('dialog.personalCopy')}</p>
                                        <div style="display: flex; gap: 8px;">
                                            <button id="select-personal-btn" style="padding: 8px 12px; border: none; border-radius: 6px; background: #10a37f; color: #fff; cursor: pointer; font-weight: bold;">${t('button.exportAll')}</button>
                                            <button id="select-personal-picker-btn" style="padding: 8px 12px; border: 1px solid #ccc; border-radius: 6px; background: #fff; cursor: pointer;">${t('button.selectConversationsExport')}</button>
                                        </div>
                                    </div>
                                    <div style="padding: 16px; border: 1px solid #ccc; border-radius: 8px; background: #f9fafb;">
                                        <strong style="font-size: 16px;">${t('dialog.projectTitle')}</strong>
                                        <p style="margin: 4px 0 12px 0; color: #666;">${t('dialog.projectCopy')}</p>
                                        <div style="display: flex; gap: 8px;">
                                            <button id="select-project-btn" style="padding: 8px 12px; border: none; border-radius: 6px; background: #10a37f; color: #fff; cursor: pointer; font-weight: bold;">${t('button.exportAll')}</button>
                                            <button id="select-project-picker-btn" style="padding: 8px 12px; border: 1px solid #ccc; border-radius: 6px; background: #fff; cursor: pointer;">${t('button.selectConversationsExport')}</button>
                                        </div>
                                    </div>
                                    <div style="padding: 16px; border: 1px solid #ccc; border-radius: 8px; background: #f9fafb;">
                                        <strong style="font-size: 16px;">${t('dialog.teamTitle')}</strong>
                                        <p style="margin: 4px 0 12px 0; color: #666;">${t('dialog.teamCopy')}</p>
                                        <div style="display: flex; gap: 8px;">
                                            <button id="select-team-btn" style="padding: 8px 12px; border: none; border-radius: 6px; background: #10a37f; color: #fff; cursor: pointer; font-weight: bold;">${t('button.exportAll')}</button>
                                            <button id="select-team-picker-btn" style="padding: 8px 12px; border: 1px solid #ccc; border-radius: 6px; background: #fff; cursor: pointer;">${t('button.selectConversationsExport')}</button>
                                        </div>
                                    </div>
                                </div>
                                <div style="display: flex; justify-content: flex-end; margin-top: 24px;">
                                    <button id="cancel-btn" style="padding: 10px 16px; border: 1px solid #ccc; border-radius: 8px; background: #fff; cursor: pointer;">${t('button.cancel')}</button>
                                </div>`;
                    break;
            }
            dialog.innerHTML = html;
            attachListeners(step);
        };

        const attachListeners = (step) => {
            if (step === 'initial') {
                document.getElementById('select-personal-btn').onclick = () => {
                    closeDialog();
                    startExportProcess('personal', null);
                };
                document.getElementById('select-personal-picker-btn').onclick = () => {
                    closeDialog();
                    showConversationPicker({ mode: 'personal', workspaceId: null });
                };
                document.getElementById('select-project-btn').onclick = () => {
                    closeDialog();
                    startProjectSpaceExportProcess();
                };
                document.getElementById('select-project-picker-btn').onclick = () => {
                    closeDialog();
                    showConversationPicker({ mode: 'project', workspaceId: null });
                };
                const startTeamFlow = (action) => {
                    const detectedIds = detectAllWorkspaceIds();
                    if (detectedIds.length === 1) {
                        const workspaceId = detectedIds[0];
                        closeDialog();
                        if (action === 'all') {
                            startExportProcess('team', workspaceId);
                        } else {
                            showConversationPicker({ mode: 'team', workspaceId });
                        }
                        return;
                    }
                    renderStep('team', action);
                };
                document.getElementById('select-team-btn').onclick = () => startTeamFlow('all');
                document.getElementById('select-team-picker-btn').onclick = () => startTeamFlow('select');
                document.getElementById('cancel-btn').onclick = closeDialog;
            } else if (step === 'team') {
                document.getElementById('back-btn').onclick = () => renderStep('initial');
                const resolveWorkspaceId = () => {
                    let workspaceId = '';
                    const radioChecked = document.querySelector('input[name="workspace_id"]:checked');
                    const codeEl = document.getElementById('workspace-id-code');
                    const inputEl = document.getElementById('team-id-input');

                    if (radioChecked) {
                        workspaceId = radioChecked.value;
                    } else if (codeEl) {
                        workspaceId = codeEl.textContent;
                    } else if (inputEl) {
                        workspaceId = inputEl.value.trim();
                    }

                    if (!workspaceId) {
                        alert(t('alert.invalidWorkspaceId'));
                        return;
                    }
                    return workspaceId;
                };
                const exportAllBtn = document.getElementById('start-team-export-btn');
                const pickerBtn = document.getElementById('start-team-picker-btn');
                if (exportAllBtn) exportAllBtn.onclick = () => {
                    const workspaceId = resolveWorkspaceId();
                    if (!workspaceId) return;
                    closeDialog();
                    startExportProcess('team', workspaceId);
                };
                if (pickerBtn) pickerBtn.onclick = () => {
                    const workspaceId = resolveWorkspaceId();
                    if (!workspaceId) return;
                    closeDialog();
                    showConversationPicker({ mode: 'team', workspaceId });
                };
            }
        };

        overlay.appendChild(dialog);
        document.body.appendChild(overlay);
        overlay.onclick = (e) => { if (e.target === overlay) closeDialog(); };
        renderStep('initial');
    }

    function addBtn() {
        if (document.getElementById('gpt-rescue-btn')) return;
        const b = document.createElement('button');
        b.id = 'gpt-rescue-btn';
        b.textContent = t('button.export');
        Object.assign(b.style, {
            position: 'fixed', bottom: '24px', right: '24px', zIndex: '99997',
            padding: '10px 14px', borderRadius: '8px', border: 'none', cursor: 'pointer',
            fontWeight: 'bold', background: '#10a37f', color: '#fff', fontSize: '14px',
            boxShadow: '0 3px 12px rgba(0,0,0,.15)', userSelect: 'none'
        });
        b.onclick = showExportDialog;
        document.body.appendChild(b);
    }

    // --- 脚本启动 ---
    setTimeout(addBtn, 2000);

    window.ChatGPTExporter = window.ChatGPTExporter || {};
    Object.assign(window.ChatGPTExporter, {
        showDialog: showExportDialog,
        startManualExport: (mode = 'personal', workspaceId = null) => {
            if (mode === 'project') {
                return startProjectSpaceExportProcess(workspaceId);
            }
            return startExportProcess(mode, workspaceId);
        },
        startScheduledExport
    });

    document.documentElement.setAttribute('data-chatgpt-exporter-ready', '1');
    window.dispatchEvent(new CustomEvent('CHATGPT_EXPORTER_READY'));

    window.addEventListener('message', (event) => {
        if (event.source !== window) return;
        const data = event.data || {};
        if (data?.type !== 'CHATGPT_EXPORTER_COMMAND') return;
        const api = window.ChatGPTExporter;
        if (!api) return;
        try {
            switch (data.action) {
                case 'START_SCHEDULED_EXPORT':
                    api.startScheduledExport(data.payload || {});
                    break;
                case 'OPEN_DIALOG':
                    api.showDialog();
                    break;
                case 'START_MANUAL_EXPORT':
                    api.startManualExport(data.payload?.mode, data.payload?.workspaceId);
                    break;
                default:
                    console.warn('[ChatGPT Exporter] 未知命令:', data.action);
            }
        } catch (err) {
            console.error('[ChatGPT Exporter] 处理命令失败:', err);
        }
    });

})();
