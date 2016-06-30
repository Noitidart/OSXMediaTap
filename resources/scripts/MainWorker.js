// Imports
importScripts('resource://gre/modules/osfile.jsm');
importScripts('chrome://osxmediatap/content/resources/scripts/comm/Comm.js');
var {callInBootstrap, callInChildworker1} = CommHelper.mainworker;

// Globals
var core;
var gBsComm;

var gChildComm;
var callInChildworker;

var OSStuff = {}; // global vars populated by init, based on OS

function init(objCore) { // function name init required for SIPWorker
	//console.log('in worker init');

	// merge objCore into core
	// core and objCore is object with main keys, the sub props

	core = objCore;

	// // lazy set up child worker
	// gChildComm = new Comm.server.worker(core.addon.path.scripts + 'ChildWorker.js');
	// callInChildworker = Comm.callInX.bind(null, 'gChildComm', null);

	// add to core
	core.os.name = OS.Constants.Sys.Name.toLowerCase();
	core.os.mname = core.os.toolkit.indexOf('gtk') == 0 ? 'gtk' : core.os.name; // mname stands for modified-name

	core.addon.path.storage = OS.Path.join(OS.Constants.Path.profileDir, 'jetpack', core.addon.id, 'simple-storage')

	// load all localization pacakages
	formatStringFromName('blah', 'main');
	core.addon.l10n = _cache_formatStringFromName_packages;

	// Import ostypes
	importScripts(core.addon.path.scripts + 'ostypes/cutils.jsm');
	importScripts(core.addon.path.scripts + 'ostypes/ctypes_math.jsm');
	switch (core.os.mname) {
		case 'winnt':
		case 'winmo':
		case 'wince':
			importScripts(core.addon.path.scripts + 'ostypes/ostypes_win.jsm');
			break
		case 'gtk':
			importScripts(core.addon.path.scripts + 'ostypes/ostypes_x11.jsm');
			break;
		case 'darwin':
			importScripts(core.addon.path.scripts + 'ostypes/ostypes_mac.jsm');
			break;
		default:
			throw new Error('Operating system, "' + OS.Constants.Sys.Name + '" is not supported');
	}

	// OS Specific Init
	switch (core.os.name) {
		case 'winnt':
		case 'winmo':
		case 'wince':

				//

			break;
		case 'gtk':

				//

			break;
		case 'darwin':

				//

			break;
		default:
			// do nothing special
	}

	return core;
}

// start - addon functions
function dummyForInstantInstantiate() {}
self.onclose = function() {
	console.log('doing mainworker term proc');

	workerComm_unregAll();

	switch (core.os.mname) {
		case 'android':

				if (OSStuff.jenv) {
					JNI.UnloadClasses(OSStuff.jenv);
				}

			break;
	}

	console.log('ok ready to terminate');
}

function fetchCore() {
	return core;
}

