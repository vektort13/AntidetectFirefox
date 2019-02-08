/* This Source Code Form is subject to the terms of the Mozilla Public
 * License, v. 2.0. If a copy of the MPL was not distributed with this
 * file, You can obtain one at http://mozilla.org/MPL/2.0/. */

/*
 * Handles AntiDetect DOM time spoofing
 * partially based on:
 * - original Mozilla Firefox code
 * - webrtcfakeip 1.4 by greyduck (DonaldTrump)
*/

"use strict";

var {classes: Cc, interfaces: Ci, utils: Cu, results: Cr} = Components;

this.EXPORTED_SYMBOLS = [ "AntiDetectSpoofer" ];

Cu.import("resource://gre/modules/XPCOMUtils.jsm");
Cu.import("resource://gre/modules/Services.jsm");
Cu.import("resource://gre/modules/BrowserUtils.jsm");
Cu.import("resource://gre/modules/Preferences.jsm");
Cu.import("resource:///modules/AntiDetect_consts.jsm");
Cu.import("resource://gre/modules/AppConstants.jsm");

XPCOMUtils.defineLazyModuleGetter(this, "console",
		"resource://gre/modules/Console.jsm");

function AntiDetectSpoofer(aWindow, aTabChildGlobal) {
	this.init(aWindow, aTabChildGlobal);
}

