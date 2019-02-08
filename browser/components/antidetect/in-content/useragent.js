/* This Source Code Form is subject to the terms of the Mozilla Public
 * License, v. 2.0. If a copy of the MPL was not distributed with this file,
 * You can obtain one at http://mozilla.org/MPL/2.0/. */

"use strict";

/* import-globals-from preferences.js */

XPCOMUtils.defineLazyModuleGetter(this, "AntiDetect_consts",
		"resource:///modules/AntiDetect_consts.jsm");
XPCOMUtils.defineLazyModuleGetter(this, "console",
		"resource://gre/modules/Console.jsm");
XPCOMUtils.defineLazyModuleGetter(this, "Preferences",
		"resource://gre/modules/Preferences.jsm");

var gUserAgentPane = {
	/**
	 * Initialization of this.
	 */

	init() {
		function setEventListener(aId, aEventType, aCallback) {
			document.getElementById(aId).addEventListener(
					aEventType, aCallback.bind(gUserAgentPane));
		}

		this.onModeChange(1);
		setEventListener("useragentEnable", "CheckboxStateChange", this.onModeSet);
		setEventListener("useragentRandomEnable", "CheckboxStateChange", this.onModeSet);

		// Notify observers that the UI is now ready
		Components.classes["@mozilla.org/observer-service;1"]
			.getService(Components.interfaces.nsIObserverService)
			.notifyObservers(window, "useragent-pane-loaded", null);
	},

	onUserAgentSet(){
		let userAgent = document.getElementById("userAgent").value;

		let ua = "Mozilla/5.0 (";
		let av = "5.0 (";
		if (AppConstants.platform.startsWith("linux")){
			av += "X11; " + navigator.oscpu;
			ua += "X11; " + navigator.oscpu;
		} else {
			av += navigator.oscpu;
			ua += navigator.oscpu;
		}

		if ("Firefox" == userAgent){
			av += ")";
			ua += "; rv:55.0) Gecko/20100101 Firefox/55.0";
			Preferences.reset("general.appversion.override");
			Preferences.reset("general.oscpu.override");
			Preferences.reset("general.buildID.override");
		} else if ("Chrome" == userAgent) {
			av += ") AppleWebKit/537.36 (KHTML, like Gecko) Chrome/61.0.3163.91 Safari/537.36";
			ua += ") AppleWebKit/537.36 (KHTML, like Gecko) Chrome/61.0.3163.91 Safari/537.36";
			Preferences.set("general.appversion.override", av);
			Preferences.set("general.oscpu.override","");
			Preferences.set("general.buildID.override", "");
		}

		Preferences.set("general.useragent.override", ua);
		return userAgent;
	},

	onModeSet(){
		document.getElementById("antidetect.useragent.mode").value =
			( document.getElementById("useragentEnable").checked ?
			  ( document.getElementById("useragentRandomEnable").checked ? 2 : 1 ) : 0 );
		gUserAgentPane.onModeChange();
		gUserAgentPane.onUserAgentSet();
	},

	onModeChange(initial = 0){
		var useragent = document.getElementById("useragentEnable");
		var useragentRandom = document.getElementById("useragentRandomEnable");
		var userAgent = document.getElementById("userAgent");
		var signature = document.getElementById("signatureEnable");

		var mode = document.getElementById("antidetect.useragent.mode");
		switch (mode.value){
			case 1:
				if (initial){
					useragent.checked = 1;
					useragentRandom.checked = 0;
				}
				useragentRandom.disabled = 1;
				userAgent.disabled = 0;
				signature.disabled = 0;
				break;
			case 2:
				if (initial){
					useragent.checked = 1;
					useragentRandom.checked = 0;
				}
				useragentRandom.disabled = 1;
				userAgent.disabled = 1;
				signature.disabled = 0;
				break;
			default:
				if (initial){
					useragent.checked = 0;
					useragentRandom.checked = 0;
					signature.checked = 0;
				}
				useragentRandom.disabled = 1;
				userAgent.disabled = 1;
				signature.disabled = 1;
				break;
		}
	},
};