function watchMediakeys() {
	console.error('in watchMediakeys');
	switch (core.os.mname) {
		case 'darwin':

				// var psn = ostypes.TYPE.ProcessSerialNumber();
				// var rez_GetCurrentProcess = ostypes.API('GetCurrentProcess')(psn.address());
				// console.log('rez_GetCurrentProcess:', rez_GetCurrentProcess, rez_GetCurrentProcess.toString());

				// OSStuff.eventTap = ostypes.API('CGEventTapCreateForPSN')(psn.address(), ostypes.CONST.kCGHeadInsertEventTap, ostypes.CONST.kCGEventTapOptionDefault, mask, OSStuff.MouseTracker, null);
				// console.log('OSStuff.mouseEventTap:', OSStuff.mouseEventTap, OSStuff.mouseEventTap.toString());

				var tapEventCallback_js = function(proxy, type, event, refcon) {

					if (cutils.jscEqual(type, ostypes.CONST.kCGEventTapDisabledByTimeout)) {
						console.error('RENABLING!!!!');
						ostypes.API('CGEventTapEnable')(OSStuff._eventPort, true);
						return event;
					} else if (cutils.jscEqual(type, ostypes.CONST.kCGEventTapDisabledByUserInput)) {
						// Was disabled manually by -[pauseTapOnTapThread]
						console.error('this should never happen!!!! but return event so things work as my tap is non-passive');
						return event;
					}

					if (!cutils.jscEqual(type, ostypes.CONST.NX_SYSDEFINED)) {
						return event;
					} else {
						var NSEvent = ostypes.HELPER.class('NSEvent');
						var nsEvent = ostypes.API('objc_msgSend')(NSEvent, ostypes.HELPER.sel('eventWithCGEvent:'), event);

						var subtype = ostypes.API('objc_msgSend')(nsEvent, ostypes.HELPER.sel('subtype'));
						console.log('subtype:', subtype);
						subtype = cutils.jscGetDeepest(ctypes.cast(subtype, ostypes.TYPE.NSUInteger));
						console.log('casted subtype:', subtype);

						if (!cutils.jscEqual(subtype, 8)) {
							return event;
						} else {
							var data1 = ostypes.API('objc_msgSend')(nsEvent, ostypes.HELPER.sel('data1'));
							console.log('data1:', data1);
							data1 = cutils.jscGetDeepest(ctypes.cast(data1, ostypes.TYPE.NSUInteger));
							console.log('casted data1:', data1);

							var keyCode = data1 >>> 16;
							var keyRepeat = !!(data1 & 0x1);
							var keyUp = data1 & 0x0100;

							switch (keyCode) {
								case ostypes.CONST.NX_KEYTYPE_PLAY:
										console.log('NX_KEYTYPE_PLAY', 'keyRepeat:', keyRepeat, 'keyUp:', keyUp);
									break;
								case ostypes.CONST.NX_KEYTYPE_NEXT:
										console.log('NX_KEYTYPE_NEXT', 'keyRepeat:', keyRepeat, 'keyUp:', keyUp);
									break;
								case ostypes.CONST.NX_KEYTYPE_FAST:
										console.log('NX_KEYTYPE_FAST', 'keyRepeat:', keyRepeat, 'keyUp:', keyUp);
									break;
								case ostypes.CONST.NX_KEYTYPE_PREVIOUS:
										console.log('NX_KEYTYPE_PREVIOUS', 'keyRepeat:', keyRepeat, 'keyUp:', keyUp);
									break;
								case ostypes.CONST.NX_KEYTYPE_REWIND:
										console.log('NX_KEYTYPE_REWIND', 'keyRepeat:', keyRepeat, 'keyUp:', keyUp);
									break;
							}

							return event;

							// if consume with return null should i do a [nsEvent retain]? as they do here - https://github.com/nevyn/SPMediaKeyTap/blob/master/SPMediaKeyTap.m#L228
						}
					}

					return event;
				};
				OSStuff.tapEventCallback = ostypes.TYPE.CGEventTapCallBack(tapEventCallback_js);

				// Add an event tap to intercept the system defined media key events
				OSStuff._eventPort = ostypes.API('CGEventTapCreate')(ostypes.CONST.kCGSessionEventTap,
																	ostypes.CONST.kCGHeadInsertEventTap,
																	ostypes.CONST.kCGEventTapOptionDefault,
																	ostypes.API('CGEventMaskBit')(ostypes.CONST.NX_SYSDEFINED),
																	OSStuff.tapEventCallback,
																	null);

				console.log('OSStuff._eventPort:', OSStuff._eventPort);

				OSStuff._eventPortSource = ostypes.API('CFMachPortCreateRunLoopSource')(ostypes.CONST.kCFAllocatorSystemDefault, OSStuff._eventPort, 0);
				console.log('OSStuff._eventPortSource:', OSStuff._eventPortSource);

				if (OSStuff._eventPortSource.isNull()) {
					console.error('ERROR: Failed to get _eventPortSource as it is null!');
					throw new Error('ERROR: Failed to get _eventPortSource as it is null!');
				} else {
					OSStuff.aLoop = ostypes.API('CFRunLoopGetCurrent')();
					console.log('OSStuff.aLoop:', OSStuff.aLoop, OSStuff.aLoop.toString());
					OSStuff.runLoopMode = ostypes.HELPER.makeCFStr('com.mozilla.firefox.osxmediatap');

					ostypes.API('CFRunLoopAddSource')(OSStuff.aLoop, OSStuff._eventPortSource, OSStuff.runLoopMode);
					console.log('did CFRunLoopAddSource');
					// while (true) {

						var rez_CFRunLoopRunInMode = ostypes.API('CFRunLoopRunInMode')(OSStuff.runLoopMode, 30, false); // 2nd arg is seconds
						console.log('rez_CFRunLoopRunInMode:', rez_CFRunLoopRunInMode);

					// }
				}

			break;
		default:
			console.error('Your OS is not supported');
			throw new Error('Your OS is not supported');
	}
	console.error('out watchMediakeys');
}