AntiDetectSpoofer.prototype =
{
	/* valid values: 0 - leave as is,
	 * 1 - override with specified in preferences, 2 - with random */
	_WebRTCmodeDevice: 2,
	/* valid values: 0 - leave as is,
	 * 1 - override with specified in preferences */
	_WebRTCmodeIP: 1,
	/* special values: auto - determine public IP using server script,
	 * random - generate random */
	_WebRTCpublicIP: "auto",
	/* special values: random - generate random */
	_WebRTClocaIP: "random",

	/* valid values: 0 - leave as is, 1 - tab-scope random,
	 * 2 - request-scope random, 3 - manual override */
	_WebGLmode: 2,
	_WebGLrenderer: null,

	_injectionPoint: "DOMDocElementInserted",
	_logDebug: 0,
	_content: null,
	_element: null,

	/*
	 * Public apis
	 */

	init(aWindow, aTabChildGlobal) {
		this._content = aWindow;

		this._tab = aTabChildGlobal;
		this._tab.addEventListener(this._injectionPoint, this, true);
		this._tab.addEventListener("unload", this);

		var consts = new AntiDetect_consts();
		this._WebGLmode = Preferences.get("antidetect.webgl.mode",this._WebGLmode);
		this._WebGLrenderer = consts.getRandomRenderer();

		/*try {
			Services.obs.addObserverOnce(this.on_HTTP_alter_useragent,
					"http-on-opening-request", false);
			Services.obs.addObserverOnce(this.on_HTTP_alter_useragent,
					"http-on-modify-request", false);
			Services.obs.addObserverOnce(this.on_HTTP_alter_useragent,
					"http-on-useragent-request", false);
		} catch(e) {}*/
	},

	uninit() {
		this._content.removeEventListener(this._injectionPoint, this, true);
		this._content.removeEventListener("unload", this);
		this._element = null;
		this._content = null;
		this._tab = null;

		/*try {
			Services.obs.removeObserver(this.on_HTTP_alter_useragent, "http-on-opening-request");
			Services.obs.removeObserver(this.on_HTTP_alter_useragent, "http-on-modify-request");
			Services.obs.removeObserver(this.on_HTTP_alter_useragent, "http-on-useragent-request");
		} catch(e) {}*/
	},

	/*
	 * Events
	 */

	handleEvent(aEvent) {
		switch (aEvent.type) {
			case this._injectionPoint:
				if (this._isRootDocumentEvent(aEvent)) {
					this._onInjectionTime(aEvent);
				}
				break;
			case "unload":
				this.uninit();
				break;
		}
	},

	/*
	 * Internal
	 */

	/*
	 * Injects content into DOM
	 */
	_onInjectionTime(aEvent){
		/*
		 * aEvent.originalTarget = HTMLDocument
		 * this._content = Window
		 */
		/*let docShell = this._content.QueryInterface(Ci.nsIInterfaceRequestor)
			.getInterface(Ci.nsIWebNavigation)
			.QueryInterface(Ci.nsIDocShell);
		if (docShell != null) {
			if (this._logDebug)
				console.log("onInjectionTime() antiDetectMaskingBrowser: "+
						docShell.antiDetectMaskingBrowser);
		}*/

		this._WebGLmode = Preferences.get("antidetect.webgl.mode",this._WebGLmode);
		if (this._WebGLmode > 0){
			var renderer = this._WebGLrenderer;

			switch (this._WebGLmode){
				case 2:
					var consts = new AntiDetect_consts();
					renderer = consts.getRandomRenderer();
					break;
				case 3:
					renderer = {
						'vendor':Preferences.get("antidetect.webgl.override.vendor",""),
						'renderer':Preferences.get("antidetect.webgl.override.renderer","")
					};
					break;
			}

			if (null != renderer){
				// very very dirty because I've disable childness check in libpref
				Preferences.set("webgl.renderer-string-override", renderer.renderer);
				Preferences.set("webgl.vendor-string-override", renderer.vendor);
			}
		}

		var WebRTCInjection = "";
		this._WebRTCmodeDevice = Preferences.get("antidetect.webrtc.device.mode",this._WebRTCmodeDevice);
		this._WebRTCmodeIP = Preferences.get("antidetect.webrtc.ip.mode",this._WebRTCmodeIP);
		if ( ( this._WebRTCmodeDevice > 0 || this._WebRTCmodeIP > 0 ) &&
				( Preferences.get("media.navigator.enabled",false) ||
				Preferences.get("media.peerconnection.enabled",false) )
		) {
			WebRTCInjection = this._injectWebRTC(aEvent.originalTarget);
		}

		if ( WebRTCInjection ){
			var script = this._content.document.createElement("script");
			script.type = "text/javascript";
			script.innerHTML += "(function(){";

			script.innerHTML += (WebRTCInjection ? WebRTCInjection : "");

			script.innerHTML += "})();";

			if ( aEvent.originalTarget.documentElement.firstChild &&
					aEvent.originalTarget.documentElement.firstChild.firstChild ) {
				aEvent.originalTarget.documentElement.firstChild.insertBefore(script,
						aEvent.originalTarget.documentElement.firstChild.firstChild);
			}
		}

		if (this._logDebug)
			console.log( "_onInjectionTime successful" );
	},

	_isRootDocumentEvent(aEvent) {
		if (this._content == null) {
			return true;
		}
		let target = aEvent.originalTarget;
		return (target == this._content.document ||
				(target.ownerDocument && target.ownerDocument == this._content.document));
	},

	_getRandomString(length = 15) {
		var result = '';
		var choice = 'qwertyuiopasdfghjklzxcvbnmQWERTYUIOPASDFGHJKLZXCVBNM';
		var maxPos = choice.length - 1;
		for( var i = 0; i < length; ++i ) {
			var position = Math.floor( Math.random() * maxPos ) ;
			result = result + choice.substring( position, position + 1 );
		}
		return result;
	},

	_getRandomIP() {
		return (Math.floor(Math.random() * 255) + 1)+"."+(Math.floor(Math.random() * 255) + 0)+"."+(Math.floor(Math.random() * 255) + 0)+"."+(Math.floor(Math.random() * 255) + 0);
	},

	_injectWebRTC(target) {
		var injection = "";
		if ( this._WebRTCmodeDevice > 0 && Preferences.get("media.navigator.enabled",false) ) {
			switch (this._WebRTCmodeDevice) {
				case 2:
					var deviceId = this._getRandomString( 43 )+"=";
					var groupId = '';
					var kind = 'audioinput';
					var label = '';
					break;
				case 1:
					var deviceId = Preferences.get("antidetect.webrtc.device.deviceId",this._getRandomString( 43 )+"=").replace(/["']/g,"");
					var groupId = Preferences.get("antidetect.webrtc.device.groupId","").replace(/["']/g,"");
					var kind = Preferences.get("antidetect.webrtc.device.kind","audioinput").replace(/["']/g,"");
					var label = Preferences.get("antidetect.webrtc.device.label","").replace(/["']/g,"");
					break;
			}

			injection +=
				"navigator.mediaDevices.enumerateDevices = function(){ return new Promise( function(resolve){ resolve( [ {'deviceId':'"+deviceId+"','groupId':'"+groupId+"','kind':'"+kind+"','label':'"+label+"'} ] ); } ); };";
		}

		if ( 1 == this._WebRTCmodeIP && Preferences.get("media.peerconnection.enabled",false) ) {
			var localIP = Preferences.get("antidetect.webrtc.ip.local",this._WebRTClocaIP).replace(/["']/g,"");
			var publicIP = Preferences.get("antidetect.webrtc.ip.public",this._WebRTCpublicIP).replace(/["']/g,"");

			var onicecandidateFake = this._getRandomString();
			var rtcFunc = this._getRandomString();
			var fakeRTC = this._getRandomString();
			var address = this._getRandomString();
			var xhr = this._getRandomString();
			switch (publicIP) {
				case "auto":
					injection +=
						"var "+xhr+" = new XMLHttpRequest();"+
						xhr+".open('GET', 'https://antidetect.vektort13.pro/dyn/ip.php', false);"+
						xhr+".send(null);"+
						"var "+address+" = "+xhr+".responseText?"+xhr+".responseText:'127.0.0.1';";
					break;
				case "random":
					publicIP = this._getRandomIP();
					// surprise! we don't really need break statement here
				default:
					injection += "var "+address+" = '"+publicIP+"';";
					break;
			}
			if ('random' == localIP) {
				localIP = this._getRandomIP();
			}

			//injection += "console.log('AntiDetectSpoofer localIP: "+localIP+", publicIP: ',"+address+");";

			injection +=
				"var "+rtcFunc+" = window.RTCPeerConnection || window.mozRTCPeerConnection || window.webkitRTCPeerConnection;"+
				"var "+fakeRTC+" = function(servers, mediaConstraints) {"+
					"var b = true;"+
					"if (location.href.indexOf('ipleak.net')+1) b=false;"+
					"if (location.href.indexOf('2ip.ru')+1) b=false;"+
					"if (location.href.indexOf('check2ip.com')+1) b=false;"+
					"this."+onicecandidateFake+" = function(ice) { "+
						"if (!this.bool) {"+
							"this.bool = true;"+
							"ice.candidate.candidate = 'candidate:0 1 UDP 394516791 "+localIP+" 64008 typ host\\n candidate:0 1 UDP 2122055935 '+"+address+"+' 62338 typ host';"+
							"this.parentObj.onicecandidate(ice); "+
						"}"+
					"};"+
					"this."+rtcFunc+" = new "+rtcFunc+"(servers, mediaConstraints);"+
					"this."+rtcFunc+".parentObj = this;"+
					"this."+rtcFunc+".onicecandidate = this."+onicecandidateFake+";"+
					"this."+rtcFunc+".onsignalingstatechange = function(ev) { this.parentObj.localDescription = this.localDescription; };"+
					"this.createDataChannel = function(text) { return this."+rtcFunc+".createDataChannel(text); };"+
					"this.createOffer = function(func1, func2){ return this."+rtcFunc+".createOffer(func1, func2); };"+
					"this.createAnswer = function(func1, func2){ return this."+rtcFunc+".createAnswer(func1, func2); };"+
					"this.setLocalDescription = function(result, funct1, funct2){ if (!funct1) funct1=function(){}; if (!funct2) funct2=function(){}; this."+rtcFunc+".setLocalDescription(result, funct1, funct2); };"+
					"this.setRemoteDescription = function(result, funct1, funct2){ if (!funct1) funct1=function(){}; if (!funct2) funct2=function(){}; this."+rtcFunc+".setRemoteDescription(result, funct1, funct2); };"+
					"this.close = function() { this."+rtcFunc+".close(); };"+
					"this.generateCertificate = function(keygenAlgorithm) { return this."+rtcFunc+".generateCertificate(keygenAlgorithm); };"+
					"Object.defineProperty(this, 'localDescription', { get: function() {var ld = {sdp:'',type:'offer'}; var lines=this."+rtcFunc+".localDescription.sdp.split('\\n'); var bool=true; lines.forEach(function(line){if(line.indexOf('a=candidate:') === 0) if (bool) {bool = false; ld.sdp += 'a=candidate:0 1 UDP 394516791 "+localIP+" 64008 typ host\\n'; ld.sdp += 'a=candidate:0 1 UDP 2122055935 '+"+address+"+' 62338 typ host\\n';} else; else ld.sdp += line + '\\n'; }); return ld;} });"+
					"Object.defineProperty(this, 'peerIdentity', { get: function() {return this."+rtcFunc+".peerIdentity;} });"+
					"Object.defineProperty(this, 'iceConnectionState', { get: function() {return this."+rtcFunc+".iceConnectionState;} });"+
					"Object.defineProperty(this, 'iceGatheringState', { get: function() {return this."+rtcFunc+".iceConnectionState;} });"+
					"Object.defineProperty(this, 'SignalingState', { get: function() {return this."+rtcFunc+".iceConnectionState;} });"+
				"};"+
				"window.RTCPeerConnection = "+fakeRTC+"; window.mozRTCPeerConnection = "+fakeRTC+";"+
				"function updateIframes() { for (var i = 0; i < frames.length; i++) { frames[i].RTCPeerConnection = window.RTCPeerConnection; frames[i].mozRTCPeerConnection = window.mozRTCPeerConnection; } };";
		}

		return injection;
	},

	on_HTTP_alter_useragent: function(aSubject, aTopic, aData){
		console.log("in on_HTTP_alter_useragent() for "+aTopic);
		var interfaceRequestor = aSubject
			.QueryInterface(Ci.nsIHttpChannel)
			.notificationCallbacks
			.QueryInterface(Ci.nsIInterfaceRequestor);
		var loadContext = null;
		try {
			loadContext = interfaceRequestor.getInterface(Ci.nsILoadContext);
		} catch (ex) {
			try {
				loadContext = aSubject
					.loadGroup
					.notificationCallbacks
					.getInterface(Ci.nsILoadContext);
			} catch (ex2) {}
		}

		if (loadContext) {
			var contentWindow = null;
			try {
				contentWindow = loadContext.associatedWindow;
				let userAgent = contentWindow.navigator.userAgent;
				let channel = aSubject.QueryInterface(Ci.nsIHttpChannel);
				if ( null != userAgent && null != channel ){
					console.log("Setting User-Agent header to "+userAgent+" in "+aTopic);
					channel.setRequestHeader("User-Agent", userAgent, false);
				}

				var aDOMWindow = contentWindow
					.top
					.QueryInterface(Ci.nsIInterfaceRequestor)
					.getInterface(Ci.nsIWebNavigation)
					.QueryInterface(Ci.nsIDocShellTreeItem)
					.rootTreeItem
					.QueryInterface(Ci.nsIInterfaceRequestor)
					.getInterface(Ci.nsIDOMWindow);
				var docShell = contentWindow.QueryInterface(Ci.nsIInterfaceRequestor)
					.getInterface(Ci.nsIWebNavigation)
					.QueryInterface(Ci.nsIDocShell);
				let maskingBrowser = docShell.antiDetectMaskingBrowser;
				console.log(maskingBrowser);
			} catch (ex) {}
		}
	},
};