// start - common helper functions
function Deferred() {
	this.resolve = null;
	this.reject = null;
	this.promise = new Promise(function(resolve, reject) {
		this.resolve = resolve;
		this.reject = reject;
	}.bind(this));
	Object.freeze(this);
}
function genericReject(aPromiseName, aPromiseToReject, aReason) {
	var rejObj = {
		name: aPromiseName,
		aReason: aReason
	};
	console.error('Rejected - ' + aPromiseName + ' - ', rejObj);
	if (aPromiseToReject) {
		aPromiseToReject.reject(rejObj);
	}
}
function genericCatch(aPromiseName, aPromiseToReject, aCaught) {
	var rejObj = {
		name: aPromiseName,
		aCaught: aCaught
	};
	console.error('Caught - ' + aPromiseName + ' - ', rejObj);
	if (aPromiseToReject) {
		aPromiseToReject.reject(rejObj);
	}
}
// rev2 - not yet updated to gist.github - https://gist.github.com/Noitidart/ec1e6b9a593ec7e3efed
function xhr(aUrlOrFileUri, aOptions={}) {
	// console.error('in xhr!!! aUrlOrFileUri:', aUrlOrFileUri);

	// all requests are sync - as this is in a worker
	var aOptionsDefaults = {
		responseType: 'text',
		timeout: 0, // integer, milliseconds, 0 means never timeout, value is in milliseconds
		headers: null, // make it an object of key value pairs
		method: 'GET', // string
		data: null // make it whatever you want (formdata, null, etc), but follow the rules, like if aMethod is 'GET' then this must be null
	};
	aOptions = Object.assign(aOptionsDefaults, aOptions);

	var cRequest = new XMLHttpRequest();

	cRequest.open(aOptions.method, aUrlOrFileUri, false); // 3rd arg is false for synchronus

	if (aOptions.headers) {
		for (var h in aOptions.headers) {
			cRequest.setRequestHeader(h, aOptions.headers[h]);
		}
	}

	cRequest.responseType = aOptions.responseType;
	cRequest.send(aOptions.data);

	// console.log('response:', cRequest.response);

	// console.error('done xhr!!!');
	return cRequest;
}
// rev4 - https://gist.github.com/Noitidart/6d8a20739b9a4a97bc47
var _cache_formatStringFromName_packages = {}; // holds imported packages
function formatStringFromName(aKey, aLocalizedPackageName, aReplacements) {
	// depends on ```core.addon.path.locale``` it must be set to the path to your locale folder

	// aLocalizedPackageName is name of the .properties file. so mainworker.properties you would provide mainworker // or if it includes chrome:// at the start then it fetches that
	// aKey - string for key in aLocalizedPackageName
	// aReplacements - array of string

	// returns null if aKey not found in pacakage

	var packagePath;
	var packageName;
	if (aLocalizedPackageName.indexOf('chrome:') === 0 || aLocalizedPackageName.indexOf('resource:') === 0) {
		packagePath = aLocalizedPackageName;
		packageName = aLocalizedPackageName.substring(aLocalizedPackageName.lastIndexOf('/') + 1, aLocalizedPackageName.indexOf('.properties'));
	} else {
		packagePath = core.addon.path.locale + aLocalizedPackageName + '.properties';
		packageName = aLocalizedPackageName;
	}

	if (!_cache_formatStringFromName_packages[packageName]) {
		var packageStr = xhr(packagePath).response;
		var packageJson = {};

		var propPatt = /(.*?)=(.*?)$/gm;
		var propMatch;
		while (propMatch = propPatt.exec(packageStr)) {
			packageJson[propMatch[1]] = propMatch[2];
		}

		_cache_formatStringFromName_packages[packageName] = packageJson;

		console.log('packageJson:', packageJson);
	}

	var cLocalizedStr = _cache_formatStringFromName_packages[packageName][aKey];
	if (!cLocalizedStr) {
		return null;
	}
	if (aReplacements) {
		for (var i=0; i<aReplacements.length; i++) {
			cLocalizedStr = cLocalizedStr.replace('%S', aReplacements[i]);
		}
	}

	return cLocalizedStr;
}

function xhrAsync(aUrlOrFileUri, aOptions={}, aCallback) { // 052716 - added timeout support
	// console.error('in xhr!!! aUrlOrFileUri:', aUrlOrFileUri);
	if (!aUrlOrFileUri && aOptions.url) { aUrlOrFileUri = aOptions.url }

	// all requests are sync - as this is in a worker
	var aOptionsDefaults = {
		responseType: 'text',
		timeout: 0, // integer, milliseconds, 0 means never timeout, value is in milliseconds
		headers: null, // make it an object of key value pairs
		method: 'GET', // string
		data: null, // make it whatever you want (formdata, null, etc), but follow the rules, like if aMethod is 'GET' then this must be null
		onprogress: undefined, // set to callback you want called
		onuploadprogress: undefined // set to callback you want called
	};
	Object.assign(aOptionsDefaults, aOptions);
	aOptions = aOptionsDefaults;

	var request = new XMLHttpRequest();

	request.timeout = aOptions.timeout;

	var handler = ev => {
		evf(m => request.removeEventListener(m, handler, !1));

		switch (ev.type) {
			case 'load':

					aCallback({request, ok:true});
					// if (xhr.readyState == 4) {
					// 	if (xhr.status == 200) {
					// 		deferredMain_xhr.resolve(xhr);
					// 	} else {
					// 		var rejObj = {
					// 			name: 'deferredMain_xhr.promise',
					// 			aReason: 'Load Not Success', // loaded but status is not success status
					// 			xhr: xhr,
					// 			message: xhr.statusText + ' [' + ev.type + ':' + xhr.status + ']'
					// 		};
					// 		deferredMain_xhr.reject(rejObj);
					// 	}
					// } else if (xhr.readyState == 0) {
					// 	var uritest = Services.io.newURI(aStr, null, null);
					// 	if (uritest.schemeIs('file')) {
					// 		deferredMain_xhr.resolve(xhr);
					// 	} else {
					// 		var rejObj = {
					// 			name: 'deferredMain_xhr.promise',
					// 			aReason: 'Load Failed', // didnt even load
					// 			xhr: xhr,
					// 			message: xhr.statusText + ' [' + ev.type + ':' + xhr.status + ']'
					// 		};
					// 		deferredMain_xhr.reject(rejObj);
					// 	}
					// }

				break;
			case 'abort':
			case 'error':
			case 'timeout':

					// var result_details = {
					// 	reason: ev.type,
					// 	request,
					// 	message: request.statusText + ' [' + ev.type + ':' + request.status + ']'
					// };
					aCallback({request, ok:false, reason:ev.type});

				break;
			default:
				var result_details = {
					reason: 'unknown',
					request,
					message: request.statusText + ' [' + ev.type + ':' + request.status + ']'
				};
				aCallback({request, ok:false, reason:ev.type, result_details});
		}
	};


	var evf = f => ['load', 'error', 'abort', 'timeout'].forEach(f);
	evf(m => request.addEventListener(m, handler, false));

	if (aOptions.onprogress) {
		request.addEventListener('progress', aOptions.onprogress, false);
	}
	if (aOptions.onuploadprogress) {
		request.upload.addEventListener('progress', aOptions.onuploadprogress, false);
	}
	request.open(aOptions.method, aUrlOrFileUri, true); // 3rd arg is false for async

	if (aOptions.headers) {
		for (var h in aOptions.headers) {
			request.setRequestHeader(h, aOptions.headers[h]);
		}
	}

	request.responseType = aOptions.responseType;
	request.send(aOptions.data);

	// console.log('response:', request.response);

	// console.error('done xhr!!!');

}

function setTimeoutSync(aMilliseconds) {
	var breakDate = Date.now() + aMilliseconds;
	while (Date.now() < breakDate) {}
}

// rev1 - _ff-addon-snippet-safedForPlatFS.js - https://gist.github.com/Noitidart/e6dbbe47fbacc06eb4ca
var _safedForPlatFS_pattWIN = /([\\*:?<>|\/\"])/g;
var _safedForPlatFS_pattNIXMAC = /\//g;
function safedForPlatFS(aStr, aOptions={}) {
	// short for getSafedForPlatformFilesystem - meaning after running this on it, you can safely use the return in a filename on this current platform
	// aOptions
	//	repStr - use this string, in place of the default repCharForSafePath in place of non-platform safe characters
	//	allPlatSafe - by default it will return a path safed for the current OS. Set this to true if you want to to get a string that can be used on ALL platforms filesystems. A Windows path is safe on all other platforms

	// set defaults on aOptions
	if (!('allPlatSafe' in aOptions)) {
		aOptions.allPlatSafe = false;
	}
	if (!('repStr' in aOptions)) {
		aOptions.repStr = '-';
	}

	var usePlat = aOptions.allPlatSafe ? 'winnt' : core.os.name; // a windows path is safe in all platforms so force that. IF they dont want all platforms then use the current platform
	switch (usePlat) {
		case 'winnt':
		case 'winmo':
		case 'wince':

				return aStr.replace(_safedForPlatFS_pattWIN, aOptions.repStr);

			break;
		default:

				return aStr.replace(_safedForPlatFS_pattNIXMAC, aOptions.repStr);
	}
}

// https://gist.github.com/Noitidart/7810121036595cdc735de2936a7952da -rev1
function writeThenDir(aPlatPath, aContents, aDirFrom, aOptions={}) {
	// tries to writeAtomic
	// if it fails due to dirs not existing, it creates the dir
	// then writes again
	// if fail again for whatever reason it throws

	var cOptionsDefaults = {
		encoding: 'utf-8',
		noOverwrite: false
		// tmpPath: aPlatPath + '.tmp'
	};

	aOptions = Object.assign(cOptionsDefaults, aOptions);

	var do_write = function() {
		OS.File.writeAtomic(aPlatPath, aContents, aOptions); // doing unixMode:0o4777 here doesn't work, i have to `OS.File.setPermissions(path_toFile, {unixMode:0o4777})` after the file is made
	};

	try {
		do_write();
	} catch (OSFileError) {
		if (OSFileError.becauseNoSuchFile) { // this happens when directories dont exist to it
			OS.File.makeDir(OS.Path.dirname(aPlatPath), {from:aDirFrom});
			do_write(); // if it fails this time it will throw outloud
		} else {
			throw OSFileError;
		}
	}

}

// rev1 - https://gist.github.com/Noitidart/c4ab4ca10ff5861c720b
var jQLike = { // my stand alone jquery like functions
	serialize: function(aSerializeObject) {
		// https://api.jquery.com/serialize/

		// verified this by testing
			// http://www.w3schools.com/jquery/tryit.asp?filename=tryjquery_ajax_serialize
			// http://www.the-art-of-web.com/javascript/escape/

		var serializedStrArr = [];
		for (var cSerializeKey in aSerializeObject) {
			serializedStrArr.push(encodeURIComponent(cSerializeKey) + '=' + encodeURIComponent(aSerializeObject[cSerializeKey]));
		}
		return serializedStrArr.join('&');
	}
};

// rev4 - not yet updated to gist - jun 12 16 - using Object.assign for defaults - https://gist.github.com/Noitidart/e6dbbe47fbacc06eb4ca
var _safedForPlatFS_pattWIN = /([\\*:?<>|\/\"])/g;
var _safedForPlatFS_pattNIXMAC = /[\/:]/g;
function safedForPlatFS(aStr, aOptions={}) {
	// depends on core.os.mname - expects it to be lower case
	// short for getSafedForPlatformFilesystem - meaning after running this on it, you can safely use the return in a filename on this current platform
	// aOptions
	//	repStr - use this string, in place of the default repCharForSafePath in place of non-platform safe characters
	//	allPlatSafe - by default it will return a path safed for the current OS. Set this to true if you want to to get a string that can be used on ALL platforms filesystems. A Windows path is safe on all other platforms

	// 022816 - i added : to _safedForPlatFS_pattNIXMAC because on mac it was replacing it with a `/` which is horrible it will screw up OS.Path.join .split etc

	// set defaults on aOptions
	aOptions = Object.assign({
		allPlatSafe: false,
		repStr: '-'
	}, aOptions)

	var usePlat = aOptions.allPlatSafe ? 'winnt' : core.os.mname; // a windows path is safe in all platforms so force that. IF they dont want all platforms then use the current platform
	switch (usePlat) {
		case 'winnt':
		case 'winmo':
		case 'wince':

				return aStr.replace(_safedForPlatFS_pattWIN, aOptions.repStr);

			break;
		default:

				return aStr.replace(_safedForPlatFS_pattNIXMAC, aOptions.repStr);
	}
}

var _cache_getSystemDirectory = {};
function getSystemDirectory(type) {
	// main entry point that should be used for getting system path. worker, botostrap, etc should call here
	// for each type, guranteed to return a string

	// resolves to string
	// type - string - enum: Videos
	var deferredMain_getSystemDirectory = new Deferred();

	if (_cache_getSystemDirectory[type]) {
		deferredMain_getSystemDirectory.resolve(_cache_getSystemDirectory[type]);
	} else {
		const TYPE_ROUTE_BOOTSTRAP = 0;
		const TYPE_ROUTE_ANDROID = 1;
		const TYPE_ROUTE_OS_CONST = 2;
		switch (type) {
			case 'Videos':

					var platform = {
						winnt: { type:'Vids', route:TYPE_ROUTE_BOOTSTRAP },
						darwin: { type:'Mov', route:TYPE_ROUTE_BOOTSTRAP },
						gtk: { type:'XDGVids', route:TYPE_ROUTE_BOOTSTRAP },
						android: { type:'DIRECTORY_MOVIES', route:TYPE_ROUTE_ANDROID }
					};

				break;
		}

		var { type, route } = platform[core.os.mname];

		switch (route) {
			case TYPE_ROUTE_BOOTSTRAP:
					callInBootstrap('getSystemDirectory_bootstrap', type, function(path) {
						deferredMain_getSystemDirectory.resolve(path);
					});
				break;
			case TYPE_ROUTE_ANDROID:
					deferredMain_getSystemDirectory.resolve(getSystemDirectory_android[type]);
				break;
			case TYPE_ROUTE_OS_CONST:
					deferredMain_getSystemDirectory.resolve(OS.Constants.Path[type]);
				break;
		};
	}

	return deferredMain_getSystemDirectory.promise;
}

function getSystemDirectory_android(type) {
	// progrmatic helper for getSystemDirectory in MainWorker - devuser should NEVER call this himself
	// type - string - currently accepted values
		// DIRECTORY_DOWNLOADS
		// DIRECTORY_MOVIES
		// DIRECTORY_MUSIC
		// DIRECTORY_PICTURES

	// var OSStuff.jenv = null;
	try {
		if (!OSStuff.jenv) {
			OSStuff.jenv = JNI.GetForThread();
		}

		var SIG = {
			Environment: 'Landroid/os/Environment;',
			String: 'Ljava/lang/String;',
			File: 'Ljava/io/File;'
		};

		var Environment = JNI.LoadClass(OSStuff.jenv, SIG.Environment.substr(1, SIG.Environment.length - 2), {
			static_fields: [
				{ name: 'DIRECTORY_DOWNLOADS', sig: SIG.String },
				{ name: 'DIRECTORY_MOVIES', sig: SIG.String },
				{ name: 'DIRECTORY_MUSIC', sig: SIG.String },
				{ name: 'DIRECTORY_PICTURES', sig: SIG.String }
			],
			static_methods: [
				{ name:'getExternalStorageDirectory', sig:'()' + SIG.File }
			]
		});

		var jFile = JNI.LoadClass(OSStuff.jenv, SIG.File.substr(1, SIG.File.length - 2), {
			methods: [
				{ name:'getPath', sig:'()' + SIG.String }
			]
		});

		var OSPath_dirExternalStorage = JNI.ReadString(OSStuff.jenv, Environment.getExternalStorageDirectory().getPath());
		var OSPath_dirname = JNI.ReadString(OSStuff.jenv, Environment[type]);
		var OSPath_dir = OS.Path.join(OSPath_dirExternalStorage, OSPath_dirname);
		console.log('OSPath_dir:', OSPath_dir);

		return OSPath_dir;

	} finally {
		// if (OSStuff.jenv) {
		// 	JNI.UnloadClasses(OSStuff.jenv);
		// }
	}
}
function queryStringAsJson(aQueryString) {
	var asJsonStringify = aQueryString;
	asJsonStringify = asJsonStringify.replace(/&/g, '","');
	asJsonStringify = asJsonStringify.replace(/=/g, '":"');
	asJsonStringify = '{"' + asJsonStringify + '"}';
	asJsonStringify = asJsonStringify.replace(/"(\d+|true|false)"/, function($0, $1) { return $1; });

	return JSON.parse(asJsonStringify);
}

// startup
gBsComm = new Comm.client.worker();
